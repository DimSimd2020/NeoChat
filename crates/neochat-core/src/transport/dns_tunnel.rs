//! DNS Tunnel transport — encodes encrypted data in DNS queries/responses.
//! Works even when all internet traffic is blocked (DNS queries almost always pass).
//! Requires a DNS endpoint (own VPS or Cloudflare Worker with DNS support).

use serde::{Deserialize, Serialize};

/// Configuration for DNS tunnel
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DnsTunnelConfig {
    /// Base domain for tunnel, e.g. "chat.neo.example.com"
    pub base_domain: String,
    /// DNS resolver to use (empty = system default)
    pub resolver: String,
    /// Polling interval in seconds
    pub poll_interval_secs: u64,
}

impl Default for DnsTunnelConfig {
    fn default() -> Self {
        Self {
            base_domain: "chat.neo.example.com".to_string(),
            resolver: String::new(),
            poll_interval_secs: 5,
        }
    }
}

/// Encoded DNS message chunk (fits in a single DNS label: max 63 chars)
#[derive(Debug, Clone)]
pub struct DnsChunk {
    /// Sequence number for reassembly
    pub seq: u16,
    /// Total chunks in this message
    pub total: u16,
    /// Base32-encoded encrypted data
    pub data: String,
}

/// Formats an outgoing message as DNS query names
pub fn encode_message_as_dns(
    encrypted_data: &[u8],
    recipient_hash: &str,
    message_id: &str,
    base_domain: &str,
) -> Vec<String> {
    let b32 = base32::encode(base32::Alphabet::RFC4648 { padding: false }, encrypted_data)
        .to_lowercase();

    // DNS label max = 63 chars, we use 50 for data to leave room for metadata
    let chunk_size = 50;
    let chunks: Vec<&str> = b32
        .as_bytes()
        .chunks(chunk_size)
        .map(|c| std::str::from_utf8(c).unwrap())
        .collect();

    let total = chunks.len();

    chunks
        .into_iter()
        .enumerate()
        .map(|(i, chunk)| {
            // Format: {data}.{seq}-{total}.{msg_id}.{recipient}.m.{base_domain}
            format!(
                "{}.{}-{}.{}.{}.m.{}",
                chunk,
                i + 1,
                total,
                &message_id[..8], // short msg id
                recipient_hash,
                base_domain,
            )
        })
        .collect()
}

/// Formats a poll query to check for new messages
pub fn encode_poll_as_dns(my_hash: &str, base_domain: &str) -> String {
    format!("{}.p.{}", my_hash, base_domain)
}

/// Decode a TXT record response back to encrypted bytes
pub fn decode_dns_response(txt_records: &[String]) -> Option<Vec<u8>> {
    // TXT records contain base32-encoded encrypted data, possibly split across records
    let combined: String = txt_records.iter().map(|s| s.trim()).collect();

    if combined.is_empty() {
        return None;
    }

    base32::decode(base32::Alphabet::RFC4648 { padding: false }, &combined.to_uppercase())
}
