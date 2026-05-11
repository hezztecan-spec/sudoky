# 🧩 Летний чемпионат по судоку

Минималистичная чёрно-белая онлайн-платформа для ежедневных судоку. Авторизация — по номеру телефона через OTP в WhatsApp.

## ✨ Возможности

- 🔐 Вход по номеру телефона + OTP в WhatsApp
- 🧩 Ежедневные, еженедельные и бонусные судоку
- ⏱ Серверный таймер + анти-чит
- 🏆 Таблица лидеров в реальном времени (WebSocket)
- 💎 Очки, ранги, ачивки, ежедневные задания
- 📜 История игр и статистика
- 💬 Общий чат (real-time)
- 🛠 Админ-панель
- 🎉 Конфетти при победе
- 📱 Адаптивно, чёрно-белая тема

## 🧱 Архитектура

```
┌────────────────────┐     ┌──────────────────┐     ┌────────────────┐
│  sudoku-web        │     │  sudoku-api      │     │  sudoku-db     │
│  (Render Static)   │◀───▶│  (Render Web)    │◀───▶│  (Render PG)   │
│  React + Vite      │     │  Express + WS    │     │  Postgres 16   │
└────────────────────┘     └──────────▲───────┘     └────────────────┘
                                      │ wss /ws/worker
                                      │
                          ┌───────────▼─────────┐
                          │ WhatsApp-worker     │
                          │ (твой ноут)         │
                          │ whatsapp-web.js     │
                          └─────────────────────┘
```

- **Фронт и бэк** — на Render (бесплатный план).
- **WhatsApp-воркер** — локальный процесс у тебя на ноуте, который отправляет OTP. На сервере не держим, потому что Chromium + WhatsApp Web требуют памяти и стабильной сессии (а на Render Free сервис засыпает).
- Бэк и воркер связаны по WebSocket `/ws/worker` с общим секретом `WORKER_SECRET`.

## 🚀 Деплой на Render

### 1. Запушь репо на GitHub.

### 2. Создай Blueprint на Render

1. https://dashboard.render.com/blueprints → **New Blueprint Instance**
2. Выбери репозиторий. Render прочитает `render.yaml` и предложит создать три сущности:
   - `sudoku-db` (Postgres)
   - `sudoku-api` (Node)
   - `sudoku-web` (Static)

### 3. Заполни переменные окружения в дашборде

**sudoku-api** → Environment:
- `ADMIN_PHONE` — твой номер в формате `+79991234567` (получит права админа при первом входе)

**sudoku-web** → Environment:
- `VITE_API_URL` = `https://sudoku-api-xxxx.onrender.com/api`  *(URL бэка, который выдаст Render)*
- `VITE_WS_URL` = `wss://sudoku-api-xxxx.onrender.com/ws`

### 4. Скопируй WORKER_SECRET

На `sudoku-api` → Environment найди `WORKER_SECRET` (Render сгенерировал сам). Нажми «Show value», скопируй — пригодится воркеру.

### 5. Запусти фронт-билд повторно

После того как вписал `VITE_API_URL` / `VITE_WS_URL`, кликни **Manual Deploy** на `sudoku-web`, чтобы переменные попали в сборку.

### 6. Запусти WhatsApp-воркер на ноуте

```bash
cd whatsapp-worker
cp .env.example .env
```

Впиши в `.env`:
```env
BACKEND_WS=wss://sudoku-api-xxxx.onrender.com/ws/worker
WORKER_SECRET=<тот же, что в Render>
```

```bash
npm install
npm start
```

При первом запуске покажет QR-код — отсканируй его в WhatsApp (Настройки → Связанные устройства → Привязать устройство). Сессия сохранится в `whatsapp-worker/.wwebjs_auth/`.

### 7. Проверь

- Открой `https://sudoku-web-xxxx.onrender.com`
- Введи свой номер → получи код в WhatsApp → войди
- На бэке в логах должно быть `[whatsapp] воркер подключён`

## 🧪 Локально

### DB + бэкенд в Docker
```bash
cp .env.example .env
docker compose up --build
```

### Фронт
```bash
cd frontend
npm install
npm run dev
```

### WhatsApp-воркер
```bash
cd whatsapp-worker
cp .env.example .env
# BACKEND_WS=ws://localhost:4000/ws/worker
# WORKER_SECRET= тот же, что в .env для docker-compose
npm install
npm start
```

## 📚 Структура

```
sudoku-championship/
├── backend/               # Express + WebSocket (Render Web)
├── frontend/              # React + Vite + Tailwind (Render Static)
├── whatsapp-worker/       # Локальный WhatsApp OTP-сервис
├── render.yaml
├── docker-compose.yml
└── README.md
```

## 🔌 REST API (ключевое)

| Метод | Путь                             | Описание                               |
| ----- | -------------------------------- | -------------------------------------- |
| POST  | `/api/auth/send-code`            | Выслать OTP в WhatsApp                 |
| POST  | `/api/auth/verify-code`          | Проверить код, выдать JWT              |
| GET   | `/api/auth/whatsapp-status`      | Статус воркера (ready/offline)         |
| GET   | `/api/me`                        | Профиль                                |
| GET   | `/api/puzzles`                   | Список судоку                          |
| POST  | `/api/puzzles/:id/start`         | Старт попытки                          |
| POST  | `/api/puzzles/:id/submit`        | Отправить решение                      |
| GET   | `/api/leaderboard`               | Топ игроков                            |
| GET   | `/api/chat`                      | История чата                           |
| POST  | `/api/admin/puzzles`             | Добавить судоку (admin)                |

## 🛡 Защита от читов

- Серверная валидация решений
- Серверный `started_at`, клиентский таймер не влияет
- Минимальное время прохождения
- Rate-limit на submit, OTP, чат

## ⚠️ Ограничения

- **Воркер должен быть включён**, чтобы OTP приходили. Выключил ноут — никто не войдёт (кроме уже залогиненных).
- **Render Free засыпает** через 15 минут простоя: первый запрос будет долгим (~30 сек). WebSocket воркера переподключится автоматически.
- **Postgres Free** удаляется через 30 дней — переходи на Starter ($7/мес) для продакшена.
- WhatsApp-автоматизация через `whatsapp-web.js` неофициальна. Для серьёзного проекта — WhatsApp Business Cloud API или Twilio.

## 📄 Лицензия

MIT
