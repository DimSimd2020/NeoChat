use neochat_core::{Chat, Contact, Message, NeoChatCore, TransportMode, User};
use std::sync::Arc;
use tauri::State;

// Define the application state to hold the Core instance
struct AppState {
    core: Arc<NeoChatCore>,
}

// --- Tauri Commands ---

#[tauri::command]
fn get_my_profile(state: State<AppState>) -> User {
    state.core.get_my_profile()
}

#[tauri::command]
fn register_user(state: State<AppState>, username: String) -> Result<User, String> {
    state.core.register(username).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_chats(state: State<AppState>) -> Vec<Chat> {
    state.core.get_chats()
}

#[tauri::command]
fn get_messages(state: State<AppState>, chat_id: String, limit: u32, offset: u32) -> Vec<Message> {
    state.core.get_messages(chat_id, limit, offset)
}

#[tauri::command]
fn send_message(state: State<AppState>, chat_id: String, text: String) -> Result<Message, String> {
    state
        .core
        .send_message(chat_id, text)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn create_chat(state: State<AppState>, pubkey: String) -> Result<Chat, String> {
    state
        .core
        .create_chat(pubkey)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn create_group(state: State<AppState>, name: String, participants: Vec<String>) -> Result<Chat, String> {
    state
        .core
        .create_group(name, participants)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_contacts(state: State<AppState>) -> Vec<Contact> {
    state.core.get_contacts()
}

#[tauri::command]
fn search_users(state: State<AppState>, query: String) -> Vec<Contact> {
    state.core.search_users(query)
}

#[tauri::command]
fn add_contact(state: State<AppState>, pubkey: String, name: String) {
    state.core.add_contact(pubkey, name)
}

#[tauri::command]
fn add_contact_with_phone(state: State<AppState>, pubkey: String, name: String, phone: String) {
    state.core.add_contact_with_phone(pubkey, name, phone)
}

#[tauri::command]
fn set_chat_transport(state: State<AppState>, chat_id: String, mode: TransportMode) -> Result<(), String> {
    state.core.set_chat_transport(chat_id, mode).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_profile(state: State<AppState>, name: String, avatar: Option<String>) {
    state.core.update_profile(name, avatar)
}

#[tauri::command]
fn get_network_info(state: State<AppState>) -> neochat_core::NetworkStatus {
    state.core.get_network_status()
}

#[tauri::command]
fn clear_database(state: State<AppState>) {
    state.core.clear_database()
}

#[tauri::command]
fn poll_messages(state: State<AppState>) -> Result<Vec<Message>, String> {
    state.core.poll_messages().map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize Core with a dummy path (storage logic in core is minimal/mocked for now)
    let core = NeoChatCore::new("neochat.db".to_string()).expect("Failed to init NeoChat Core");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AppState { core }) // Manage the state so commands can access it
        .invoke_handler(tauri::generate_handler![
            get_my_profile,
            register_user,
            get_chats,
            get_messages,
            send_message,
            create_chat,
            create_group,
            get_contacts,
            search_users,
            add_contact,
            add_contact_with_phone,
            set_chat_transport,
            get_network_info,
            update_profile,
            clear_database,
            poll_messages
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_core_integration() {
        let core = NeoChatCore::new("test_integration.db".to_string()).expect("Failed to init core");
        let profile = core.get_my_profile();
        assert_eq!(profile.username, "New User");
        
        let chats = core.get_chats();
        assert!(chats.is_empty()); // Should be empty initially
    }
}

