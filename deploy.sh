#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

# Configuración: proyecto y región de Cloud Run
PROJECT_ID="${GCP_PROJECT_ID:-uroutes8-admon}"
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="${CLOUD_RUN_SERVICE:-webadmon}"
REPO_NAME="cloud-run-source-deploy"
IMAGE_NAME="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$SERVICE_NAME"

echo "Proyecto: $PROJECT_ID"
echo "Región:  $REGION"
echo "Servicio: $SERVICE_NAME"
echo ""

if ! command -v gcloud &>/dev/null; then
  echo "Necesitas instalar Google Cloud SDK: https://cloud.google.com/sdk/docs/install"
  exit 1
fi

if [[ ! -f .env.local ]]; then
  echo "Error: hace falta .env.local con VITE_FIREBASE_* para que Firebase funcione en producción."
  exit 1
fi

# Cargar .env.local para el build
set -a
source .env.local
set +a
echo "Variables de .env.local cargadas para el build."
echo ""

# Build local con Docker (así las VITE_* se incluyen en la app)
if ! command -v docker &>/dev/null; then
  echo "Error: hace falta Docker para construir la imagen con las variables de Firebase."
  echo "Instala Docker Desktop o usa el deploy desde Cloud Build (la app quedaría sin config Firebase)."
  exit 1
fi

echo "=== Crear repositorio en Artifact Registry (si no existe) ==="
gcloud artifacts repositories create "$REPO_NAME" \
  --repository-format=docker \
  --location="$REGION" \
  --project="$PROJECT_ID" 2>/dev/null || true

echo ""
echo "=== Configurar Docker para Artifact Registry ==="
gcloud auth configure-docker "$REGION-docker.pkg.dev" --quiet 2>/dev/null || true

echo ""
echo "=== Build de la imagen (con variables de Firebase) ==="
# Plataforma linux/amd64 para que Cloud Run pueda ejecutar la imagen (en Mac es arm64 por defecto)
docker build \
  --platform linux/amd64 \
  --build-arg VITE_FIREBASE_API_KEY="$VITE_FIREBASE_API_KEY" \
  --build-arg VITE_FIREBASE_AUTH_DOMAIN="$VITE_FIREBASE_AUTH_DOMAIN" \
  --build-arg VITE_FIREBASE_PROJECT_ID="$VITE_FIREBASE_PROJECT_ID" \
  --build-arg VITE_FIREBASE_STORAGE_BUCKET="$VITE_FIREBASE_STORAGE_BUCKET" \
  --build-arg VITE_FIREBASE_MESSAGING_SENDER_ID="$VITE_FIREBASE_MESSAGING_SENDER_ID" \
  --build-arg VITE_FIREBASE_APP_ID="$VITE_FIREBASE_APP_ID" \
  --build-arg VITE_TOKEN_ALTAS_BAJAS="$VITE_TOKEN_ALTAS_BAJAS" \
  -t "$IMAGE_NAME:latest" .

echo ""
echo "=== Push de la imagen ==="
docker push "$IMAGE_NAME:latest"

echo ""
echo "=== Deploy a Cloud Run ==="
yes y | gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE_NAME:latest" \
  --platform managed \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --allow-unauthenticated

echo ""
echo "Listo. La URL del servicio se muestra arriba."
