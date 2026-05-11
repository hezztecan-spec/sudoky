# 🧩 Летний чемпионат по судоку

Минималистичная чёрно-белая онлайн-платформа для ежедневных судоку. Вход только через Google.

## ✨ Возможности

- 🔐 Авторизация только через Google (Google Identity Services)
- 🧩 Ежедневные, еженедельные и бонусные судоку
- ⏱ Серверный таймер + анти-чит (минимальное время прохождения)
- 🏆 Таблица лидеров в реальном времени (WebSocket)
- 💎 Очки, ранги, ачивки, ежедневные задания
- 📜 История игр и статистика в профиле
- 💬 Общий чат (real-time)
- 🛠 Админ-панель для добавления новых судоку
- 🎉 Конфетти при победе
- 📱 Адаптивно под ПК и телефон, чёрно-белая тема

## 🧱 Стек

- **Frontend:** React 18 + Vite + Tailwind + Zustand
- **Backend:** Node.js 20 + Express + pg + ws + JWT + google-auth-library
- **DB:** PostgreSQL 16
- **Infra:** Docker + docker-compose

## 🔑 Google OAuth — обязательный шаг

1. Зайди в [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Создай **OAuth 2.0 Client ID** типа *Web application*.
3. В **Authorized JavaScript origins** добавь:
   - `http://localhost:5173`
   - (прод: твой домен)
4. Скопируй **Client ID** в `.env`:

```env
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
```

Если хочешь сделать себя админом: в `.env` укажи свой Gmail в `ADMIN_EMAIL` и войди один раз через Google, затем перезапусти сид (`npm run seed` или перезапуск docker).

## 🚀 Быстрый старт (Docker)

```bash
git clone <repo>
cd sudoku-championship
cp .env.example .env
# впиши GOOGLE_CLIENT_ID, VITE_GOOGLE_CLIENT_ID, ADMIN_EMAIL
docker compose up --build
```

- Frontend: http://localhost:5173
- API: http://localhost:4000/api
- WebSocket: ws://localhost:4000/ws

## 🧪 Локально без Docker

### Backend
```bash
cd backend
cp .env.example .env   # впиши GOOGLE_CLIENT_ID и DATABASE_URL
npm install
npm run migrate
npm run seed
npm run dev
```

### Frontend
```bash
cd frontend
VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com npm run dev
```

## 📚 Структура

```
sudoku-championship/
├── backend/
│   ├── src/
│   │   ├── routes/        # auth (google), users, puzzles, leaderboard, chat, admin ...
│   │   ├── middleware/    # auth, admin
│   │   ├── utils/         # sudoku, ranks, achievements
│   │   ├── migrations/    # SQL
│   │   ├── db.js
│   │   ├── ws.js
│   │   └── index.js
│   └── package.json
├── frontend/
│   └── src/
│       ├── components/    # SudokuGrid, NumberPad, Navbar, GoogleButton, Timer, Confetti
│       ├── pages/         # Home, Login, PuzzleList, PuzzlePlay, Leaderboard, Profile, Chat, Admin, PublicProfile
│       ├── store.js
│       ├── api.js
│       └── useWs.js
├── docker-compose.yml
└── README.md
```

## 🔌 REST API (ключевое)

| Метод | Путь                      | Описание                               |
| ----- | ------------------------- | -------------------------------------- |
| POST  | `/api/auth/google`        | Логин через Google ID token            |
| GET   | `/api/me`                 | Текущий профиль                        |
| GET   | `/api/users/:id`          | Публичный профиль                      |
| GET   | `/api/puzzles`            | Список судоку                          |
| GET   | `/api/puzzles/:id`        | Судоку (без решения)                   |
| POST  | `/api/puzzles/:id/start`  | Старт попытки (серверный таймер)       |
| POST  | `/api/puzzles/:id/submit` | Отправить решение                      |
| GET   | `/api/leaderboard`        | Топ игроков                            |
| GET   | `/api/achievements`       | Ачивки                                 |
| GET   | `/api/daily-tasks`        | Задания дня                            |
| GET   | `/api/chat`               | История чата                           |
| POST  | `/api/chat`               | Отправить сообщение                    |
| POST  | `/api/admin/puzzles`      | Добавить судоку (admin)                |
| GET   | `/api/admin/stats`        | Статистика (admin)                     |

## 🛡 Защита от читов

- Серверная валидация решений
- Серверный `started_at`, клиентский таймер не влияет
- Минимальное время прохождения на каждое судоку
- Rate-limit на submit и чат

## 🌍 Деплой: Netlify (фронт) + Render (бэк + Postgres)

### Шаг 1. Бэкенд + БД на Render

1. Запушь репозиторий на GitHub.
2. Открой https://dashboard.render.com/blueprints → **New Blueprint Instance** → выбери репозиторий.
3. Render прочитает `render.yaml` и создаст два сервиса: Postgres `sudoku-db` и web-сервис `sudoku-api`.
4. После создания открой `sudoku-api` → Environment → добавь значения:
   - `GOOGLE_CLIENT_ID` — твой Google OAuth Client ID
   - `ADMIN_EMAIL` — твой Gmail (станет админом)
5. Дождись деплоя. URL бэка будет вида `https://sudoku-api.onrender.com`.
6. Проверь: открой `https://sudoku-api.onrender.com/api/health` — должно вернуть JSON с `ok: true`.

### Шаг 2. Фронт на Netlify

1. https://app.netlify.com → **Add new site → Import from Git** → выбери тот же репозиторий.
2. Netlify прочитает `frontend/netlify.toml` — Base `frontend`, Publish `frontend/dist`.
3. В **Site settings → Environment variables** добавь:
   - `VITE_API_URL` = `https://sudoku-api.onrender.com/api`
   - `VITE_WS_URL` = `wss://sudoku-api.onrender.com/ws`
   - `VITE_GOOGLE_CLIENT_ID` = твой Google OAuth Client ID
4. **Deploy**. Получишь URL типа `https://твой-проект.netlify.app`.

### Шаг 3. Google OAuth

В [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials) открой свой OAuth Client и в **Authorized JavaScript origins** добавь:
- `https://твой-проект.netlify.app`
- (локально оставь `http://localhost:5173`)

### Нюансы бесплатного плана

- **Render Free** усыпляет web-сервис после 15 минут простоя: первый запрос холодный (~30 сек). Postgres free живёт 30 дней, потом удаляется.
- **Netlify Free** — 100 ГБ трафика/мес, больше чем хватит для демо.

Для продакшена — возьми Render Starter ($7/мес) для бэка и сохрани Netlify Free для фронта.

## 📄 Лицензия

MIT
