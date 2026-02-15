use neochat_core::{User, UserStatus};
use serde_json;

#[test]
fn test_user_serialization() {
    let user = User {
        id: "test-id".to_string(),
        username: "Test".to_string(),
        status: UserStatus::Online,
        last_seen: 12345,
        avatar_url: Some("url".to_string()),
        is_registered: true,
    };

    let json = serde_json::to_string(&user).unwrap();
    let deserialized: User = serde_json::from_str(&json).unwrap();

    assert_eq!(user.id, deserialized.id);
    assert_eq!(user.username, deserialized.username);
    assert_eq!(user.status, deserialized.status);
    assert_eq!(user.avatar_url, deserialized.avatar_url);
}

#[test]
fn test_chat_serialization() {
    use neochat_core::{Chat, ChatType};
    let chat = Chat {
        id: "c1".to_string(),
        chat_type: ChatType::Group,
        name: "Group".to_string(),
        avatar_url: None,
        unread_count: 5,
        last_message: None,
        participants: vec!["u1".to_string(), "u2".to_string()],
    };

    let json = serde_json::to_string(&chat).unwrap();
    let deserialized: Chat = serde_json::from_str(&json).unwrap();
    assert_eq!(chat.id, deserialized.id);
    assert_eq!(chat.unread_count, deserialized.unread_count);
    assert_eq!(chat.participants.len(), 2);
}
