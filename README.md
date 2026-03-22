# uRoutes Admin

Panel de administración para gestionar empresas, usuarios y bitácoras (proyecto uRoutes8).

## Requisitos

- Node 18+
- Proyecto Firebase **uRoutes8** (o el que uses para Admon) con Firestore activo.

## Configuración

1. Instalación:

   ```bash
   cd webAdmon
   npm install
   ```

2. Variables de entorno: copia **`.env.local.example`** → **`.env.local`** y rellena las `VITE_FIREBASE_*` con los **mismos valores** que en `webOptimizador/.env.local` (mismo proyecto Admon). También puedes partir de `.claves.example`.

3. **Login del panel:** primero usuario/contraseña en `src/lib/admonHardcodedAuth.js` (gaby/maria/mm). Después el cliente inicia sesión en **Firebase Auth** con `VITE_FIREBASE_PANEL_EMAIL` y `VITE_FIREBASE_PANEL_PASSWORD` (crea ese usuario en Firebase Console → Authentication → Email/Password). Sin esto, Firestore responde *Missing or insufficient permissions* porque las reglas exigen `request.auth != null`.

4. **Reglas de Firestore (obligatorio):** en Firebase Console → Firestore → **Reglas**, publica el contenido de `firestore.rules` de este repo.

5. Desarrollo:

   ```bash
   npm run dev
   ```

6. Build producción: `npm run build` → salida en `dist/`.

## Deploy a Cloud Run (como webOptimizador)

Guía detallada: **[docs/DEPLOY_WEBADMON.md](docs/DEPLOY_WEBADMON.md)**

Resumen:

```bash
cp .env.local.example .env.local    # y rellena VITE_* (iguales que Optimizador)
# opcional: cp .env.deploy.example .env.deploy
./scripts/verificar_pre_deploy.sh
./deploy.sh
```

- Sin prompts de gcloud (`CLOUDSDK_CORE_DISABLE_PROMPTS`).
- Habilita Artifact Registry, Cloud Run y Cloud Build.
- **Docker** en marcha → build local; si no → **Cloud Build** (`cloudbuild.yaml` con tus `VITE_*`).

Variables útiles: `GCP_PROJECT_ID` o `cloudProject`, `GCP_REGION`, `CLOUD_RUN_SERVICE` o `serviceName` (en `.env.deploy` o entorno). Ver `.env.deploy.example`.

## Estructura relevante

- `config/firebase.js`: Firebase (Firestore) para el panel.
- `src/context/AuthContext.jsx`: sesión del panel (hardcoded / `sessionStorage`).
- `src/pages/LoginPage.jsx`, `DashboardPage.jsx`: login y layout con tabs.
- `src/components/tabs/`: TabEmpresas, TabUsuarios, TabBitácora, TabEstadísticas.
- `src/lib/firestore.js`: colecciones `empresas`, `usuarios`, `bitácora`.

## Rutas

- `/login`: pantalla de login.
- `/`: dashboard (protegido).
