# Contributing to Innerflect

Thank you for your interest in contributing! 🎉

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md).  
By participating you agree to uphold it. Please report unacceptable behavior to **hello@innerflect.app**.

## How to Contribute

### Reporting Bugs
Open an issue on [GitHub](https://github.com/MrNova420/innerflect/issues) with:
- What you expected vs what happened
- Browser + OS version
- Steps to reproduce

### Suggesting Features
Open an issue labelled `enhancement`. Describe the use case and why it helps users.

### Pull Requests

1. Fork the repo and create a branch: `git checkout -b fix/your-fix`
2. Make your changes — `npm run build` must pass
3. Open a PR with a clear description of what changed and why

### Local Setup

```bash
git clone https://github.com/MrNova420/innerflect.git
cd innerflect
npm install
npm run dev
```

See [README.md](README.md) for full setup including the optional backend.

## Project Structure

```
src/
  pages/        # Landing, TherapySpace, About, FAQ, Privacy
  components/   # Nav, Footer, AuthModal, GlassSurface, etc.
  hooks/        # useModelDetect, useSessionLimit, useServerAI, etc.
  context/      # AuthContext
api/
  main.py       # FastAPI backend (auth, sessions, chat history)
www/            # Built output (Vite → Netlify)
config/
  .env.template # Copy to .env and fill in values
```

## Questions?

Open a GitHub Discussion or email **hello@innerflect.app**.
