# Push de Pomodoro con Jobs + Cron en Supabase (Guía de Implementación Segura)

Fecha: 2026-03-27

## 1) Contexto y problema observado

Hoy el push de fin de Pomodoro se dispara desde el cliente y el endpoint actual de envío hace broadcast a **todas** las suscripciones del usuario.

Consecuencia:
- Si inicias un pomo en web, puede llegar también a tablet/móvil.
- En mobile background, la notificación puede llegar tarde (cuando vuelves a abrir la app).

Objetivo:
- Hacer envío confiable desde backend (scheduler + jobs).
- Entregar la notificación solo al dispositivo que inició el pomo.

## 2) Conceptos clave (cron, scheduler, job)

- `Job`: trabajo puntual (ej: “enviar push del session_id X a las 22:01”).
- `Scheduler`: proceso que revisa qué jobs vencieron.
- `Cron`: forma de programar el scheduler por tiempo (`* * * * *` = cada minuto).

En Supabase, `pg_cron` es el scheduler dentro de Postgres y puede ejecutar SQL o HTTP (Edge Functions).

## 3) ¿Entra en Supabase Free?

Sí, en general entra si el volumen no es extremo.

### Cuotas relevantes (Supabase)

Según documentación oficial de billing:
- `Edge Function Invocations (Free)`: 500,000/mes.
- `Egress (Free)`: 5 GB.
- `Database Size (Free)`: 500 MB por proyecto.

Si ejecutas cron cada minuto invocando una Edge Function:
- 1 invocación/min = 60/h = 1,440/día = 43,200/mes.
- Solo el scheduler consumiría aprox. `43,200 / 500,000 = 8.64%` de invocaciones Free.

### Consumo real de recursos

- **Cron/Jobs**: CPU + I/O de Postgres (consultar jobs vencidos y actualizar estados).
- **Push**: tiempo de función + requests salientes + algo de egreso.
- **Storage**: tabla de jobs + histórico (depende retención).

### Riesgo principal en Free

Supabase puede pausar proyectos Free con baja actividad en 7 días. Si está pausado, el scheduler no correrá hasta reactivarlo.

## 4) Arquitectura recomendada (segura y confiable)

### Principios

- Una sola fuente de envío real: backend.
- Cliente solo UX (modal/sonido/animación).
- Idempotencia estricta: evitar duplicados aunque haya reintentos.
- Sin fallback a broadcast por usuario.

### Diseño de datos sugerido

#### `push_installations` (dispositivo/sesión de app)

Campos sugeridos:
- `id uuid pk`
- `user_id uuid not null`
- `installation_id text not null` (estable por cliente, guardado en localStorage)
- `endpoint text not null`
- `p256dh text not null`
- `auth text not null`
- `last_seen_at timestamptz`
- `revoked_at timestamptz null`

Índices/constraints:
- `unique(user_id, installation_id)`
- `unique(user_id, endpoint)` (opcional pero útil)

#### `push_jobs`

Campos sugeridos:
- `id uuid pk`
- `user_id uuid not null`
- `session_id uuid not null`
- `event_type text not null` (ej: `work_complete`, `break_complete`)
- `installation_id text not null`
- `fire_at timestamptz not null`
- `status text not null` (`scheduled|processing|sent|failed|canceled`)
- `attempts int not null default 0`
- `claimed_at timestamptz null`
- `sent_at timestamptz null`
- `last_error text null`
- `payload jsonb not null`

Índices/constraints:
- `unique(user_id, session_id, event_type)` (idempotencia lógica)
- índice por `(status, fire_at)`

## 5) Flujo correcto “solo cliente que inició”

1. Al iniciar pomo en cliente:
- Leer `installation_id` (crear si no existe).
- Leer `getSubscription().endpoint` activo.
- Backend valida que esa instalación/endpoint pertenece al usuario autenticado.
- Crear/upsert job con `installation_id` y `fire_at`.

2. Al pausar/reset/skip/finalizar antes de tiempo:
- Cancelar job (`status='canceled'`).

3. Scheduler (cada minuto):
- Toma jobs vencidos: `status='scheduled' AND fire_at <= now()`.
- Claim transaccional con lock (`FOR UPDATE SKIP LOCKED`) y pasa a `processing`.
- Resuelve endpoint por `user_id + installation_id`.
- Envía push.
- Marca `sent` o `failed`.

4. Si push responde 404/410:
- Revocar instalación/subscription.
- No hacer broadcast como fallback.

Resultado:
- Se notifica solo al dispositivo que activó el pomo.
- No hay duplicados por corrida de cron.

## 6) Seguridad y anti-errores

- No confiar en `installation_id` enviado por cliente sin validación de ownership.
- RLS en tablas de instalaciones/jobs para lectura de usuario; escrituras críticas por backend con role seguro.
- Secrets en Vault (si cron invoca Edge Function con token).
- Estado de job transaccional + locks para evitar doble envío.
- `max_attempts` + backoff para errores transitorios.
- Job cleanup periódico (ej. borrar `sent/canceled` > 30 días).

## 7) Dos opciones de ejecución en Supabase

### Opción A: Cron -> SQL (más simple y eficiente)

- `pg_cron` ejecuta función SQL que procesa jobs.
- Menos invocaciones de Edge Function.
- Menor complejidad operativa.

### Opción B: Cron -> Edge Function (más flexible)

- `pg_cron` usa `net.http_post` para llamar a una función.
- Más fácil para lógica HTTP/SDK Web Push en un solo lugar.
- Consume invocaciones de Edge Function (igual suele entrar en Free a escala moderada).

## 8) Plan de implementación (para mañana)

1. Crear tabla `push_installations` y migrar `push_subscriptions` a modelo por instalación.
2. Generar `installation_id` estable en frontend (localStorage).
3. Modificar `/api/push/subscribe` para guardar `installation_id` + endpoint.
4. Crear tabla `push_jobs` con índices y constraints.
5. Al iniciar/pausar/reset/skip, crear/cancelar job desde backend.
6. Implementar `dispatch_due_push_jobs()` con claim transaccional e idempotencia.
7. Programar cron cada minuto (`pg_cron`).
8. Ajustar envío push para filtrar por `user_id + installation_id` (o endpoint propietario).
9. Manejar 404/410 revocando instalación.
10. Agregar logs/métricas mínimas (sent/failed/late_by_seconds).

## 9) Checklist de pruebas

- Mismo usuario en web + tablet: iniciar pomo en web -> solo noti en web.
- App cerrada/bloqueada: noti llega igual al vencer.
- Pausa antes de vencer: no llega noti.
- Reanudar con nuevo vencimiento: llega una sola noti en nuevo horario.
- Fuerza de cron duplicada: no se duplica envío (idempotencia ok).
- Endpoint expirado: se limpia y no se reintenta infinito.

## 10) Conclusión

Sí, se puede hacer bien y de forma segura en Supabase Free para un producto pequeño/mediano.
La clave para no romper UX ni costos es:
- backend como fuente única de envío,
- jobs idempotentes,
- targeting por instalación (no por usuario completo),
- y control de reintentos/limpieza.

---

## Fuentes oficiales consultadas

- Supabase Billing (cuotas y overage): https://supabase.com/docs/guides/platform/billing-on-supabase
- Supabase Cron (pg_cron, concurrencia recomendada): https://supabase.com/docs/guides/cron
- Scheduling Edge Functions (pg_cron + pg_net + Vault): https://supabase.com/docs/guides/functions/schedule-functions
- Edge Functions Limits (duración, CPU, etc.): https://supabase.com/docs/guides/functions/limits
- Production checklist (Free plan puede pausar por inactividad): https://supabase.com/docs/guides/deployment/going-into-prod
