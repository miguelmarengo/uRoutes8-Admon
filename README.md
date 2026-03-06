# uRoutes Admin

Panel de administración para gestionar empresas, usuarios y bitácoras (proyecto uRoutes8-Admon).

## Requisitos

- Node 18+
- Proyecto Firebase **uRoutes8-Admon** con Auth (Email/Password) y Firestore activados.

## Configuración

1. Clona o abre el proyecto y instala dependencias:

   ```bash
   cd webAdmon
   npm install
   ```

2. Crea el usuario admin en Firebase Console (Authentication → Email/Password):
   - Email: p. ej. `mm@uroutes-admin.local`
   - Contraseña: `mm` (o la que uses para login universal).

3. Variables de entorno: copia `.claves.example` a `.env.local` y rellena con la config de Firebase (Configuración del proyecto → Tus apps → SDK):

   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```

4. **Reglas de Firestore (obligatorio para que guardar funcione):** En Firebase Console del proyecto uRoutes8-Admon → Firestore Database → pestaña **Reglas**, pega el contenido del archivo `firestore.rules` de este repo y pulsa **Publicar**. Sin esto, las escrituras fallan o se quedan colgadas.

5. Arranca en desarrollo:

   ```bash
   npm run dev
   ```

6. Build para producción: `npm run build`. La salida queda en `dist/`.

## Estructura relevante

- `config/firebase.js`: inicialización de Firebase.
- `src/context/AuthContext.jsx`: estado global de autenticación.
- `src/pages/LoginPage.jsx`, `DashboardPage.jsx`: login y layout con tabs.
- `src/components/tabs/`: TabEmpresas, TabUsuarios, TabBitacora, TabEstadisticas.
- `src/lib/firestore.js`: helpers para colecciones `empresas`, `usuarios`, `bitacora`.

## Deploy a Cloud Run

```bash
./deploy.sh
```

Requisitos: [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) instalado y `gcloud login` hecho. El script usa el proyecto por defecto `uroutes8-admon` y la región `us-central1`; puedes sobreescribir con `GCP_PROJECT_ID`, `GCP_REGION` y `CLOUD_RUN_SERVICE`.

Si tienes `.env.local`, las variables `VITE_*` se pasan al build en Cloud Run para que Firebase quede configurado en la app desplegada.

## Rutas

- `/login`: pantalla de login.
- `/`: dashboard (protegido; redirige a `/login` si no hay sesión).
