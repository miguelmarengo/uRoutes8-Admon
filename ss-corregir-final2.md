# 🛠️ @ss-corregir-final2 — Protocolo de Cierre, Certificación y Deploy

> **Uso:** Al terminar una sesión de correcciones, abre Cursor Composer (`Cmd/Ctrl + I`) y escribe:
> *"Ejecuta el protocolo de cierre usando @ss-corregir-final2.md"*
>
> **Regla de confirmación:** La IA se detiene al final de CADA fase y espera que escribas **"Continúa"** antes de avanzar. Sin esa palabra, no avanza.

---

## ⚙️ REGLA DE ORO (No negociable)

> **CERO REGRESIONES.** No refactorices lo que no se tocó. No cambies estilos generales. No supongas — pregunta. Tu único objetivo es certificar que lo arreglado funciona y que nada de lo que ya funcionaba se rompió.

---

## 🔢 CHECKLIST DE VERSIÓN (+1 OBLIGATORIO)

Ejecuta este checklist en **Fase 4** cada vez que la sesión cierre con al menos un bug corregido o mejora funcional.

### Repositorio principal (`web_dashboard_cliente`)

| # | Archivo | Acción |
|---|---------|--------|
| 1 | `version.properties` (raíz del monorepo) | Subir `VERSION_MINOR` en +1. Subir `VERSION_CODE` en +1. |
| 2 | `web_dashboard_cliente/src/config.py` | `APP_VERSION` debe leerlo `read_app_version()` desde env o `version.properties`. **No hardcodear.** |
| 3 | `web_dashboard_cliente/src/app.py` | `inject_env` y `GET /revision.json` usan `APP_VERSION` de `config`. Mismo valor en footer, login y JSON. |
| 4 | `web_dashboard_cliente/deploy.sh` | Actualizar valor por defecto: `APP_VERSION=${APP_VERSION:-X.XX}` con la nueva versión. |
| 5 | `web_dashboard_cliente/run.sh` | Verificar que `APP_VERSION` esté exportada o leída desde `version.properties` para correr local. |
| 6 | `web_dashboard_cliente/prd.md` | Cabecera **Versión:** = nueva `X.XX`. |
| 7 | `web_dashboard_cliente/templates/layout.html` y `login.html` | Jinja `default('X.XX')` = nueva versión (fallback visual). |
| 8 | `web_dashboard_cliente/CHANGELOG.md` | Nueva entrada: fecha + versión + viñetas técnicas de lo corregido. |
| 9 | `web_dashboard_cliente/prd.md §13` | Nueva fila en tabla *Version History* con resumen funcional. |
| 10 | **Este archivo `ss-corregir-final2.md`** | Si cambia el proceso o rutas, actualizar esta tabla en la misma sesión. |

**Verificación rápida:** Footer en UI == `GET /revision.json` == `log_login.app_version` == `APP_VERSION`. Los cuatro deben mostrar el mismo número.

---

### Repositorio `webOptimizador` (si aplica)

| # | Archivo | Acción |
|---|---------|--------|
| 1 | `frontend/src/version.js` | Incrementar `APP_VERSION` en +1 (último dígito). |
| 2 | `CHANGELOG.md` | Entrada fechada con cambios técnicos. |
| 3 | `run.sh` | Verificar que levante correctamente en local antes de hacer deploy. |
| 4 | `deploy.sh` | Verificar que el build esté limpio y que la versión esté inyectada. |
| 5 | `PRD.md` | Cabecera y §23 con versión SPA actualizada. |

**Health check obligatorio:** `GET /health` → HTTP 200 → Body JSON: `{"service":"webOptimizador","status":"ok"}` — no texto plano.

---

## 🤖 PROTOCOLO DE EJECUCIÓN PARA CURSOR COMPOSER

```xml
<role>
Actúa como Staff Engineer y QA Lead. Certifica, limpia y sella el código de esta sesión antes de producción.
REGLA: CERO REGRESIONES. No refactorices fuera del scope. Pregunta antes de modificar si hay duda.
</role>
```

---

### FASE 1 — AUDITORÍA Y CLEAN CODE (`🔍 Sin regresiones`)

**Acción:**
1. Analiza el diff completo de todos los archivos modificados en esta sesión.
2. Elimina `console.log`, `console.debug` y `print()` temporales de debugging. Conserva `console.warn`, `console.error` y logs de sistema.
3. Si quedó código duplicado por el fix, unifícalo quirúrgicamente (solo el alcance del fix, no el archivo entero).
4. Verifica que ningún import quedó sin usar como consecuencia de la corrección.
5. Confirma que no se modificaron componentes fuera del scope declarado en el ticket.

**Output esperado:**
```
🔍 AUDITORÍA FASE 1:
- Archivos revisados: [lista]
- console.logs eliminados: [N]
- Código duplicado unificado: [sí/no — dónde]
- Imports huérfanos eliminados: [N]
- Componentes fuera de scope tocados: [ninguno / detalle si aplica]
- Veredicto: LIMPIO ✅ / PENDIENTE ⚠️ [razón]
```

**⏸️ DETENTE — escribe "Continúa" para avanzar a Fase 2.**

---

### FASE 2 — CERTIFICACIÓN DE SALUD (`🩺 Health Checks`)

**Acción:**
1. Confirma teóricamente que `GET /health` sigue respondiendo `200` con JSON `{"service":"webOptimizador","status":"ok"}`.
2. Verifica que ningún contrato HTTP (rutas, payloads, headers) haya cambiado sin documentarlo.
3. Si se tocó autenticación, sesión o cookies: confirmar coherencia con el PRD.
4. Si se tocaron pines de mapa (lat/lng) o lógica de *Liquidado*: confirmar que no se alteró negativamente.
5. Si se tocó Firebase/Firestore: confirmar que las suscripciones (`onSnapshot`) y mutaciones siguen coherentes.
6. Si se tocó cálculo de costos o refrigeración: verificar que `isRefrigerated` fluye correctamente desde el feed hasta la UI.

**Output esperado:**
```
🩺 HEALTH CHECK FASE 2:
- GET /health: OK ✅ / ROTO ❌ [detalle]
- Contratos HTTP modificados: [ninguno / lista con justificación]
- Auth/sesión afectada: [sí/no]
- Mapa/Liquidado afectado: [sí/no]
- Firebase coherente: [sí/no]
- Veredicto: SALUDABLE ✅ / RIESGO ⚠️ [razón]
```

**⏸️ DETENTE — escribe "Continúa" para avanzar a Fase 3.**

---

### FASE 3 — TESTS Y COHERENCIA (`🧪 Suite de pruebas`)

**Acción:**
1. Revisa si algún test existente fallaría con los cambios aplicados (payloads modificados, mocks desactualizados, funciones renombradas).
2. Si hay tests rotos por el fix: actualízalos para que reflejen la nueva lógica correcta.
3. Elimina tests de funciones que se hayan borrado en Fase 1.
4. NO escribas tests nuevos salvo que el ticket lo exija explícitamente.
5. Deja una nota de qué comando usar para validar: `make verify`, `pytest -n auto`, `vitest run`, según el repo.

**Output esperado:**
```
🧪 TESTS FASE 3:
- Tests revisados: [N]
- Tests actualizados: [N — cuáles y por qué]
- Tests eliminados: [N — cuáles]
- Tests nuevos escritos: [0 / N si el ticket lo requería]
- Comando de validación: [make verify / pytest -n auto / vitest run]
- Veredicto: COHERENTE ✅ / PENDIENTE ⚠️
```

**⏸️ DETENTE — escribe "Continúa" para avanzar a Fase 4.**

---

### FASE 4 — VERSIÓN, DOCUMENTACIÓN Y SELLO (`📦 Release`)

**Acción:**
1. Aplica el **Checklist de Versión (+1)** de la tabla de arriba, según el repositorio activo.
2. Actualiza `CHANGELOG.md` con entrada fechada y viñetas técnicas concretas (qué se arregló, archivo, línea aproximada).
3. Actualiza `prd.md`: cabecera Versión + §13 Version History con resumen funcional del fix.
4. Si hubo cambio de contrato HTTP, regla de negocio o límite operativo: reflejar en la sección correspondiente del PRD.
5. Verifica que `run.sh` esté actualizado y funcional para levantar localmente.
6. Verifica que `deploy.sh` tenga la versión correcta inyectada y el flujo de build/push listo.
7. Actualiza este archivo `ss-corregir-final2.md` si el proceso cambió.

**Output esperado:**
```
📦 SELLO FASE 4:
- Versión anterior: vX.XX → Nueva versión: vX.XY
- version.properties actualizado: ✅
- config.py / version.js actualizado: ✅
- deploy.sh actualizado con nueva versión: ✅
- run.sh verificado y funcional: ✅
- CHANGELOG.md entrada añadida: ✅
- prd.md cabecera + §13 actualizados: ✅
- Archivos desactualizados encontrados: [ninguno / lista]
```

**⏸️ DETENTE — escribe "Continúa" para el cierre final.**

---

### FASE 5 — CIERRE Y DEPLOY (`🚀 Listo para producción`)

**Precondición:** Fases 1-4 completadas y con veredicto ✅.

**Acción:**
1. Confirma que `run.sh` y `deploy.sh` existen, tienen permisos de ejecución (`chmod +x`) y tienen la versión correcta.
2. El mensaje de commit en `deploy.sh` debe seguir el formato convencional:
   ```
   fix: [descripción corta del bug] — vX.XY
   ```
3. Imprime el bloque de cierre final con la versión real (no el placeholder):

```
=========================================
🎉 ¡LISTO! CERTIFICACIÓN COMPLETADA 🎉
=========================================

Versión certificada: vX.XY
Fecha: YYYY-MM-DD

Bugs corregidos esta sesión:
  • [Bug 1 — archivo — descripción en 1 línea]
  • [Bug 2 — archivo — descripción en 1 línea]

El código está limpio, sin regresiones y documentado.

Para probar en local:
  > ./run.sh

Para hacer commit + deploy a producción:
  > ./deploy.sh

=========================================
```

---

## 📁 SCRIPTS — PLANTILLAS ACTUALIZABLES

Verifica en Fase 4 que estos dos archivos existen en el repo y están al día.

### `run.sh` — Levantar en local
```bash
#!/usr/bin/env bash
# run.sh — Levantar la app en local para validación pre-deploy
set -euo pipefail

# Leer versión desde version.properties si existe
if [ -f "version.properties" ]; then
  MAJOR=$(grep VERSION_MAJOR version.properties | cut -d'=' -f2)
  MINOR=$(grep VERSION_MINOR version.properties | cut -d'=' -f2)
  PATCH=$(grep VERSION_PATCH version.properties | cut -d'=' -f2 2>/dev/null || echo "0")
  export APP_VERSION="${MAJOR}.${MINOR}.${PATCH}"
elif [ -f "frontend/src/version.js" ]; then
  export APP_VERSION=$(grep APP_VERSION frontend/src/version.js | grep -oP '[\d.]+')
fi

echo "▶ Levantando app local — versión: ${APP_VERSION:-local}"

# ── Adaptar al stack del proyecto ──────────────────────────
# Python/Flask:        python src/app.py
# Node/React (dev):    cd frontend && npm run dev
# Docker Compose:      docker compose up --build
# FastAPI/uvicorn:     uvicorn app.main:app --reload
# ──────────────────────────────────────────────────────────
```

### `deploy.sh` — Build, commit y push a producción
```bash
#!/usr/bin/env bash
# deploy.sh — Certificar, versionar, hacer commit y desplegar a producción
set -euo pipefail

# 1. Leer versión
if [ -f "version.properties" ]; then
  MAJOR=$(grep VERSION_MAJOR version.properties | cut -d'=' -f2)
  MINOR=$(grep VERSION_MINOR version.properties | cut -d'=' -f2)
  PATCH=$(grep VERSION_PATCH version.properties | cut -d'=' -f2 2>/dev/null || echo "0")
  export APP_VERSION="${MAJOR}.${MINOR}.${PATCH}"
elif [ -f "frontend/src/version.js" ]; then
  export APP_VERSION=$(grep APP_VERSION frontend/src/version.js | grep -oP '[\d.]+')
fi

echo "🚀 Iniciando deploy — versión: ${APP_VERSION}"

# 2. Build (adaptar al stack)
# Python:    pip install -r requirements.txt
# Node/SPA:  cd frontend && npm ci && npm run build

# 3. Git: stage → commit → push
git add -A
git commit -m "fix: correcciones sesión — v${APP_VERSION}"
git push origin main   # cambiar rama si aplica: develop, staging, etc.

# 4. Deploy al servidor (adaptar)
# Cloud Run:   gcloud run deploy SERVICIO --image gcr.io/PROYECTO/imagen:${APP_VERSION} --region us-central1
# SSH/VPS:     ssh user@servidor "cd /app && git pull && ./restart.sh"
# Docker Hub:  docker build -t imagen:${APP_VERSION} . && docker push imagen:${APP_VERSION}

echo "✅ Deploy completado — v${APP_VERSION}"
echo "   Verificar en producción: GET /revision.json debe mostrar ${APP_VERSION}"
```

---

## 🗂️ REFERENCIA RÁPIDA DE TIPOS DE ERROR

| Síntoma | Causa frecuente | Fase crítica |
|---------|----------------|--------------|
| UI no refleja cambios de DB | `onSnapshot` no suscrito / caché no invalidado | Fase 2 |
| Tooltip/modal cortado | `overflow:hidden` en ancestro / z-index bajo | Fase 1 |
| Campo duplicado en pantalla | Componente renderizado dos veces | Fase 1 |
| Valor siempre en 0 | Propiedad mal mapeada desde JSON/feed | Fase 2 |
| Label/texto no actualizado | Build antiguo en caché / merge no aplicado | Fase 2 |
| Estado no persiste entre vistas | Mutación local sin propagación al store global | Fase 2 |
| Refrigeración ignorada en costos | `isRefrigerated` no leído del feed de Google Sheets | Fase 2 |

---

> **Versión de este protocolo:** 2.0
> **Actualizar** este archivo si cambia el stack, los scripts, o el proceso de deploy del proyecto.
