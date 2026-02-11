# Backend — Desktop (Tauri + Rust)

## Цель
Создать надёжный, производительный и кросс-платформенный бэкенд для десктопного клиента (Windows, macOS, Linux) на базе Rust + Tauri.

## Основной стек
- Язык: Rust (стабильный канал)
- UI-фреймворк: Tauri 2.x (Rust backend + веб-фронтенд)
- Сеть: libp2p-rs
- Криптография: rustls, ring или sodiumoxide / libsodium-sys, noise-protocol
- Групповое шифрование: openmls (Messaging Layer Security)
- Хранение: sled (embedded kv) или rusqlite (с шифрованием sqlcipher)
- Сериализация: postcard (компактный бинарный формат) + serde
- Асинхронность: tokio
- Логирование: tracing + tracing-subscriber

## Основные модули

### 1. network
- libp2p транспорт: TCP + QUIC + WebRTC (для будущей совместимости)
- DHT: Kademlia (для discovery публичных ключей и multiaddr)
- Gossipsub: для рассылки сообщений в группах (topic = group_id)
- NAT traversal: встроенный в libp2p (hole punching)
- Поддержка bootstrap-нод (публичные, не наши)

### 2. crypto
- Identity: Ed25519 (для подписи) + X25519 (для key exchange)
- 1-to-1: Noise Protocol (IK handshake) + Double Ratchet
- Группы: MLS (openmls) — ratcheting, commit & propose, remove/leave
- Верификация первого контакта: HMAC-SHA256 → base32 12-символьный одноразовый код
- Ключи хранятся в зашифрованном виде (пароль / системный keychain)

### 3. storage
- Профиль: публичный ключ, ник (локальный), аватар-хэш
- Контакты: pubkey → verified status, local_nick, safety_number
- Сообщения: зашифрованные blobs + индекс по времени/группе
- Mailbox: очередь исходящих сообщений для оффлайн-пиров (TTL 7 дней)
- Группы: group_id, epoch, members (pubkeys), pending commits

### 4. mailbox & store-forward
- Каждый пир хранит зашифрованные сообщения для других участников групп
- При подключении → sync mailbox (pull-протокол)
- Ограничение: max 1000 сообщений на получателя, max 7 дней

### 5. offline-relay (локальная сеть)
- Bluetooth LE (через btleplug или аналог)
- Wi-Fi Direct / mDNS (для обнаружения в локалке)
- Простой relay-протокол поверх libp2p LAN-транспорта

### 6. events & state
- Actor-модель (или просто tokio tasks + channels)
- Основные события: peer-connected, message-received, group-commit, offline-sync-started

## Важные принципы
- Всё в памяти шифруется и дешифруется только по необходимости
- Никаких plaintext-логов ключей/сообщений
- Автоматическое удаление старых mailbox-сообщений
- Защита от sybil-атак в DHT: минимальная верификация (не PoW на старте)
- Panic wipe: удаление всех ключей и данных по команде

## Планируемые файлы/папки (примерная структура)
src/
├── main.rs
├── network/
│   ├── mod.rs
│   ├── libp2p_ext.rs
│   ├── discovery.rs
│   └── relay.rs
├── crypto/
│   ├── identity.rs
│   ├── noise.rs
│   ├── mls.rs
│   └── verification.rs
├── storage/
│   ├── profile.rs
│   ├── contacts.rs
│   ├── messages.rs
│   └── mailbox.rs
├── events.rs
└── commands.rs          # Tauri commands
## Следующие шаги
1. Настроить libp2p swarm с нужными протоколами
2. Реализовать Noise IK handshake + Double Ratchet
3. Добавить openmls группу (create, join, send)
4. Прототип mailbox sync
