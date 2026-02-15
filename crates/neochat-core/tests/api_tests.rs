use neochat_core::{MessageStatus, NeoChatCore};
use std::fs;

fn get_core() -> Arc<NeoChatCore> {
    let id = uuid::Uuid::new_v4().to_string();
    let path = format!("test_{}.db", id);
    NeoChatCore::new(path).unwrap()
}

// Cleanup helper (optional, or just let OS delete them later)
/*
fn cleanup(core: Arc<NeoChatCore>) {
    let _ = fs::remove_file(&core.storage_path);
    let _ = fs::remove_file(format!("{}.key", &core.storage_path));
}
*/

use std::sync::Arc;

#[test]
fn test_core_initialization() {
    let core = get_core();
    let profile = core.get_my_profile();
    assert_eq!(profile.username, "New User");
    assert!(!profile.is_registered);
}

#[test]
fn test_chat_creation() {
    let core = get_core();
    let chat = core.create_chat("some_friend".to_string()).unwrap();

    assert_eq!(chat.participants.len(), 2);
    assert!(chat.participants.contains(&"some_friend".to_string()));

    let chats = core.get_chats();
    assert_eq!(chats.len(), 1);
}

#[test]
fn test_messaging() {
    let core = get_core();
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

#[test]
fn test_group_chat_creation() {
    let core = get_core();
    let participants = vec!["p1".to_string(), "p2".to_string()];
    let chat = core.create_group("My Group".to_string(), participants.clone()).unwrap();

    assert_eq!(chat.name, "My Group");
    // participants + me
    assert_eq!(chat.participants.len(), 3);
    assert!(chat.participants.contains(&"p1".to_string()));
    assert!(chat.participants.contains(&"p2".to_string()));
}

#[test]
fn test_user_search() {
    let core = get_core();
    // In mock, search should return hits for "Alice" (pre-filled)
    let results = core.search_users("Alice".to_string());
    assert!(results.len() > 0);
    assert!(results[0].name.contains("Alice"));
}

#[test]
fn test_profile_update() {
    let core = get_core();
    core.update_profile("Alice".to_string(), Some("data:image/png;base64,...".to_string()));
    
    let profile = core.get_my_profile();
    assert_eq!(profile.username, "Alice");
    assert!(profile.avatar_url.is_some());
}

#[test]
fn test_get_contacts() {
    let core = get_core();
    let contacts = core.get_contacts();
    // Default mock has 2 contacts
    assert_eq!(contacts.len(), 2);
}

#[test]
fn test_invalid_chat_messaging() {
    let core = get_core();
    let result = core.send_message("non_existent_id".to_string(), "fail".to_string());
    assert!(result.is_err());
}

#[test]
fn test_empty_message_rejection() {
    let core = get_core();
    let chat = core.create_chat("friend".to_string()).unwrap();
    let result = core.send_message(chat.id.clone(), "".to_string());
    assert!(result.is_err());
}

#[test]
fn test_multiple_messages_ordering() {
    let core = get_core();
    let chat = core.create_chat("friend".to_string()).unwrap();

    core.send_message(chat.id.clone(), "Msg 1".to_string()).unwrap();
    core.send_message(chat.id.clone(), "Msg 2".to_string()).unwrap();
    core.send_message(chat.id.clone(), "Msg 3".to_string()).unwrap();

    let messages = core.get_messages(chat.id.clone(), 10, 0);
    assert_eq!(messages.len(), 3);
    assert_eq!(messages[0].text, "Msg 1");
    assert_eq!(messages[1].text, "Msg 2");
    assert_eq!(messages[2].text, "Msg 3");
}

#[test]
fn test_pagination() {
    let core = get_core();
    let chat = core.create_chat("friend".to_string()).unwrap();

    for i in 0..15 {
        core.send_message(chat.id.clone(), format!("Msg {:02}", i)).unwrap();
    }

    let page1 = core.get_messages(chat.id.clone(), 10, 0);
    assert_eq!(page1.len(), 10);
    assert_eq!(page1[0].text, "Msg 00");

    let page2 = core.get_messages(chat.id.clone(), 10, 10);
    assert_eq!(page2.len(), 5);
    assert_eq!(page2[0].text, "Msg 10");
}
