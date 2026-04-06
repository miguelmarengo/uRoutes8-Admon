#!/usr/bin/env bash
# deploy.sh — Deploy a Cloud Run (misma filosofía que webOptimizador/deploy.sh)
# Uso: ./deploy.sh
# Requiere: .env.local con VITE_FIREBASE_*  |  opcional: .env.deploy (proyecto, región, servicio)

set -euo pipefail
cd "$(dirname "$0")"
ROOT="$(pwd)"

export CLOUDSDK_CORE_DISABLE_PROMPTS=1
export CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE=""

if [[ ! -f "$ROOT/.env.local" ]]; then
  echo "No se encontró .env.local en $ROOT"
  echo "Copia .env.local.example → .env.local y rellena las variables VITE_FIREBASE_*"
  echo "(Los mismos valores que en webOptimizador para el proyecto Admon.)"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source "$ROOT/.env.local"
set +a
[[ -f "$ROOT/.env.deploy" ]] && set -a && source "$ROOT/.env.deploy" && set +a

# Imagen Docker sin reutilizar capas de un build anterior (bundle Vite fresco). Desactivar: DOCKER_BUILD_NO_CACHE=0
export DOCKER_BUILD_NO_CACHE="${DOCKER_BUILD_NO_CACHE:-1}"

PROJECT_ID="${cloudProject:-${GCP_PROJECT_ID:-uroutes8}}"
if [[ -z "$PROJECT_ID" || "$PROJECT_ID" == "tu-proyecto-gcp" ]]; then
  echo "Define GCP_PROJECT_ID o cloudProject en .env.local o .env.deploy (carpeta $ROOT)"
  exit 1
fi

REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="${serviceName:-${CLOUD_RUN_SERVICE:-webadmon}}"
REPO_NAME="cloud-run-source-deploy"
IMAGE_NAME="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$SERVICE_NAME"
API_PROPAGATION_SLEEP="${API_PROPAGATION_SLEEP:-15}"

gcloud config set project "$PROJECT_ID" --quiet 2>/dev/null || :
GCLOUD_ACCOUNT=$(gcloud config get-value account 2>/dev/null || echo "")
PROJECT_NUM=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)' --quiet 2>/dev/null || :)

echo ">>> Proyecto:     $PROJECT_ID (número: ${PROJECT_NUM:-?})"
echo ">>> Cuenta gcloud: $GCLOUD_ACCOUNT"
echo ">>> Servicio:     $SERVICE_NAME  |  Región: $REGION"
echo ""

if ! command -v gcloud &>/dev/null; then
  echo "Instala Google Cloud SDK: https://cloud.google.com/sdk/docs/install"
  exit 1
fi

if [[ -z "${VITE_FIREBASE_PROJECT_ID:-}" ]]; then
  echo "VITE_FIREBASE_PROJECT_ID está vacío en .env.local (obligatorio para el build)."
  exit 1
fi

echo ">>> Habilitando APIs (Artifact Registry, Cloud Run, Cloud Build)..."
if ! gcloud services enable \
  artifactregistry.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  --project="$PROJECT_ID" \
  --quiet; then
  echo ""
  echo ">>> Fallo al habilitar APIs. Comprueba:"
  echo "    - Que la cuenta '$GCLOUD_ACCOUNT' tenga rol en el proyecto (Owner, Editor o Service Usage Admin)."
  echo "    - Facturación activa en el proyecto."
  echo "    - O actívalas a mano: https://console.cloud.google.com/apis/library?project=$PROJECT_ID"
  exit 1
fi

echo ">>> Esperando propagación IAM/APIs (${API_PROPAGATION_SLEEP}s)..."
sleep "$API_PROPAGATION_SLEEP"

# Opcional: Cloud Build necesita escribir en Artifact Registry
if [[ "${GRANT_CLOUD_BUILD_ARTIFACT_IAM:-}" == "1" ]] && [[ -n "$PROJECT_NUM" ]]; then
  CB_SA="${PROJECT_NUM}@cloudbuild.gserviceaccount.com"
  echo ">>> Otorgando roles/artifactregistry.writer a $CB_SA ..."
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$CB_SA" \
    --role="roles/artifactregistry.writer" \
    --quiet \
    2>/dev/null || echo "    (No se pudo asignar IAM; necesitas Owner/Security Admin.)"
fi

docker_daemon_ok() {
  command -v docker &>/dev/null && docker info &>/dev/null
}

build_and_push_local() {
  echo "=== Build de la imagen en Docker local (VITE_* inyectadas) ==="
  DOCKER_NO_CACHE_ARGS=()
  if [[ "${DOCKER_BUILD_NO_CACHE:-0}" == "1" ]]; then
    DOCKER_NO_CACHE_ARGS=(--no-cache)
    echo "    (DOCKER_BUILD_NO_CACHE=1 -> docker build --no-cache)"
  fi
  docker build \
    "${DOCKER_NO_CACHE_ARGS[@]}" \
    --platform linux/amd64 \
    --build-arg VITE_FIREBASE_API_KEY="${VITE_FIREBASE_API_KEY:-}" \
    --build-arg VITE_FIREBASE_AUTH_DOMAIN="${VITE_FIREBASE_AUTH_DOMAIN:-}" \
    --build-arg VITE_FIREBASE_PROJECT_ID="${VITE_FIREBASE_PROJECT_ID:-}" \
    --build-arg VITE_FIREBASE_STORAGE_BUCKET="${VITE_FIREBASE_STORAGE_BUCKET:-}" \
    --build-arg VITE_FIREBASE_MESSAGING_SENDER_ID="${VITE_FIREBASE_MESSAGING_SENDER_ID:-}" \
    --build-arg VITE_FIREBASE_APP_ID="${VITE_FIREBASE_APP_ID:-}" \
    --build-arg VITE_TOKEN_ALTAS_BAJAS="${VITE_TOKEN_ALTAS_BAJAS:-}" \
    --build-arg VITE_FIREBASE_PANEL_EMAIL="${VITE_FIREBASE_PANEL_EMAIL:-}" \
    --build-arg VITE_FIREBASE_PANEL_PASSWORD="${VITE_FIREBASE_PANEL_PASSWORD:-}" \
    -t "$IMAGE_NAME:latest" .

  echo ""
  echo "=== Push de la imagen ==="
  gcloud auth configure-docker "$REGION-docker.pkg.dev" --quiet 2>/dev/null || :
  docker push "$IMAGE_NAME:latest"
}

print_cloud_build_denied_help() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Cloud Build respondió PERMISSION_DENIED."
  echo ""
  echo "  Cuenta gcloud activa: $GCLOUD_ACCOUNT"
  echo "  Proyecto:             $PROJECT_ID"
  echo ""
  echo "  Asigna en IAM (roles/editor o roles/cloudbuild.builds.editor):"
  echo "    gcloud projects add-iam-policy-binding $PROJECT_ID \\"
  echo "      --member=\"user:$GCLOUD_ACCOUNT\" \\"
  echo "      --role=\"roles/cloudbuild.builds.editor\""
  echo ""
  echo "  Si el build sube la imagen pero falla el push, como Owner ejecuta una vez:"
  echo "    GRANT_CLOUD_BUILD_ARTIFACT_IAM=1 ./deploy.sh"
  echo ""
  echo "  O abre Docker Desktop y vuelve a ejecutar ./deploy.sh (build local)."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
}

build_remote_cloud_build() {
  echo "=== Build remoto en Cloud Build (cloudbuild.yaml + VITE_*; docker --no-cache) ==="
  gcloud services enable cloudbuild.googleapis.com --project="$PROJECT_ID" --quiet 2>/dev/null || :

  set +e
  out=$(gcloud builds submit . \
    --project="$PROJECT_ID" \
    --config=cloudbuild.yaml \
    --substitutions="_IMAGE=${IMAGE_NAME}:latest,_VITE_FIREBASE_API_KEY=${VITE_FIREBASE_API_KEY:-},_VITE_FIREBASE_AUTH_DOMAIN=${VITE_FIREBASE_AUTH_DOMAIN:-},_VITE_FIREBASE_PROJECT_ID=${VITE_FIREBASE_PROJECT_ID:-},_VITE_FIREBASE_STORAGE_BUCKET=${VITE_FIREBASE_STORAGE_BUCKET:-},_VITE_FIREBASE_MESSAGING_SENDER_ID=${VITE_FIREBASE_MESSAGING_SENDER_ID:-},_VITE_FIREBASE_APP_ID=${VITE_FIREBASE_APP_ID:-},_VITE_TOKEN_ALTAS_BAJAS=${VITE_TOKEN_ALTAS_BAJAS:-},_VITE_FIREBASE_PANEL_EMAIL=${VITE_FIREBASE_PANEL_EMAIL:-},_VITE_FIREBASE_PANEL_PASSWORD=${VITE_FIREBASE_PANEL_PASSWORD:-}" \
    2>&1)
  st=$?
  set -e
  printf '%s\n' "$out"
  if [[ $st -ne 0 ]]; then
    echo "$out" | grep -qi 'PERMISSION_DENIED\|permission denied' && print_cloud_build_denied_help
    exit "$st"
  fi
}

echo "=== Crear repositorio Artifact Registry (si no existe) ==="
# Una sola linea: evita que un salto mal formado deje "||" seguido de un token suelto (p. ej. "ue").
gcloud artifacts repositories create "$REPO_NAME" --repository-format=docker --location="$REGION" --project="$PROJECT_ID" 2>/dev/null || :

USE_CLOUD_BUILD="${USE_CLOUD_BUILD:-}"
if [[ -z "$USE_CLOUD_BUILD" ]]; then
  if ! docker_daemon_ok; then
    echo ">>> Docker no está en marcha -> Cloud Build en la nube."
    USE_CLOUD_BUILD=1
  fi
else
  USE_CLOUD_BUILD=1
fi

echo ""
if [[ -n "$USE_CLOUD_BUILD" ]]; then
  build_remote_cloud_build
else
  gcloud auth configure-docker "$REGION-docker.pkg.dev" --quiet 2>/dev/null || :
  build_and_push_local
fi

echo ""
echo "=== Deploy a Cloud Run ==="
gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE_NAME:latest" \
  --platform managed \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --allow-unauthenticated \
  --quiet

SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --format='value(status.url)' 2>/dev/null || :)

echo ""
echo "=============================================="
echo "  Deploy listo — webAdmon"
echo "=============================================="
if [[ -n "$SERVICE_URL" ]]; then
  echo "  URL: $SERVICE_URL"
else
  echo "  (Revisa la URL en la salida de gcloud arriba.)"
fi
echo ""
echo "  Si el navegador muestra una versión vieja: recarga forzada (Cmd+Shift+R)"
echo "  o incógnito. index.html ya no se cachea en el servidor."
echo "=============================================="
