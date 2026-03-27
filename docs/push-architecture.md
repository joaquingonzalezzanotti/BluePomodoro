# Push notifications refactor (backend jobs + installation targeting)

## Arquitectura final

- **Cliente (PWA)**
  - Registra la subscription y un `installation_id` estable por dispositivo.
  - Llama a backend al activar/desactivar push y al iniciar/pausar/resetear/skip/reanudar timer.
  - Mantiene UX local (alarma/modal/sonidos), pero **no envía push real**.
- **Backend (Next.js API)**
  - `/api/push/subscribe`: upsert seguro en `push_installations`.
  - `/api/push/unsubscribe`: revoca instalación (soft revoke).
  - `/api/push/job`: schedule/cancel de jobs por `user_id + installation_id` con validación de ownership activo.
  - `/api/push/dispatch`: claim transaccional de jobs vencidos + envío web push + updates de estado.
- **Supabase (Postgres)**
  - `push_installations`: dispositivos activos/revocados.
  - `push_jobs`: jobs persistentes con estados.
  - `claim_due_push_jobs()` con `FOR UPDATE SKIP LOCKED` para evitar doble procesamiento.
  - También reclama jobs `processing` con `claimed_at` vencido (>5 min) para recuperar caídas del dispatcher.

## Flujo de datos

1. Usuario activa push en un dispositivo.
2. Cliente genera/reusa `installation_id` y envía subscription al backend.
3. Backend upsertea `push_installations` para ese usuario + instalación.
4. Cuando timer inicia/reanuda, backend crea/actualiza job `scheduled`.
5. Cuando timer pausa/resetea/skippea, backend cancela job activo.
6. Cron invoca `/api/push/dispatch` cada minuto.
7. Dispatcher claimea jobs vencidos, envía al endpoint objetivo y marca `sent/failed`.
8. Si endpoint responde 404/410, la instalación se revoca (sin fallback/broadcast).

## Tablas nuevas

### `push_installations`
Campos:
- `id`, `user_id`, `installation_id`, `endpoint`, `p256dh`, `auth`
- `last_seen_at`, `revoked_at`, `created_at`, `updated_at`

Reglas:
- unique `(user_id, installation_id)`
- unique `(user_id, endpoint)`
- índices por lookup y activas (`revoked_at is null`)

### `push_jobs`
Campos:
- `id`, `user_id`, `session_id`, `event_type`, `installation_id`
- `fire_at`, `status`, `attempts`, `claimed_at`, `sent_at`, `canceled_at`
- `last_error`, `payload`, `created_at`, `updated_at`

Estados:
- `scheduled`, `processing`, `sent`, `failed`, `canceled`

Idempotencia:
- unique `(user_id, session_id, event_type)`

## Targeting por instalación

El dispatch resuelve destino usando:
- `user_id`
- `installation_id`

No existe fallback a otras instalaciones del mismo usuario.

## Cancelación y reprogramación

- **pause/reset/skip**: `cancel` sobre job activo de la sesión actual.
- **resume/start**: `schedule` con `fire_at` recalculado.
- **jobs cancelados**: no se claimean ni envían.

## Cron (Supabase)

### Requisitos
- Extensiones: `pg_cron`, `pg_net` (si cron invoca HTTP), `pgcrypto`.
- Secret requerido en backend: `PUSH_DISPATCH_SECRET`.

### Ejemplo SQL (manual)

```sql
select cron.schedule(
  'push-dispatch-every-minute',
  '* * * * *',
  $$
  select
    net.http_post(
      url := 'https://<tu-dominio>/api/push/dispatch',
      headers := jsonb_build_object(
        'content-type','application/json',
        'x-push-dispatch-secret','<PUSH_DISPATCH_SECRET>'
      ),
      body := '{}'::jsonb
    );
  $$
);
```

## Variables/secrets

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `PUSH_DISPATCH_SECRET`

## Tests

```bash
npm run test:push
```

## Validación manual recomendada

1. Activar push en web y tablet con mismo usuario.
2. Iniciar pomodoro en web; validar que llega solo a web.
3. Repetir iniciando en tablet; validar que llega solo a tablet.
4. Probar pause/reset/skip antes del vencimiento; validar no push viejo.
5. Probar resume; validar una sola notificación al nuevo horario.
6. Forzar endpoint inválido; validar revocación y ausencia de fallback.

## Decisiones técnicas

- Se desactiva `/api/push/send` (410) para evitar doble sistema.
- Scheduling/cancelación se centraliza en backend (`/api/push/job`).
- Dispatch idempotente con claim SQL transaccional.
- Limpieza de instalaciones inválidas en 404/410.
- `push_subscriptions` queda explícitamente deprecada para evitar uso accidental.

## Limitaciones/riesgos conocidos

- El cron real depende de configuración manual en Supabase.
- Sin backoff temporal avanzado aún; se usa `max_attempts` con reintento inmediato por siguiente corrida de cron.
