
//! Bluetooth/WiFi mesh transport — store-and-forward P2P mesh networking.
//! Messages hop between NeoChat devices via BLE/WiFi Direct until they reach the recipient.

use serde::{Deserialize, Serialize};

/// A packet designed to be relayed through the mesh network
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MeshPacket {
    /// Unique message ID (UUID) for deduplication
    pub message_id: String,
    /// First 4 bytes of recipient's pubkey hash — enough for routing, preserves privacy
    pub recipient_hash: String, // hex, e.g. "a1b2c3d4"
    /// E2E encrypted payload — only the final recipient can decrypt
    pub encrypted_payload: Vec<u8>,
    /// Hop counter — decremented at each relay, dropped at 0
    pub ttl: u8,
    /// Unix timestamp — packets older than 7 days are garbage-collected
    pub created_at: u64,
}

impl MeshPacket {
    pub const MAX_TTL: u8 = 20;
    pub const MAX_AGE_SECS: u64 = 7 * 24 * 3600; // 7 days
    pub const MAX_STORE_BYTES: usize = 50 * 1024 * 1024; // 50 MB

    pub fn is_expired(&self, now: u64) -> bool {
        now.saturating_sub(self.created_at) > Self::MAX_AGE_SECS
    }

    pub fn is_alive(&self) -> bool {
        self.ttl > 0
    }

    /// Decrement TTL for forwarding
    pub fn forward(&mut self) {
        self.ttl = self.ttl.saturating_sub(1);
    }
}

/// BLE advertisement data for NeoChat mesh discovery
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MeshBeacon {
    /// Protocol version
    pub version: u8,
    /// First 4 bytes of this node's pubkey hash
    pub node_hash: String,
    /// How many packets this node is carrying (for prioritization)
    pub packet_count: u32,
}

/// Result of a mesh sync between two devices
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MeshSyncResult {
    /// Packets received from the peer
    pub received: u32,
    /// Packets sent to the peer
    pub sent: u32,
    /// Peer's node hash
    pub peer_hash: String,
}

/// Local mesh packet store — lives on each device
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct MeshStore {
    /// Packets we're carrying for other users
    pub packets: Vec<MeshPacket>,
    /// Message IDs we've already seen (for dedup)
    pub seen_ids: Vec<String>,
}

impl MeshStore {
    /// Add a packet if we haven't seen it before
    pub fn accept_packet(&mut self, packet: MeshPacket) -> bool {
        if self.seen_ids.contains(&packet.message_id) {
            return false;
        }
        if !packet.is_alive() {
            return false;
        }
        self.seen_ids.push(packet.message_id.clone());
        self.packets.push(packet);
        self.gc();
        true
    }

    /// Get packets that a peer needs (not in their seen list)
    pub fn get_packets_for_sync(&self, peer_seen: &[String]) -> Vec<MeshPacket> {
        self.packets
            .iter()
            .filter(|p| !peer_seen.contains(&p.message_id) && p.is_alive())
            .cloned()
            .collect()
    }

    /// Garbage collect expired packets and trim to size limit
    pub fn gc(&mut self) {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();

        self.packets.retain(|p| !p.is_expired(now) && p.is_alive());

        // Trim seen_ids to last 10000
        if self.seen_ids.len() > 10_000 {
            let drain = self.seen_ids.len() - 10_000;
            self.seen_ids.drain(0..drain);
        }

        // Trim packets by total size
        let mut total_size: usize = 0;
        self.packets.retain(|p| {
            total_size += p.encrypted_payload.len();
            total_size <= MeshPacket::MAX_STORE_BYTES
        });
    }

    /// Extract packets destined for this user
    pub fn extract_my_packets(&mut self, my_hash: &str) -> Vec<MeshPacket> {
        let (mine, others): (Vec<_>, Vec<_>) = self
            .packets
            .drain(..)
            .partition(|p| p.recipient_hash == my_hash);
        self.packets = others;
        mine
    }
}
