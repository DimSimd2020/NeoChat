use neochat_core::{MessageStatus, NeoChatCore};

#[test]
fn test_core_initialization() {
    let core = NeoChatCore::new("test.db".to_string()).unwrap();
    let profile = core.get_my_profile();
    assert_eq!(profile.username, "New User");
    assert!(!profile.is_registered);
}

#[test]
fn test_chat_creation() {
    let core = NeoChatCore::new("test.db".to_string()).unwrap();
    let chat = core.create_chat("some_friend".to_string()).unwrap();

    assert_eq!(chat.participants.len(), 2);
    assert!(chat.participants.contains(&"some_friend".to_string()));

    let chats = core.get_chats();
    // Default mock has 0 chats, plus valid new chat makes 1.
    assert_eq!(chats.len(), 1);
}

#[test]
fn test_messaging() {
    let core = NeoChatCore::new("test.db".to_string()).unwrap();
    let chat = core.create_chat("friend".to_string()).unwrap();

    let msg = core
        .send_message(chat.id.clone(), "Hello World".to_string())
        .unwrap();
    assert_eq!(msg.text, "Hello World");
    assert_eq!(msg.status, MessageStatus::Sent);

    let messages = core.get_messages(chat.id.clone(), 10, 0);
    assert_eq!(messages.len(), 1);
    assert_eq!(messages[0].text, "Hello World");
}
