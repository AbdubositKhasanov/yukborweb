#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# Load local deploy overrides if present (not committed)
if [[ -f "$ROOT_DIR/.deploy.env" ]]; then
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.deploy.env"
fi

# Core connection params
DEPLOY_USER="${DEPLOY_USER:-root}"
DEPLOY_HOST="${DEPLOY_HOST:-167.172.68.133}"
DEPLOY_PORT="${DEPLOY_PORT:-22}"
SSH_KEY_PATH="${SSH_KEY_PATH:-}"
BATCH_MODE="${BATCH_MODE:-no}"

# Deploy mode:
# - remote_git: run git pull/build/reload on server
# - rsync: build locally and upload dist/
DEPLOY_MODE="${DEPLOY_MODE:-remote_git}"

# remote_git mode settings
APP_DIR="${APP_DIR:-/var/www/yukborweb}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
NPM_INSTALL_CMD="${NPM_INSTALL_CMD:-npm install}"
BUILD_CMD="${BUILD_CMD:-npm run build}"
RELOAD_CMD="${RELOAD_CMD:-sudo systemctl reload nginx}"
GITHUB_REPO_HTTPS="${GITHUB_REPO_HTTPS:-https://github.com/AbdubositKhasanov/yukborweb.git}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"

# rsync mode settings
DEPLOY_PATH="${DEPLOY_PATH:-/var/www/yukborweb/dist}"
REMOTE_PRE_DEPLOY_CMD="${REMOTE_PRE_DEPLOY_CMD:-}"
REMOTE_POST_DEPLOY_CMD="${REMOTE_POST_DEPLOY_CMD:-}"

# GitHub SSH key bootstrap (for remote_git mode)
BOOTSTRAP_GITHUB_KEY="${BOOTSTRAP_GITHUB_KEY:-1}"
GITHUB_KEY_PATH="${GITHUB_KEY_PATH:-$HOME/.ssh/id_ed25519_github_deploy}"
GITHUB_REPO_SSH="${GITHUB_REPO_SSH:-git@github.com:AbdubositKhasanov/yukborweb.git}"

# Optional: add generated public key to GitHub deploy keys API
ADD_GITHUB_DEPLOY_KEY="${ADD_GITHUB_DEPLOY_KEY:-0}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
GITHUB_REPO="${GITHUB_REPO:-}" # owner/repo
GITHUB_KEY_TITLE="${GITHUB_KEY_TITLE:-codex-deploy-key}"

print_usage() {
  cat <<'EOF'
Usage:
  ./deploy.sh
  DEPLOY_USER=<user> DEPLOY_HOST=<host> ./deploy.sh

Optional environment variables:
  DEPLOY_MODE=remote_git|rsync  (default: remote_git)
  DEPLOY_PORT=22
  SSH_KEY_PATH=/path/to/private_key
  BATCH_MODE=no|yes (default: no)

remote_git mode:
  APP_DIR=/var/www/yukborweb (default)
  DEPLOY_BRANCH=main (default)
  GITHUB_REPO_HTTPS=https://github.com/owner/repo.git
  GITHUB_TOKEN=ghp_xxx  # optional; if set, pull uses token auth every time
  NPM_INSTALL_CMD='npm install'
  BUILD_CMD='npm run build'
  RELOAD_CMD='sudo systemctl reload nginx'
  BOOTSTRAP_GITHUB_KEY=1 (default)
  GITHUB_KEY_PATH=~/.ssh/id_ed25519_github_deploy (default)
  GITHUB_REPO_SSH=git@github.com:AbdubositKhasanov/yukborweb.git (default)

Optional GitHub API auto add (requires token):
  ADD_GITHUB_DEPLOY_KEY=1
  GITHUB_TOKEN=ghp_xxx
  GITHUB_REPO=owner/repo
  GITHUB_KEY_TITLE='my-server-deploy-key'

rsync mode:
  DEPLOY_PATH=/var/www/yukborweb/dist
  REMOTE_PRE_DEPLOY_CMD='...'
  REMOTE_POST_DEPLOY_CMD='...'

Example:
  DEPLOY_USER=root \
  DEPLOY_HOST=167.172.68.133 \
  APP_DIR=/var/www/yukborweb \
  DEPLOY_BRANCH=main \
  BOOTSTRAP_GITHUB_KEY=1 \
  GITHUB_REPO_SSH=git@github.com:OWNER/REPO.git \
  ./deploy.sh
EOF
}

if ! command -v ssh >/dev/null 2>&1; then
  echo "Error: ssh is required but not installed."
  exit 1
fi

# Expand local key path when user passes ~
if [[ -n "$SSH_KEY_PATH" ]]; then
  SSH_KEY_PATH="${SSH_KEY_PATH/#\~/$HOME}"
fi

SSH_ARGS=(-p "$DEPLOY_PORT" -o BatchMode="$BATCH_MODE" -o StrictHostKeyChecking=accept-new)
if [[ -n "$SSH_KEY_PATH" ]]; then
  SSH_ARGS+=(-i "$SSH_KEY_PATH")
fi

SSH_TARGET="${DEPLOY_USER}@${DEPLOY_HOST}"

bootstrap_github_key_remote() {
  echo "==> Bootstrapping GitHub SSH key on remote server..."
  ssh "${SSH_ARGS[@]}" "$SSH_TARGET" \
    "APP_DIR='$APP_DIR' GITHUB_KEY_PATH='$GITHUB_KEY_PATH' GITHUB_REPO_SSH='$GITHUB_REPO_SSH' bash -s" <<'REMOTE_SCRIPT'
set -euo pipefail

GITHUB_KEY_PATH="${GITHUB_KEY_PATH/#\~/$HOME}"

mkdir -p ~/.ssh
chmod 700 ~/.ssh

if [[ ! -f "$GITHUB_KEY_PATH" ]]; then
  ssh-keygen -t ed25519 -N "" -f "$GITHUB_KEY_PATH" -C "deploy-$(hostname)-$(date +%Y%m%d)"
fi

touch ~/.ssh/known_hosts
if ! ssh-keygen -F github.com >/dev/null 2>&1; then
  ssh-keyscan -t rsa,ecdsa,ed25519 github.com >> ~/.ssh/known_hosts
fi
chmod 600 ~/.ssh/known_hosts

touch ~/.ssh/config
if ! grep -q "IdentityFile $GITHUB_KEY_PATH" ~/.ssh/config; then
  {
    echo ""
    echo "Host github.com"
    echo "  HostName github.com"
    echo "  User git"
    echo "  IdentityFile $GITHUB_KEY_PATH"
    echo "  IdentitiesOnly yes"
  } >> ~/.ssh/config
fi
chmod 600 ~/.ssh/config

if [[ -n "$GITHUB_REPO_SSH" ]]; then
  cd "$APP_DIR"
  git remote set-url origin "$GITHUB_REPO_SSH"
fi
REMOTE_SCRIPT
}

add_remote_pubkey_to_github() {
  if [[ "$ADD_GITHUB_DEPLOY_KEY" != "1" ]]; then
    return
  fi

  if [[ -z "$GITHUB_TOKEN" || -z "$GITHUB_REPO" ]]; then
    echo "Error: ADD_GITHUB_DEPLOY_KEY=1 requires GITHUB_TOKEN and GITHUB_REPO."
    exit 1
  fi

  if ! command -v curl >/dev/null 2>&1; then
    echo "Error: curl is required for GitHub API call."
    exit 1
  fi

  echo "==> Reading remote public key..."
  local pub_key
  pub_key="$(ssh "${SSH_ARGS[@]}" "$SSH_TARGET" "cat '$GITHUB_KEY_PATH.pub'")"

  local response_file
  response_file="$(mktemp)"

  echo "==> Adding deploy key to GitHub repo ${GITHUB_REPO}..."
  local http_code
  http_code="$(curl -sS -o "$response_file" -w "%{http_code}" \
    -X POST \
    -H "Authorization: Bearer ${GITHUB_TOKEN}" \
    -H "Accept: application/vnd.github+json" \
    "https://api.github.com/repos/${GITHUB_REPO}/keys" \
    -d "{\"title\":\"${GITHUB_KEY_TITLE}\",\"key\":\"${pub_key}\",\"read_only\":true}")"

  if [[ "$http_code" == "201" ]]; then
    echo "==> GitHub deploy key added."
  elif [[ "$http_code" == "422" ]]; then
    echo "==> GitHub returned 422 (likely key/title already exists)."
    cat "$response_file"
  else
    echo "Error: failed to add GitHub deploy key (HTTP ${http_code})."
    cat "$response_file"
    rm -f "$response_file"
    exit 1
  fi

  rm -f "$response_file"
}

show_remote_pubkey() {
  echo "==> Remote public key (add to GitHub Deploy Keys if not auto-added):"
  ssh "${SSH_ARGS[@]}" "$SSH_TARGET" "cat '$GITHUB_KEY_PATH.pub'"
}

deploy_remote_git() {
  echo "==> Running remote git deploy on ${SSH_TARGET}:${APP_DIR}"
  ssh "${SSH_ARGS[@]}" "$SSH_TARGET" \
    "APP_DIR='$APP_DIR' DEPLOY_BRANCH='$DEPLOY_BRANCH' GITHUB_REPO_HTTPS='$GITHUB_REPO_HTTPS' GITHUB_TOKEN='$GITHUB_TOKEN' NPM_INSTALL_CMD='$NPM_INSTALL_CMD' BUILD_CMD='$BUILD_CMD' RELOAD_CMD='$RELOAD_CMD' bash -s" <<'REMOTE_SCRIPT'
set -euo pipefail
cd "$APP_DIR"

if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  ASKPASS_FILE="$(mktemp)"
  cat > "$ASKPASS_FILE" <<'ASKPASS'
#!/usr/bin/env sh
case "$1" in
  *Username*) echo "x-access-token" ;;
  *Password*) echo "$GITHUB_TOKEN" ;;
esac
ASKPASS
  chmod 700 "$ASKPASS_FILE"

  # Pull with GitHub token without persisting credentials on server
  GIT_TERMINAL_PROMPT=0 GIT_ASKPASS="$ASKPASS_FILE" git fetch "$GITHUB_REPO_HTTPS" "$DEPLOY_BRANCH"
  git checkout "$DEPLOY_BRANCH"
  GIT_TERMINAL_PROMPT=0 GIT_ASKPASS="$ASKPASS_FILE" git pull --ff-only "$GITHUB_REPO_HTTPS" "$DEPLOY_BRANCH"

  rm -f "$ASKPASS_FILE"
else
  git fetch origin "$DEPLOY_BRANCH"
  git checkout "$DEPLOY_BRANCH"
  git pull --ff-only origin "$DEPLOY_BRANCH"
fi

eval "$NPM_INSTALL_CMD"
eval "$BUILD_CMD"
eval "$RELOAD_CMD"
REMOTE_SCRIPT
}

deploy_rsync() {
  if [[ -z "$DEPLOY_PATH" ]]; then
    echo "Error: DEPLOY_PATH is required for DEPLOY_MODE=rsync."
    exit 1
  fi

  if ! command -v rsync >/dev/null 2>&1; then
    echo "Error: rsync is required for DEPLOY_MODE=rsync."
    exit 1
  fi

  echo "==> Building project locally..."
  npm run build

  echo "==> Preparing remote directory: ${DEPLOY_PATH}"
  ssh "${SSH_ARGS[@]}" "$SSH_TARGET" "mkdir -p '$DEPLOY_PATH'"

  if [[ -n "$REMOTE_PRE_DEPLOY_CMD" ]]; then
    echo "==> Running remote pre-deploy command..."
    ssh "${SSH_ARGS[@]}" "$SSH_TARGET" "$REMOTE_PRE_DEPLOY_CMD"
  fi

  echo "==> Uploading dist/ to ${SSH_TARGET}:${DEPLOY_PATH}"
  rsync -az --delete -e "ssh ${SSH_ARGS[*]}" "$ROOT_DIR/dist/" "${SSH_TARGET}:${DEPLOY_PATH}/"

  if [[ -n "$REMOTE_POST_DEPLOY_CMD" ]]; then
    echo "==> Running remote post-deploy command..."
    ssh "${SSH_ARGS[@]}" "$SSH_TARGET" "$REMOTE_POST_DEPLOY_CMD"
  fi
}

if [[ "$DEPLOY_MODE" == "remote_git" ]]; then
  if [[ "$BOOTSTRAP_GITHUB_KEY" == "1" ]]; then
    bootstrap_github_key_remote
    add_remote_pubkey_to_github
    show_remote_pubkey
  fi
  deploy_remote_git
elif [[ "$DEPLOY_MODE" == "rsync" ]]; then
  deploy_rsync
else
  echo "Error: unknown DEPLOY_MODE='$DEPLOY_MODE'. Use remote_git or rsync."
  exit 1
fi

echo "==> Deploy completed successfully."
