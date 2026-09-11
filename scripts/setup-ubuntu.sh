#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="fleetcmd"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="/etc/${APP_NAME}.env"
SERVICE_FILE="/etc/systemd/system/${APP_NAME}.service"
RUN_USER="${SUDO_USER:-$USER}"
NPM_PATH="$(command -v npm || true)"

if [[ -z "$NPM_PATH" ]]; then
  echo "Node.js and npm are required before running this setup."
  exit 1
fi

if ! command -v sudo >/dev/null 2>&1; then
  echo "sudo is required."
  exit 1
fi

read_required() {
  local prompt="$1"
  local variable_name="$2"
  local secret="${3:-false}"
  local value=""

  while [[ -z "$value" ]]; do
    if [[ "$secret" == "true" ]]; then
      read -r -s -p "$prompt: " value
      echo
    else
      read -r -p "$prompt: " value
    fi
  done

  if [[ "$value" == *$'\n'* || "$value" == *$'\r'* ]]; then
    echo "Values cannot contain line breaks."
    exit 1
  fi

  printf -v "$variable_name" '%s' "$value"
}

quote_systemd_value() {
  local value="$1"
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  printf '"%s"' "$value"
}

echo "FleetCmD Ubuntu setup"
echo "Application directory: $APP_DIR"
echo "Secrets will be written only to $ENV_FILE."
echo

read_required "PostgreSQL connection URL" DATABASE_URL true
read_required "Microsoft Entra tenant ID" GRAPH_TENANT_ID
read_required "Microsoft Entra application/client ID" GRAPH_CLIENT_ID
read_required "NEW Microsoft Entra client secret" GRAPH_CLIENT_SECRET true

SESSION_SECRET="$(openssl rand -hex 32)"

TEMP_ENV="$(mktemp)"
trap 'rm -f "$TEMP_ENV"' EXIT

{
  printf 'DATABASE_URL=%s\n' "$(quote_systemd_value "$DATABASE_URL")"
  printf 'DB_DRIVER=pg\n'
  printf 'SESSION_SECRET=%s\n' "$(quote_systemd_value "$SESSION_SECRET")"
  printf 'NODE_ENV=production\n'
  printf 'PORT=5000\n'
  printf 'MICROSOFT_GRAPH_TENANT_ID=%s\n' "$(quote_systemd_value "$GRAPH_TENANT_ID")"
  printf 'MICROSOFT_GRAPH_CLIENT_ID=%s\n' "$(quote_systemd_value "$GRAPH_CLIENT_ID")"
  printf 'MICROSOFT_GRAPH_CLIENT_SECRET=%s\n' "$(quote_systemd_value "$GRAPH_CLIENT_SECRET")"
} > "$TEMP_ENV"

sudo install -o root -g "$RUN_USER" -m 640 "$TEMP_ENV" "$ENV_FILE"

sudo tee "$SERVICE_FILE" >/dev/null <<EOF
[Unit]
Description=FleetCmD application
After=network.target postgresql.service

[Service]
Type=simple
User=$RUN_USER
WorkingDirectory=$APP_DIR
EnvironmentFile=$ENV_FILE
ExecStart=$NPM_PATH start
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable "$APP_NAME"

echo
echo "Configuration saved. Running the first deployment..."
"$APP_DIR/scripts/deploy-ubuntu.sh" --skip-pull
