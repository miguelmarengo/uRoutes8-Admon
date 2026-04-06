# 🛠️ Skill: Certificación y Sello de Versión (Post-Correcciones)

**Propósito:** Este documento es el Prompt Maestro para Cursor Composer. Se debe ejecutar **siempre** al finalizar una sesión de corrección de bugs o ajustes (`@ss-correcciones-fin.md`) para garantizar que el código modificado sea seguro, no rompa la aplicación, y quede listo para producción.

---

## 📋 Instrucciones de Uso (Humano)
1. Abre **Cursor Composer** (`Cmd/Ctrl + I`).
2. Escribe: *"Ejecuta el protocolo de cierre usando el archivo @ss-correcciones-fin.md"*.
3. La IA tomará el control basándose en el bloque `<cursor_prompt>` a continuación. Da tu confirmación ("Continúa") entre cada fase.

---

## 🔢 Versión del dashboard (+1) — checklist obligatorio

**Al cerrar una sesión que merezca release (o cuando el humano pida subir versión):** incrementar **en +1** la versión lógica del **web_dashboard_cliente** y dejar **alineados** todos los puntos siguientes. La **fuente numérica** del repo es **`version.properties`** en la **raíz del monorepo** (`VERSION_MAJOR`, `VERSION_MINOR`, `VERSION_PATCH`, `VERSION_CODE`).

| Orden | Ubicación | Qué hacer |
|-------|-----------|-----------|
| 1 | **`version.properties`** (raíz repo) | Subir `VERSION_MINOR` en +1 (o `VERSION_PATCH` si usáis parche), y `VERSION_CODE` en +1 si el proyecto lo exige para trazabilidad. |
| 2 | **`web_dashboard_cliente/src/config.py`** | `APP_VERSION` debe salir de `read_app_version()` (lee env `APP_VERSION` o `version.properties`). **No** hardcodear otra cifra aquí salvo fallback interno de la función. |
| 3 | **`web_dashboard_cliente/src/app.py`** | `inject_env` y `GET /revision.json` deben usar **`APP_VERSION`** importado de `config` (misma cadena en footer, login y JSON). |
| 4 | **`web_dashboard_cliente/deploy.sh`** | Valor por defecto `APP_VERSION=${APP_VERSION:-X.XX}` igual a la versión mostrada (para Cloud Run sin `.env`). |
| 5 | **`web_dashboard_cliente/prd.md`** | Cabecera **Versión:** misma `X.XX`. |
| 6 | **`web_dashboard_cliente/templates/layout.html`** y **`login.html`** | `default('X.XX')` en Jinja **igual** a la versión actual (fallback si fallara el context processor). |
| 7 | **`web_dashboard_cliente/CHANGELOG.md`** | Entrada con fecha y número de versión si aplica. |
| 8 | **`web_dashboard_cliente/prd.md` §13** | Fila en tabla *Version History* si hay cambio funcional documentable. |
| 9 | **Este archivo `ss-correcciones-fin.md`** | Si cambia el proceso o nuevas rutas de versión, **actualizar la tabla de arriba** en la misma sesión. |

**Verificación rápida:** con la app levantada, el footer y `GET /revision.json` deben mostrar la **misma** versión; con login, `log_login.app_version` debe coincidir con `APP_VERSION` (salvo override por variable de entorno en servidor).

---

## 🤖 Prompt Maestro para Cursor (Copiar o Referenciar en Composer)

<cursor_prompt>
<role>
Actúa como un **Staff Engineer y QA Lead** extremadamente riguroso. Tu objetivo es certificar, limpiar y "sellar" el código modificado en la sesión actual antes de enviarlo a producción. 
</role>

<core_directive>
**REGLA DE ORO: CERO REGRESIONES.** Tu trabajo NO es refactorizar todo el proyecto, ni cambiar el estilo general. Tu trabajo es asegurar que lo que se arregló funcione perfectamente y que **nada de lo que ya funcionaba se haya roto**. No hagas suposiciones. Si no estás seguro, pregunta antes de modificar.
</core_directive>

<execution_workflow>
Ejecuta este protocolo estrictamente en el orden indicado. **DETENTE al final de cada fase y pide mi confirmación explícita ("Continúa") antes de avanzar.**

### Fase 1: Auditoría "Cero Regresiones" y Clean Code
- **Acción:** Analiza el diff de los archivos modificados en esta sesión.
- **Limpieza:** Elimina código muerto, `console.log` o `print()` temporales dejados durante el debugging. Deja intactos los logs informativos (`warn`/`info`) del sistema.
- **DRY Quirúrgico:** Si dejaste código duplicado al hacer la corrección, unifícalo. NO refactorices archivos enteros, solo el alcance de esta sesión.
- **Espera confirmación.**

### Fase 2: Certificación de Salud (Health Checks)
- **Acción:** Verifica teóricamente que los contratos HTTP no se hayan roto.
- Confirma que `GET /health` siga respondiendo **200** con cuerpo **`OK`** (texto plano en este proyecto; no exige JSON `{"status":"ok"}`).
- Si en la sesión se tocó configuración o mapas: confirma que rutas relacionadas con sesión/cookies y `Maps_api_key` sigan coherentes con el PRD.
- Verifica que la lógica de los pines del mapa (lat/lng) y la funcionalidad de *Liquidado* no hayan sido alteradas negativamente (solo si hubo cambios en esas áreas).
- **Espera confirmación.**

### Fase 3: Limpieza y Certificación de Tests
- **Acción:** Revisa la suite de pruebas (actualmente ~92 tests).
- Si las correcciones de esta sesión rompieron algún test (ej. cambiaste un payload o un mock), **actualiza el test** para que coincida con la nueva lógica.
- Elimina tests de funciones que hayas borrado en la Fase 1.
- *Nota interna:* La validación final la haré yo con `make verify` o `pytest -n auto`, pero asegúrate de que el código de los tests sea coherente.
- **Espera confirmación.**

### Fase 4: Documentación, versión, PRD y CHANGELOG (Sello)
- **Acción:** Documenta la corrección y **aplica el checklist "Versión del dashboard (+1)"** de este mismo archivo si corresponde subir versión (incremento +1 y mismos valores en todas las filas de la tabla).
- Actualiza **CHANGELOG.md** con viñeta técnica bajo la versión/fecha adecuada.
- **PRD (`prd.md`):** además de la cabecera **Versión:** alineada al checklist, incorpora en **§13 *Version History*** (y en §1, §4 o §9 si el cambio lo exige) un **resumen claro de los cambios importantes de esta sesión de correcciones** (qué se arregló, alcance, APIs o pantallas tocadas). No dejes el PRD solo con el número de versión sin contexto.
- Si hubo cambio de contrato HTTP, límites o reglas de negocio, refleja también en las secciones correspondientes del PRD.
- **Actualiza este `ss-correcciones-fin.md`** si añadiste nuevas rutas de versión o cambió el proceso.
- **Espera confirmación.**

### Fase 5: Cierre triunfal (mensaje final con versión)
- **Precondición:** Fase 4 cumplida: **PRD** ya documenta los cambios relevantes de la sesión y la **versión** está unificada según el checklist.
- **Acción:** Imprime un **único** bloque de cierre (formato abajo). Sustituye **`vX.XX`** por la **versión real** que debe ver el usuario (la misma que `APP_VERSION` / footer / `GET /revision.json` tras el checklist). No uses el placeholder en la respuesta al humano.
- El mensaje puede ir seguido de una línea opcional de contexto (fuera del bloque decorado) si hace falta, pero el bloque en sí debe mantener la estructura fija.

```text
=========================================
🎉 TERMINE!!! CERTIFICACIÓN COMPLETADA 🎉
=========================================

Versión certificada: vX.XX

El código está limpio, sin regresiones y documentado.
Para levantar en local y probar, ejecuta:
> ./run.sh   (o 'make smoke')

Para desplegar a producción, ejecuta:
> ./deploy.sh
=========================================
```

*(En la entrega al usuario, `vX.XX` debe ser el valor concreto, p. ej. `v9.92`.)*

</execution_workflow>
</cursor_prompt>
