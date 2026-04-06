#!/usr/bin/env bash
# 1) VERSION +1 y package.json sincronizado (scripts/module_version.sh)
# 2) Preflight npm ci + npm run build (bundle con la nueva versión)
# 3) deploy_cloudrun.sh → Cloud Run
#
# Opciones:
#   SKIP_DEPLOY_PREFLIGHT=1 ./deploy.sh     — sin npm ci/build local antes de Docker
#   DOCKER_BUILD_NO_CACHE=0 ./deploy.sh     — build Docker más rápido (reutiliza capas)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONOREPO="$(cd "$ROOT/.." && pwd)"
# shellcheck source=/dev/null
source "$MONOREPO/scripts/module_version.sh"
module_version_bump "$ROOT/VERSION"
# Sin caracteres «» (pueden romper el parseo con set -u en algunos entornos).
DEPLOY_VER="$(tr -d '\r\n' <"$ROOT/VERSION" 2>/dev/null || true)"
echo ">>> Desplegando versión: ${DEPLOY_VER} (visible en login)"
echo ""

export DOCKER_BUILD_NO_CACHE="${DOCKER_BUILD_NO_CACHE:-1}"

if [[ "${SKIP_DEPLOY_PREFLIGHT:-}" != "1" ]]; then
  echo ">>> Preflight: npm ci + npm run build (mismo tipo de build que dentro del Dockerfile)…"
  cd "$ROOT"
  npm ci
  rm -rf dist
  npm run build
  echo ">>> Preflight OK."
  echo ""
fi

exec bash "$ROOT/deploy_cloudrun.sh" "$@"
