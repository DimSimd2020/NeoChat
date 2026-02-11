# План параллельной работы (Multi-Agent Workflow)

Этот план описывает, как организовать работу нескольких агентов одновременно над проектом NeoChat.
**Ключевое правило:** Каждый агент отвечает за свою *изолированную* область и не мешает другим. Все синхронизируются через `docs/api-contract.md`.

## 1. Роли и Ответственности

### Агент A (Core Architect & Rust Developer)
- **Зона ответственности**: `crates/`, `scripts/`, `Cargo.toml`.
- **Задача**: Реализация ядра на Rust.
- **Входные данные**: `docs/project-rules.md`, `docs/backend-desktop.md`, `docs/backend-android.md`, `docs/api-contract.md`.
- **Выходные данные**: Работающая библиотека `neochat-core`, проходящая тесты (`cargo test`), и экспортируемые через Uniffi биндинги.

### Агент B (Android Developer)
- **Зона ответственности**: `Android/`.
- **Задача**: Создание Android-приложения на Kotlin + Jetpack Compose.
- **Входные данные**: `docs/ui-ux-android.md`, `docs/api-contract.md`.
- **Выходные данные**: Компилируемое Android-приложение с Mock-данными (пока ядро не готово) или реальной интеграцией.

### Агент C (Desktop Developer)
- **Зона ответственности**: `Desktop/`.
- **Задача**: Создание Desktop-приложения на Tauri (Rust + Frontend).
- **Входные данные**: `docs/ui-ux-desktop.md`, `docs/api-contract.md`.
- **Выходные данные**: Запускаемое приложение `npm run tauri dev` с Mock-данными.

## 2. Инструкции для запуска (Prompts)

Скопируйте эти промпты в новые сессии Gemini CLI для запуска параллельной работы.

### Промпт для Агента A (Core/Rust):
```text
Ты — Senior Rust Developer, работающий над ядром NeoChat.
Твоя задача: Реализовать базовую структуру `neochat-core` в `crates/neochat-core`.
1. Изучи `docs/project-rules.md` и `docs/api-contract.md`.
2. Создай структуру проекта (lib.rs, modules).
3. Реализуй основные типы данных (Structs/Enums) согласно контракту.
4. Настрой Uniffi для экспорта этих типов.
5. Напиши тесты.
НЕ трогай папки `Android/` и `Desktop/`.
```

### Промпт для Агента B (Android):
```text
Ты — Senior Android Developer.
Твоя задача: Создать UI для NeoChat в папке `Android/`.
1. Изучи `docs/ui-ux-android.md`.
2. Создай новый проект (или используй существующий) с Jetpack Compose.
3. Реализуй экраны: Список чатов, Экран чата, Настройки.
4. Создай `MockRepository`, который возвращает фейковые данные (User, Chat, Message) согласно `docs/api-contract.md`.
НЕ жди готовности Rust-ядра, используй моки.
НЕ трогай папки `crates/` и `Desktop/`.
```

### Промпт для Агента C (Desktop):
```text
Ты — Senior Frontend/Tauri Developer.
Твоя задача: Создать UI для NeoChat в папке `Desktop/`.
1. Изучи `docs/ui-ux-desktop.md`.
2. Настрой Tauri + Vite (React/Svelte/Vue) проект.
3. Реализуй верстку основных экранов (Sidebar, Chat, Settings).
4. Создай `MockService`, симулирующий бэкенд согласно `docs/api-contract.md`.
НЕ жди готовности Rust-ядра, используй моки.
НЕ трогай папки `crates/` и `Android/`.
```

## 3. Процесс слияния (Integration)

Когда агенты завершат свои задачи:
1. **Core**: Агент A публикует рабочую версию `neochat-core`.
2. **Android**: Агент A помогает Агенту B подключить `neochat-core` через `.so` библиотеки и JNI/Uniffi.
3. **Desktop**: Агент A помогает Агенту C подключить `neochat-core` как команду Tauri.

Этот этап (Integration) выполняется *после* того, как UI и Core готовы по отдельности.
