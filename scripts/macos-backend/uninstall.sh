#!/bin/bash
set -euo pipefail

LABEL="com.webtoon.image-translator.api"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

if [[ -f "$PLIST" ]]; then
  launchctl bootout "gui/$(id -u)" "$PLIST" 2>/dev/null || true
  rm -f "$PLIST"
fi

echo "Serviço removido. A configuração e os logs foram preservados em:"
echo "$HOME/Library/Application Support/WebtoonImageTranslator"
