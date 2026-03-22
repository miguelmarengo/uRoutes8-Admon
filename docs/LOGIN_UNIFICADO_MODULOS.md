# Login unificado entre módulos (empresa / usuario / bodega)

**Archivo:** `docs/LOGIN_UNIFICADO_MODULOS.md`  
**Última revisión:** 2026-03-21

Referencia única para que los programas que den acceso a operadores (web, scripts, etc.) se comporten **igual**. La **app Kotlin** puede usar UI distinta, pero conviene el **mismo contrato HTTP y JSON** descrito aquí.

---

## Índice

1. [Qué problema resolvemos](#1-qué-problema-resolvemos)  
2. [Flujo de pantallas](#2-flujo-de-pantallas-recomendado-para-todos-los-módulos-no-kotlin)  
3. [Contrato de datos (respuesta)](#3-contrato-de-datos-respuesta-de-login)  
4. [Endpoint HTTP `loginCliente`](#4-endpoint-http-cloud-function-logincliente)  
5. [Cómo unificar (paquete vs copia)](#5-cómo-unificar-sin-un-solo-login-empaquetado)  
6. [Kotlin](#6-kotlin-excepción-de-ui)  
7. [Checklist por módulo](#7-checklist-para-cada-módulo-nuevo)  
8. [Ubicación en el repo](#8-dónde-está-implementado-en-este-repo)  
9. [Resumen](#9-resumen-en-una-frase)  
10. [Ejemplo HTML, tipos TS, sesión, seguridad](#10-continuación-ejemplo-listo-tipos-y-sesión)  
11. [Ejecutar el login, guardar sesión y leer Sheet / Firestore](#11-ejecutar-el-login-guardar-sesión-y-leer-sheet--firestore)  
12. [Cómo aplicar esto en cada módulo](#12-cómo-aplicar-esto-en-cada-módulo)

---

## 1. Qué problema resolvemos

| Concepto | Dónde se define |
|----------|-----------------|
| Empresa y sus bodegas | Firestore: colección `empresas`, campo `bodegas` (array en el documento). |
| Usuario operador | Colección `usuarios`: `empresaId`, **`bodegaIds`** (array de ids de bodega). |
| Token de entrada | Campo `tokenAcceso` (3 caracteres alfanuméricos), configurado en el panel. |

Reglas de negocio:

- En el **panel**, si la empresa tiene bodegas, cada usuario debe tener **al menos una** bodega marcada en `bodegaIds`; eso define **a qué puede acceder** (si marcas las cuatro, el login trae **cuatro**; si solo una, trae **una**).
- El **login HTTP** (`loginCliente`) y **webOptimizador** solo envían en **`bodegas`** las bodegas **asignadas a ese usuario** (intersección con el catálogo de la empresa). **No** se envía el listado completo de la empresa al cliente.
- Si el usuario **no** tiene `bodegaIds` (ni `bodegaId` legado) y la empresa **sí** tiene bodegas en Firestore, el login **no es válido** (Optimizador: no matchea usuario; `loginCliente`: `bodegas` vacío).
- Si la empresa tiene **`googleMapsApiKey`** en Firestore, el JSON de `loginCliente` puede incluir **`empresa.googleMapsApiKey`** (clave de navegador; sin `firebaseConfig` ni service accounts).
- Tras login, el operador elige **`bodegaActivaId`** para la sesión (trabajo y dashboards).
- **Legado:** si en Firestore aún existe `bodegaId` (un solo id) y no hay `bodegaIds`, el servidor lo sigue interpretando hasta migrar el documento.

---

## 2. Flujo de pantallas (recomendado para todos los módulos no Kotlin)

### Paso A — Identificación (una pantalla)

| Orden | Campo | Obligatorio | Notas |
|------|--------|-------------|--------|
| 1 | **Empresa** | Recomendado | Código, nombre corto o selector. Contexto para el operador; extensiones futuras del API. |
| 2 | **Usuario** | Opcional | Email o código interno; puede ir vacío si solo usan token. |
| 3 | **Token de acceso** | **Sí** | Tres caracteres: `tokenAcceso` del panel. |

Al enviar: **POST** al endpoint (§4). Hoy el backend resuelve al usuario **solo con el token** normalizado (sin espacios, 3 caracteres). Empresa/Usuario en pantalla pueden ser **recordatorio visual** hasta exista validación en servidor.

### Paso B — Selección de bodega

| Situación | Acción |
|-----------|--------|
| `bodegas.length === 0` | Error claro: sin bodegas asignadas o usuario sin empresa; contactar administrador. |
| `bodegas.length === 1` | **Auto-seleccionar** `bodegaActivaId = bodegas[0].id` y continuar (sin pantalla extra, opcional). |
| `bodegas.length > 1` | Pantalla/modal: “¿Con qué bodega trabajas?” usando **solo** `response.bodegas`. |

### Paso C — Sesión de trabajo

Persistir (memoria, `sessionStorage`, `localStorage` o store del framework):

- Objeto **`usuario`** (campos públicos de la respuesta)
- **`empresa`** (`id`, `nombre`, opcional `googleMapsApiKey`)
- **`bodegas`** (solo las que el usuario tiene asignadas)
- **`bodegaActivaId`** (elegida por el operador entre esas `bodegas`)

Toda vista que use hoja Google o datos por centro debe filtrar por **`bodegaActivaId`** y comprobar que ese `id` siga en **`bodegas`** devueltas por el login.

---

## 3. Contrato de datos (respuesta de login)

### 3.1 `usuario`

- `id`, `nombre`, `email`, `empresaId`, `activo`
- **`bodegaIds`**: ids autorizados en Firestore (la lista útil para UI es **`bodegas`**)

### 3.2 `empresa`

- `id`, `nombre`.
- Opcional: **`googleMapsApiKey`** si está definida en el documento empresa (no se envían `firebaseConfig`, service accounts ni SMTP).

### 3.3 `bodegas`

- **Solo** bodegas que el usuario tiene asignadas en Firestore (`bodegaIds` o legado `bodegaId`), cruzadas con las que existen en `empresas/{id}.bodegas`.
- La comparación de **`id`** es **case-insensitive** (UUID en mayúsculas/minúsculas).
- Cada ítem incluye al menos `id`, `nombre`, `googleSheet`; el panel puede guardar más campos (dirección, contactos, etc.).

### 3.4 Casos límite

- **Usuario sin `empresaId`:** `empresa` será `null` y `bodegas` suele ir vacío.
- **Empresa con bodegas pero usuario sin asignar ninguna:** `bodegas` vacío; en Optimizador el login con Admon **falla** hasta asignar bodegas en el panel.
- **Compatibilidad:** `bodegaSeleccionada` y `googleSheet` en la raíz reflejan la **primera** entrada de `bodegas`. **No** sustituyen a **`bodegaActivaId`**.

### 3.5 Ejemplo JSON

```json
{
  "usuario": {
    "id": "abc123",
    "nombre": "María",
    "email": "m@ejemplo.com",
    "empresaId": "empX",
    "bodegaIds": ["b1", "b2"],
    "activo": true
  },
  "empresa": {
    "id": "empX",
    "nombre": "Llano de la Torre",
    "googleMapsApiKey": "AIza..."
  },
  "bodegas": [
    { "id": "b1", "nombre": "Bodega Norte", "googleSheet": "https://docs.google.com/..." },
    { "id": "b2", "nombre": "Bodega Sur", "googleSheet": "..." }
  ],
  "bodegaSeleccionada": { "id": "b1", "nombre": "Bodega Norte", "googleSheet": "..." },
  "googleSheet": "https://docs.google.com/..."
}
```

---

## 4. Endpoint HTTP (Cloud Function `loginCliente`)

| Aspecto | Valor |
|---------|--------|
| Método | `POST` |
| `Content-Type` | `application/json` |
| Cuerpo | `{ "tokenAcceso": "aB1" }` (también se acepta la propiedad `token`) |
| Región (este repo) | `us-central1` |
| CORS | Habilitado en la función |

En Firestore el valor puede estar en **`tokenAcceso`** (recomendado) o en campos antiguos: **`password`**, **`token`**, **`codigoAcceso`**, **`codigo`**. La función busca en todos en ese orden. El token enviado en el POST debe tener **exactamente 3** caracteres alfanuméricos (si un usuario tenía solo 2, hay que ampliarlo en el panel y guardar).

**URL típica tras desplegar:**

`https://us-central1-<PROJECT_ID>.cloudfunctions.net/loginCliente`

**Despliegue (desde la raíz del proyecto webAdmon):**

```bash
cd functions && npm install && cd .. && firebase deploy --only functions:loginCliente
```

### Errores HTTP

| HTTP | `code` | Significado |
|------|--------|-------------|
| 400 | `AUTH_TOKEN_BAD_FORMAT` | Token vacío o no tiene 3 caracteres válidos |
| 401 | `AUTH_TOKEN_INVALID` | Ningún usuario con ese token |
| 403 | `AUTH_USER_INACTIVE` | Usuario con `activo: false` |
| 405 | — | No es `POST` |
| 409 | `AUTH_TOKEN_AMBIGUOUS` | Más de un documento con el mismo token |
| 500 | — | Error interno (revisar logs de Cloud Functions) |

Los cuerpos de error suelen incluir `error` (texto) y a veces `code`; mostrar mensaje claro al operador y registrar `code` en consola/logs.

---

## 5. Cómo unificar sin un solo “login” empaquetado

- **Opción A — Documento + copia local:** cada módulo implementa el flujo §2 y los tipos §3 (recomendado al inicio).
- **Opción B — Paquete interno npm:** `@tu-org/uroutes-auth-client` con `loginCliente(url, token)` y componentes compartidos.
- **Opción C — Micro-app de login:** una SPA que escriba la sesión bajo la clave **`uroutes.session.v1`** (§10) y redirija o use `postMessage`.

**Sugerencia:** Opción A hasta que tres módulos dupliquen lo mismo; entonces Opción B.

---

## 6. Kotlin (excepción de UI)

Misma API y mismas reglas: POST → parsear `bodegas` → fijar **`bodegaActivaId`** antes de operar. La UI nativa puede diferir.

---

## 7. Checklist para cada módulo nuevo

- [ ] Orden visual: Empresa → Usuario (opcional) → Token.
- [ ] `POST` con `{ "tokenAcceso": "..." }` y manejo de errores §4.
- [ ] Si `bodegas.length === 0` → mensaje de soporte.
- [ ] Si `bodegas.length === 1` → auto `bodegaActivaId` (opcional pero coherente).
- [ ] Si `bodegas.length > 1` → selector explícito.
- [ ] Guardar sesión con **`bodegaActivaId`**; no confiar en listas de bodegas cargadas aparte del login.
- [ ] Al cambiar bodega en sesión, invalidar datos/caché del dashboard.
- [ ] HTTPS en producción.

---

## 8. Dónde está implementado en este repo

| Pieza | Ruta |
|-------|------|
| Construcción del JSON (referencia) | `src/lib/clienteSesion.js` (`buildClienteLoginResponse`, `collectUsuarioBodegaIds`) |
| Resolución en admin (con sesión Firebase) | `src/lib/firestore.js` (`resolveClienteSesionPorTokenAcceso`, …) |
| Cloud Function | `functions/index.js` (`loginCliente`), `functions/loginPayload.js` |
| Panel: empresas / bodegas / usuarios | `src/components/tabs/TabEmpresas.jsx`, `TabUsuarios.jsx` |
| Ejemplo HTML | `docs/ejemplo-login-vanilla/index.html` |
| Tipos TypeScript | `docs/login-response.types.ts` |

Cualquier cambio en el JSON debe reflejarse **en `clienteSesion.js` y en `functions/loginPayload.js`**.

---

## 9. Resumen en una frase

**Mismo criterio en todos los módulos: `bodegas` en la respuesta son solo las asignadas al usuario; el operador elige `bodegaActivaId` entre ellas.**

Si más adelante el servidor valida “empresa + usuario + token”, se amplía el body del `POST`; la selección de bodega **sigue igual**.

---

## 10. Continuación: ejemplo listo, tipos y sesión

### 10.1 HTML vanilla

**`docs/ejemplo-login-vanilla/index.html`** — URL del endpoint, contexto empresa/usuario, token, radios de bodegas, guardado en `sessionStorage`.

Probar con servidor local (evita CORS/`file://`):

```bash
cd docs/ejemplo-login-vanilla && npx --yes serve -l 3456 .
```

Abrir `http://localhost:3456`.

### 10.2 TypeScript

**`docs/login-response.types.ts`** — `LoginClienteResponse`, `UroutesSessionV1`, helpers `loginCliente()` y `readUroutesSession()`.

### 10.3 Clave de sesión acordada

| Clave | Almacén | Contenido mínimo |
|-------|---------|------------------|
| `uroutes.session.v1` | `sessionStorage` (preferido) o `localStorage` | `usuario`, `empresa`, `bodegas`, `bodegaActivaId`, `savedAt` |

El ejemplo HTML usa exactamente **`uroutes.session.v1`**.

### 10.4 Algoritmo mínimo (pseudo)

1. `POST` → parsear JSON como respuesta de login.  
2. Si no hay `bodegas` o `length === 0` → error.  
3. Si `length === 1` → `bodegaActivaId = bodegas[0].id`.  
4. Si `length > 1` → UI de selección.  
5. Persistir sesión y entrar al módulo.

### 10.5 Seguridad

El token de 3 caracteres es **débil** por diseño operativo; no reemplaza OAuth. Usar **HTTPS**, valorar **App Check** / rate limiting en `loginCliente`, y no exponer secretos de empresa en el cliente (el API no los incluye).

---

## 11. Ejecutar el login, guardar sesión y leer Sheet / Firestore

Esta sección es la guía operativa para programadores: **cómo llamar al login**, **qué objeto persistir**, **dónde** y **cómo recuperar** lo necesario para Google Sheet y para Firebase/Firestore.

### 11.1 Cómo ejecutar el login (orden exacto)

1. **Normalizar el token** en cliente: quitar caracteres que no sean letras/números y usar solo los **primeros 3** (igual que el panel).
2. **POST** al URL de la Cloud Function `loginCliente` (HTTPS).
3. **Parsear JSON**. Si `response.ok` es falso, leer `error` y opcionalmente `code` (§4).
4. Comprobar **`bodegas`**: si `length === 0`, no continuar.
5. Fijar **`bodegaActivaId`**: si hay una sola bodega, `bodegas[0].id`; si hay varias, el id que elija el usuario en UI.
6. **Construir el objeto de sesión** (§11.2) y **guardarlo** (§11.3).
7. Redirigir o montar el layout del módulo; en cada pantalla **leer la sesión** desde memoria/`sessionStorage` (§11.4–11.5).

**Ejemplo mínimo (JavaScript):**

```javascript
const LOGIN_URL = "https://us-central1-TU_PROYECTO.cloudfunctions.net/loginCliente";

function normalizarToken(t) {
  return String(t ?? "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 3);
}

async function ejecutarLogin(tokenCrudo) {
  const tokenAcceso = normalizarToken(tokenCrudo);
  if (tokenAcceso.length !== 3) throw new Error("Token debe tener 3 caracteres");

  const res = await fetch(LOGIN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tokenAcceso }),
  });

  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || res.statusText);
    err.code = data.code;
    throw err;
  }

  const bodegas = Array.isArray(data.bodegas) ? data.bodegas : [];
  if (bodegas.length === 0) throw new Error("Sin bodegas asignadas");

  let bodegaActivaId =
    bodegas.length === 1 ? bodegas[0].id : null; // si hay >1, asignar tras UI

  return { data, bodegaActivaId }; // si hay selector, vuelve a llamar a guardarSesion cuando el usuario elija
}
```

### 11.2 Qué guardar (estructura recomendada)

Guarda **toda la respuesta útil del login** más **`bodegaActivaId`**, para no volver a pedir al servidor lo que ya autorizó.

| Campo en sesión | Obligatorio | Para qué sirve |
|-----------------|------------|----------------|
| `version` | Sí | `1` — permite migrar el formato después. |
| `savedAt` | Sí | ISO timestamp de cuándo se guardó. |
| `usuario` | Sí | `id`, `nombre`, `email`, `empresaId`, `bodegaIds`, `activo`. |
| `empresa` | Sí* | `id`, `nombre`. *Puede ser `null` si el usuario no tiene empresa. |
| `bodegas` | Sí | Array completo devuelto por el login (autorizadas). |
| `bodegaActivaId` | Sí | Bodega con la que trabaja ahora el operador. |
| `loginClienteUrl` | Recomendado | URL usada en el POST (por si cambia entorno o se renueva el despliegue). |
| `rawLoginResponse` | Opcional | Copia completa del JSON por depuración (no imprescindible). |

**Ejemplo de objeto listo para `JSON.stringify` y guardar:**

```json
{
  "version": 1,
  "savedAt": "2026-03-22T12:00:00.000Z",
  "loginClienteUrl": "https://us-central1-xxx.cloudfunctions.net/loginCliente",
  "usuario": { "id": "…", "nombre": "…", "email": null, "empresaId": "…", "bodegaIds": ["b1","b2"], "activo": true },
  "empresa": { "id": "…", "nombre": "…" },
  "bodegas": [ { "id": "b1", "nombre": "…", "googleSheet": "https://docs.google.com/spreadsheets/d/ABC123/edit" } ],
  "bodegaActivaId": "b1"
}
```

### 11.3 Dónde guardarlo (memoria vs almacenamiento)

| Ubicación | Uso |
|-----------|-----|
| **Variable / store global** (React context, Pinia, singleton) | Acceso inmediato en la misma pestaña sin I/O; se pierde al recargar si no persistes. |
| **`sessionStorage`** | Recomendado para web: la sesión dura **solo esa pestaña**. Clave acordada: **`uroutes.session.v1`**. |
| **`localStorage`** | Persiste entre cierres del navegador; útil en tablets fijas, **riesgo** en PCs compartidos. |

**Guardar:**

```javascript
const SESSION_KEY = "uroutes.session.v1";

function guardarSesion(payload) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
}
```

**Leer al arrancar el módulo:**

```javascript
function leerSesion() {
  const raw = sessionStorage.getItem("uroutes.session.v1");
  if (!raw) return null;
  try {
    const s = JSON.parse(raw);
    if (s.version !== 1 || !s.bodegaActivaId) return null;
    return s;
  } catch {
    return null;
  }
}
```

Tras leer, **sincroniza también tu store en memoria** (por ejemplo `setSession(leerSesion())` al iniciar la app) para que el resto de componentes no toquen `sessionStorage` en cada render.

### 11.4 Cómo obtener el Google Sheet (id / URL) desde la sesión

El login **no** devuelve un “sheet id” suelto fiable para todas las apps: lo correcto es usar el campo **`googleSheet`** de la **bodega activa** dentro del array **`bodegas`** guardado en sesión.

**Paso 1 — Resolver la bodega activa:**

```javascript
function normId(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase();
}

function getBodegaActiva(sesion) {
  if (!sesion?.bodegas || !sesion.bodegaActivaId) return null;
  const want = normId(sesion.bodegaActivaId);
  return (
    sesion.bodegas.find((b) => normId(b.id) === want) ?? null
  );
}
```

**Paso 2 — Leer URL o id:**

- **`googleSheet`** puede ser una **URL completa** de Google Sheets o a veces solo el **id** del documento (según cómo lo cargaste en el panel).
- Para APIs de Google que piden el id numérico/alfanumérico del spreadsheet, extrae el id desde una URL típica:

```javascript
function extraerSpreadsheetId(googleSheet) {
  if (!googleSheet) return null;
  const s = String(googleSheet).trim();
  if (!s.includes("/")) return s; // ya es id
  const m = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : s;
}

// Uso
const sesion = leerSesion();
const b = getBodegaActiva(sesion);
const sheetIdParaApi = extraerSpreadsheetId(b?.googleSheet);
```

**Cambio de bodega en mitad de sesión:** actualiza `bodegaActivaId` en el objeto de sesión, vuelve a `sessionStorage.setItem`, y **invalida** datos del dashboard que dependían de la hoja anterior.

### 11.5 Firebase y Firestore: qué trae el login y qué no

**Importante:** la respuesta de `loginCliente` **no incluye** `firebaseConfig`, service accounts ni claves de Firebase de la empresa. Eso es intencional (secretos y configuración sensible viven en el panel admin, no en el cliente del operador).

| Necesidad | ¿Viene en el login? | Cómo suele resolverse hoy |
|-----------|---------------------|---------------------------|
| **ID de empresa** (`empresaId`) | Sí, en `usuario.empresaId` | Guardarlo en sesión para filtrar datos o rutas. |
| **Google Sheet de la bodega** | Sí, en `bodegas[].googleSheet` | §11.4. |
| **Google Maps (clave navegador)** | Opcional, en `empresa.googleMapsApiKey` si está en Firestore | Restringir por referrer en Google Cloud; no es un secreto de servidor. |
| **Inicializar Firebase (Firestore) en la app del operador** | No | Ver filas de abajo. |

**Patrones habituales para Firestore en apps de campo:**

1. **Build por empresa / por módulo:** variables de entorno (`VITE_*`, `google-services.json`, etc.) con el **mismo `firebaseConfig` público** que pegaste en el panel para esa empresa (apiKey, projectId, …). El login solo confirma **quién** es y **qué bodega**; el SDK ya apunta al proyecto correcto.
2. **Un solo proyecto Firebase para todos:** el `firebaseConfig` es común en el binario; las **reglas** y las **consultas** filtran por `empresaId` / `bodegaId` usando datos de la sesión del login.
3. **Futuro (si lo necesitáis):** un segundo endpoint **solo** que devuelva el objeto **`firebaseConfig` público** (no las service accounts) para un `empresaId` ya autenticado, o ampliar `loginCliente` con cuidado de no filtrar secretos.

**Resumen:** para **Sheet**, todo lo que necesitas del login está en **sesión → bodega activa → `googleSheet`**. Para **Firestore**, inicializa Firebase con la configuración que corresponda a vuestro despliegue (env / proyecto único) y usa **`usuario.empresaId`** y **`bodegaActivaId`** en queries y reglas.

### 11.6 Comprobar sesión antes de rutas protegidas

Pseudo-flujo al cargar cualquier página interna:

1. `sesion = leerSesion()` (o equivalente en memoria).  
2. Si `!sesion` → pantalla de login.  
3. Si `!getBodegaActiva(sesion)` → forzar selector de bodega o login de nuevo.  
4. Si todo OK → montar dashboard usando `sheetId` §11.4 y filtros §11.5.

---

## 12. Cómo aplicar esto en cada módulo

Usa la **misma regla mental** en todos: lo que el servidor pone en **`bodegas`** es **exactamente** lo que el usuario puede usar (ni más ni menos). No inventes listas de bodegas aparte del login salvo que leas Firestore con reglas admin (no es el caso del operador).

| Módulo | Mecanismo de sesión | Qué leer para bodegas | Qué leer para Maps (si aplica) |
|--------|---------------------|----------------------|--------------------------------|
| **Apps con `loginCliente`** (POST token) | JSON de la Cloud Function + tu `sessionStorage` / store | `response.bodegas` | `response.empresa?.googleMapsApiKey` |
| **webOptimizador** | Cookie `access_token` (JWT) + `GET /api/me` | `data.bodegas` y `data.sheets` (el listbox de hojas sale de `bodegas` con `sheet_id`) | `data.googleMapsApiKey` o `GET /api/config` |
| **Kotlin / nativo** | Igual que fila 1: POST y parsear JSON | `bodegas` | `empresa.googleMapsApiKey` opcional |

**Checklist rápido al integrar un módulo nuevo**

1. Tras autenticar, si `bodegas.length === 0` → no entrar al dashboard (mensaje: asignar bodegas en Admon).
2. `bodegaActivaId` debe ser siempre uno de los `id` de `bodegas` devueltas.
3. No mostrar bodegas de la empresa que no vengan en `bodegas` (el operador no debe ver centros a los que no tiene acceso).
4. Mantener alineados `src/lib/clienteSesion.js` y `functions/loginPayload.js` si tocáis el shape del JSON en webAdmon.

**Referencia de código (este monorepo)**

| Módulo | Archivos |
|--------|----------|
| JSON `loginCliente` | `webAdmon/functions/loginPayload.js`, `webAdmon/src/lib/clienteSesion.js` |
| Optimizador login Firestore | `webOptimizador/app/admon_login.py` |
| JWT + `/api/me` | `webOptimizador/app/main.py` (`bodegas` en payload, `google_maps_api_key`) |
| Tipos TS copiables | `webAdmon/docs/login-response.types.ts` |
