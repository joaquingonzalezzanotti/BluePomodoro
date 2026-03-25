# BluePomodoro - Documento Maestro de Desarrollo

Fecha: 2026-03-25  
Estado: Activo (living document)  
Alcance: producto, arquitectura, roadmap, backlog, riesgos y criterios de aceptacion

## 1) Resumen ejecutivo
BluePomodoro es una app de foco con:
- Timer Pomodoro persistente y registro de sesiones.
- Gestion de proyectos, materias, tareas y subtareas.
- Estadisticas diarias y mensuales agregadas en base de datos.
- Integraciones con Google Tasks, Google Calendar y Spotify.
- Notificaciones push (PWA).

Situacion actual:
- La integracion Google se opera en modo practico `read_only` durante validacion OAuth.
- Se implemento puente de materia por titulo Google (`[Materia] Titulo`).
- Sigue habiendo deuda tecnica para sync bidireccional robusto (conflictos, deletes, locks).

Meta de corto plazo:
- Estabilizar sync y experiencia diaria sin comprometer compliance de Google.

Meta de mediano plazo:
- Evolucionar a sync bidireccional auditable y tolerante a conflictos.

---

## 2) Estado actual del proyecto

### 2.1 Stack y arquitectura
- Frontend: Next.js + React + TypeScript.
- Backend: API routes (`src/app/api/**`).
- DB/Auth/Realtime: Supabase.
- Dominio de datos: PostgreSQL (`supabase/schema.sql`).
- Integraciones:
  - Google OAuth + Google Tasks + Google Calendar.
  - Spotify OAuth.
  - Web Push.

### 2.2 Modulos funcionales vigentes
- Pomodoro:
  - Estado persistido en localStorage.
  - Reglas sincronizadas desde `profiles`.
  - Registro de sesiones en `pomodoro_sessions`.
  - Manejo de overtime y alarmas.
- Tareas:
  - CRUD de tareas/subtareas y asignacion de materia.
  - Vista lista y kanban.
- Estadisticas:
  - Tablas agregadas diarias/mensuales.
  - Funciones SQL + triggers para consistencia.
- Google Sync:
  - Pull de Tasks/Calendar.
  - Modo efectivo `read_only` para este sprint.
  - Parseo de materia por prefijo de titulo (`[Materia] ...` o `Materia: ...`).
  - Regla defensiva: no borrar `subject_id` existente si no hay match.

### 2.3 Calidad y deuda tecnica
- No hay suite formal de tests para sync Google.
- Observabilidad limitada a errores resumidos (`google_last_sync_error`).
- Riesgos conocidos:
  - Duplicados historicos en Google Tasks de etapas previas con push.
  - Lint script necesita ajuste operativo.

---

## 3) Objetivos de producto

### 3.1 Objetivo principal
Entregar una experiencia de foco confiable, sin perdida ni corrupcion de tareas y sesiones.

### 3.2 Objetivos secundarios
- Reducir friccion en organizacion academica (proyecto -> materia -> tarea).
- Mantener integraciones utiles sin comprometer estabilidad.
- Mejorar visibilidad de progreso con estadisticas consistentes.

### 3.3 No objetivos de corto plazo
- No priorizar sync bidireccional seamless completo antes de cerrar validacion OAuth y estabilidad base.

---

## 4) Decisiones tecnicas vigentes

### 4.1 Seguridad de datos primero
Se privilegia consistencia local sobre reconciliacion agresiva externa.

### 4.2 Puente de materia por titulo Google
- Formato remoto preferido: `[Materia] Titulo`.
- En BluePomodoro se muestra titulo limpio y materia separada.
- Ventaja: rapido y simple.
- Limite: depende de convencion de texto.

### 4.3 Regla anti regresion para materia
Si no hay inferencia valida de materia, no se pisa `subject_id` existente.

### 4.4 Feature gate para bidireccional
El codigo mantiene compatibilidad para futuro, pero el modo de operacion actual es read only.

### 4.5 Agregacion de estadisticas en base
La consistencia de metricas se resuelve server side con funciones/triggers SQL.

---

## 5) Problemas raiz identificados (Google Sync)

1. Falta modelo completo de conflictos.
2. Falta estrategia formal para deletes bidireccionales.
3. Sin lock distribuido por usuario para sync concurrente.
4. Dependencia parcial en heuristicas de texto para metadata.
5. Falta auditoria de bajo nivel por operacion de sync.

---

## 6) Roadmap por releases

## R0 - Estabilizacion y compliance (actual)
Objetivo:
- Operar sync de forma segura durante validacion OAuth de Google.

Entregables:
- Modo efectivo read only.
- Bridge de materia `[Materia] Titulo` en importacion.
- Regla de preservacion de `subject_id`.
- Limpieza manual guiada de duplicados remotos (una sola vez).

Exit criteria:
- Cero perdida de materia por sync durante 14 dias.
- Cero creaciones remotas no deseadas mientras `read_only`.
- Errores manuales de sync visibles para usuario.

## R1 - Integridad operativa del sync
Objetivo:
- Blindar datos locales contra borrados agresivos y carreras.

Entregables:
- Quarantine de tareas stale (soft delete + TTL), sin hard delete inmediato.
- Exclusion de items sensibles en limpieza automatica.
- Lock server side por usuario para evitar sync concurrente.
- Logging de operaciones por corrida.

Exit criteria:
- Cero borrados irreversibles por stale cleanup.
- Cero carreras detectadas por doble sync simultaneo.

## R2 - Modelo de conflictos y metadata estable
Objetivo:
- Pasar de heuristica parcial a reconciliacion robusta.

Entregables:
- `updated_at` local + `last_remote_updated_at`.
- Politica explicita de merge (LWW o regla por campo).
- Metadata de vinculacion de materia independiente del titulo.
- Auditoria de conflictos y resoluciones.

Exit criteria:
- Conflictos reproducibles y trazables.
- Resolucion deterministica documentada.

## R3 - Bidireccional productivo (post validacion Google)
Objetivo:
- Habilitar push controlado y luego general.

Entregables:
- Tombstones para deletes locales/remotos.
- Propagacion local -> Google con safeguards.
- Rollout progresivo por cohortes.

Exit criteria:
- Sin regresiones de datos en cohort piloto.
- KPIs de sync dentro del umbral acordado.

---

## 7) Backlog priorizado (sprint ready)

Formato por item:
- ID
- Prioridad (`P0`, `P1`, `P2`)
- Criterio de aceptacion

## 7.1 P0

`SYNC-001` Quarantine para stale local tasks  
CA:
- No se ejecuta hard delete directo por stale.
- Se marca `quarantined_at` y purge posterior por TTL.

`SYNC-002` Lock server side por usuario  
CA:
- Si ya hay sync en curso para `user_id`, nueva corrida aborta o espera segun politica.
- No hay corridas paralelas mutando las mismas filas.

`SYNC-003` Telemetria minima por corrida  
CA:
- Cada sync guarda run id, tiempos y conteos (`upsert`, `skip`, `error`).
- Se puede trazar por `google_task_id`.

## 7.2 P1

`SYNC-010` Modelo de conflictos base  
CA:
- Campos `updated_at` y `last_remote_updated_at` disponibles.
- Regla de merge documentada y aplicada.

`SYNC-011` Limpieza de duplicados asistida  
CA:
- Procedimiento operativo documentado.
- Reporte previo y posterior por usuario.

`SYNC-012` Hardening parser de materia  
CA:
- Parsea `[Materia] Titulo` y `Materia: Titulo`.
- Casos ambiguos con fallback seguro.

## 7.3 P2

`SYNC-020` Tabla de vinculo estable tarea <-> google  
CA:
- La asignacion de materia no depende solo del titulo remoto.

`SYNC-021` UI de diagnostico sync  
CA:
- Vista de ultima corrida y errores resumidos.

`OPS-030` Ajuste lint/quality gate  
CA:
- Comando lint estable en entorno local y CI.

---

## 8) Politica operativa durante revision OAuth de Google

1. Mantener scopes de lectura para Google Tasks y Google Calendar.
2. Evitar cambios de scopes en produccion durante revision.
3. Si se requiere escritura para pruebas internas:
- habilitar solo en entorno de test por feature flag.
- no exponer en UX publica.
4. Mantener Terms/Privacy alineados al comportamiento real desplegado.

---

## 9) Definicion de hecho (DoD) para features de sync

Una feature de sync se considera hecha cuando cumple:
1. Criterios de aceptacion funcionales.
2. No regresion de datos en pruebas controladas.
3. Logs de corrida con trazabilidad minima.
4. Documentacion actualizada en este archivo.
5. Runbook breve de rollback.

---

## 10) KPIs y monitoreo

KPIs sugeridos:
- `sync_success_rate` por dia.
- `sync_partial_rate` (HTTP 207).
- `task_subject_loss_incidents` (objetivo: 0).
- `duplicate_remote_detected` por usuario.
- `avg_sync_duration_ms`.

Alertas sugeridas:
- Spike de errores auth por hora.
- Spike de quarantines sobre baseline.

---

## 11) Riesgos y mitigaciones

Riesgo: duplicados historicos en Google Tasks.  
Mitigacion: limpieza manual asistida + lock + dedupe plan.

Riesgo: conflictos no deterministas al reactivar push.  
Mitigacion: modelo de conflictos antes de rollout.

Riesgo: cambios de scopes que afecten aprobacion Google.  
Mitigacion: freeze de scopes en produccion hasta cierre de revision.

Riesgo: tokens sensibles en texto plano.  
Mitigacion: release dedicado de seguridad para cifrado/rotacion.

---

## 12) Runbook breve - limpieza manual de duplicados Google Tasks

Uso:
- Ejecutar una sola vez por usuario afectado por duplicados historicos.

Pasos:
1. En BluePomodoro, ejecutar sync manual para snapshot actual.
2. En Google Tasks (lista default), eliminar duplicados visuales dejando una sola instancia.
3. Volver a BluePomodoro y ejecutar sync manual.
4. Verificar:
- No reaparecen duplicados.
- La materia sigue asociada en Blue.

Si hay riesgo:
- detener sync de Tasks para ese usuario.
- revisar `google_last_sync_error`.

---

## 13) Gobierno del documento

Frecuencia de actualizacion:
- Minimo una vez por sprint.
- Obligatorio al cerrar cada release `R0`, `R1`, `R2`, `R3`.

Responsable:
- Owner tecnico del sprint.

Convencion:
- Agregar changelog al final con fecha y cambios.

---

## 14) Changelog del documento

2026-03-25:
- Version inicial del documento maestro.
- Registro del estado de estabilizacion read only y bridge de materia en Google Tasks.
