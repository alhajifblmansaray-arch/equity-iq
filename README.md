# EquityIQ

Institutional-grade equity research, with a Wealthsimple-inspired UI.

Type a ticker → get a full research report: snapshot, price chart, technicals
(RSI / MACD / SMA), short interest, news, auto-generated risks, bull/bear
thesis, and a scored verdict.

## Stack

- **Client** — Vite + React 18 + TypeScript + Tailwind + Recharts + lucide-react
- **Server** — Node.js + Express + TypeScript
- **Database** — MongoDB (via Mongoose)
- **Auth** — Passport.js (local + Google OAuth) with express-session + connect-mongo.
  This is the Express-compatible equivalent of NextAuth's "credentials + Google" — same
  UX (email/password + "Continue with Google"), but framework-appropriate for a Vite + Express stack.
- **Market data** — Multi-source with automatic fallback:
  - Massive Market Data (premium, original spec)
  - Finnhub (free real-time quotes + news)
  - Alpha Vantage (free fundamentals)
  - Yahoo Finance (unofficial, no key, broad coverage via `yahoo-finance2`)

## Quick start

```bash
# 1. Install dependencies for both workspaces
npm run install:all

# 2. Configure server env
cp server/.env.example server/.env
# edit server/.env — at minimum, set MONGODB_URI and SESSION_SECRET

# 3. Run both servers (Vite on :5173, Express on :3001)
npm run dev
```

Open <http://localhost:5173>.

## Environment variables (server/.env)

| Var                       | Required | Notes                                                                    |
| ------------------------- | -------- | ------------------------------------------------------------------------ |
| `PORT`                    | no       | Defaults to `3001`.                                                      |
| `MONGODB_URI`             | yes      | e.g. `mongodb://localhost:27017/equity-iq` or an Atlas connection string. |
| `SESSION_SECRET`          | yes      | Any long random string. Used to sign session cookies.                    |
| `CLIENT_ORIGIN`           | no       | Defaults to `http://localhost:5173`. CORS allow-list.                    |
| `GOOGLE_CLIENT_ID`        | no       | If unset, Google sign-in is hidden in the UI.                             |
| `GOOGLE_CLIENT_SECRET`    | no       | Paired with the above.                                                   |
| `GOOGLE_CALLBACK_URL`     | no       | Defaults to `http://localhost:3001/api/auth/google/callback`.            |
| `MASSIVE_API_KEY`         | no       | Premium tier unlocks snapshot, ratios, financials, options.              |
| `FINNHUB_API_KEY`         | no       | Free signup at finnhub.io.                                                |
| `ALPHA_VANTAGE_API_KEY`   | no       | Free signup at alphavantage.co (5 req/min).                                |

If no provider keys are set, the app still works for any S&P-listed ticker
via Yahoo Finance (price history, quote, news). Premium-only fields will
collapse cleanly and the affected sections will hide themselves.

## Project layout

```
equity-iq/
├── package.json              # workspace runner (concurrently)
├── server/                   # Express + TS API
│   ├── src/
│   │   ├── index.ts          # entry
│   │   ├── config/           # db + passport
│   │   ├── models/User.ts
│   │   ├── middleware/auth.ts
│   │   ├── routes/           # auth, research, user
│   │   └── services/         # massive, finnhub, alphaVantage, yahoo, research
│   └── .env.example
└── client/                   # Vite + React + TS
    └── src/
        ├── pages/            # Landing, Login, Signup, Dashboard
        ├── components/       # SearchBar, SnapshotCard, PriceChart, …
        ├── contexts/         # AuthContext
        ├── hooks/            # useResearch
        └── lib/              # api, helpers
```

## Notes on data freshness

- Real-time quotes come from Finnhub when available; otherwise the snapshot is
  derived from the most recent daily bar.
- Charts always include 90 days of daily history; the 1M / 3M toggle slices
  this client-side.
- A small "As of …" pill appears on the snapshot when data is derived rather
  than live.

## Disclaimer

EquityIQ surfaces aggregated public market data and an automated scoring model.
It is **not** investment advice. Do your own research.
