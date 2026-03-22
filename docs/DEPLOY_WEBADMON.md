# Deploy webAdmon (alineado con webOptimizador)

Misma idea que `webOptimizador/deploy.sh`: variables en `.env.local`, proyecto GCP explícito, APIs sin preguntas interactivas, y build en **Docker local** o **Cloud Build** si Docker no corre.

## 1. Credenciales / valores (como en Optimizador)

Usa **el mismo proyecto Firebase (Admon)** que en Optimizador:

1. Copia plantillas:
   - `cp .env.local.example .env.local`
   - (Opcional) `cp .env.deploy.example .env.deploy`
2. Rellena en **`.env.local`** las mismas `VITE_FIREBASE_*` que ya tienes en `webOptimizador/.env.local` (o en `.claves`), más **`VITE_FIREBASE_PANEL_EMAIL`** y **`VITE_FIREBASE_PANEL_PASSWORD`** (usuario Email/Password en Firebase Auth del proyecto Admon; sin esto Firestore devuelve *Missing or insufficient permissions* en producción).
3. En **`.env.deploy`** (opcional) puedes fijar:
   - `GCP_PROJECT_ID` o `cloudProject` (igual que Optimizador)
   - `CLOUD_RUN_SERVICE` o `serviceName` (por defecto `webadmon`)
   - `GCP_REGION` (por defecto `us-central1`)
   - `API_PROPAGATION_SLEEP=60` la primera vez si acabas de crear el proyecto (Optimizador usa 60 s tras habilitar APIs).

No subas `.env.local` ni `.env.deploy` al repositorio.

## 2. Comprobar antes de subir

```bash
./scripts/verificar_pre_deploy.sh
```

## 3. Desplegar

```bash
./deploy.sh
```

- Si **Docker Desktop** está en marcha → build local + push a Artifact Registry.
- Si no → **Cloud Build** con `cloudbuild.yaml` (necesitas rol **Cloud Build Editor** o **Editor** en el proyecto; si falla el push de la imagen, un Owner puede ejecutar una vez `GRANT_CLOUD_BUILD_ARTIFACT_IAM=1 ./deploy.sh`).

Forzar siempre build en la nube:

```bash
USE_CLOUD_BUILD=1 ./deploy.sh
```

## 4. IAM habitual de errores

| Error | Qué hacer |
|-------|-----------|
| `PERMISSION_DENIED` en `gcloud builds submit` | IAM → tu usuario necesita `roles/cloudbuild.builds.editor` o `roles/editor` en el proyecto. |
| Build OK pero fallo al subir imagen | Como Owner: `GRANT_CLOUD_BUILD_ARTIFACT_IAM=1 ./deploy.sh` o asigna `roles/artifactregistry.writer` a `{PROJECT_NUMBER}@cloudbuild.gserviceaccount.com`. |

## 5. Referencia cruzada

- Optimizador: `webOptimizador/deploy.sh`, `webOptimizador/.env.local.example`
- Admon: `webAdmon/deploy.sh`, `webAdmon/cloudbuild.yaml`, `webAdmon/Dockerfile`
