
use crate::models::{
    Chat, ChatLastMessage, ChatType, Contact, CoreError, Message, MessageStatus, NetworkStatus,
    TransportMode, User, UserStatus, SmsEnvelope,
};
use crate::transport::discovery::{DiscoveryConfig, PeerDiscovery};
use crate::crypto::{IdentityKeys, PeerIdentity, encrypt_for_peer, decrypt_from_peer};

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

/// Internal struct to serialize all app state at once (encrypted on disk)
#[derive(Serialize, Deserialize)]
struct StorageData {
    user: User,
    chats: HashMap<String, Chat>,
    messages: HashMap<String, Vec<Message>>,
    contacts: HashMap<String, Contact>,
    // Store keys as hex/bytes wrapper or specific struct
    identity_priv: Vec<u8>, // Ed25519 Private Key Bytes (32)
    encryption_priv: Vec<u8>, // X25519 Private Key Bytes (32)
    outgoing_sms: Vec<SmsEnvelope>,
}

#[derive(uniffi::Object)]
pub struct NeoChatCore {
    chats: Mutex<HashMap<String, Chat>>,
    messages: Mutex<HashMap<String, Vec<Message>>>,
    contacts: Mutex<HashMap<String, Contact>>,
    my_profile: Mutex<User>,
    identity_keys: Mutex<IdentityKeys>, // In-memory keys
    outgoing_sms: Mutex<Vec<SmsEnvelope>>,
    network_status: Mutex<NetworkStatus>,
    pub storage_path: String,
    pub encryption_key: [u8; 32], // Local database key
    discovery: PeerDiscovery,
}

#[uniffi::export]
impl NeoChatCore {
    #[uniffi::constructor]
    pub fn new(storage_path_str: String) -> Result<Arc<Self>, CoreError> {
        if let Some(parent) = Path::new(&storage_path_str).parent() {
            if !parent.as_os_str().is_empty() {
                fs::create_dir_all(parent).map_err(|e| CoreError::Internal(e.to_string()))?;
            }
        }

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

        if Path::new(&storage_path_str).exists() {
            if let Ok(loaded) = Self::load_from_disk(&storage_path_str, &key) {
                // Reconstruct IdentityKeys
                let signing = ed25519_dalek::SigningKey::from_bytes(&loaded.identity_priv.try_into().unwrap());
                let encryption = x25519_dalek::StaticSecret::from(<[u8; 32]>::try_from(loaded.encryption_priv).unwrap());
                
                let identity = IdentityKeys {
                    signing_key: signing,
                    encryption_key: encryption,
                };

                return Ok(Arc::new(Self {
                    chats: Mutex::new(loaded.chats),
                    messages: Mutex::new(loaded.messages),
                    contacts: Mutex::new(loaded.contacts),
                    my_profile: Mutex::new(loaded.user),
                    identity_keys: Mutex::new(identity),
                    outgoing_sms: Mutex::new(loaded.outgoing_sms),
                    network_status: Mutex::new(NetworkStatus::Disconnected),
                    storage_path: storage_path_str,
                    encryption_key: key,
                    discovery: PeerDiscovery::new(DiscoveryConfig::default()),
                }));
            }
        }

        // New User
        let keys = IdentityKeys::generate();
        let pub_id = keys.id_string();
        let pub_enc = keys.encryption_pub_string();
        
        let my_profile = User {
            id: pub_id,
            username: "New User".to_string(),
            status: UserStatus::Offline,
            last_seen: 0,
            avatar_url: None,
            is_registered: false,
            encryption_pubkey: Some(pub_enc),
        };

        Ok(Arc::new(Self {
            chats: Mutex::new(HashMap::new()),
            messages: Mutex::new(HashMap::new()),
            contacts: Mutex::new(HashMap::new()),
            my_profile: Mutex::new(my_profile),
            identity_keys: Mutex::new(keys),
            outgoing_sms: Mutex::new(Vec::new()),
            network_status: Mutex::new(NetworkStatus::Disconnected),
            storage_path: storage_path_str,
            encryption_key: key,
            discovery: PeerDiscovery::new(DiscoveryConfig::default()),
        }))
    }
}

// Private methods
impl NeoChatCore {
    fn save_to_disk(&self) -> Result<(), CoreError> {
        let keys = self.identity_keys.lock().unwrap();
        
        let data = StorageData {
            user: self.my_profile.lock().unwrap().clone(),
            chats: self.chats.lock().unwrap().clone(),
            messages: self.messages.lock().unwrap().clone(),
            contacts: self.contacts.lock().unwrap().clone(),
            identity_priv: keys.signing_key.to_bytes().to_vec(),
            encryption_priv: keys.encryption_key.to_bytes().to_vec(),
            outgoing_sms: self.outgoing_sms.lock().unwrap().clone(),
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
        // Keep keys and profile but reset status
        {
            let mut profile = self.my_profile.lock().unwrap();
            profile.status = UserStatus::Offline;
            profile.last_seen = 0;
        }
        let _ = self.save_to_disk();
    }

    // === Chats ===
    pub fn get_chats(&self) -> Vec<Chat> {
        let chats = self.chats.lock().unwrap();
        chats.values().cloned().collect()
    }
    
    // New create_chat logic with potential peer discovery
    pub fn create_chat(&self, participant_pubkey: String) -> Result<Chat, CoreError> {
        let mut chats = self.chats.lock().unwrap();
        for chat in chats.values() {
            if chat.chat_type == ChatType::Private
                && chat.participants.contains(&participant_pubkey)
            {
                return Ok(chat.clone());
            }
        }

        // Try to find contact info locally or via discovery
        // In P2P, we assume user might be offline. But we need their encryption key eventually.
        // If we don't have it, we can't encrypt.
        // For now, assume we got the ID (signing key).
        // If we don't have the encryption key, we can't send encrypted messages.
        // Solution: Create the chat but mark as "Pending Key Exchange"?
        // Or assume the ID string CONTAINS the encryption key? No P2P usually separate.
        // Let's assume for now, discovery finds it or user manually provides it via QR.
        
        let (name, avatar, status) = {
            let contacts = self.contacts.lock().unwrap();
            if let Some(contact) = contacts.get(&participant_pubkey) {
                (contact.name.clone(), contact.avatar_url.clone(), contact.status.clone())
            } else {
                // Not in contacts. Create default.
                (format!("User {}", &participant_pubkey[..8]), None, UserStatus::Offline)
            }
        };

        let id = Uuid::new_v4().to_string();
        let my_id = self.my_profile.lock().unwrap().id.clone();

        let chat = Chat {
            id: id.clone(),
            chat_type: ChatType::Private,
            name,
            avatar_url: avatar,
            unread_count: 0,
            last_message: None,
            participants: vec![my_id, participant_pubkey.clone()],
            transport: TransportMode::Internet, 
        };
        chats.insert(id.clone(), chat.clone());
        
        // Ensure contact exists
        let mut contacts = self.contacts.lock().unwrap();
        if !contacts.contains_key(&participant_pubkey) {
             contacts.insert(participant_pubkey.clone(), Contact {
                 id: participant_pubkey,
                 name: chat.name.clone(),
                 avatar_url: chat.avatar_url.clone(),
                 status,
                 encryption_pubkey: None, // Need to fill this later or via QR
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
        use base64::{Engine as _, engine::general_purpose};

        if text.trim().is_empty() {
            return Err(CoreError::Internal("Empty message".into()));
        }

        let (participants, transport) = {
            let chats = self.chats.lock().unwrap();
            match chats.get(&chat_id) {
                Some(chat) => (chat.participants.clone(), chat.transport.clone()),
                None => return Err(CoreError::Internal("Chat not found".into())),
            }
        };

        let my_id = self.my_profile.lock().unwrap().id.clone();
        let msg_id = Uuid::new_v4().to_string();
        
        // Iterate over participants (Peer to Peer implies sending to each)
        for p in &participants {
            if p == &my_id { continue; }
            
            // Get peer contact to find encryption key
            let contact = {
                let contacts = self.contacts.lock().unwrap();
                contacts.get(p).cloned()
            };
            
            // Core Logic for Encryption Transport
            if transport == TransportMode::Internet || transport == TransportMode::Sms {
                if let Some(contact) = contact {
                    if let Some(enc_key) = contact.encryption_pubkey {
                        // We have key, Encrypt
                        let peer_identity = PeerIdentity::from_strings(&contact.id, &enc_key)
                            .map_err(|e| CoreError::Internal(format!("Invalid peer keys: {}", e)))?;
                            
                        let my_keys = self.identity_keys.lock().unwrap();
                        let encrypted_bytes = encrypt_for_peer(&my_keys, &peer_identity, text.as_bytes())
                            .map_err(|e| CoreError::Internal(format!("Encryption error: {}", e)))?;
                            
                        let encrypted_b64 = general_purpose::STANDARD.encode(&encrypted_bytes);
                        
                        if transport == TransportMode::Sms {
                            if let Some(phone) = contact.phone_number {
                                let mut sms_queue = self.outgoing_sms.lock().unwrap();
                                sms_queue.push(SmsEnvelope {
                                    id: msg_id.clone(),
                                    recipient_phone: phone,
                                    encrypted_payload: encrypted_b64, 
                                });
                            } else {
                                println!("Warning: SMS transport selected but no phone number for contact {}", p);
                            }
                        } else {
                            // Internet P2P logic
                            // Queue for mesh/direct
                        }
                    } else {
                        println!("Warning: No encryption key for peer {}, message stored but not sent securely.", p);
                    }
                }
            }
        }

        let msg = Message {
            id: msg_id.clone(),
            chat_id: chat_id.clone(),
            sender_id: my_id,
            text: text.clone(), // Store plaintext locally
            timestamp: Self::now_ts(),
            status: if transport == TransportMode::Internet { MessageStatus::Sending } else { MessageStatus::PendingSms }, 
            attachments: vec![],
            transport,
        };

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

    // === SMS Management ===
    pub fn poll_outgoing_sms(&self) -> Vec<SmsEnvelope> {
        let queue = self.outgoing_sms.lock().unwrap();
        queue.clone()
    }

    pub fn mark_sms_sent(&self, msg_id: String) {
        {
            let mut queue = self.outgoing_sms.lock().unwrap();
            queue.retain(|sms| sms.id != msg_id);
        }
        // Also update message status if found
        {
            let mut messages_map = self.messages.lock().unwrap();
            for msgs in messages_map.values_mut() {
                for msg in msgs {
                    if msg.id == msg_id {
                        msg.status = MessageStatus::Sent;
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
        let mut contacts = self.contacts.lock().unwrap();
        contacts.insert(pubkey.clone(), Contact {
            id: pubkey,
            name,
            avatar_url: None,
            status: UserStatus::Offline,
            encryption_pubkey: None,
            phone_number: None,
        });
        drop(contacts);
        let _ = self.save_to_disk();
    }
    
    pub fn add_contact_with_phone(&self, pubkey: String, name: String, phone: String) {
        let mut contacts = self.contacts.lock().unwrap();
        contacts.insert(pubkey.clone(), Contact {
            id: pubkey,
            name,
            avatar_url: None,
            status: UserStatus::Offline,
            encryption_pubkey: None, 
            phone_number: Some(phone),
        });
        drop(contacts);
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
    
    pub fn get_network_status(&self) -> NetworkStatus {
        self.network_status.lock().unwrap().clone()
    }
}
