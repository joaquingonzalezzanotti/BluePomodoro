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

### 3) Spotify
- `NEXT_PUBLIC_SPOTIFY_CLIENT_ID`

Redirect URIs importantes en Spotify:
- `https://tu-app.vercel.app/app`

## Costos y Limites
- IA (Gemini): Free tier.
- Supabase: Plan Free.
- Spotify: Gratis (Embed y API estandar).
