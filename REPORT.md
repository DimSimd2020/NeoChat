# Report: P2P Architecture Transition

## Overview
Based on user feedback, the centralized Relay server implementation was **removed** to adhere to the core "serverless" P2P philosophy of NeoChat.

## Key Changes

### 1. Removal of Centralized Relay
- **Deleted**: `crates/neochat-core/src/transport/relay.rs` and the `relay/` directory (Cloudflare Worker).
- **Modified**: `api.rs` to remove all HTTP calls to the relay. User profiles are no longer fetched from a central server.

### 2. Implementation of Decentralized Transport Stubs
- **Added `discovery.rs`**: Created a `PeerDiscovery` module to handle peer lookups (currently a placeholder for future DHT integration).
- **Updated `mesh.rs`**: Refined the Mesh transport logic for store-and-forward messaging (BLE/WiFi).

### 3. Solution for "Fake Chats" (Without Server)
- **Local Validation**: Instead of verifying user existence against a server, we now strictly validate the format of the Public Key/ID locally.
- **Offline First**: Chats created with unknown users are marked as "Offline/Pending" until a direct or mesh connection is established. This prevents the UI from breaking while maintaining decentralization.

### 4. Direct Messaging Logic
- **`create_chat`**: Now defaults to `TransportMode::Internet` (Direct P2P) or `Mesh` without requiring server confirmation.
- **`send_message`**: Messages are queued locally with status `Sending` until a P2P acknowledgment is received (simulated/future implementation).

## Repository Status
- **Clean History**: Successfully cleaned up large binary files (`target/`) from git history.
- **Pushed**: Changes are pushed to `origin/master` (commit `fdb8a41`).

# Report: Security & SMS Implementation

## 1. High-Grade E2E Encryption
Implemented a robust cryptographic layer based on modern primitives:
- **Identity Keys**: Ed25519 (Signing) for unforgeable user identity.
- **Encryption Keys**: X25519 (Diffie-Hellman) for secure key agreement.
- **Transport Encryption**: ChaCha20-Poly1305 (Authenticated Encryption) for message confidentiality and integrity.
- **Perfect Forward Secrecy (Sender)**: Ephemeral keys are used for every message sending.
- **Offline Envelope**: Messages are encrypted using the recipient's static public key, allowing delivery even if the recipient is offline (Store-and-Forward compatible).

## 2. SMS Transport Logic
- **Queueing System**: Implemented an outgoing SMS queue in the core.
- **Polling API**: Exposed `poll_outgoing_sms` and `mark_sms_sent` commands to allow the host application (Android/Tauri) to fetch pending SMS and send them using OS-native APIs.
- **Encryption over SMS**: SMS payloads are encrypted (same protocol as P2P) and Base64 encoded before being queued. This ensures "Special Services" cannot read SMS content without the recipient's private key.

## 3. Key Management
- **Generation**: Check for existing keys on startup; generate new Ed25519/X25519 keypairs if missing.
- **Storage**: Keys are stored on disk, encrypted with the local database encryption key (AES-256-GCM).

## 4. Dependencies
Added `x25519-dalek`, `ed25519-dalek`, `chacha20poly1305`, `hkdf`, `sha2`, `base64`.
