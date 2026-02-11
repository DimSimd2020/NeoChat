# NeoChat — Общие правила, структура и конвенции разработки

## 1. Название проекта
- Полное название: **NeoChat**
- Короткое: NeoChat
- Пакет/namespace: `com.neochat` (или `neochat.com` в зависимости от платформы)
- Иконка/брендинг: пока не определено, но использовать тёмную тему по умолчанию
- Иконка: Находиться в /assets/logo.png (основная иконка приложения, для панели задач,exe и тд, и /assets/logo_clean.png (та же иконка но без фона, можно использовать внутри приложения)
## 2. Основные принципы разработки
- **Максимальная приватность и безопасность** — всё E2EE, ничего в plaintext, минимальные метаданные
- **Полностью peer-to-peer** — никаких собственных серверов, только DHT/bootstrap-ноды публичные
- **Кросс-платформенность** — Desktop (Windows/macOS/Linux) + Android, код максимально шарить
- **Чистота кода** — читаемость > производительность (в разумных пределах)
- **Минимализм** — не добавлять зависимости без крайней необходимости
- **Документация в коде** — каждый публичный модуль/функция имеет doc-comment
- **Ошибки обрабатывать явно** — никаких unwrap/panic в production-коде

## 3. Стек технологий (общий)

### Общее ядро (Rust)
- Язык: Rust stable (2024 edition и выше)
- Сеть: libp2p-rs
- Криптография: ring / sodiumoxide, noise-protocol, openmls (MLS для групп)
- Сериализация: postcard + serde
- Асинхронность: tokio
- Хранение: sled / rusqlite + sqlcipher (encrypted)
- Логирование: tracing + tracing-subscriber (json для production)

### Desktop
- Фреймворк: Tauri 2.x
- UI: HTML/CSS/JS или Svelte / React / Vue (на выбор, пока не определено)

### Android
- Язык ядра: Rust (через cargo-ndk + uniffi)
- UI: Jetpack Compose
- Интеграция: uniffi для вызова Rust из Kotlin
- Bluetooth/Wi-Fi: Android BLE + Nearby Connections API

## 4. Правила чистоты кода и стиля

- **Rustfmt** — обязателен, запускать перед каждым коммитом
- **clippy** — уровень `pedantic` + несколько дополнительных lint'ов отключать только с обоснованием
  ```toml
  # .cargo/config.toml или clippy.toml
  allow = ["missing_docs", "module_name_repetitions"]
  warn = ["pedantic", "nursery", "cargo"]

Именование:
snake_case для переменных, функций, модулей
CamelCase для типов, trait'ов, enum'ов
Константы: SCREAMING_SNAKE_CASE

Модули — один файл = один модуль, не больше 400–500 строк
Функции — не длиннее 40–50 строк (если длиннее → рефакторить)
Комментарии — объяснять «почему», а не «что» (код должен быть самодокументируемым)
Error handling — использовать thiserror + anyhow в нужных местах, никогда unwrap()
Unsafe — только в крайнем случае, с подробным обоснованием в комментарии

6. Структура репозитория (предварительная)
NeoChat/
├── crates/                     # все rust-библиотеки и бинарники
│   ├── neochat-core/           # общее ядро (crypto, network, storage, mailbox)
│   ├── neochat-proto/          # protobuf/postcard схемы
├── Android/ 					# Kotlin + Compose + Gradle проект +  Rust-часть + JNI/uniffi
│-  Desktop/ 					# Desktop проект   Tauri приложение 
├── docs/                       # вся документация
│   ├── architecture.md
│   ├── backend-desktop.md
│   ├── backend-android.md
│   ├── project-rules.md        ← этот файл
│   └── ui-ux-desktop.md
│   └── ui-ux-android.md
├── scripts/                    # вспомогательные скрипты
├── .github/workflows/          # CI
├── rust-toolchain.toml
├── Cargo.toml                  # workspace
└── README.md
7. Процесс работы с задачами и коммитами

Коммиты — Conventional Commits
Примеры:textfeat(core): implement mailbox sync protocol
fix(network): fix NAT hole punching on Android
refactor: extract verification code logic to separate module
docs: update project-rules.md with NeoMCP commands
Веточки — feature/название, fix/название, refactor/что-то
PR — минимум 1 reviewer, все проверки (fmt, clippy, tests) должны проходить

8. Запреты

Не коммитить ключи, пароли, токены
Не использовать unwrap(), expect(), panic!() в основном коде
Не добавлять новые зависимости без обсуждения
Не писать код без тестов для критических частей (crypto, network, mailbox)