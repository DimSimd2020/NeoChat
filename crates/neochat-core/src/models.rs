use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, uniffi::Enum)]
#[serde(rename_all = "lowercase")]
pub enum UserStatus {
    Online,
    Offline,
    Typing,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, uniffi::Record)]
pub struct User {
    pub id: String, // pubkey_base32 (Signing Key)
    pub username: String,
    pub status: UserStatus,
    pub last_seen: u64,
    pub avatar_url: Option<String>,
    pub encryption_pubkey: Option<String>, // X25519 public key (base32)
    pub is_registered: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, uniffi::Record)]
pub struct Contact {
    pub id: String,
    pub name: String,
    pub avatar_url: Option<String>,
    pub status: UserStatus,
    pub encryption_pubkey: Option<String>,
    pub phone_number: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, uniffi::Enum)]
#[serde(rename_all = "lowercase")]
pub enum ChatType {
    Private,
    Group,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, uniffi::Enum)]
#[serde(rename_all = "lowercase")]
pub enum TransportMode {
    Internet, // Direct / Mesh / P2P
    Sms,      // SMS Fallback
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, uniffi::Record)]
pub struct ChatLastMessage {
    pub text: String,
    pub timestamp: u64,
    pub sender_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, uniffi::Record)]
pub struct Chat {
    pub id: String,
    pub chat_type: ChatType,
    pub name: String,
    pub avatar_url: Option<String>,
    pub unread_count: u32,
    pub last_message: Option<ChatLastMessage>,
    pub participants: Vec<String>,
    pub transport: TransportMode,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, uniffi::Enum)]
#[serde(rename_all = "lowercase")]
pub enum MessageStatus {
    Sending,
    Sent,
    Delivered,
    Read,
    Failed,
    PendingSms,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, uniffi::Record)]
pub struct Message {
    pub id: String,
    pub chat_id: String,
    pub sender_id: String,
    pub text: String, // Now stores ENCRYPTED text (base64) or internal representation? No, frontend needs text. Core stores decrypted.
    pub timestamp: u64,
    pub status: MessageStatus,
    pub attachments: Vec<String>,
    pub transport: TransportMode,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, uniffi::Enum)]
#[serde(rename_all = "lowercase")]
pub enum NetworkStatus {
    Connected,
    Disconnected,
    Connecting,
}

#[derive(Debug, thiserror::Error, uniffi::Error)]
pub enum CoreError {
    #[error("Internal error: {0}")]
    Internal(String),
    #[error("Not implemented")]
    NotImplemented,
    #[error("Invalid argument: {0}")]
    InvalidArgument(String),
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, uniffi::Record)]
pub struct SmsEnvelope {
    pub id: String,
    pub recipient_phone: String,
    pub encrypted_payload: String, // Base64
}
