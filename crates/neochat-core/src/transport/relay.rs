//! CDN Relay transport — routes encrypted packets through a Cloudflare Worker (or any HTTP relay).
//! The relay never sees plaintext — it only forwards encrypted blobs between peers.

use crate::models::{User, UserStatus};
use serde::{Deserialize, Serialize};

/// Configuration for the CDN relay endpoint
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RelayConfig {
    /// URL of the relay Worker, e.g. "https://neochat-relay.username.workers.dev"
    pub relay_url: String,
    /// Timeout in seconds for HTTP requests
    pub timeout_secs: u64,
}

impl Default for RelayConfig {
    fn default() -> Self {
        Self {
            relay_url: "https://neochat-relay.dimsimd.workers.dev".to_string(), // Updated to likely correct dev URL or placeholder
            timeout_secs: 10,
        }
    }
}

/// Envelope sent to the relay
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RelayEnvelope {
    /// Sender's public key hash (4 bytes hex) or ID
    pub from: String,
    /// Recipient's public key hash (4 bytes hex) or ID
    pub to: String,
    /// Base64-encoded encrypted payload (E2E, relay can't read)
    pub payload: String,
    /// Message ID for deduplication
    pub message_id: String,
    /// Unix timestamp
    pub timestamp: u64,
}

/// Response from polling the relay for messages
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RelayPollResponse {
    pub messages: Vec<RelayEnvelope>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileUpdate {
    pub id: String,
    pub username: String,
    pub status: UserStatus,
    pub avatar_url: Option<String>,
}

pub struct RelayClient {
    config: RelayConfig,
    client: reqwest::blocking::Client,
}

impl RelayClient {
    pub fn new(config: RelayConfig) -> Self {
        let client = reqwest::blocking::Client::builder()
            .timeout(std::time::Duration::from_secs(config.timeout_secs))
            .build()
            .unwrap_or_default(); // Fallback if build fails
            
        Self { config, client }
    }

    pub fn send(&self, envelope: &RelayEnvelope) -> Result<(), String> {
        let url = format!("{}/send", self.config.relay_url);
        let res = self.client.post(&url)
            .json(envelope)
            .send()
            .map_err(|e| e.to_string())?;

        if !res.status().is_success() {
            return Err(format!("Relay error: {}", res.status()));
        }

        Ok(())
    }

    pub fn poll(&self, user_hash: &str) -> Result<Vec<RelayEnvelope>, String> {
        let url = format!("{}/poll/{}", self.config.relay_url, user_hash);
        let res = self.client.get(&url)
            .send()
            .map_err(|e| e.to_string())?;

        if !res.status().is_success() {
            return Err(format!("Relay error: {}", res.status()));
        }

        let response: RelayPollResponse = res.json().map_err(|e| e.to_string())?;
        Ok(response.messages)
    }
    
    pub fn ack(&self, user_hash: &str, message_id: &str) -> Result<(), String> {
        let url = format!("{}/ack/{}/{}", self.config.relay_url, user_hash, message_id);
        let res = self.client.delete(&url)
            .send()
            .map_err(|e| e.to_string())?;

        if !res.status().is_success() {
            return Err(format!("Relay error: {}", res.status()));
        }
        Ok(())
    }

    pub fn update_profile(&self, user: &User) -> Result<(), String> {
        let url = format!("{}/profile", self.config.relay_url);
        let payload = ProfileUpdate {
            id: user.id.clone(),
            username: user.username.clone(),
            status: user.status.clone(),
            avatar_url: user.avatar_url.clone(),
        };

        let res = self.client.post(&url)
            .json(&payload)
            .send()
            .map_err(|e| e.to_string())?;

        if !res.status().is_success() {
            return Err(format!("Relay error: {}", res.status()));
        }
        Ok(())
    }

    pub fn get_profile(&self, user_id: &str) -> Result<User, String> {
        let url = format!("{}/profile/{}", self.config.relay_url, user_id);
        let res = self.client.get(&url)
            .send()
            .map_err(|e| e.to_string())?;

        if res.status() == 404 {
            return Err("User not found".to_string());
        }
        if !res.status().is_success() {
            return Err(format!("Relay error: {}", res.status()));
        }

        let user: User = res.json().map_err(|e| e.to_string())?;
        Ok(user)
    }
}
