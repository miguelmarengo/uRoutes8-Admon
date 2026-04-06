---
name: checar
description: >
  Úsalo al final de un ciclo de correcciones o de sesión cuando el usuario diga "ya terminé",
  "checamos?", "checar", etc. Orden: (1) verificar cambios en código, (2) impacto lateral en lo tocado,
  (3) sugerencias, (4) en webDashboardEntregas — tests pytest mínimos o suite completa según alcance
  (ver FASE 4). En @ss-corregir2 NO se debe correr la suite entera; aquí sí puede tardar un poco más.
  Nunca aplicar cambios por cuenta propia sin aprobación — reportar y sugerir.
---

# Skill: checar

Protocolo de cierre de sesión o de **ciclo de correcciones**. Cuatro bloques; en el bloque 1–3 no avanzar si falta verificación. El bloque 4 (tests) es al final y puede ser más lento.

---

## FASE 1 — VERIFICACIÓN DE CAMBIOS DE SESIÓN

### Objetivo
Confirmar que cada cambio acordado durante la sesión **existe en el código** y funciona como se
esperaba. No asumir — leer los archivos reales.

### Pasos

1. **Recopilar el inventario de cambios de la sesión**
   - Extraer de la conversación todos los archivos y funciones que se mencionaron como modificados
   - Si no es claro, preguntarle al usuario: _"¿Me confirmas los archivos que tocamos hoy?"_

2. **Leer cada archivo modificado** (no usar memoria — leer disco)
   ```
   Por cada archivo en el inventario:
     - Leer el archivo completo o la sección relevante
     - Buscar la implementación del cambio acordado
     - Marcar como ✅ VERIFICADO o ❌ FALTANTE / ⚠️ PARCIAL
   ```

3. **Emitir tabla de verificación**

   | # | Archivo | Cambio acordado | Estado | Observación |
   |---|---------|-----------------|--------|-------------|
   | 1 | `ruta/archivo.py` | Descripción breve | ✅ | — |
   | 2 | `ruta/otro.ts` | Descripción breve | ❌ | No se encontró la función X |
   | 3 | `ruta/comp.jsx` | Descripción breve | ⚠️ | Implementado pero incompleto |

4. **Si hay ❌ o ⚠️**: pausar aquí y reportar al usuario antes de continuar con Fase 2.
   No avanzar a sugerencias si hay cambios sin completar.

---

## FASE 2 — ANÁLISIS DE IMPACTO LATERAL

### Objetivo
Detectar, **solo dentro del alcance de los archivos modificados hoy**, patrones que sugieran
oportunidades de mejora. No revisar el proyecto completo — solo lo que se tocó.

### Tipos de análisis a aplicar

**A. Consistencia interna (mismo archivo)**
- ¿El cambio introduce un patrón que ya existe de otra forma en el mismo archivo?
- ¿Hay código duplicado que ahora podría unificarse?

**B. Propagación de patrón (archivos relacionados)**
- ¿El cambio resuelve un problema que probablemente existe en archivos hermanos/similares?
- Ejemplo: se corrigió validación en `endpoint_a.py` → ¿`endpoint_b.py` tiene el mismo bug?

**C. Oportunidad de abstracción**
- ¿El cambio repite lógica que podría extraerse a una función/componente reutilizable?

**D. Deuda técnica activada**
- ¿El cambio toca código que tiene un TODO, workaround, o comentario de "mejorar después"?

**E. Riesgo de regresión**
- ¿El cambio modifica algo que otros módulos consumen sin que hayamos actualizado esos módulos?

### Regla de alcance
> ⚠️ Solo sugerir mejoras que sean **consecuencia directa** de los cambios de esta sesión.
> No incluir mejoras globales del proyecto que no tienen relación con lo modificado hoy.

---

## FASE 3 — PRESENTACIÓN DE SUGERENCIAS

### Formato de salida

Presentar las sugerencias agrupadas por categoría. Cada sugerencia debe incluir:
- **Tipo**: una de las categorías abajo
- **Prioridad**: 🔴 Alta / 🟡 Media / 🟢 Baja
- **Qué hacer**: descripción concreta en 1-2 líneas
- **Por qué**: beneficio esperado
- **Archivo(s) afectado(s)**: ruta exacta

### Categorías de sugerencias

```
🔁 CONSISTENCIA     — Unificar patrones duplicados o inconsistentes
⚡ EFICIENCIA       — Reducir operaciones, llamadas, o loops innecesarios
🛡️ ROBUSTEZ         — Manejo de errores, validaciones, edge cases
♻️ REUTILIZACIÓN    — Extraer lógica repetida a funciones/componentes
🔗 PROPAGACIÓN      — Aplicar el mismo fix en archivos similares
🧹 DEUDA TÉCNICA    — Limpiar TODOs o workarounds activados por el cambio
⚠️ RIESGO           — Dependencias rotas o regresiones potenciales
```

### Ejemplo de salida

```
## 📋 Reporte de Sesión — [fecha]

### ✅ Verificación: 3/3 cambios confirmados

### 💡 Sugerencias derivadas de esta sesión (4)

---
🔗 PROPAGACIÓN | 🔴 Alta
Qué: Aplicar la misma validación de `null` que pusimos en `getRoute()` a `getRouteById()`
Por qué: Mismo patrón, mismo riesgo de crash en producción
Archivo: src/services/routeService.ts → función getRouteById() línea ~87

---
♻️ REUTILIZACIÓN | 🟡 Media  
Qué: Extraer el bloque de formateo de fechas (3 usos en el mismo archivo) a `formatDate()`
Por qué: Cambio futuro en formato implicaría editar 3 lugares
Archivo: src/components/OrderTable.jsx → líneas 45, 112, 178

---
🧹 DEUDA TÉCNICA | 🟢 Baja
Qué: Hay un TODO en línea 34 del archivo que tocamos: "// TODO: usar env var aquí"
Por qué: Ya estábamos en el archivo — conviene cerrarlo
Archivo: src/config/api.ts línea 34
```

---

## FASE 4 — TESTS AUTOMATIZADOS (solo aquí; no en `@ss-corregir2`)

### Objetivo
Ejecutar **solo** lo necesario antes de dar por cerrado el ciclo. `ss-corregir2.md` debe permanecer ágil; la batería pytest vive en esta fase.

### Alcance: `webDashboardEntregas` (silo Entregas)

Desde la raíz de este repo (carpeta `webDashboardEntregas` en el clon):

**1) Mínimo habitual** (~segundos) — login, sesión y contrato de rutas protegidas:

```bash
python -m pytest tests/test_login.py tests/test_login_first_contract.py -q --tb=short
```

**2) Si la sesión tocó dashboard, APIs de datos o agregaciones** — añadir smoke de API/HTML acotado:

```bash
python -m pytest tests/test_dashboard_cards_tables_map.py -q --tb=short
```

**3) Cierre duro / antes de merge** — red de seguridad completa (tarda varios minutos; solo una vez al final):

```bash
python -m pytest tests/ -q --tb=line
```

### Reglas
- No duplicar la suite completa en cada bug individual; corre **(1)** o **(1)+(2)** por defecto.
- Usar **(3)** cuando el usuario indique merge, release o “cerramos todo el sprint de fixes”.
- Si un fix es muy localizado y no toca auth ni `main.py`, puede bastar **(1)**; si solo tocaste un test o a doc, evalúa omitir o un archivo `-k` concreto.

---

## REGLAS GENERALES DEL SKILL

1. **Nunca ejecutar cambios** — este skill solo lee, analiza y sugiere. Los cambios los aprueba y
   ejecuta el usuario.

2. **Alcance estricto** — si se detecta algo interesante fuera del alcance de la sesión,
   mencionarlo en una nota al pie, no en las sugerencias principales.

3. **Sin relleno** — si no hay sugerencias genuinas, decirlo claramente:
   _"No encontré oportunidades de mejora derivadas de los cambios de hoy."_

4. **Preguntar si hay duda** — si el inventario de cambios no es claro, preguntar antes de
   proceder, no adivinar.

5. **Cierre explícito** — tras Fase 4 (si aplica), terminar con un resumen de tests + sugerencias:
   ```
   ✅ Sesión cerrada. Resultado pytest: … ¿Seguimos con alguna sugerencia?
   ```

---

## INVOCACIÓN

El usuario puede invocar este skill con cualquiera de estas frases:
- `checar`
- `checamos`
- `checar sesión`
- `cierra sesión`
- `qué hicimos hoy`
- `verifica los cambios`
- `reporte de sesión`
- `dame el reporte`
