use crate::models::{
    Chat, ChatLastMessage, ChatType, Contact, CoreError, Message, MessageStatus, NetworkStatus,
    TransportMode, User, UserStatus,
};
use crate::transport::relay::{RelayClient, RelayConfig, RelayEnvelope};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;
use aes_gcm::{
    aead::{Aead, AeadCore, KeyInit},
    Aes256Gcm, Nonce,
};
use base32::Alphabet;
use rand::{rngs::OsRng, RngCore};
use std::fs;
use std::path::Path;
use serde::{Deserialize, Serialize};

/// Internal struct to serialize all app state at once
#[derive(Serialize, Deserialize)]
struct StorageData {
    user: User,
    chats: HashMap<String, Chat>,
    messages: HashMap<String, Vec<Message>>,
    contacts: HashMap<String, Contact>,
}

#[derive(uniffi::Object)]
pub struct NeoChatCore {
    chats: Mutex<HashMap<String, Chat>>,
    messages: Mutex<HashMap<String, Vec<Message>>>,
    contacts: Mutex<HashMap<String, Contact>>,
    my_profile: Mutex<User>,
    network_status: Mutex<NetworkStatus>,
    pub storage_path: String,
    pub encryption_key: [u8; 32],
    // Relay client for network operations (not serialized)
    relay: RelayClient,
}

#[uniffi::export]
impl NeoChatCore {
    #[uniffi::constructor]
    pub fn new(storage_path_str: String) -> Result<Arc<Self>, CoreError> {
        // Ensure storage directory exists
        if let Some(parent) = Path::new(&storage_path_str).parent() {
            if !parent.as_os_str().is_empty() {
                fs::create_dir_all(parent).map_err(|e| CoreError::Internal(e.to_string()))?;
            }
        }

        // Load or generate encryption key
        let key_path = format!("{}.key", storage_path_str);
        let key = if Path::new(&key_path).exists() {
            fs::read(&key_path)
                .map_err(|e| CoreError::Internal(format!("Failed to read key: {}", e)))?
                .try_into()
                .map_err(|_| CoreError::Internal("Invalid key length".into()))?
        } else {
            let mut key = [0u8; 32];
            OsRng.fill_bytes(&mut key);
            fs::write(&key_path, &key)
                .map_err(|e| CoreError::Internal(format!("Failed to save key: {}", e)))?;
            key
        };

        let relay_client = RelayClient::new(RelayConfig::default());

        // Try to load existing data from disk
        if Path::new(&storage_path_str).exists() {
            if let Ok(loaded) = Self::load_from_disk(&storage_path_str, &key) {
                return Ok(Arc::new(Self {
                    chats: Mutex::new(loaded.chats),
                    messages: Mutex::new(loaded.messages),
                    contacts: Mutex::new(loaded.contacts),
                    my_profile: Mutex::new(loaded.user),
                    network_status: Mutex::new(NetworkStatus::Disconnected),
                    storage_path: storage_path_str,
                    encryption_key: key,
                    relay: relay_client,
                }));
            }
        }

        // Fresh profile — no mock data
        let id = Uuid::new_v4().to_string();
        let my_profile = User {
            id,
            username: "New User".to_string(),
            status: UserStatus::Offline,
            last_seen: 0,
            avatar_url: None,
            is_registered: false,
        };

        Ok(Arc::new(Self {
            chats: Mutex::new(HashMap::new()),
            messages: Mutex::new(HashMap::new()),
            contacts: Mutex::new(HashMap::new()),
            my_profile: Mutex::new(my_profile),
            network_status: Mutex::new(NetworkStatus::Disconnected),
            storage_path: storage_path_str,
            encryption_key: key,
            relay: relay_client,
        }))
    }
}

// Private methods
impl NeoChatCore {
    fn save_to_disk(&self) -> Result<(), CoreError> {
        let data = StorageData {
            user: self.my_profile.lock().unwrap().clone(),
            chats: self.chats.lock().unwrap().clone(),
            messages: self.messages.lock().unwrap().clone(),
            contacts: self.contacts.lock().unwrap().clone(),
        };

        let json_bytes = serde_json::to_vec(&data)
            .map_err(|e| CoreError::Internal(format!("Serialization error: {}", e)))?;

        let cipher = Aes256Gcm::new(&self.encryption_key.into());
        let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
        let ciphertext = cipher.encrypt(&nonce, json_bytes.as_ref())
             .map_err(|e| CoreError::Internal(format!("Encryption error: {}", e)))?;
        
        let mut encrypted_payload = nonce.to_vec();
        encrypted_payload.extend_from_slice(&ciphertext);

        let base32_str = base32::encode(Alphabet::RFC4648 { padding: true }, &encrypted_payload);

        fs::write(&self.storage_path, base32_str.as_bytes())
             .map_err(|e| CoreError::Internal(format!("File write error: {}", e)))?;

        Ok(())
    }

    fn load_from_disk(path: &str, key: &[u8; 32]) -> Result<StorageData, CoreError> {
        let file_bytes = fs::read(path)
            .map_err(|e| CoreError::Internal(format!("File read error: {}", e)))?;
        
        let base32_str = String::from_utf8(file_bytes)
             .map_err(|e| CoreError::Internal(format!("Invalid UTF-8: {}", e)))?;

        let encrypted_payload = base32::decode(Alphabet::RFC4648 { padding: true }, &base32_str)
             .ok_or(CoreError::Internal("Base32 decode error".into()))?;

        if encrypted_payload.len() < 12 {
            return Err(CoreError::Internal("Data too short".into()));
        }

        let (nonce_bytes, ciphertext) = encrypted_payload.split_at(12);
        let nonce = Nonce::from_slice(nonce_bytes);
        
        let cipher = Aes256Gcm::new(key.into());
        let plaintext = cipher.decrypt(nonce, ciphertext)
             .map_err(|e| CoreError::Internal(format!("Decryption error: {}", e)))?;

        let data: StorageData = serde_json::from_slice(&plaintext)
             .map_err(|e| CoreError::Internal(format!("Deserialization error: {}", e)))?;
        
        Ok(data)
    }

    fn now_ts() -> u64 {
        SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs()
    }
}

// Public API
#[uniffi::export]
impl NeoChatCore {
    // === Profile ===
    pub fn register(&self, username: String) -> Result<User, CoreError> {
        if username.trim().is_empty() {
            return Err(CoreError::InvalidArgument("Username cannot be empty".into()));
        }
        {
            let mut profile = self.my_profile.lock().unwrap();
            profile.username = username;
            profile.status = UserStatus::Online;
            profile.last_seen = Self::now_ts();
            profile.is_registered = true;
        }
        
        let profile = self.my_profile.lock().unwrap().clone();
        // Sync with relay
        if let Err(e) = self.relay.update_profile(&profile) {
             println!("Warning: Failed to sync profile with relay: {}", e);
        }

        self.save_to_disk()?;
        Ok(profile)
    }

    pub fn get_my_profile(&self) -> User {
        self.my_profile.lock().unwrap().clone()
    }

    pub fn update_profile(&self, name: String, avatar: Option<String>) {
        {
            let mut profile = self.my_profile.lock().unwrap();
            profile.username = name;
            profile.avatar_url = avatar;
        }
        let profile = self.my_profile.lock().unwrap().clone();
        if let Err(e) = self.relay.update_profile(&profile) {
             println!("Warning: Failed to sync profile with relay: {}", e);
        }
        let _ = self.save_to_disk();
    }

    pub fn clear_database(&self) {
        {
            let mut chats = self.chats.lock().unwrap();
            chats.clear();
        }
        {
            let mut messages = self.messages.lock().unwrap();
            messages.clear();
        }
        {
            let mut contacts = self.contacts.lock().unwrap();
            contacts.clear();
        }
        {
            let mut profile = self.my_profile.lock().unwrap();
            profile.username = "New User".to_string();
            profile.status = UserStatus::Offline;
            profile.last_seen = 0;
            profile.avatar_url = None;
            profile.is_registered = false;
        }
        let _ = self.save_to_disk();
    }

    // === Chats ===
    pub fn get_chats(&self) -> Vec<Chat> {
        let chats = self.chats.lock().unwrap();
        chats.values().cloned().collect()
    }

    pub fn create_chat(&self, participant_pubkey: String) -> Result<Chat, CoreError> {
        let mut chats = self.chats.lock().unwrap();
        // Check if chat with this participant already exists
        for chat in chats.values() {
            if chat.chat_type == ChatType::Private
                && chat.participants.contains(&participant_pubkey)
            {
                return Ok(chat.clone());
            }
        }

        // Check local contacts first
        let contacts = self.contacts.lock().unwrap();
        let candidate = contacts.get(&participant_pubkey).cloned();
        drop(contacts); // Release lock before network call

        let (name, avatar, status) = if let Some(contact) = candidate {
            (contact.name, contact.avatar_url, contact.status)
        } else {
            // Try fetch from network
            match self.relay.get_profile(&participant_pubkey) {
                 Ok(user) => (user.username, user.avatar_url, user.status),
                 Err(_) => {
                     // If user is not found, we Return Error instead of creating fake chat
                     return Err(CoreError::InvalidArgument("User not found on network".into()));
                 }
            }
        };

        let id = Uuid::new_v4().to_string();
        let my_id = self.my_profile.lock().unwrap().id.clone();

        let chat = Chat {
            id: id.clone(),
            chat_type: ChatType::Private,
            name: name.clone(),
            avatar_url: avatar.clone(),
            unread_count: 0,
            last_message: None,
            participants: vec![my_id, participant_pubkey.clone()],
            transport: TransportMode::Internet,
        };
        chats.insert(id.clone(), chat.clone());
        
        // Add to contacts if not exists
        let mut contacts = self.contacts.lock().unwrap();
        if !contacts.contains_key(&participant_pubkey) {
            contacts.insert(participant_pubkey.clone(), Contact {
                id: participant_pubkey,
                name,
                avatar_url: avatar,
                status,
                phone_number: None,
            });
        }
        
        drop(chats);
        drop(contacts);
        
        self.save_to_disk()?;
        Ok(chat)
    }

    pub fn create_group(&self, name: String, participants: Vec<String>) -> Result<Chat, CoreError> {
        let mut chats = self.chats.lock().unwrap();
        let id = Uuid::new_v4().to_string();
        let mut all_participants = participants;
        let my_id = self.my_profile.lock().unwrap().id.clone();
        all_participants.push(my_id);

        let chat = Chat {
            id: id.clone(),
            chat_type: ChatType::Group,
            name,
            avatar_url: None,
            unread_count: 0,
            last_message: None,
            participants: all_participants,
            transport: TransportMode::Internet,
        };
        chats.insert(id.clone(), chat.clone());
        drop(chats);
        self.save_to_disk()?;
        Ok(chat)
    }

    pub fn delete_chat(&self, chat_id: String) {
        {
            let mut chats = self.chats.lock().unwrap();
            chats.remove(&chat_id);
        }
        {
            let mut messages = self.messages.lock().unwrap();
            messages.remove(&chat_id);
        }
        let _ = self.save_to_disk();
    }

    /// Switch transport mode for a chat (Internet <-> SMS)
    pub fn set_chat_transport(&self, chat_id: String, mode: TransportMode) -> Result<(), CoreError> {
        let mut chats = self.chats.lock().unwrap();
        if let Some(chat) = chats.get_mut(&chat_id) {
            chat.transport = mode;
            drop(chats);
            self.save_to_disk()?;
            Ok(())
        } else {
            Err(CoreError::Internal("Chat not found".into()))
        }
    }

    // === Messages ===
    pub fn get_messages(&self, chat_id: String, limit: u32, offset: u32) -> Vec<Message> {
        let messages_map = self.messages.lock().unwrap();
        if let Some(msgs) = messages_map.get(&chat_id) {
            let start = offset as usize;
            let end = (offset + limit) as usize;
            if start < msgs.len() {
                msgs[start..std::cmp::min(end, msgs.len())].to_vec()
            } else {
                Vec::new()
            }
        } else {
            Vec::new()
        }
    }

    pub fn send_message(&self, chat_id: String, text: String) -> Result<Message, CoreError> {
        if text.trim().is_empty() {
            return Err(CoreError::Internal("Empty message".into()));
        }

        // Get chat participants and transport
        let (participants, transport, _chat_type) = {
            let chats = self.chats.lock().unwrap();
            match chats.get(&chat_id) {
                Some(chat) => (chat.participants.clone(), chat.transport.clone(), chat.chat_type.clone()),
                None => return Err(CoreError::Internal("Chat not found".into())),
            }
        };

        let my_id = self.my_profile.lock().unwrap().id.clone();
        let msg_id = Uuid::new_v4().to_string();
        let timestamp = Self::now_ts();

        let msg = Message {
            id: msg_id.clone(),
            chat_id: chat_id.clone(),
            sender_id: my_id.clone(),
            text: text.clone(),
            timestamp,
            status: MessageStatus::Sent,
            attachments: vec![],
            transport: transport.clone(),
        };

        // Send to network
        if transport == TransportMode::Internet {
             for p in participants {
                 if p == my_id { continue; }
                 
                 // TODO: Encrypt payload properly
                 let envelope = RelayEnvelope {
                     from: my_id.clone(),
                     to: p.clone(),
                     payload: text.clone(), // Sending cleartext for now as E2E setup is complex without PKI
                     message_id: msg_id.clone(),
                     timestamp,
                 };
                 
                 if let Err(e) = self.relay.send(&envelope) {
                     println!("Failed to send to {}: {}", p, e);
                     // We still save the message locally but maybe mark as failed?
                     // returning error would stop local save
                 }
             }
        }

        {
            let mut messages_map = self.messages.lock().unwrap();
            let msgs = messages_map.entry(chat_id.clone()).or_default();
            msgs.push(msg.clone());
        }

        {
            let mut chats = self.chats.lock().unwrap();
            if let Some(chat) = chats.get_mut(&chat_id) {
                chat.last_message = Some(ChatLastMessage {
                    text,
                    timestamp: msg.timestamp,
                    sender_id: msg.sender_id.clone(),
                });
            }
        }
        self.save_to_disk()?;
        Ok(msg)
    }

    pub fn poll_messages(&self) -> Result<Vec<Message>, CoreError> {
        let my_id = self.my_profile.lock().unwrap().id.clone();
        
        let envelopes = self.relay.poll(&my_id)
            .map_err(|e| CoreError::Internal(format!("Poll error: {}", e)))?;

        let mut new_messages = Vec::new();
        
        for env in envelopes {
            // Find or create chat for sender
            // Note: In real app we should check signature
            
            // Check if chat exists
            let sender_id = env.from.clone();
            
            // We need to find which chat this belongs to. 
            // In private chat, participants = [me, sender]
            let mut chat_id = String::new();
            
            {
                let chats = self.chats.lock().unwrap();
                for c in chats.values() {
                     if c.chat_type == ChatType::Private && c.participants.contains(&sender_id) {
                         chat_id = c.id.clone();
                         break;
                     }
                }
            }
            
            if chat_id.is_empty() {
                // New chat from unknown user? 
                // We should fetch profile first
                 drop(self.chats.lock().unwrap()); // Ensure not locked
                 match self.create_chat(sender_id.clone()) {
                     Ok(chat) => chat_id = chat.id,
                     Err(e) => {
                         println!("Failed to create chat for incoming msg: {}", e);
                         continue;
                     }
                 }
            }
            
            let msg = Message {
                id: env.message_id.clone(),
                chat_id: chat_id.clone(),
                sender_id: sender_id.clone(),
                text: env.payload.clone(),
                timestamp: env.timestamp,
                status: MessageStatus::Read, // or Received
                attachments: vec![],
                transport: TransportMode::Internet,
            };
            
            {
                let mut messages_map = self.messages.lock().unwrap();
                let msgs = messages_map.entry(chat_id.clone()).or_default();
                // Dedup
                if !msgs.iter().any(|m| m.id == msg.id) {
                    msgs.push(msg.clone());
                    new_messages.push(msg.clone());
                }
            }
            
             // Ack message
             let _ = self.relay.ack(&my_id, &env.message_id);
        }
        
        if !new_messages.is_empty() {
             self.save_to_disk()?;
        }
        
        Ok(new_messages)
    }

    pub fn mark_as_read(&self, chat_id: String, message_ids: Vec<String>) {
        {
            let mut messages_map = self.messages.lock().unwrap();
            if let Some(msgs) = messages_map.get_mut(&chat_id) {
                for msg in msgs {
                    if message_ids.contains(&msg.id) {
                        msg.status = MessageStatus::Read;
                    }
                }
            }
        }
        let _ = self.save_to_disk();
    }

    // === Contacts ===
    pub fn get_contacts(&self) -> Vec<Contact> {
        self.contacts.lock().unwrap().values().cloned().collect()
    }

    pub fn add_contact(&self, pubkey: String, name: String) {
        {
            let mut contacts = self.contacts.lock().unwrap();
            contacts.insert(pubkey.clone(), Contact {
                id: pubkey,
                name,
                avatar_url: None,
                status: UserStatus::Offline,
                phone_number: None,
            });
        }
        let _ = self.save_to_disk();
    }

    /// Add contact with phone number (for SMS fallback)
    pub fn add_contact_with_phone(&self, pubkey: String, name: String, phone: String) {
        {
            let mut contacts = self.contacts.lock().unwrap();
            contacts.insert(pubkey.clone(), Contact {
                id: pubkey,
                name,
                avatar_url: None,
                status: UserStatus::Offline,
                phone_number: Some(phone),
            });
        }
        let _ = self.save_to_disk();
    }

    pub fn search_users(&self, query: String) -> Vec<Contact> {
        let contacts = self.contacts.lock().unwrap();
        contacts
            .values()
            .filter(|c| {
                c.name.to_lowercase().contains(&query.to_lowercase())
                    || c.id.to_lowercase().contains(&query.to_lowercase())
            })
            .cloned()
            .collect()
    }

    // === Network ===
    pub fn connect_peer(&self, _address: String) {
        let mut status = self.network_status.lock().unwrap();
        *status = NetworkStatus::Connecting;
        // TODO: real P2P connection via libp2p/QUIC
        *status = NetworkStatus::Connected;
    }

    pub fn get_network_status(&self) -> NetworkStatus {
        self.network_status.lock().unwrap().clone()
    }
}
