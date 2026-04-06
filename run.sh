#!/usr/bin/env bash
# Bump VERSION (+1) y arranca Vite en modo desarrollo.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONOREPO="$(cd "$ROOT/.." && pwd)"
# shellcheck source=/dev/null
source "$MONOREPO/scripts/module_version.sh"
module_version_bump "$ROOT/VERSION"
cd "$ROOT"
if [[ ! -f node_modules/.bin/vite ]]; then
  echo ">>> Falta Vite en node_modules. Instalando dependencias (npm ci)…"
  npm ci || npm install
fi
exec npm run dev
