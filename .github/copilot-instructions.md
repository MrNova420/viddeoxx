# Copilot Instructions — Innerflect

Privacy-first browser-based AI companion. The AI model runs 100% locally in the browser via WebLLM + WebGPU. No user messages ever reach the server.

## Commands

### Frontend
```bash
npm run dev       # Dev server at http://localhost:5173
npm run build     # Production build → www/
npm run preview   # Preview built output
```

### Backend (FastAPI)
```bash
# From repo root, with venv active:
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
# Or use the managed script:
./restart-api.sh
```

### Full stack (all services)
```bash
./start.sh        # Starts PostgreSQL + FastAPI + Caddy + tunnel (idempotent)
./stop.sh         # Stops all services
./restart-api.sh  # Restart FastAPI only (activates venv automatically)
./reload-caddy.sh # Reload Caddy config without restart
./backup-full.sh  # Database + config + logs backup
```

To temporarily stop the watchdog from auto-restarting services during development:
```bash
touch /tmp/innerflect-watchdog-disabled   # disable
rm /tmp/innerflect-watchdog-disabled      # re-enable
```

There is no test suite. The codebase is JavaScript/JSX (no TypeScript) on the frontend, Python on the backend.

## Architecture

Two deployment modes coexist in this repo:

- **Netlify mode** (primary): Frontend SPA deployed to Netlify (`www/` is the publish dir). Backend runs separately on Android/PC, exposed via Tailscale Funnel or ngrok. Frontend discovers the backend URL via `window.API_BASE` set in `www/config.js`.
- **Self-host mode**: Caddy binary (`./caddy`) serves everything on port 8090 — static SPA (`www/`), FastAPI reverse-proxied at `/api/*`, admin panel (`admin/`), TherapySpace (`www/therapyspace/`).

### Request routing (Caddy / `Caddyfile`)
| Path | Destination |
|---|---|
| `/therapyspace*` | `www/therapyspace/` (relaxed COEP for HuggingFace downloads) |
| `/admin*` | `admin/` SPA, Caddy basic auth gate (user: `admin`) |
| `/ghostslayer/*` | `ghostslayer/` static files |
| `/api/*` | `localhost:8000` (FastAPI) |
| `/health` | Inline JSON response, no logging |
| `/*` | `www/` SPA with `try_files` fallback |

### Frontend (`src/`)
- **Pages** (`src/pages/`): `Landing`, `TherapySpace`, `About`, `FAQ`, `Privacy` — all lazy-loaded via `React.lazy()` in `App.jsx`
- **Auth state**: `src/context/AuthContext.jsx` — JWT stored in `localStorage` under key `Innerflect_auth`. API base resolved as `window.API_BASE || window.INNERFLECT_API_BASE || ''`
- **AI model selection**: `src/hooks/useModelDetect.js` — detects WebGPU capabilities (`shader-f16` support + `maxBufferSize` VRAM tier) and picks the best compatible model. User's choice persisted in `localStorage` under key `viddeoxx_model_id`
- **Session limits**: `src/hooks/useSessionLimit.js` — anon: 30 min/day (soft nudge, not hard-blocked); free account: 60 min/day (hard gate); pro: unlimited
- **Server AI fallback**: `src/hooks/useServerAI.js` — used when WebGPU is unavailable; calls `/api/ai/chat`, streams via SSE, uses OpenRouter

### Backend (`api/main.py`)
FastAPI app. Key route groups:
- `/api/auth/*` — register, login, Google OAuth, me, logout
- `/api/usage/*` — record and fetch daily session minutes
- `/api/chat/*` — save/list/get/delete chat sessions
- `/api/ai/*` — server-side AI fallback (OpenRouter, streaming)
- `/api/admin/*` — system stats, logs, Redis info, service restart (requires `INNERFLECT_ADMIN_TOKEN` header)
- `/api/analytics/*` — pageview + perf beacon endpoints

Config is loaded from `config/.env` (relative to repo root) before env vars are checked.

### Vite build config (`vite.config.js`)
Output dir is `www/` (not `dist/`). Manual chunk splitting: `webllm`, `framer`, `fonts`, `react`, `router`. `@mlc-ai/web-llm` is excluded from `optimizeDeps` (too large).

## Key Conventions

- **Global modal openers**: `window.__openAuth(mode)` and `window.__openUpgrade()` are set in `App.jsx`'s `useEffect` so any component or page can trigger auth/upgrade modals without prop drilling.
- **API base URL**: Never hardcoded. Always resolved at runtime via `window.API_BASE || window.INNERFLECT_API_BASE || ''`. This value comes from `www/config.js` (not bundled — loaded separately so it can be updated without a rebuild).
- **localStorage key prefixes**: Mixed — auth/session use `Innerflect_` prefix; model selection and fingerprint use `viddeoxx_` prefix. Don't unify without checking all consumers.
- **TherapySpace COEP**: `/therapyspace*` uses `Cross-Origin-Embedder-Policy: credentialless` (not `require-corp`) so HuggingFace model files can be fetched. All other routes use `require-corp`.
- **`config/.env` must be `chmod 600`** — contains JWT_SECRET, Redis credentials, OpenRouter key. The API reads it directly via `_load_env()`.
- **`npm run build` must pass before any PR** — it's the only CI gate mentioned in CONTRIBUTING.md.
- **`admin-cli.sh`** provides a terminal interface to the admin API. Subcommands: `overview`, `users`, `ads`, `logs`, `restart`, `redis`. Requires `INNERFLECT_ADMIN_TOKEN` from `config/.env`.
- **Discord webhook** (`DISCORD_WEBHOOK` in `config/.env`) receives watchdog restart alerts and daily reports. Leave empty to disable.
- **Admin panel** is a static SPA (`admin/`) with no server-side auth of its own. The only security layer is Caddy basic auth. The bcrypt hash in `Caddyfile` can be regenerated with `./caddy hash-password --plaintext "newpass"`.
- **Progressive loading strategy**: On first visit with an uncached model, the app loads a tiny quick model (SmolLM2-135M for f16 devices, SmolLM2-360M-q4f32 for compat) so the user can chat immediately while the better model downloads in the background.
