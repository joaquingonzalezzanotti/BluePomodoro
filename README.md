# BluePomodoro

Tu herramienta definitiva de productividad con la tecnica Pomodoro e IA.

## Configuracion Inicial (CRITICO)

Para que todas las funciones operen correctamente, configura las siguientes variables de entorno en Vercel:

### 1) IA
- `GEMINI_API_KEY`: Google AI Studio. Es vital para desglose y priorizacion.

### 2) Supabase
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Notas:
- Ejecuta el esquema de base de datos en `supabase/schema.sql` dentro del SQL Editor de Supabase.
- Habilita RLS automatico y Realtime en las tablas del esquema public.

Auth en Supabase:
- Habilita Google provider.
- Habilita Anonymous sign-ins para el modo invitado.
- Google OAuth pedira permisos para Google Tasks y Google Calendar (modo configurable: solo lectura o bidireccional).

Opcional:
- `NEXT_PUBLIC_SITE_URL` (para metadataBase en Open Graph).
- `GOOGLE_SYNC_ENABLE_BIDIRECTIONAL` (default activo; usa `false` para forzar modo solo lectura en backend).

### 3) Spotify
- `NEXT_PUBLIC_SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`

Redirect URIs importantes en Spotify:
- `https://tu-app.vercel.app/app`

### 4) PWA + Push (Android)
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (ej: `mailto:admin@bluepomodoro.app`)

Genera las claves con:
```
npx web-push generate-vapid-keys
```

Notas:
- El service worker vive en `public/sw.js`.
- El manifest vive en `public/manifest.json`.

## Costos y Limites
- IA (Gemini): Free tier.
- Supabase: Plan Free.
- Spotify: Gratis (Embed y API estandar).

## Push backend jobs (nuevo)

El envio push real ya no se hace desde cliente. Ahora usa jobs backend + cron.

Variables adicionales requeridas:
- `SUPABASE_SERVICE_ROLE_KEY`
- `PUSH_DISPATCH_SECRET`

Migración principal:
- `supabase/migrations/20260327_push_jobs_installations.sql`

Documentación:
- `docs/push-architecture.md`
- `docs/push-manual-checklist.md`
