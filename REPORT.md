# Report: NeoChat Relay Integration

## Overview
This report details the work done to resolve issues with "fake chats", message delivery, and user status sync by implementing a Relay-based transport mechanism.

## Implemented Features

### 1. Relay Transport Layer (`crates/neochat-core/src/transport/relay.rs`)
- Created `RelayClient` using `reqwest` to communicate with a Cloudflare Worker relay.
- Implemented methods for:
  - `send`: Sending encrypted message envelopes.
  - `poll`: Fetching pending messages for the user.
  - `ack`: Acknowledging receipt of messages.
  - `update_profile`: Syncing user profile data (username, avatar, status) to the relay.
  - `get_profile`: looking up user profiles by public key/ID.

### 2. Core Logic Integration (`crates/neochat-core/src/api.rs`)
- **Profile Management**: `register` and `update_profile` now automatically sync the user's profile to the relay.
- **Chat Creation**: `create_chat` now attempts to fetch the participant's profile from the relay if not found locally. This prevents the creation of "fake" chats with unknown users.
- **Message Sending**: `send_message` now pushes messages to the relay for immediate delivery (or store-and-forward).
- **Message Polling**: Added `poll_messages` to fetch new messages from the relay, process them (deduplication), and save them to the local database.

### 3. Tauri Backend (`Desktop/src-tauri/src/lib.rs`)
- Exposed `poll_messages` as a new Tauri command to allow the frontend to trigger message fetching.

### 4. Frontend Integration
- **Service Layer (`Desktop/src/services/TauriService.ts`)**: Added `pollMessages` method.
- **App Component (`Desktop/src/App.tsx`)**: Implemented a global polling interval (every 2 seconds) to check for new messages and update the chat list.
- **Chat Window (`Desktop/src/components/ChatWindow.tsx`)**: Added local polling to refresh the active chat view when new messages arrive.

### 5. Relay Worker (`relay/worker.js`)
- Created a Cloudflare Worker script to handle:
  - Message storage (in KV) with 7-day retention.
  - Profile storage and lookup.
  - secure message polling and acknowledgment.

## Benefits
- **Real-time Delivery**: Messages are now delivered reliably via the relay even if the recipient is offline (store-and-forward).
- **User Discovery**: Users can now be found by ID, and their actual profiles (name, avatar) are displayed.
- **No More "Fake Chats"**: Chats are only created if the user exists on the network (relay).
