#!/bin/bash
set -euo pipefail

if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
  echo "Não execute este instalador com sudo. O serviço precisa ser registrado na sua sessão do macOS, não na sessão do root." >&2
  echo "Execute novamente sem sudo: ./scripts/macos-backend/install.sh" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
PYTHON="$ROOT_DIR/apps/api/.venv-ocr/bin/python"
LABEL="com.webtoon.image-translator.api"
APP_SUPPORT="$HOME/Library/Application Support/WebtoonImageTranslator"
LAUNCH_AGENTS="$HOME/Library/LaunchAgents"
ENV_FILE="$APP_SUPPORT/backend.env"
RUNNER="$APP_SUPPORT/run-backend.sh"
PLIST="$LAUNCH_AGENTS/$LABEL.plist"
UID_VALUE="$(id -u)"

if [[ ! -x "$PYTHON" ]]; then
  echo "Ambiente Python do OCR não encontrado: $PYTHON" >&2
  echo "Crie o ambiente e instale apps/api/requirements-ocr.txt antes de instalar o serviço." >&2
  exit 1
fi

mkdir -p "$APP_SUPPORT" "$LAUNCH_AGENTS" "$APP_SUPPORT/logs"
chmod 700 "$APP_SUPPORT" "$APP_SUPPORT/logs"

if [[ ! -f "$ENV_FILE" ]]; then
  umask 077
  cat > "$ENV_FILE" <<'EOF'
# Preencha somente a chave da sua conta DeepL.
DEEPL_API_KEY=
# Opcional: proteja as chamadas da extensão com um token local.
# API_ACCESS_TOKEN=
EOF
  chmod 600 "$ENV_FILE"
  echo "Arquivo de configuração criado: $ENV_FILE"
  echo "Preencha DEEPL_API_KEY e execute este instalador novamente."
  exit 0
fi

if ! grep -Eq '^DEEPL_API_KEY=.+$' "$ENV_FILE"; then
  echo "DEEPL_API_KEY não está preenchida em: $ENV_FILE" >&2
  exit 1
fi

cat > "$RUNNER" <<EOF
#!/bin/bash
set -euo pipefail
set -a
source "$ENV_FILE"
set +a
cd "$ROOT_DIR/apps/api"
exec "$PYTHON" -m uvicorn app.main:app --host 127.0.0.1 --port 8000
EOF
chmod 700 "$RUNNER"

cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$RUNNER</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ThrottleInterval</key>
  <integer>10</integer>
  <key>WorkingDirectory</key>
  <string>$ROOT_DIR/apps/api</string>
  <key>StandardOutPath</key>
  <string>$APP_SUPPORT/logs/backend.log</string>
  <key>StandardErrorPath</key>
  <string>$APP_SUPPORT/logs/backend.error.log</string>
</dict>
</plist>
EOF
chmod 600 "$PLIST"

launchctl bootout "gui/$UID_VALUE" "$PLIST" 2>/dev/null || true
launchctl bootstrap "gui/$UID_VALUE" "$PLIST"
launchctl kickstart -k "gui/$UID_VALUE/$LABEL"

echo "Backend instalado e iniciado como serviço: $LABEL"
echo "Logs: $APP_SUPPORT/logs"
