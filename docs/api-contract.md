# NeoChat API Contract & Data Models

Этот документ описывает единый контракт данных и интерфейсов для взаимодествия между Core (Rust) и UI (Android/Desktop).
Все агенты должны строго следовать этим определениям.

## 1. Data Models (JSON / Struct Representation)

### 1.1. User / Contact
```json
{
  "id": "pubkey_string_base32",
  "username": "User Name",
  "status": "online", // online, offline, typing
  "last_seen": 1678886400, // unix timestamp
  "avatar_url": "optional_local_path_or_base64"
}
```

### 1.2. Chat / Group
```json
{
  "id": "chat_uuid_v4",
  "type": "private", // private, group
  "name": "Chat Name",
  "avatar_url": null,
  "unread_count": 2,
  "last_message": {
    "text": "Hello world!",
    "timestamp": 1678886405
  },
  "participants": ["pubkey_1", "pubkey_2"]
}
```

### 1.3. Message
```json
{
  "id": "msg_uuid_v4",
  "chat_id": "chat_uuid_v4",
  "sender_id": "pubkey_string_base32",
  "text": "Hello world!",
  "timestamp": 1678886405,
  "status": "read", // sending, sent, delivered, read, failed
  "attachments": [] // list of file paths or metadata
}
```

## 2. Core API Interface (Rust / Uniffi)

Этот интерфейс должен быть реализован в `crates/neochat-core` и экспортирован через Uniffi.
UI-клиенты (Android/Desktop) должны использовать сгенерированные биндинги или моки, соответствующие этому интерфейсу.

```rust
// Interface definition (pseudo-code / Uniffi styled)

interface NeoChatCore {
    // Initialization
    fn init(storage_path: String) -> Result<void, Error>;
    
    // Auth / Profile
    fn get_my_profile() -> User;
    fn update_profile(name: String, avatar: Option<String>);
    
    // Chats
    fn get_chats() -> Vec<Chat>;
    fn create_chat(participant_pubkey: String) -> Result<Chat, Error>;
    fn delete_chat(chat_id: String);
    
    // Messages
    fn get_messages(chat_id: String, limit: u32, offset: u32) -> Vec<Message>;
    fn send_message(chat_id: String, text: String) -> Result<Message, Error>;
    fn mark_as_read(chat_id: String, message_ids: Vec<String>);
    
    // Network
    fn connect_peer(address: String); // Manual connection
    fn get_network_status() -> NetworkStatus;
}
```

## 3. Mock Data for UI Development

Для параллельной разработки UI, используйте следующие данные (захардкоженные в Mock Repository/Service):

**My Profile:**
- ID: "my_local_pubkey_12345"
- Name: "Me"
- Status: "online"

**Contact:**
- ID: "remote_pubkey_67890"
- Name: "Alice"
- Status: "online"

**Chat:**
- ID: "chat_1"
- Name: "Alice"
- Type: "private"
- Unread: 1

**Message:**
- ID: "msg_1"
- Text: "Hi there!"
- Sender: "remote_pubkey_67890"
- Status: "read"
