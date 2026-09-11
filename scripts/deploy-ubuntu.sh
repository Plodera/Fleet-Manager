#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="fleetcmd"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="/etc/${APP_NAME}.env"
SKIP_PULL=false

if [[ "${1:-}" == "--skip-pull" ]]; then
  SKIP_PULL=true
fi

if [[ ! -r "$ENV_FILE" ]]; then
  echo "Configuration is missing. Run: sudo -E $APP_DIR/scripts/setup-ubuntu.sh"
  exit 1
fi

cd "$APP_DIR"

if [[ "$SKIP_PULL" == "false" ]]; then
  git pull --ff-only
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

npm ci
npm run check
npm run build
npm run db:push

sudo systemctl restart "$APP_NAME"
sleep 3
sudo systemctl --no-pager --full status "$APP_NAME"

if ! curl --fail --silent --show-error "http://127.0.0.1:${PORT:-5000}/" >/dev/null; then
  echo "Deployment finished, but the local health check failed."
  echo "View logs with: sudo journalctl -u $APP_NAME -n 100 --no-pager"
  exit 1
fi

echo
echo "FleetCmD deployed successfully."
