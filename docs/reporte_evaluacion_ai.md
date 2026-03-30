# Análisis y Estado Actual de BluePomodoro

## 1. Visión General del Proyecto y Objetivos

**BluePomodoro** (inicialmente referenciado como FocusFlow en el blueprint) es una herramienta de productividad sumamente ambiciosa que busca unificar múltiples frentes en una sola experiencia fluida:
*   Gestión de tareas, materias y proyectos.
*   Técnica Pomodoro con registro estricto de sesiones y estadísticas (diarias y mensuales).
*   Integraciones con ecosistemas de terceros: Google Tasks, Google Calendar y Spotify.
*   Uso de Inteligencia Artificial (Google Gemini a través de Genkit) para priorizar y desglosar tareas.
*   Capacidades de PWA (Web Push y notificaciones programadas).

**Objetivo Central:** Proveer un entorno unificado y confiable para enfocar la concentración de los usuarios, sin riesgo de pérdida de datos externos (Google) y con alta visibilidad estadística sobre su productividad.

---

## 2. Pila Tecnológica (Tech Stack)

La selección tecnológica es moderna, robusta y altamente escalable:
*   **Frontend y "Backend For Frontend" (BFF):** Next.js (App Router), React 19, Tailwind CSS, y Radix UI (sistema de componentes sin estilos para alta accesibilidad).
*   **Base de Datos y Autenticación:** Supabase (PostgreSQL avanzado).
*   **Inteligencia Artificial:** Google Genkit con el modelo `gemini-2.5-flash`.
*   **Servicios en Segundo Plano:** Migración reciente a un sistema de notificaciones Push programado por base de datos (Cron Jobs en PostgreSQL) y Sync con Google.

---

## 3. Estado Actual y Arquitectura

### 3.1. Bases de Datos y Lógica Pesada (Excelente Diseño)
El proyecto ha decidido delegar la lógica de negocio pesada relacionada con estadísticas (como acumulación de pomodoros, rachas "streaks", y cierres contables mensuales/diarios) **directamente a PostgreSQL mediante Triggers y Funciones (PL/pgSQL)**. 
*   **Opinión:** Esta es una arquitectura sobresaliente. Muchas aplicaciones en Next.js intentan calcular todo en el frontend o en API Routes, lo que termina en cuellos de botella y desincronización de datos. El uso de `schema.sql` es estricto e incluye funciones avanzadas de recalculado de métricas (por ejemplo, `recompute_user_daily_stats`).
  
### 3.2. Sincronización con Google (Eje Crítico del Estado Actual)
Actualmente, el proyecto se encuentra en una **fase estricta de mitigación de riesgos (Fase R0)** respecto a la integración con Google Tasks y Calendar. 
Debido a la validación pendiente del OAuth consent screen de Google (que es muy delicado), el equipo técnico tomó la excelente decisión de:
1.  Bajar el sistema de sync a modo `read_only`.
2.  Implementar un parseo por expresiones regulares (heurística) para detectar la materia en el título (`[Materia] Titulo`).
3.  Impedir el borrado remoto de tareas (Hard-Delete).

### 3.3. Notificaciones Web Push
Existe una migración clara y documentada (vista en `docs/push-architecture.md` y `supabase/migrations/`) desde un dispatch de notificaciones manuales o orientadas a cliente, hacia colas de trabajo puramente de backend utilizando un rol de servicio en Supabase. 

---

## 4. Flujo de Trabajo (Workflow)

El flujo de trabajo actual se nota **altamente disciplinado** y profesional:
*   **Documentación Viva:** Se mantiene un archivo `desarrollo-roadmap-operativo.md` excelente. Hay rastreabilidad de decisiones (ej. _¿Por qué está en read-only el Sync con Google?_ Porque no queremos corromper datos durante el proceso de validación Oauth).
*   **Definición de Terminado (DoD):** El proyecto sigue un ciclo de vida con criterios de aceptación claros para cada módulo.
*   **Checklists y Runbooks:** Hay documentos específicos (`push-manual-checklist.md`, `google-token-refresh-diagnostico-checklist.md`) para operar sistemas vulnerables a fallos. Este acercamiento "DevOps centric" a la documentación previene horas de debug en el futuro.

---

## 5. Planes a Futuro (Roadmap)

El Roadmap actual es coherente e inteligentemente distribuido:
1.  **R0 (Actual - Estabilización):** Blindar integración Google para auditoría y prevenir fuga/corrupción de datos. Modo de Sólo Lectura activo. Fallback seguro frente a errores.
2.  **R1 (Integridad):** Impedir ejecuciones concurrentes del sync (lock server-side por id de usuario). Manejo de las tareas locales "vencidas" (quarantine + TTL).
3.  **R2 (Modelo de Conflictos):** Descentralizar la lógica dependiente del `[Título]` e implementar reconciliación determinista de versiones locales vs. cloud.
4.  **R3 (Bidireccional y Productivo):** Prender nuevamente la capacidad de escribir y borrar en Google de manera progresiva. Activar push notifications generales asincrónicos.

---

## 6. Reporte de Opinión Profesional y Riesgos

### 🌟 Fortalezas del Proyecto
- **Higiene arquitectónica:** La base de datos es el centro de la verdad. Los triggers y contadores están increíblemente bien modelados. Manejar zonas horarias directamente para cada perfil desde Postgres es un acierto enorme en aplicaciones de productividad.
- **Mentalidad Preventiva:** Es rarísimo ver equipos pequeños tomando tantas precauciones respecto al borrado de datos de terceros (como Tasks/Calendar). Esa política de "_safe default, fallback to read-only_" evitará incidentes catastróficos.
- **Trazabilidad:** La decisión de registrar errores de sync sistemáticamente en el usuario (`google_last_sync_error`) permite operar de forma visible, sin depender solo de los logs del servidor de Vercel.

### ⚠️ Debilidades / Puntos a Mejorar
- **Fragilidad de la Heurística de Textos:** El parseo obligatorio como `[Materia] Tarea` o `Materia: Tarea` es propenso a errores humanos. Los usuarios son caóticos. A medida que avancen a `R2`, deberán atar el `subject_id` fuertemente a sus propios metadatos, y no solo mediante lectura por expresiones regulares.
- **Suite de Pruebas (Test Coverage):** Aunque veo algunos tests definidos (`npm run test:push`), dada la densidad de lógica en los scripts de Next_JS y en Supabase, el sistema parece carecer de una suite densa de pruebas de integración local (unit testing del sync sin llamar a la verdadera API de Google). Un mock server para Google Tasks agilizaría las pruebas bidireccionales drásticamente.
- **Complejidad del Esquema SQL:** Puesto que tanta lógica crítica de recompensas, sprints y recalculado reside en triggers (ej. `on_pomodoro_session_insert`), los desarrolladores que se incorporen al proyecto requerirán pericia fuerte en PL/pgSQL; un error allí puede tumbar la persistencia o duplicar puntajes.

### 💡 Conclusión
El proyecto es **robusto, excepcionalmente bien planificado y está en una etapa crítica (pero madura)**. El código y los documentos respiran calidad de software Enterprise. A nivel de producto, una vez que el Sync bidireccional (R3) logre probarse estable, BluePomodoro será una herramienta temible en el nicho de productividad. Las bases están sólidamente construidas.
