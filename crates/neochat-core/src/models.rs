use serde::{Deserialize, Serialize};

// Re-export specific uniffi types if needed, or use them directly.
// Uniffi supports basic types, string, Option, Vec, Result, specific structs (Record), and Objects.

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, uniffi::Enum)]
#[serde(rename_all = "lowercase")]
pub enum UserStatus {
    Online,
    Offline,
    Typing,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, uniffi::Record)]
pub struct User {
    pub id: String, // pubkey_string_base32
    pub username: String,
    pub status: UserStatus,
    pub last_seen: u64, // unix timestamp
    pub avatar_url: Option<String>,
    pub is_registered: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, uniffi::Record)]
pub struct Contact {
    pub id: String, // pubkey
    pub name: String, // local nickname or profile name
    pub avatar_url: Option<String>,
    pub status: UserStatus,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, uniffi::Enum)]
#[serde(rename_all = "lowercase")]
pub enum ChatType {
    Private,
    Group,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, uniffi::Record)]
pub struct ChatLastMessage {
    pub text: String,
    pub timestamp: u64,
    pub sender_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, uniffi::Record)]
pub struct Chat {
    pub id: String, // chat_uuid_v4
    pub chat_type: ChatType,
    pub name: String,
    pub avatar_url: Option<String>,
    pub unread_count: u32,
    pub last_message: Option<ChatLastMessage>,
    pub participants: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, uniffi::Enum)]
#[serde(rename_all = "lowercase")]
pub enum MessageStatus {
    Sending,
    Sent,
    Delivered,
    Read,
    Failed,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, uniffi::Record)]
pub struct Message {
    pub id: String, // msg_uuid_v4
    pub chat_id: String,
    pub sender_id: String,
    pub text: String,
    pub timestamp: u64,
    pub status: MessageStatus,
    pub attachments: Vec<String>,
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
