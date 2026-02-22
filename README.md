# 🎵 SpotiStats

> Your personal Spotify listening analytics dashboard — track your music habits, discover trends, and explore your taste in music.

![Spotify Stats](https://img.shields.io/badge/Spotify-Statistics-1DB954?style=for-the-badge&logo=spotify&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)

## ✨ Features

- 🎤 **Top Artists & Tracks** — See your most played artists and songs across different time ranges
- 📊 **Listening Statistics** — Detailed analytics with charts and insights
- 🕐 **Listening History** — Extended history beyond Spotify's 50-track limit
- 📥 **GDPR Data Import** — Import your full streaming history from Spotify's data export
- 🔮 **AI Insights** — Mood analysis, listening patterns, and music DNA
- 👤 **Profile Overview** — Your Spotify profile with personalized stats
- 🌙 **Dark Mode** — Beautiful Spotify-inspired dark theme

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, Recharts |
| **Backend** | Node.js, Express, Prisma ORM |
| **Database** | PostgreSQL (Supabase compatible) |
| **Auth** | OAuth 2.0 + PKCE, JWT in HttpOnly Cookies |
| **Security** | Helmet, Rate Limiting, AES-256-GCM token encryption |
| **Observability** | Prometheus metrics, Sentry error tracking |
| **Resilience** | Circuit breaker, request timeout, jitter backoff |

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database (or [Supabase](https://supabase.com) free tier)
- [Spotify Developer App](https://developer.spotify.com/dashboard)

### 1. Clone & Setup

```bash
git clone https://github.com/izimen/spotistats.git
cd spotistats
```

### 2. Spotify Developer Setup

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new application
3. Add Redirect URI: `http://localhost:5000/auth/callback`
4. Copy your **Client ID** and **Client Secret**

### 3. Backend Configuration

```bash
cd backend

# Install dependencies
npm install

# Optional: Install monitoring packages
npm install prom-client @sentry/node

# Create environment file
cp .env.example .env
```

Edit `.env` with your credentials:
```env
DATABASE_URL="postgresql://..."
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
JWT_SECRET=your_random_32_char_secret
ENCRYPTION_KEY=your_separate_encryption_key
CRON_SECRET_KEY=your_random_cron_secret
FRONTEND_URL=http://localhost:8080
SENTRY_DSN=your_sentry_dsn  # Optional
```

```bash
# Setup database
npx prisma generate
npx prisma migrate dev

# Start server
npm run dev
```

### 4. Frontend Configuration

```bash
cd ../frontend
npm install
npm run dev
```

### 5. Open the App

Visit `http://localhost:8080` and login with Spotify! 🎉

## 📁 Project Structure

```
my-spotify-stats/
├── backend/
│   ├── src/
│   │   ├── controllers/    # Route handlers
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Auth, rate limiting, metrics
│   │   └── routes/         # API endpoints
│   └── prisma/             # Database schema
│
└── frontend/
    └── src/
        ├── pages/          # Main views
        ├── components/     # Reusable UI
        └── api/            # API client
```

## 🔐 API Endpoints

All API endpoints use versioned paths: `/api/v1/*`

> ⚠️ Legacy unversioned `/api/*` routes have been removed. Use `/api/v1/*` only.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/auth/login` | Initiate Spotify OAuth |
| `GET` | `/auth/callback` | OAuth callback handler |
| `GET` | `/auth/me` | Get current user |
| `POST` | `/auth/logout` | End session |
| `GET` | `/api/v1/stats/top-artists` | Top artists |
| `GET` | `/api/v1/stats/top-tracks` | Top tracks |
| `GET` | `/api/v1/stats/listening-history` | Listening history |
| `GET` | `/api/v1/stats/dna` | Music DNA profile |
| `GET` | `/api/v1/stats/prediction` | Listening prediction |
| `GET` | `/api/v1/stats/discovery/roulette` | Music discovery |
| `POST` | `/api/v1/import/upload` | Import GDPR data |
| `GET` | `/metrics` | Prometheus metrics |
| `GET` | `/health` | Health check |

> 📝 **Error Format**: All errors follow [RFC 7807 Problem Details](https://datatracker.ietf.org/doc/html/rfc7807) with `application/problem+json` content-type.

## 🔒 Security

- **Authentication**:
  - OAuth 2.0 with PKCE flow
  - Stateless JWT implementation with automatic rotation
  - HttpOnly, Secure, SameSite=Strict cookies
- **Protection**:
  - **CSRF**: Double Submit Cookie pattern with cryptographic tokens
  - **XSS**: Strict Content Security Policy (CSP) and input sanitization
  - **Rate Limiting**: Per-user adaptive limits (Redis-backed) with jitter
  - **Audit Logging**: Logging of sensitive actions to stdout (Cloud Logging compatible)
- **Resilience**:
  - **Circuit Breaker**: Fail-fast on Spotify API failures
  - **Request Timeout**: 5s timeout on external calls
  - **Backoff with Jitter**: ±50% jitter to prevent thundering herd
- **Data Protection**:
  - AES-256-GCM encryption for stored refresh tokens (separate ENCRYPTION_KEY)
  - GDPR-compliant data export and deletion

> 🛡️ **See also:** [Full Security Policy](./SECURITY.md)

## 🧪 Testing

```bash
cd backend
npm test
npm run test:watch  # Watch mode
```

## 🚢 Deployment

See [GCP_DEPLOYMENT.md](./GCP_DEPLOYMENT.md) for Google Cloud Platform deployment guide with:
- Cloud Run (backend)
- Cloud Build (CI/CD)
- Secret Manager

## 📄 License

MIT

---

<p align="center">
  Built with 💚 using the <a href="https://developer.spotify.com/documentation/web-api">Spotify Web API</a>
</p>
