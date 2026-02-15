
use x25519_dalek::{StaticSecret, PublicKey as X25519PublicKey};
use ed25519_dalek::{SigningKey as EdSigningKey, VerifyingKey as EdVerifyingKey, Signer, Verifier, Signature};
use chacha20poly1305::{ChaCha20Poly1305, Key, Nonce};
use chacha20poly1305::aead::{Aead, NewAead};
use hkdf::Hkdf;
use sha2::Sha256;
use rand::rngs::OsRng;
use base32::Alphabet;
use anyhow::{Result, Context, anyhow};
use std::fmt;

const ENCRYPTION_SALT: &[u8] = b"NeoChat_P2P_Encryption_Salt_v1";

/// KeyPair managing both Signing (Identity) and Encryption (PreKey)
#[derive(Debug)]
pub struct IdentityKeys {
    pub signing_key: EdSigningKey,
    pub encryption_key: StaticSecret,
}

impl IdentityKeys {
    pub fn generate() -> Self {
        let mut csprng = OsRng;
        let signing_key = EdSigningKey::generate(&mut csprng);
        let encryption_key = StaticSecret::random_from_rng(&mut csprng);
        
        Self {
            signing_key,
            encryption_key,
        }
    }

    pub fn signing_public(&self) -> EdVerifyingKey {
        self.signing_key.verifying_key()
    }

    pub fn encryption_public(&self) -> X25519PublicKey {
        X25519PublicKey::from(&self.encryption_key)
    }
    
    // Serialization helpers (base32)
    pub fn id_string(&self) -> String {
        base32::encode(Alphabet::RFC4648 { padding: false }, self.signing_public().as_bytes())
    }
    
    pub fn encryption_pub_string(&self) -> String {
        base32::encode(Alphabet::RFC4648 { padding: false }, self.encryption_public().as_bytes())
    }
}

pub struct PeerIdentity {
    pub signing_key: EdVerifyingKey,
    pub encryption_key: X25519PublicKey,
}

impl PeerIdentity {
    pub fn from_strings(id_str: &str, enc_key_str: &str) -> Result<Self> {
        let id_bytes = base32::decode(Alphabet::RFC4648 { padding: false }, id_str)
            .ok_or_else(|| anyhow!("Invalid Base32 ID"))?;
        let enc_bytes = base32::decode(Alphabet::RFC4648 { padding: false }, enc_key_str)
            .ok_or_else(|| anyhow!("Invalid Base32 Encryption Key"))?;
            
        let signing_key = EdVerifyingKey::from_bytes(&id_bytes.try_into().map_err(|_| anyhow!("Invalid ID length"))?)
            .map_err(|e| anyhow!("Invalid Ed25519 key: {}", e))?;
            
        let encryption_key = X25519PublicKey::from(enc_bytes.try_into().map_err(|_| anyhow!("Invalid X25519 length"))?);
        
        Ok(Self {
            signing_key,
            encryption_key,
        })
    }
}

/// Encrypts a message for a specific peer (P2P Envelope)
/// 1. Generates Ephemeral Keypair (E)
/// 2. Derives Shared Secret = ECDH(E_priv, Peer_pub)
/// 3. Derives Key = HKDF(Shared Secret)
/// 4. Encrypts payload with ChaCha20Poly1305
/// 5. Signs (E_pub + Ciphertext) with Identity Key
/// Output: [E_pub (32)][Signature (64)][Nonce (12)][Ciphertext]
pub fn encrypt_for_peer(my_identity: &IdentityKeys, peer: &PeerIdentity, plaintext: &[u8]) -> Result<Vec<u8>> {
    let mut csprng = OsRng;
    let ephemeral_secret = StaticSecret::random_from_rng(&mut csprng);
    let ephemeral_public = X25519PublicKey::from(&ephemeral_secret);
    
    let shared_secret = ephemeral_secret.diffie_hellman(&peer.encryption_key);
    
    let hkdf = Hkdf::<Sha256>::new(Some(ENCRYPTION_SALT), shared_secret.as_bytes());
    let mut key = [0u8; 32];
    hkdf.expand(b"NeoChat_Message_Key", &mut key).map_err(|_| anyhow!("HKDF failed"))?;
    
    let cipher = ChaCha20Poly1305::new(Key::from_slice(&key));
    // Use random nonce for every message since key is ephemeral (unique per message due to random ephemeral key)
    // Actually, distinct ephemeral key guarantees distinct shared secret, so nonce can be fixed or random.
    // Random avoids any risk.
    let nonce = Nonce::from([0u8; 12]); // OR generate random. Since key is unique per msg, 0 nonce is safe.
    // Wait, reusing nonce with same key is fatal. Key is derived from ephemeral ECDH.
    // Ephemeral key pair is random per message. So shared secret is random per message.
    // So Key is unique per message.
    // So Nonce = 0 is safe.
    
    let ciphertext = cipher.encrypt(&nonce, plaintext)
        .map_err(|e| anyhow!("Encryption failed"))?;
        
    // Sign the ephemeral public key to prove sender identity
    // We sign (Ephemeral PubKey + Ciphertext) to bind them.
    let mut dump = Vec::new();
    dump.extend_from_slice(ephemeral_public.as_bytes());
    dump.extend_from_slice(&ciphertext);
    
    let signature = my_identity.signing_key.sign(&dump);
    
    let mut envelope = Vec::new();
    envelope.extend_from_slice(ephemeral_public.as_bytes()); // 32
    envelope.extend_from_slice(&signature.to_bytes());       // 64
    envelope.extend_from_slice(&ciphertext);                 // Rest
    
    Ok(envelope)
}

/// Decrypts a message from a peer
/// Input: [E_pub (32)][Signature (64)][Ciphertext]
pub fn decrypt_from_peer(my_identity: &IdentityKeys, sender_id_pub: &EdVerifyingKey, envelope: &[u8]) -> Result<Vec<u8>> {
    if envelope.len() < 32 + 64 {
        return Err(anyhow!("Envelope too short"));
    }
    
    let (ephemeral_bytes, rest) = envelope.split_at(32);
    let (signature_bytes, ciphertext) = rest.split_at(64);
    
    let ephemeral_public = X25519PublicKey::from(
        <[u8; 32]>::try_from(ephemeral_bytes).expect("slice split success")
    );
    
    let signature = Signature::from_bytes(
        <[u8; 64]>::try_from(signature_bytes).expect("slice split success")
    );
    
    // 1. Verify Signature
    let mut signed_data = Vec::new();
    signed_data.extend_from_slice(ephemeral_bytes);
    signed_data.extend_from_slice(ciphertext);
    
    sender_id_pub.verify(&signed_data, &signature)
        .map_err(|e| anyhow!("Signature verification failed: {}", e))?;
        
    // 2. Derive Shared Secret
    let shared_secret = my_identity.encryption_key.diffie_hellman(&ephemeral_public);
    
    let hkdf = Hkdf::<Sha256>::new(Some(ENCRYPTION_SALT), shared_secret.as_bytes());
    let mut key = [0u8; 32];
    hkdf.expand(b"NeoChat_Message_Key", &mut key).map_err(|_| anyhow!("HKDF failed"))?;
    
    let cipher = ChaCha20Poly1305::new(Key::from_slice(&key));
    let nonce = Nonce::from([0u8; 12]);
    
    let plaintext = cipher.decrypt(&nonce, ciphertext)
        .map_err(|e| anyhow!("Decryption failed"))?;
        
    Ok(plaintext)
}
