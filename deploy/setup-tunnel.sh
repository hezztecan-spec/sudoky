#!/usr/bin/env bash
# Интерактивный сетап Cloudflare Tunnel для sudoku-проекта.
# Требует: cloudflared, домен уже добавлен в Cloudflare, работающий браузер.

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

say() { echo -e "${GREEN}▸${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC}  $1"; }
err() { echo -e "${RED}✗${NC} $1"; }

command -v cloudflared >/dev/null || { err "cloudflared не установлен. brew install cloudflared"; exit 1; }

CF_DIR="$HOME/.cloudflared"
TUNNEL_NAME="sudoku"

# 1) Логин
if [ ! -f "$CF_DIR/cert.pem" ]; then
  say "Открываю браузер для входа в Cloudflare…"
  cloudflared tunnel login
else
  say "cert.pem уже есть, логин пропущен"
fi

# 2) Создание туннеля (если ещё нет)
if cloudflared tunnel list 2>/dev/null | grep -q " $TUNNEL_NAME "; then
  say "Туннель '$TUNNEL_NAME' уже существует"
else
  say "Создаю туннель '$TUNNEL_NAME'…"
  cloudflared tunnel create "$TUNNEL_NAME"
fi

TUNNEL_ID=$(cloudflared tunnel list 2>/dev/null | awk -v name="$TUNNEL_NAME" '$2==name {print $1}')
if [ -z "$TUNNEL_ID" ]; then
  err "Не удалось определить ID туннеля"
  exit 1
fi
say "ID туннеля: $TUNNEL_ID"

# 3) Домен
if [ -z "$1" ]; then
  read -rp "Введи поддомен для туннеля (например sudoku.example.com): " DOMAIN
else
  DOMAIN="$1"
fi
if [ -z "$DOMAIN" ]; then err "Домен не задан"; exit 1; fi

# 4) DNS
say "Привязываю DNS: $DOMAIN → туннель"
cloudflared tunnel route dns "$TUNNEL_NAME" "$DOMAIN" || warn "Запись DNS, возможно, уже есть — это ок"

# 5) Конфиг
CONFIG="$CF_DIR/config.yml"
say "Пишу конфиг $CONFIG"
cat > "$CONFIG" <<EOF
tunnel: $TUNNEL_NAME
credentials-file: $CF_DIR/$TUNNEL_ID.json

ingress:
  - hostname: $DOMAIN
    path: /api/*
    service: http://localhost:4000
  - hostname: $DOMAIN
    path: /ws*
    service: http://localhost:4000
  - hostname: $DOMAIN
    service: http://localhost:5173
  - service: http_status:404
EOF

# 6) Frontend .env
FE_ENV="$(cd "$(dirname "$0")/.." && pwd)/frontend/.env"
say "Обновляю $FE_ENV"
cat > "$FE_ENV" <<EOF
VITE_API_URL=https://$DOMAIN/api
VITE_WS_URL=wss://$DOMAIN/ws
# не забудь добавить сюда VITE_GOOGLE_CLIENT_ID=...
EOF

echo ""
say "Готово! Дальше:"
echo "  1. В Google Cloud Console → OAuth Client → Authorized JavaScript origins добавь:"
echo "       https://$DOMAIN"
echo "  2. Допиши VITE_GOOGLE_CLIENT_ID в frontend/.env и пересобери фронт."
echo "  3. Запусти туннель:"
echo "       cloudflared tunnel run $TUNNEL_NAME"
echo "     или как сервис (auto-start при загрузке):"
echo "       sudo cloudflared service install"
echo ""
say "URL сайта: https://$DOMAIN"
