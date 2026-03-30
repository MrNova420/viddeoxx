# Innerflect — Full Project Guide

Everything you need to understand, run, control, and deploy Innerflect.

---

## Table of Contents

1. [What is Innerflect?](#what-is-innerflect)
2. [Architecture at a Glance](#architecture)
3. [Quick Start](#quick-start)
4. [Deployment Options](#deployment-options)
5. [Android Server Guide](#android-server)
6. [Environment Variables](#environment-variables)
7. [Control Commands](#control-commands)
8. [Database](#database)
9. [Security Model](#security-model)
10. [API Reference](#api-reference)
11. [Troubleshooting](#troubleshooting)

---

## What is Innerflect? {#what-is-innerflect}

Innerflect is a **privacy-first AI therapy companion** that runs 100% in the browser.

- The AI model downloads to **your device** and runs via WebGPU — no conversation ever leaves your device
- Optional backend provides: user accounts, chat history, session limits, Pro upgrades
- Built for worldwide private use — no tracking, no ad networks, no third-party AI APIs

**Who is it for?**  
Anyone who wants a private, always-available space to process thoughts, vent, reflect, or work through life's challenges — with a compassionate AI that actually listens and maintains full conversation memory.

---

## Architecture {#architecture}

```
┌────────────────────────────────────────────────────────┐
│                     USER'S BROWSER                     │
│                                                        │
│  React SPA (Netlify CDN)  ←──────────────────────────  │
│  WebLLM + WebGPU (AI runs 100% locally in browser)    │
│  No conversation data ever sent to any server          │
└───────────────────────┬────────────────────────────────┘
                        │  Auth / History / Limits only
                        ▼
┌───────────────────────────────────────────────────────┐
│              OPTIONAL BACKEND (your device)            │
│                                                        │
│  FastAPI  →  PostgreSQL (local OR Neon cloud)         │
│  Caddy reverse proxy                                   │
│  Exposed via Tailscale Funnel (recommended) or ngrok  │
└───────────────────────────────────────────────────────┘
```

**Key principle:** The AI chat itself is 100% private. The backend only handles account management, session tracking, and history storage — never the content of your AI conversations (except encrypted history you explicitly save as a Pro user).

---

## Quick Start {#quick-start}

### Netlify-only (frontend, no backend)

```bash
# 1. Clone
git clone https://github.com/MrNova420/innerflect
cd innerflect

# 2. Build
npm install && npm run build

# 3. Deploy www/ to Netlify
# Push to GitHub → connect repo at app.netlify.com → publish dir: www
```

That's it. The AI chat works immediately — no backend required.

### With Android backend (full features)

```bash
# On your Android in Termux:
git clone https://github.com/MrNova420/innerflect ~/public-site
bash ~/public-site/termux-setup/setup-termux.sh
```

See [Android Server Guide](#android-server) for full details.

---

## Deployment Options {#deployment-options}

| Option | Frontend | Backend | Database | Cost |
|--------|----------|---------|----------|------|
| **Netlify-only** | Netlify CDN | None | None | Free |
| **Netlify + Android** | Netlify CDN | Android device | Local PostgreSQL | Free |
| **Netlify + Neon** | Netlify CDN | Android/PC device | Neon cloud PostgreSQL | Free |
| **Full self-host** | Android/PC | Android/PC | Local PostgreSQL | Free |

### Netlify + Neon (recommended for reliability)

Neon gives you a free cloud PostgreSQL database that persists even when your device is offline.

1. Sign up at [neon.tech](https://neon.tech) — free tier includes 0.5 GB storage
2. Create a project, copy the connection string (looks like `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`)
3. Add to `config/.env`:
   ```
   DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. The backend auto-detects Neon and configures SSL + smaller pool size automatically
5. Run schema: `python3 -c "import asyncio; exec(open('api/schema_init.py').read())"`

### Tailscale Funnel (recommended tunnel)

Free permanent HTTPS URL. No popups. Works through any network.

```bash
# Install Tailscale on Android via Play Store / F-Droid
# Sign up at tailscale.com (free)
# Enable Funnel in admin console → ACLs → add "funnel": ["*"]
tailscale funnel --bg 8090
tailscale funnel status  # shows your permanent URL
```

Then add your URL to `config/.env`:
```
BACKEND_URL=https://yourdevice.tail1234.ts.net
```

And update the frontend config:
```bash
bash termux-setup/update-api-base.sh https://yourdevice.tail1234.ts.net
```

---

## Android Server Guide {#android-server}

Turn any Android phone into a 24/7 Innerflect backend.

### Requirements

- Android 7+ with at least 2 GB RAM free
- [Termux](https://f-droid.org/packages/com.termux/) from F-Droid (NOT Play Store)
- [Termux:Boot](https://f-droid.org/packages/com.termux.boot/) from F-Droid
- Optional: [Termux:API](https://f-droid.org/packages/com.termux.api/) for wake lock

### One-command setup

```bash
# In Termux:
curl -fsSL https://raw.githubusercontent.com/MrNova420/innerflect/main/termux-setup/setup-termux.sh | bash
```

Or if you already have the repo:
```bash
bash ~/public-site/termux-setup/setup-termux.sh
```

This installs: Python, PostgreSQL, Caddy, sets up the database, configures your tunnel, and sets up auto-start on boot.

### 24/7 Uptime Steps (Required)

**Step 1 — Termux:Boot**
- Install from F-Droid → open it once
- This lets Termux auto-start on device reboot

**Step 2 — Disable Battery Optimisation**
- Android Settings → Apps → Termux → Battery → **Unrestricted**
- Do the same for Termux:Boot and Termux:API if installed
- On Samsung: also disable "Put unused apps to sleep"

**Step 3 — Wake Lock (optional but recommended)**
```bash
pkg install termux-api
termux-wake-lock
```
Add to your start script to run automatically.

**Step 4 — Keep device powered**
- Plug in or wireless charge
- Enable "Stay awake while charging" in Developer Options if needed

### Control Panel

After setup, type `vx` anywhere in Termux:

```
vx           → open control panel menu
vx start     → start all services
vx stop      → stop all services
vx status    → check what's running
vx logs      → tail logs
vx update    → git pull + restart
```

### What runs on your Android

| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL | 5432 | Database (local) |
| FastAPI | 8000 | REST API backend |
| Caddy | 8090 | Reverse proxy + HTTPS |
| Tunnel | — | Tailscale or ngrok |
| Watchdog | cron | Auto-restart crashed services |

---

## Environment Variables {#environment-variables}

Innerflect uses a **split architecture** — secrets live in two places:

| Location | Used by | Variables |
|---|---|---|
| `config/.env` on your Android/PC | FastAPI backend | `JWT_SECRET`, `RESEND_API_KEY`, `DATABASE_URL`, `STRIPE_*` |
| Netlify Environment Variables | Netlify build (frontend only) | `GOOGLE_CLIENT_ID` only |

### First-time setup wizard

The easiest way — runs you through every service step by step:

```bash
bash bin/setup-accounts.sh
```

Or set up one service at a time:

```bash
bash bin/setup-accounts.sh resend     # Email service (verification + password reset)
bash bin/setup-accounts.sh google     # Google Sign-In (optional)
bash bin/setup-accounts.sh netlify    # Shows what to set in Netlify dashboard
```

### Backend config (config/.env on your Android/PC)

```bash
# ── Database ─────────────────────────────────────────────────────────────────
# Local PostgreSQL (default after setup-termux.sh):
DATABASE_URL=postgresql://innerflect:innerflect_dev@localhost:5432/innerflect

# Neon cloud PostgreSQL (recommended for reliability):
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require

# ── Auth ─────────────────────────────────────────────────────────────────────
JWT_SECRET=<auto-generated by setup wizard — 128 char hex>
INNERFLECT_ADMIN_TOKEN=<auto-generated>

# ── Email (Resend — free, 3,000/month) ───────────────────────────────────────
RESEND_API_KEY=re_...
# Get one: bash bin/setup-accounts.sh resend

# ── Google OAuth ──────────────────────────────────────────────────────────────
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
# Get one: bash bin/setup-accounts.sh google
# ⚠ Also set this in Netlify dashboard (see below)

# ── Stripe ($4.99/month Pro plan) ────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...

# ── Tunnel ────────────────────────────────────────────────────────────────────
NGROK_DOMAIN=abc.ngrok-free.dev   # If using ngrok
# TAILSCALE_URL=https://yourdevice.tail1234.ts.net
```

### Automatically generate JWT_SECRET

```bash
bash bin/manage-secrets.sh rotate-jwt   # Auto-generates + saves + restarts API
```

### Frontend config (Netlify dashboard)

Netlify only needs **1 environment variable**:

| Variable | Value | Where to get it |
|---|---|---|
| `GOOGLE_CLIENT_ID` | `xxx.apps.googleusercontent.com` | `bash bin/setup-accounts.sh google` |

Set it at: **Netlify → your site → Site configuration → Environment variables**

After setting it, trigger a new deploy — the `prebuild` script auto-injects it into `www/config.js`.

> **Why only 1?** JWT_SECRET, RESEND_API_KEY etc. are used by the FastAPI backend running on your Android device — Netlify never touches them. Netlify only hosts the static React frontend.

### Check all secrets are valid

```bash
bash bin/manage-secrets.sh check
```

### Netlify free plan limits (you're well within all of these)

| Limit | Free plan | Innerflect usage |
|---|---|---|
| Bandwidth | 100 GB/month | Static files + WebLLM model CDN (not counted against you) |
| Build minutes | 300/month | ~6s per build → ~3,000 deploys/month |
| Deploys | Unlimited | ✓ |
| Serverless Functions | Not used | ✓ (backend is on your device) |

---

## Control Commands {#control-commands}

```bash
# Start everything
bash start.sh

# Stop everything
bash stop.sh

# Restart just the API
bash restart-api.sh

# Reload Caddy config (no downtime)
bash reload-caddy.sh

# Check health of all services + SSL certs + token expiry
bash bin/check-expiry.sh

# Update to latest code + restart
git pull && bash restart-api.sh

# View live logs
tail -f logs/api.log
tail -f logs/postgres.log
tail -f logs/caddy.log
```

---

## Database {#database}

### Schema overview

| Table | Purpose |
|-------|---------|
| `users` | Accounts: email, password hash, plan (anon/free/pro), Google OAuth |
| `sessions` | Chat session metadata per user |
| `daily_usage` | Per-user daily message counts |
| `anon_daily_usage` | Per-fingerprint anon usage (no login required) |
| `chat_history` | Saved chat sessions (Pro users, E2E encrypted) |
| `refresh_tokens` | Auth refresh token rotation store |
| `password_resets` | Temporary password reset tokens |
| `contacts` | Contact form submissions |
| `analytics` | Anonymous event tracking |

### Useful queries

```sql
-- How many users?
SELECT plan, COUNT(*) FROM users GROUP BY plan;

-- Active sessions today
SELECT COUNT(*) FROM daily_usage WHERE date = CURRENT_DATE;

-- Expiring refresh tokens (next 7 days)
SELECT COUNT(*) FROM refresh_tokens
WHERE expires_at BETWEEN EXTRACT(EPOCH FROM NOW()) AND EXTRACT(EPOCH FROM NOW()) + 604800;

-- Clean expired tokens manually
DELETE FROM refresh_tokens WHERE expires_at < EXTRACT(EPOCH FROM NOW());
DELETE FROM password_resets WHERE expires_at < EXTRACT(EPOCH FROM NOW());
```

---

## Security Model {#security-model}

### AI Conversations — Zero Server Access

All AI inference runs 100% in the browser via WebLLM + WebGPU. Conversation messages never leave the device. The backend has no visibility into what users say to the AI.

### E2E Encrypted History (Pro)

When Pro users save chat history:
- Encryption key = `PBKDF2(password + email, 300k iterations, SHA-256)` → 256-bit AES-GCM key
- Key is **deterministic** — same key on any device with same credentials
- Backend stores only the encrypted blob — it cannot read it
- Google OAuth users: no password → no E2E key → history saves unencrypted (noted in UI)

### Auth Token Flow

```
Login → { access_token (7 days), refresh_token (90 days) }
       ↓
  Auto-refresh fires 1 day before access_token expires
       ↓
  POST /api/auth/refresh → new { access_token, refresh_token }
  (old refresh_token is rotated/invalidated)
       ↓
  On 401 → silent retry with refresh → if refresh fails → force logout
```

### Rate Limits

- All endpoints: 200 req/min per IP (SlowAPI)
- Auth endpoints: stricter (5 req/min for login, 3 req/min for forgot-password)
- Anon users: 30 min/day (client-enforced) + server-side fingerprint check

---

## API Reference {#api-reference}

Base URL: your `BACKEND_URL` (e.g. `https://yourdevice.tail1234.ts.net`)

### Auth

| Method | Path | Body | Notes |
|--------|------|------|-------|
| POST | `/api/auth/register` | `{email, password, name}` | Returns `{token, refresh_token, user}` |
| POST | `/api/auth/login` | `{email, password}` | Returns `{token, refresh_token, user}` |
| POST | `/api/auth/google` | `{credential}` | Google OAuth ID token |
| POST | `/api/auth/refresh` | `{refresh_token}` | Rotate tokens |
| POST | `/api/auth/logout` | `{refresh_token}` | Revoke refresh token |
| POST | `/api/auth/forgot-password` | `{email}` | Send reset email |
| POST | `/api/auth/reset-password` | `{token, password}` | Consume reset token |

### Usage & Limits

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/usage/anon-check` | Check anon fingerprint limit |
| GET | `/api/usage/status` | Auth required — user's usage stats |

### Chat History (Pro)

| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/chat/save` | Save/update session |
| GET | `/api/chat/history` | List user's sessions |
| GET | `/api/chat/session/{id}` | Load single session |
| DELETE | `/api/chat/session/{id}` | Delete session |

### User Preferences

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/user/preferences` | Get preferences |
| PUT | `/api/user/preferences` | Update preferences |

### Admin (requires `INNERFLECT_ADMIN_TOKEN` header)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/admin/stats` | Overall stats |
| GET | `/api/admin/users` | User list |
| POST | `/api/admin/user/{id}/plan` | Change user plan |

---

## Troubleshooting {#troubleshooting}

### API won't start

```bash
# Check logs
tail -50 logs/api.log

# Test manually
cd public-site && python3 -m uvicorn api.main:app --port 8000

# Common causes:
# - Missing DATABASE_URL in config/.env
# - PostgreSQL not running: pg_ctl -D $PREFIX/var/lib/postgresql start
# - Port 8000 already in use: lsof -i :8000
```

### Database connection failed (Neon)

- Neon auto-pauses after 5 min inactivity — first request after pause takes 1-3s (normal)
- The backend retries 3 times automatically
- If still failing: check your `DATABASE_URL` in `config/.env`
- Neon free tier max 10 connections — backend uses max 3 to stay safe

### WebGPU not working in browser

- Use Chrome 113+ or Edge 113+ on desktop
- On Android: Chrome 121+ with WebGPU flag enabled
- Safari: not supported yet
- Fallback: server-side AI via `OPENROUTER_API_KEY` (optional)

### ngrok URL keeps changing

- Sign up at ngrok.com (free) and get a permanent domain
- Add `NGROK_DOMAIN=yourname.ngrok-free.dev` to `config/.env`
- Run: `ngrok http --domain=yourname.ngrok-free.dev 8090`

### Termux keeps getting killed

1. Battery optimization: Settings → Apps → Termux → Battery → Unrestricted
2. Run `termux-wake-lock` (requires Termux:API)
3. Keep device plugged in
4. On Samsung: Settings → Device Care → Battery → Background usage limits → Never sleeping apps → Add Termux

### "Condensing context…" appears during chat

This is normal — it means the conversation is getting long and Innerflect is silently summarizing older messages to keep the AI's full context working. Chat continues normally; older details are preserved in a compact summary.

### Refresh token expired / forced logout

Refresh tokens last 90 days. If a user gets logged out unexpectedly:
- They can simply log back in
- Check `bin/check-expiry.sh` for how many tokens are expiring soon

---

## Model Strategy & Roadmap {#model-strategy}

### Current model lineup

Innerflect prioritizes lightweight models that run entirely in-browser via WebGPU — no data leaves the device:

| Model | Download | VRAM | Best for |
|-------|----------|------|----------|
| SmolLM2 135M | ~270 MB | 360 MB | Ultra-low-end devices, instant load |
| SmolLM2 360M | ~360 MB | 376 MB | Very light devices, quick sessions |
| Llama 3.2 1B | ~700 MB | 879 MB | **Default sweet spot** — any WebGPU device |
| SmolLM2 1.7B | ~1.1 GB | 1.7 GB | Step-up quality, still compact |
| Gemma 2 2B | ~1.3 GB | 1.9 GB | Nuanced reasoning on capable hardware |
| Phi-3.5-mini | ~2.3 GB | 3.7 GB | Best therapy quality, 4GB+ GPU required |

The primary focus is the **200–700 MB tier**. The goal: make the lightest models as warm and responsive as possible so every device — including older phones — gets a genuinely helpful experience.

### Fine-tuning / custom model (future)

**Goal (noted for future development):** Slowly fine-tune a custom Innerflect model in the 200–700 MB range that is deeply specialized for therapeutic conversation — not a general-purpose assistant.

Approach when implemented:
1. Curate a therapy-focused dataset: MI dialogue examples, reflective listening patterns, CBT/ACT techniques, safe crisis responses.
2. Fine-tune a lightweight base (SmolLM2-360M or Llama 1B) using LoRA/QLoRA for minimal compute cost.
3. Quantize to q4f16 for WebLLM compatibility and upload to HuggingFace as an MLC-compiled model.
4. Users download and load it locally — just like the prebuilt models today.

**Why this matters:** Even the smallest model, trained specifically on therapeutic dialogue patterns, will outperform a larger general model for this use case. The focus is quality-per-MB, not raw parameter count.

This is tracked as a future milestone. The infrastructure (WebLLM, model picker, context management) is already built to support custom model IDs without any code changes.
