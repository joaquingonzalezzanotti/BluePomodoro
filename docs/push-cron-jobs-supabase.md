# Push de Pomodoro con Jobs + Cron en Supabase (Guia de Implementacion Segura)

Fecha: 2026-03-27

## 1) Contexto y problema observado

Hoy el push de fin de Pomodoro se dispara desde el cliente y el endpoint actual de envio hace broadcast a **todas** las suscripciones del usuario.

Consecuencia:
- Si inicias un pomo en web, puede llegar tambien a tablet/movil.
- En mobile background, la notificacion puede llegar tarde (cuando vuelves a abrir la app).

Objetivo:
- Hacer envio confiable desde backend (scheduler + jobs).
- Entregar la notificacion solo al dispositivo que inicio el pomo.

## 2) Conceptos clave (cron, scheduler, job)

- `Job`: trabajo puntual (ej: "enviar push del session_id X a las 22:01").
- `Scheduler`: proceso que revisa que jobs vencieron.
- `Cron`: forma de programar el scheduler por tiempo (`* * * * *` = cada minuto).

En Supabase, `pg_cron` es el scheduler dentro de Postgres y puede ejecutar SQL o HTTP (Edge Functions).

## 3) Reporte de costos y recursos (Supabase Free)

Si, para una app pequena/mediana suele entrar en Free, con las siguientes salvedades.

### Cuotas relevantes (Supabase)

Segun documentacion oficial de billing:
- `Edge Function Invocations (Free)`: 500,000/mes.
- `Egress (Free)`: 5 GB.
- `Database Size (Free)`: 500 MB por proyecto.

Si ejecutas cron cada minuto invocando una funcion backend:
- 1 invocacion/min = 60/h = 1,440/dia = 43,200/mes.
- Solo el scheduler consumiria aprox. `43,200 / 500,000 = 8.64%` de invocaciones Free.

### Estimacion rapida (orden de magnitud)

Supuestos:
- Scheduler cada minuto (43,200 ejecuciones/mes).
- 1 ejecucion cron = 1 llamada a funcion de despacho.

Escenarios:
- Solo scheduler: 43,200 invocaciones/mes (8.64% del free de 500,000).
- Scheduler + 20,000 envios push/mes: normalmente sigue entrando por invocaciones; vigilar egress y logs.
- Scheduler + 100,000 envios push/mes: probablemente todavia viable en invocaciones, pero ya requiere monitoreo fino de egress, reintentos y latencia.

### Consumo real de hardware/recursos

- **Cron/Jobs**: CPU + I/O de Postgres (consultar jobs vencidos y actualizar estados).
- **Push**: tiempo de funcion + requests salientes + algo de egreso.
- **Storage**: tabla de jobs + historico (depende retencion).

### Quien asume el costo

- En Free: no pagas factura, pero estas limitado por cuota y recursos compartidos.
- Si superas cuotas en planes pagos: se aplica overage segun item.
- En tu caso, el costo operativo principal lo absorbe tu proyecto (compute DB + invocaciones + egress).

### Riesgo principal en Free

Supabase puede pausar proyectos Free con baja actividad en 7 dias. Si esta pausado, el scheduler no correra hasta reactivarlo.

## 4) Arquitectura recomendada (segura y confiable)

### Principios

- Una sola fuente de envio real: backend.
- Cliente solo UX (modal/sonido/animacion).
- Idempotencia estricta: evitar duplicados aunque haya reintentos.
- Sin fallback a broadcast por usuario.

### Dispositivo objetivo (clave para tu caso)

Hoy notifica a todos porque el envio filtra por `user_id` solamente.
Para que notifique solo al dispositivo que inicia el pomo:

1. Al iniciar pomo, leer `getSubscription().endpoint`.
2. Guardar `target_endpoint` o mejor `installation_id` estable en el job/sesion.
3. En envio, filtrar por `user_id + installation_id` (o `user_id + endpoint`).
4. Validar ownership de esa instalacion/endpoint contra el usuario autenticado.
5. Si endpoint expiro (404/410), limpiar y **no** hacer broadcast como fallback.

Recomendacion de robustez:
- usar `installation_id` estable por cliente (localStorage) y enviar por instalacion, no por endpoint crudo.

## 5) Diseno de datos sugerido

### `push_installations` (dispositivo/sesion de app)

Campos sugeridos:
- `id uuid pk`
- `user_id uuid not null`
- `installation_id text not null` (estable por cliente)
- `endpoint text not null`
- `p256dh text not null`
- `auth text not null`
- `last_seen_at timestamptz`
- `revoked_at timestamptz null`

Indices/constraints:
- `unique(user_id, installation_id)`
- `unique(user_id, endpoint)` (opcional pero util)

### `push_jobs`

Campos sugeridos:
- `id uuid pk`
- `user_id uuid not null`
- `session_id uuid not null`
- `event_type text not null` (`work_complete`, `break_complete`)
- `installation_id text not null`
- `fire_at timestamptz not null`
- `status text not null` (`scheduled|processing|sent|failed|canceled`)
- `attempts int not null default 0`
- `claimed_at timestamptz null`
- `sent_at timestamptz null`
- `last_error text null`
- `payload jsonb not null`

Indices/constraints:
- `unique(user_id, session_id, event_type)` (idempotencia logica)
- indice por `(status, fire_at)`

## 6) Flujo correcto "solo cliente que inicio"

1. Al iniciar pomo en cliente:
- Leer `installation_id` (crear si no existe).
- Leer `getSubscription().endpoint` activo.
- Backend valida que esa instalacion/endpoint pertenece al usuario autenticado.
- Crear/upsert job con `installation_id` y `fire_at`.

2. Al pausar/reset/skip/finalizar antes de tiempo:
- Cancelar job (`status='canceled'`).

3. Scheduler (cada minuto):
- Toma jobs vencidos: `status='scheduled' AND fire_at <= now()`.
- Claim transaccional con lock (`FOR UPDATE SKIP LOCKED`) y pasa a `processing`.
- Resuelve endpoint por `user_id + installation_id`.
- Envia push.
- Marca `sent` o `failed`.

4. Si push responde 404/410:
- Revocar instalacion/subscription.
- No hacer broadcast como fallback.

Resultado:
- Se notifica solo al dispositivo que activo el pomo.
- No hay duplicados por corrida de cron.

## 7) Opcion recomendada en Supabase

### Cron -> funcion de despacho

- `pg_cron` usa `net.http_post` para llamar una funcion backend de despacho.
- Esa funcion hace: claim de jobs vencidos, envio push, update de estado.
- Mantiene toda la logica sensible en backend y permite retries controlados.

Por que no SQL puro para Web Push:
- El envio Web Push con VAPID normalmente requiere libreria/firmado que se maneja mejor en runtime de funcion backend.

## 8) Seguridad y anti-errores

- No confiar en `installation_id` enviado por cliente sin validacion de ownership.
- RLS en tablas de instalaciones/jobs para lectura de usuario; escrituras criticas por backend con role seguro.
- Secrets en Vault para token/URL de invocacion programada.
- Estado de job transaccional + locks para evitar doble envio.
- `max_attempts` + backoff para errores transitorios.
- Job cleanup periodico (ej. borrar `sent/canceled` > 30 dias).

## 9) Plan de implementacion (para manana)

1. Crear tabla `push_installations` y migrar `push_subscriptions` a modelo por instalacion.
2. Generar `installation_id` estable en frontend (localStorage).
3. Modificar `/api/push/subscribe` para guardar `installation_id` + endpoint.
4. Crear tabla `push_jobs` con indices y constraints.
5. Al iniciar/pausar/reset/skip, crear/cancelar job desde backend.
6. Implementar `dispatch_due_push_jobs()` con claim transaccional e idempotencia.
7. Programar cron cada minuto (`pg_cron`).
8. Ajustar envio push para filtrar por `user_id + installation_id` (o endpoint propietario).
9. Manejar 404/410 revocando instalacion.
10. Agregar logs/metricas minimas (`sent`, `failed`, `late_by_seconds`).

## 10) Checklist de pruebas

- Mismo usuario en web + tablet: iniciar pomo en web -> solo noti en web.
- App cerrada/bloqueada: noti llega igual al vencer.
- Pausa antes de vencer: no llega noti.
- Reanudar con nuevo vencimiento: llega una sola noti en nuevo horario.
- Fuerza de cron duplicada: no se duplica envio (idempotencia ok).
- Endpoint expirado: se limpia y no se reintenta infinito.

## 11) Conclusiones practicas

- Si, se puede hacer bien en Supabase Free para una escala moderada.
- La parte critica no es "tener cron", sino implementar idempotencia + targeting por instalacion.
- Si te acercas a limites, primero optimiza lotes/reintentos/logs; luego evalua Pro para no depender de pausa por inactividad.

---

## Fuentes oficiales consultadas

- Supabase Billing (cuotas y overage): https://supabase.com/docs/guides/platform/billing-on-supabase
- Supabase Cron (pg_cron, concurrencia recomendada): https://supabase.com/docs/guides/cron
- Scheduling Edge Functions (pg_cron + pg_net + Vault): https://supabase.com/docs/guides/functions/schedule-functions
- Edge Functions Limits (duracion, CPU, etc.): https://supabase.com/docs/guides/functions/limits
- Production checklist (Free plan puede pausar por inactividad): https://supabase.com/docs/guides/deployment/going-into-prod
