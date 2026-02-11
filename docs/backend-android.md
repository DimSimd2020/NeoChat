# Backend — Android (Kotlin / Rust через JNI или чистый Rust + Kotlin Multiplatform)

## Цель
Создать эффективный бэкенд для Android, максимально переиспользуя код с Desktop-версией, но учитывая особенности мобильной платформы (battery, doze, background, Bluetooth).

## Основной стек (вариант 2026)
Вариант A (рекомендуемый) — Rust + Kotlin JNI / uniffi  
Вариант B — Kotlin Multiplatform + Ktor + multiplatform-libp2p (если появится стабильная)

- Язык ядра: Rust (через cargo-ndk + uniffi)
- UI: Jetpack Compose
- Сеть: libp2p-rs (компилируется под Android)
- Криптография: то же, что на десктопе (ring, noise, openmls)
- Хранение: Jetpack DataStore (preferences) + Room (sqlite) + SQLCipher
- Bluetooth: Android Bluetooth LE (GATT + advertising)
- Wi-Fi: Nearby Connections API или Wi-Fi Aware (если доступно)

## Основные модули (аналогично десктопу)

### 1. network
- libp2p: TCP + QUIC (интернет), Bluetooth (через btleplug или custom transport)
- mDNS + Nearby Connections для локального обнаружения
- Gossipsub для групп
- DHT: только при наличии интернета

### 2. crypto
- Те же примитивы: Ed25519, X25519, Noise, MLS, Double Ratchet
- Верификация 12-значным кодом (base32)
- Android Keystore для хранения master-ключа (strongbox если доступно)

### 3. storage
- Encrypted SharedPreferences / Jetpack Security для профиля и ключей
- Room DB (SQLCipher) для сообщений, контактов, групп
- Mailbox: отдельная таблица с TTL и лимитом размера

### 4. offline / mesh
- Bluetooth LE Mesh-подобный relay (advertising + GATT)
- Nearby Connections API как fallback (очень эффективно для локальной сети)
- Автоматический sync при появлении в зоне видимости

### 5. background & battery
- WorkManager для периодической синхронизации mailbox (если интернет)
- Foreground Service для Bluetooth-сканирования и relay (с уведомлением)
- Doze / App Standby — минимизировать wake-up
- Push-подобная доставка через Bluetooth / Wi-Fi при наличии пиров

### 6. permissions
- BLUETOOTH, BLUETOOTH_ADMIN, BLUETOOTH_CONNECT, BLUETOOTH_SCAN
- ACCESS_FINE_LOCATION (для BLE)
- NEARBY_WIFI_DEVICES (Android 12+)
- INTERNET
- FOREGROUND_SERVICE

## Отличия от Desktop

- Более агрессивное управление энергопотреблением
- Bluetooth — основной транспорт в оффлайне
- Mailbox sync происходит при каждом запуске приложения и по событиям (peer discovered)
- Ограничение размера кэша сообщений (например, 500 МБ)
- Биометрия / PIN для открытия приложения

## Планируемая структура (Rust-часть)
android-rust/
├── src/
│   ├── lib.rs
│   ├── network/
│   ├── crypto/
│   ├── storage/
│   └── uniffi_api.rs     # uniffi экспорт в Kotlin
└── uniffi.toml
Kotlin-часть — обычный Android-проект с Compose + вызовы Rust через uniffi.

## Следующие шаги
1. Скомпилировать libp2p-rs под android-arm64
2. Настроить uniffi для экспорта основных функций
3. Реализовать Bluetooth LE discovery и relay
4. Протестировать mailbox sync в локальной сети
