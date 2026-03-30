#!/usr/bin/env bash
# ═════════════════════════════════════════════════════════════════════════════
#  Innerflect — bin/setup-accounts.sh
#  Guided wizard to get + configure all external service accounts.
#  Walks step-by-step through Resend, Google OAuth, and Netlify env vars.
#  All free. No credit card required for any service.
#
#  Run: bash bin/setup-accounts.sh
#  Or:  bash bin/setup-accounts.sh resend      (Resend only)
#       bash bin/setup-accounts.sh google      (Google OAuth only)
#       bash bin/setup-accounts.sh netlify     (Netlify env vars only)
# ═════════════════════════════════════════════════════════════════════════════
set -uo pipefail

SITE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$SITE_DIR/config/.env"

R='\033[0;31m' G='\033[0;32m' Y='\033[1;33m' B='\033[0;34m' C='\033[0;36m' W='\033[1;37m' NC='\033[0m'
ok()    { echo -e "${G}  ✓${NC}  $*"; }
warn()  { echo -e "${Y}  ⚠${NC}  $*"; }
err()   { echo -e "${R}  ✗${NC}  $*"; }
info()  { echo -e "${B}  →${NC}  $*"; }
step()  { echo -e "\n${C}  [$1]${NC}  $2"; }
hdr()   { echo -e "\n${W}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; \
          echo -e "${W}  $*${NC}"; \
          echo -e "${W}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }

_open_url() {
  local url="$1"
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" 2>/dev/null &
  elif command -v open >/dev/null 2>&1; then
    open "$url" 2>/dev/null &
  elif command -v termux-open-url >/dev/null 2>&1; then
    termux-open-url "$url" 2>/dev/null &
  fi
  echo -e "${B}  🔗 ${url}${NC}"
}

_env_get() { grep "^${1}=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2-; }
_env_set() {
  local k="$1" v="$2"
  if grep -q "^${k}=" "$ENV_FILE" 2>/dev/null; then
    local tmp; tmp=$(mktemp)
    grep -v "^${k}=" "$ENV_FILE" > "$tmp"
    echo "${k}=${v}" >> "$tmp"
    mv "$tmp" "$ENV_FILE"
    chmod 600 "$ENV_FILE"
  else
    echo "${k}=${v}" >> "$ENV_FILE"
    chmod 600 "$ENV_FILE"
  fi
}

_pause() { echo ""; read -r -p "  Press Enter when ready…"; echo ""; }

# ═════════════════════════════════════════════════════════════════════════════
#  RESEND — free email service (verification emails + password resets)
#  Free plan: 3,000 emails/month, 100/day. No credit card.
# ═════════════════════════════════════════════════════════════════════════════
setup_resend() {
  hdr "RESEND — Email Service Setup"
  echo ""
  echo "  Resend sends your verification emails and password-reset links."
  echo "  Free plan: 3,000 emails/month (way more than enough)."
  echo "  No credit card required."
  echo ""

  local cur; cur=$(_env_get "RESEND_API_KEY")
  if [ -n "$cur" ] && [[ "$cur" == re_* ]]; then
    ok "RESEND_API_KEY is already set (${#cur} chars)"
    read -r -p "  Re-enter to update, or Enter to skip: " NEW_KEY
    [ -z "$NEW_KEY" ] && { info "Keeping existing key."; return 0; }
    cur="$NEW_KEY"
  fi

  step "1/6" "Create your free Resend account"
  echo ""
  echo "  Opening: https://resend.com/signup"
  _open_url "https://resend.com/signup"
  echo ""
  echo "  • Sign up with any email (GitHub login works too)"
  echo "  • Verify your email to activate the account"
  _pause

  step "2/6" "Create an API Key"
  echo ""
  echo "  Opening: https://resend.com/api-keys"
  _open_url "https://resend.com/api-keys"
  echo ""
  echo "  • Click  '+ Create API Key'"
  echo "  • Name it something like 'innerflect-production'"
  echo "  • Permission: 'Sending access' is enough"
  echo "  • Click 'Add'  — copy the key that appears (starts with re_)"
  echo ""
  echo -e "${Y}  ⚠  The key is only shown ONCE — copy it now!${NC}"
  _pause

  step "3/6" "Paste your API key"
  echo ""
  read -r -s -p "  Paste API key (hidden): " API_KEY
  echo ""

  if [ -z "$API_KEY" ]; then
    warn "No key entered — skipping Resend setup"
    return 0
  fi

  if [[ "$API_KEY" != re_* ]]; then
    warn "Key doesn't start with 're_' — double-check you copied the right thing"
    read -r -p "  Save anyway? [y/N]: " FORCE
    [[ "$FORCE" =~ ^[Yy]$ ]] || { info "Cancelled."; return 0; }
  fi

  step "4/6" "Verify your sending domain (optional but recommended)"
  echo ""
  echo "  Without domain verification, Resend sends from 'onboarding@resend.dev'"
  echo "  With your own domain (e.g. noreply@innerflect.app), emails look more"
  echo "  professional and are less likely to land in spam."
  echo ""
  echo "  To add your domain later:"
  _open_url "https://resend.com/domains"
  echo ""
  echo "  You can skip this for now — the app works fine with the shared domain."
  echo ""

  step "5/6" "Saving key to config/.env"
  _env_set "RESEND_API_KEY" "$API_KEY"
  ok "RESEND_API_KEY saved to config/.env"

  step "6/6" "Configure the FROM address in api/main.py"
  echo ""
  local cur_from; cur_from=$(grep -o "noreply@[a-zA-Z0-9._-]*" "$SITE_DIR/api/main.py" 2>/dev/null | head -1)
  echo "  Current FROM address: ${cur_from:-not found}"
  echo ""
  echo "  • If you verified your own domain above: edit api/main.py and set"
  echo "    FROM_EMAIL = 'noreply@yourdomain.com' in _send_verification_email()"
  echo "  • If you're using Resend's shared domain (no domain set up): leave as-is"
  echo "    — Resend auto-routes through onboarding@resend.dev for unverified accounts"
  echo ""

  ok "Resend setup complete! Verification emails will now send."
  echo ""
}

# ═════════════════════════════════════════════════════════════════════════════
#  GOOGLE OAUTH — enables 'Sign in with Google' button
#  Always free. Users can still sign up with email if this isn't configured.
# ═════════════════════════════════════════════════════════════════════════════
setup_google() {
  hdr "GOOGLE OAUTH — Sign In with Google"
  echo ""
  echo "  This enables the 'Sign in with Google' button in the auth modal."
  echo "  Without it, email/password signup still works perfectly."
  echo "  Always free. No billing needed."
  echo ""

  local cur; cur=$(_env_get "GOOGLE_CLIENT_ID")
  if [ -n "$cur" ] && [[ "$cur" == *.apps.googleusercontent.com ]] \
     && [ "$cur" != "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com" ]; then
    ok "GOOGLE_CLIENT_ID is already set"
    read -r -p "  Re-enter to update, or Enter to skip: " NEW_ID
    [ -z "$NEW_ID" ] && { info "Keeping existing Client ID."; return 0; }
    cur="$NEW_ID"
  fi

  step "1/7" "Go to Google Cloud Console"
  echo ""
  echo "  Opening: https://console.cloud.google.com/apis/credentials"
  _open_url "https://console.cloud.google.com/apis/credentials"
  echo ""
  echo "  • Sign in with your Google account"
  echo "  • If prompted, create a new project (call it 'Innerflect' or anything)"
  _pause

  step "2/7" "Configure the OAuth Consent Screen (one-time setup)"
  echo ""
  echo "  Opening: https://console.cloud.google.com/apis/credentials/consent"
  _open_url "https://console.cloud.google.com/apis/credentials/consent"
  echo ""
  echo "  • User Type: 'External'  (allows any Google account to sign in)"
  echo "  • App name: Innerflect"
  echo "  • User support email: your email"
  echo "  • Developer contact: your email"
  echo "  • Click 'Save and Continue' through the scopes screen (no extra scopes needed)"
  echo "  • Add yourself as a test user (in Testing mode, only test users can sign in)"
  echo "  • Status: 'Testing' is fine for development. For production → 'Publish App'"
  _pause

  step "3/7" "Create OAuth 2.0 Client ID"
  echo ""
  echo "  Opening: https://console.cloud.google.com/apis/credentials/oauthclient"
  _open_url "https://console.cloud.google.com/apis/credentials/oauthclient"
  echo ""
  echo "  • Application type: 'Web application'"
  echo "  • Name: 'Innerflect Web'"
  _pause

  step "4/7" "Add Authorized JavaScript Origins"
  echo ""
  echo "  Add ALL of these origins (click '+ Add URI' for each):"
  echo ""
  echo "    https://innerflect.netlify.app    ← Netlify production"
  echo "    http://localhost:8090              ← local dev"
  echo "    http://localhost:5173              ← Vite dev server"
  echo ""
  local NGROK_DOMAIN; NGROK_DOMAIN=$(_env_get "NGROK_DOMAIN" 2>/dev/null || true)
  local TAILSCALE_URL; TAILSCALE_URL=$(_env_get "TAILSCALE_URL" 2>/dev/null || true)
  [ -n "$NGROK_DOMAIN" ]   && echo "    https://${NGROK_DOMAIN}   ← your ngrok domain"
  [ -n "$TAILSCALE_URL" ]  && echo "    ${TAILSCALE_URL}         ← your Tailscale URL"
  echo ""
  echo "  • Leave 'Authorized redirect URIs' empty (not needed for GIS one-tap)"
  echo "  • Click 'Create'"
  _pause

  step "5/7" "Copy your Client ID"
  echo ""
  echo "  A dialog shows your credentials:"
  echo "  • Your Client ID looks like: 123456789-xxxxx.apps.googleusercontent.com"
  echo "  • Copy the Client ID (NOT the Client Secret)"
  echo ""

  step "6/7" "Paste your Client ID"
  echo ""
  read -r -p "  Paste Client ID: " CLIENT_ID

  if [ -z "$CLIENT_ID" ]; then
    warn "No Client ID entered — skipping Google OAuth setup"
    return 0
  fi

  if [[ "$CLIENT_ID" != *.apps.googleusercontent.com ]]; then
    warn "Client ID doesn't end in '.apps.googleusercontent.com' — double-check"
    read -r -p "  Save anyway? [y/N]: " FORCE
    [[ "$FORCE" =~ ^[Yy]$ ]] || { info "Cancelled."; return 0; }
  fi

  _env_set "GOOGLE_CLIENT_ID" "$CLIENT_ID"
  ok "GOOGLE_CLIENT_ID saved to config/.env"

  step "7/7" "Sync to config.js + set Netlify env var"
  echo ""
  bash "$SITE_DIR/bin/manage-secrets.sh" sync-config
  echo ""
  echo "  For Netlify deploys, also set the env var in Netlify dashboard:"
  echo "  (This bakes your Client ID into the Netlify build automatically)"
  echo ""
  _open_url "https://app.netlify.com/sites/innerflect/configuration/env"
  echo ""
  echo "  • Click 'Add a variable'"
  echo "  • Key:   GOOGLE_CLIENT_ID"
  echo "  • Value: ${CLIENT_ID}"
  echo "  • Scopes: 'All scopes'"
  echo "  • Click Save — then trigger a new Netlify deploy"
  echo ""

  ok "Google OAuth setup complete! Google Sign-In is now enabled."
  echo ""
}

# ═════════════════════════════════════════════════════════════════════════════
#  NETLIFY ENV VARS — which variables to set in Netlify dashboard
# ═════════════════════════════════════════════════════════════════════════════
setup_netlify() {
  hdr "NETLIFY — Environment Variables"
  echo ""
  echo "  Innerflect uses a split architecture:"
  echo ""
  echo -e "${W}  Frontend (Netlify free static hosting):${NC}"
  echo "  • Only needs GOOGLE_CLIENT_ID to enable Google Sign-In"
  echo "  • Everything else runs on your Android/PC backend"
  echo ""
  echo -e "${W}  Backend (your Android/PC via config/.env):${NC}"
  echo "  • JWT_SECRET, RESEND_API_KEY, DATABASE_URL, STRIPE keys"
  echo "  • These are never sent to Netlify"
  echo ""
  echo "  ─────────────────────────────────────────────────────"
  echo ""
  echo "  What to set in Netlify dashboard:"
  echo ""
  echo "  Opening: https://app.netlify.com/sites/innerflect/configuration/env"
  _open_url "https://app.netlify.com/sites/innerflect/configuration/env"
  echo ""

  local gid; gid=$(_env_get "GOOGLE_CLIENT_ID" 2>/dev/null || true)
  [ "$gid" = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com" ] && gid=""

  echo "  ┌──────────────────────┬────────────────────────────────────────┐"
  echo "  │ Variable             │ Value                                  │"
  echo "  ├──────────────────────┼────────────────────────────────────────┤"
  if [ -n "$gid" ]; then
  printf "  │ %-20s │ %-38s │\n" "GOOGLE_CLIENT_ID" "${gid:0:38}"
  else
  printf "  │ %-20s │ %-38s │\n" "GOOGLE_CLIENT_ID" "(paste from Google Cloud Console)"
  fi
  echo "  └──────────────────────┴────────────────────────────────────────┘"
  echo ""
  echo "  That's it for Netlify! Only 1 variable needed for the frontend."
  echo ""
  echo "  After adding the variable:"
  echo "  • Go to Deploys tab → 'Trigger deploy' → 'Deploy site'"
  echo "  • The prebuild script auto-injects it into config.js"
  echo ""
  echo "  ─────────────────────────────────────────────────────"
  echo ""
  echo "  Netlify free plan limits (you're well within all of these):"
  echo "  • 100 GB bandwidth/month    — static files + WebLLM models"
  echo "  • 300 build minutes/month   — prebuild is ~3s, leaves 297+ min"
  echo "  • 125K function calls/month — we don't use Netlify Functions"
  echo "  • Unlimited deploys"
  echo ""
}

# ═════════════════════════════════════════════════════════════════════════════
#  ENTRY POINT
# ═════════════════════════════════════════════════════════════════════════════
CMD="${1:-all}"

case "$CMD" in
  resend)
    setup_resend
    ;;
  google)
    setup_google
    bash "$SITE_DIR/bin/manage-secrets.sh" check
    ;;
  netlify)
    setup_netlify
    ;;
  all)
    echo ""
    echo -e "${W}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${W}║     Innerflect — Account Setup Wizard                        ║${NC}"
    echo -e "${W}║     3 services. All free. No credit card.                    ║${NC}"
    echo -e "${W}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  This wizard will set up:"
    echo "  1. Resend  — sends verification & password-reset emails (free)"
    echo "  2. Google  — enables Sign In with Google button (free, optional)"
    echo "  3. Netlify — shows which env var to set in your Netlify dashboard"
    echo ""
    echo "  You can run any section individually:"
    echo "    bash bin/setup-accounts.sh resend"
    echo "    bash bin/setup-accounts.sh google"
    echo "    bash bin/setup-accounts.sh netlify"
    echo ""
    read -r -p "  Start setup now? [Y/n]: " START
    [[ "$START" =~ ^[Nn]$ ]] && exit 0

    setup_resend
    setup_google
    setup_netlify

    hdr "Setup Complete — Final Check"
    bash "$SITE_DIR/bin/manage-secrets.sh" check
    echo ""
    echo -e "${G}  ✓ All done! Your next steps:${NC}"
    echo ""
    echo "  1. Set GOOGLE_CLIENT_ID in Netlify dashboard (URL opened above)"
    echo "  2. Trigger a new Netlify deploy"
    echo "  3. Start your backend: bash start.sh"
    echo "  4. Daily health check: bash bin/check-expiry.sh"
    echo ""
    ;;
  *)
    echo ""
    echo "  Usage: bash bin/setup-accounts.sh [resend|google|netlify|all]"
    echo ""
    exit 1
    ;;
esac
