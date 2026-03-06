# Innerflect

> A privacy-first AI companion that runs entirely in your browser.  
> No accounts needed. No data collected. No servers involved in your conversations.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Netlify Status](https://api.netlify.com/api/v1/badges/placeholder/deploy-status)](https://innerflect.netlify.app)

**Live:** https://innerflect.netlify.app

---

## What It Is

Innerflect is an open-source browser-based AI companion for private self-reflection. The AI model runs 100% locally in your browser using [WebLLM](https://github.com/mlc-ai/web-llm) and WebGPU — your conversations never leave your device.

## How It's Private

- AI runs entirely in your browser via WebGPU (no server receives messages)
- Conversation cleared when you close the tab
- No analytics on your messages, no tracking cookies
- Optional account only stores email, name, and plan type — never chat content

## Features

- 🧠 Auto-selects best AI model for your device (270 MB → 2.3 GB)
- ⚡ Progressive loading — chat instantly while the better model loads in background
- 📱 Works on Chrome, Edge, Safari 18+, Chrome for Android
- 💾 Model cached after first download — loads instantly on return visits
- 🌐 Fully offline after initial load
- 🔓 Anonymous 30 min/day · 👤 Free account 60 min/day · ⭐ Pro unlimited

## Supported Models

| Model | VRAM | shader-f16 required |
|---|---|---|
| SmolLM2 135M q0f16 | ~360 MB | ✅ Yes |
| SmolLM2 360M q4f16 | ~376 MB | ✅ Yes |
| SmolLM2 360M q4f32 (compat) | ~580 MB | ❌ No |
| Llama 3.2 1B q4f16 | ~879 MB | ❌ No |
| Gemma 2 2B q4f16 | ~1895 MB | ✅ Yes |
| Phi-3.5-mini q4f16 | ~3672 MB | ❌ No |

The app detects `shader-f16` GPU feature support and auto-selects compatible models.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite |
| AI Runtime | WebLLM 0.2.81 (MLC AI) |
| Animations | Framer Motion |
| Backend (auth/sessions) | FastAPI + PostgreSQL |
| Deployment | Netlify |
| Reverse proxy | Caddy |

## Local Development

```bash
git clone https://github.com/MrNova420/innerflect.git
cd innerflect
npm install
npm run dev        # frontend at http://localhost:5173
npm run build      # production build → www/
```

### Backend (optional — auth, session limits, chat history)

```bash
pip install -r api/requirements.txt
# Edit config/.env — set DATABASE_URL, JWT_SECRET
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

## Contributing

PRs welcome! See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

1. Fork → feature branch → PR
2. `npm run build` must pass before submitting

## License

[MIT](LICENSE) © 2026 mrnova420

---

<a href="https://www.netlify.com"><img src="https://www.netlify.com/v3/img/components/netlify-color-accent.svg" alt="Deploys by Netlify" height="40"></a>
