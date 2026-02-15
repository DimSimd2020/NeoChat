use neochat_core::NeoChatCore;
use std::sync::Arc;

#[test]
fn test_encryption_roundtrip() {
    let core = NeoChatCore::new("enc_test.db".to_string()).unwrap();
    core.register("EncyptUser".to_string()).unwrap();
    
    // Core should be able to load its own saved data
    let key = core.encryption_key.clone();
    // Use private method via pub if possible, but load_from_disk is private.
    // However, NeoChatCore::new(path) already calls load_from_disk.
    
    drop(core);
    
    let core2 = NeoChatCore::new("enc_test.db".to_string()).unwrap();
    assert_eq!(core2.get_my_profile().username, "EncyptUser");
}

#[test]
fn test_invalid_key_fails() {
    // This is hard to test without exposing private methods, 
    // but we can corrupt the key file.
    let path = "corrupt_test.db";
    let core = NeoChatCore::new(path.to_string()).unwrap();
    core.register("User".to_string()).unwrap();
    drop(core);
    
    // Corrupt key
    std::fs::write(format!("{}.key", path), vec![0u8; 32]).unwrap();
    
    // Loading should fail or return default
    let core2 = NeoChatCore::new(path.to_string()).unwrap();
    assert_eq!(core2.get_my_profile().username, "New User"); // Should have reset since load failed
}
