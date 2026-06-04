#!/usr/bin/env bash
set -euo pipefail

echo "▶ Installing workspace dependencies…"
npm install --no-audit --no-fund --silent
npm install --prefix server --no-audit --no-fund --silent
npm install --prefix client --no-audit --no-fund --silent

ENV_FILE=server/.env
if [ ! -f "$ENV_FILE" ]; then
  echo "▶ Creating $ENV_FILE with sane Codespaces defaults…"
  SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
  cat > "$ENV_FILE" <<EOF
MONGODB_URI=mongodb://localhost:27017/equity-iq
SESSION_SECRET=$SECRET
PORT=3001
CLIENT_ORIGIN=http://localhost:5173
NODE_ENV=development

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback

MASSIVE_API_KEY=
FINNHUB_API_KEY=
ALPHA_VANTAGE_API_KEY=
TWELVE_DATA_API_KEY=
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=
EOF
fi

echo "✓ Setup complete. Run 'npm run dev' from the repo root to start both servers."
