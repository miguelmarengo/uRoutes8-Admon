#!/usr/bin/env bash
# Comprueba que puedes desplegar webAdmon (misma idea que webOptimizador/scripts/verificar_pre_deploy.sh).
# Uso: ./scripts/verificar_pre_deploy.sh

set -eo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"

echo "=============================================="
echo "VERIFICACIÓN PRE-DEPLOY — webAdmon"
echo "=============================================="
echo ""

FAIL=0

if [[ ! -f "$ROOT/.env.local" ]]; then
  echo "[✗] Falta .env.local (copia .env.local.example → .env.local y rellena VITE_*)."
  FAIL=1
else
  # shellcheck disable=SC1091
  set -a && source "$ROOT/.env.local" && set +a
  echo "[✓] .env.local encontrado"
  for key in VITE_FIREBASE_API_KEY VITE_FIREBASE_PROJECT_ID VITE_FIREBASE_APP_ID VITE_FIREBASE_PANEL_EMAIL VITE_FIREBASE_PANEL_PASSWORD; do
    v=$(printenv "$key" 2>/dev/null || true)
    if [[ -z "$v" ]]; then
      echo "[✗] $key vacío en .env.local"
      FAIL=1
    fi
  done
  [[ $FAIL -eq 0 ]] && echo "[✓] Variables VITE mínimas presentes"
fi

[[ -f "$ROOT/.env.deploy" ]] && set -a && source "$ROOT/.env.deploy" && set +a
PROJECT_ID="${cloudProject:-${GCP_PROJECT_ID:-uroutes8}}"
echo ""
echo "[ ] Proyecto GCP: $PROJECT_ID"

if ! command -v gcloud &>/dev/null; then
  echo "[✗] gcloud no está en PATH"
  FAIL=1
else
  echo "[✓] gcloud instalado"
  ACCT=$(gcloud config get-value account 2>/dev/null || echo "?")
  echo "    Cuenta activa: $ACCT"
fi

echo ""
echo "[ ] Docker (opcional: si no corre, deploy.sh usará Cloud Build)"
if command -v docker &>/dev/null && docker info &>/dev/null; then
  echo "[✓] Docker daemon OK → build local posible"
else
  echo "[!] Docker no disponible → hace falta permiso Cloud Build en el proyecto"
fi

echo ""
if [[ $FAIL -eq 0 ]]; then
  echo "=============================================="
  echo "Listo para: ./deploy.sh"
  echo "Si Cloud Build da PERMISSION_DENIED, pide rol Editor o"
  echo "Cloud Build Editor en IAM para tu cuenta en $PROJECT_ID."
  echo "=============================================="
else
  echo "=============================================="
  echo "Corrige lo anterior antes de ./deploy.sh"
  echo "=============================================="
  exit 1
fi
