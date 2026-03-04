#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

DEPLOY_USER="${DEPLOY_USER:-}"
DEPLOY_HOST="${DEPLOY_HOST:-}"
DEPLOY_PATH="${DEPLOY_PATH:-}"
DEPLOY_PORT="${DEPLOY_PORT:-22}"
SSH_KEY_PATH="${SSH_KEY_PATH:-}"
REMOTE_PRE_DEPLOY_CMD="${REMOTE_PRE_DEPLOY_CMD:-}"
REMOTE_POST_DEPLOY_CMD="${REMOTE_POST_DEPLOY_CMD:-}"

print_usage() {
  cat <<'EOF'
Usage:
  DEPLOY_USER=<user> DEPLOY_HOST=<host> DEPLOY_PATH=<remote_path> ./deploy.sh

Optional environment variables:
  DEPLOY_PORT=22
  SSH_KEY_PATH=/path/to/private_key
  REMOTE_PRE_DEPLOY_CMD='command to run on server before upload'
  REMOTE_POST_DEPLOY_CMD='command to run on server after upload'

Example:
  DEPLOY_USER=deploy \
  DEPLOY_HOST=203.0.113.10 \
  DEPLOY_PATH=/var/www/yukborweb \
  DEPLOY_PORT=22 \
  ./deploy.sh
EOF
}

if [[ -z "$DEPLOY_USER" || -z "$DEPLOY_HOST" || -z "$DEPLOY_PATH" ]]; then
  echo "Error: DEPLOY_USER, DEPLOY_HOST and DEPLOY_PATH are required."
  print_usage
  exit 1
fi

if ! command -v rsync >/dev/null 2>&1; then
  echo "Error: rsync is required but not installed."
  exit 1
fi

if ! command -v ssh >/dev/null 2>&1; then
  echo "Error: ssh is required but not installed."
  exit 1
fi

SSH_ARGS=(-p "$DEPLOY_PORT" -o BatchMode=yes)
if [[ -n "$SSH_KEY_PATH" ]]; then
  SSH_ARGS+=(-i "$SSH_KEY_PATH")
fi

SSH_TARGET="${DEPLOY_USER}@${DEPLOY_HOST}"

echo "==> Building project..."
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

echo "==> Deploy completed successfully."
