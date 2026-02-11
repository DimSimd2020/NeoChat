use crate::models::{
    Chat, ChatLastMessage, ChatType, Contact, CoreError, Message, MessageStatus, NetworkStatus,
    User, UserStatus,
};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;
use aes_gcm::{
    aead::{Aead, AeadCore, KeyInit},
    Aes256Gcm, Nonce // Or `Aes128Gcm`
};
use base32::Alphabet;
use rand::{rngs::OsRng, RngCore};
use std::fs;
use std::path::Path;
use serde::{Deserialize, Serialize};

// Internal struct to serialize everything at once
#[derive(Serialize, Deserialize)]
struct StorageData {
    user: User,
    chats: HashMap<String, Chat>,
    messages: HashMap<String, Vec<Message>>,
    contacts: HashMap<String, Contact>,
}

#[derive(uniffi::Object)]
pub struct NeoChatCore {
    // Internal state (mock for now)
    chats: Mutex<HashMap<String, Chat>>,
    messages: Mutex<HashMap<String, Vec<Message>>>, // chat_id -> messages
    contacts: Mutex<HashMap<String, Contact>>,      // user_id -> Contact
    my_profile: Mutex<User>,
    network_status: Mutex<NetworkStatus>,
    storage_path: String,
    encryption_key: [u8; 32],
}

#[uniffi::export]
impl NeoChatCore {
    #[uniffi::constructor]
    pub fn new(storage_path_str: String) -> Result<Arc<Self>, CoreError> {
        // Ensure storage directory exists
        if let Some(parent) = Path::new(&storage_path_str).parent() {
            fs::create_dir_all(parent).map_err(|e| CoreError::Internal(e.to_string()))?;
        }

        // Load or generate key
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

        // Try to load data
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
                }));
            }
        }

        // Initialize with default (unregistered) profile
        // Generate a random ID that looks like a public key (UUID for now)
        let id = Uuid::new_v4().to_string();
        
        let my_profile = User {
            id,
            username: "New User".to_string(),
            status: UserStatus::Offline,
            last_seen: 0,
            avatar_url: None,
            is_registered: false,
        };

        let chats = HashMap::new();
        let messages = HashMap::new();
        let contacts = HashMap::new();

        Ok(Arc::new(Self {
            chats: Mutex::new(chats),
            messages: Mutex::new(messages),
            contacts: Mutex::new(contacts),
            my_profile: Mutex::new(my_profile),
            network_status: Mutex::new(NetworkStatus::Disconnected),
            storage_path: storage_path_str,
            encryption_key: key,
        }))
    }
}

// Private implementation block for internal methods
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

        // Encrypt: Json Bytes -> Encrypted Bytes
        let cipher = Aes256Gcm::new(&self.encryption_key.into());
        let nonce = Aes256Gcm::generate_nonce(&mut OsRng); // 96-bits; unique per message
        let ciphertext = cipher.encrypt(&nonce, json_bytes.as_ref())
             .map_err(|e| CoreError::Internal(format!("Encryption error: {}", e)))?;
        
        // Combine nonce + ciphertext
        let mut encrypted_payload = nonce.to_vec();
        encrypted_payload.extend_from_slice(&ciphertext);

        // Base32 Encode
        let base32_str = base32::encode(Alphabet::RFC4648 { padding: true }, &encrypted_payload);

        // Write as binary (bytes of the base32 string)
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
}

#[uniffi::export]
impl NeoChatCore {
    pub fn register(&self, username: String) -> Result<User, CoreError> {
        if username.trim().is_empty() {
            return Err(CoreError::InvalidArgument("Username cannot be empty".into()));
        }
        {
            let mut profile = self.my_profile.lock().unwrap();
            profile.username = username;
            profile.status = UserStatus::Online;
            profile.last_seen = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs();
            profile.is_registered = true;
        }
        self.save_to_disk()?;
        Ok(self.my_profile.lock().unwrap().clone())
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
        let _ = self.save_to_disk();
    }

    pub fn get_chats(&self) -> Vec<Chat> {
        let chats = self.chats.lock().unwrap();
        chats.values().cloned().collect()
    }

    pub fn create_chat(&self, participant_pubkey: String) -> Result<Chat, CoreError> {
        let mut chats = self.chats.lock().unwrap();
        // Check if chat already exists
        for chat in chats.values() {
            if chat.chat_type == ChatType::Private
                && chat.participants.contains(&participant_pubkey)
            {
                return Ok(chat.clone());
            }
        }

        let id = Uuid::new_v4().to_string();
        // Try to find name in contacts
        let contacts = self.contacts.lock().unwrap();
        let name = contacts
            .get(&participant_pubkey)
            .map(|c| c.name.clone())
            .unwrap_or_else(|| format!("User {}", &participant_pubkey[..8]));

        let my_id = self.my_profile.lock().unwrap().id.clone();

        let chat = Chat {
            id: id.clone(),
            chat_type: ChatType::Private, 
            name,
            avatar_url: None,
            unread_count: 0,
            last_message: None,
            participants: vec![my_id, participant_pubkey],
        };
        chats.insert(id.clone(), chat.clone());
        drop(chats); // unlock before save
        drop(contacts);
        
        self.save_to_disk()?;
        
        Ok(chat)
    }

    pub fn create_group(&self, name: String, participants: Vec<String>) -> Result<Chat, CoreError> {
        let mut chats = self.chats.lock().unwrap();
        let id = Uuid::new_v4().to_string();
        let mut all_participants = participants.clone();
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
        };
        chats.insert(id.clone(), chat.clone());
        drop(chats);
        self.save_to_disk()?;
        Ok(chat)
    }

    pub fn delete_chat(&self, chat_id: String) {
        let mut chats = self.chats.lock().unwrap();
        chats.remove(&chat_id);
        drop(chats);
        let _ = self.save_to_disk();
    }

    pub fn get_messages(&self, chat_id: String, limit: u32, offset: u32) -> Vec<Message> {
        let messages_map = self.messages.lock().unwrap();
        if let Some(msgs) = messages_map.get(&chat_id) {
            // Simple pagination (mock)
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
        let mut messages_map = self.messages.lock().unwrap();
        let msgs = messages_map.entry(chat_id.clone()).or_insert(Vec::new());

        let my_id = self.my_profile.lock().unwrap().id.clone();

        let msg = Message {
            id: Uuid::new_v4().to_string(),
            chat_id: chat_id.clone(),
            sender_id: my_id,
            text: text.clone(),
            timestamp: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs(),
            status: MessageStatus::Sent,
            attachments: vec![],
        };
        msgs.push(msg.clone());

        // Update last message in chat
        let mut chats = self.chats.lock().unwrap();
        if let Some(chat) = chats.get_mut(&chat_id) {
            chat.last_message = Some(ChatLastMessage {
                text,
                timestamp: msg.timestamp,
                sender_id: msg.sender_id.clone(),
            });
        }
        
        drop(messages_map);
        drop(chats);
        self.save_to_disk()?;

        Ok(msg)
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

    // Contacts
    pub fn get_contacts(&self) -> Vec<Contact> {
        let contacts = self.contacts.lock().unwrap();
        contacts.values().cloned().collect()
    }

    pub fn add_contact(&self, pubkey: String, name: String) {
        {
            let mut contacts = self.contacts.lock().unwrap();
            contacts.insert(
                pubkey.clone(),
                Contact {
                    id: pubkey,
                    name,
                    avatar_url: None,
                    status: UserStatus::Offline,
                },
            );
        }
        let _ = self.save_to_disk();
    }

    pub fn search_users(&self, query: String) -> Vec<Contact> {
        let contacts = self.contacts.lock().unwrap();
        let mut results: Vec<Contact> = contacts
            .values()
            .filter(|c| c.name.to_lowercase().contains(&query.to_lowercase()))
            .cloned()
            .collect();

        // Simulate global network search
        // If query looks like a key/ID, mock a found user
        if query.len() > 8 && !results.iter().any(|c| c.id == query) {
             results.push(Contact {
                id: query.clone(),
                name: format!("User {}", &query[..4]),
                avatar_url: None,
                status: UserStatus::Online,
            });
        }

        // Keep Bob for testing
        if "bob".contains(&query.to_lowercase()) && !results.iter().any(|c| c.name == "Bob") {
            results.push(Contact {
                id: Uuid::new_v4().to_string(),
                name: "Bob".to_string(),
                avatar_url: None,
                status: UserStatus::Online,
            });
        }
        results
    }

    pub fn connect_peer(&self, address: String) {
        // Mock connection
        println!("Connecting to peer: {}", address);
        let mut status = self.network_status.lock().unwrap();
        *status = NetworkStatus::Connected;
    }

    pub fn get_network_status(&self) -> NetworkStatus {
        let status = self.network_status.lock().unwrap();
        status.clone()
    }
}
