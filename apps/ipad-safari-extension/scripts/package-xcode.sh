#!/bin/zsh

set -euo pipefail

SCRIPT_DIR="${0:A:h}"
IPAD_DIR="${SCRIPT_DIR:h}"
REPOSITORY_ROOT="${IPAD_DIR:h:h}"
WEB_EXTENSION_DIR="$IPAD_DIR/build/web-extension"
XCODE_PROJECT_DIR="${IPAD_XCODE_PROJECT_DIR:-$IPAD_DIR/xcode}"
APP_NAME="${IPAD_APP_NAME:-Webtoon Image Translator}"
BUNDLE_IDENTIFIER="${IPAD_BUNDLE_IDENTIFIER:-com.webtoon.image-translator}"

if [[ -z "${IPAD_BACKEND_ORIGIN:-}" ]]; then
  print -u2 "Defina IPAD_BACKEND_ORIGIN com a origem HTTPS do backend no QNAP."
  exit 1
fi

if ! xcrun --find safari-web-extension-packager >/dev/null 2>&1; then
  print -u2 "O empacotador Safari não foi encontrado. Instale e abra o Xcode completo primeiro."
  exit 1
fi

cd "$REPOSITORY_ROOT"
npm run build:ipad

mkdir -p "$XCODE_PROJECT_DIR"
xcrun safari-web-extension-packager "$WEB_EXTENSION_DIR" \
  --project-location "$XCODE_PROJECT_DIR" \
  --app-name "$APP_NAME" \
  --bundle-identifier "$BUNDLE_IDENTIFIER" \
  --ios-only

print "Projeto iOS criado em $XCODE_PROJECT_DIR"
print "Abra o projeto no Xcode, selecione sua equipe de assinatura e instale no iPad."
