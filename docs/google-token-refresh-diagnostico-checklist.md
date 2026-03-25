# Checklist operativo - Diagnostico `Google token refresh failed`

Fecha: 2026-03-25  
Estado: Analisis (sin cambios de codigo)

## Objetivo
Confirmar causa raiz del error `Google token refresh failed` sin modificar comportamiento productivo.

## Contexto tecnico confirmado
- El error se dispara en:
  - `src/app/api/google/sync/route.ts`
  - `src/app/api/google/calendar/events/route.ts`
  - `src/app/api/google/calendar/lists/route.ts`
- El backend hace refresh con `GOOGLE_OAUTH_CLIENT_ID` y opcionalmente `GOOGLE_OAUTH_CLIENT_SECRET`.
- El token de sync se guarda via `POST /api/google/session` usando `session.provider_token` y `session.provider_refresh_token`.
- El sync automatico se dispara al volver visible la app (`visibilitychange`) en `/app`.

## Hipotesis priorizadas
1. Desalineacion entre cliente OAuth que emite el refresh token (Supabase provider) y cliente OAuth usado para refresh en backend.
2. `google_refresh_token` invalido/revocado en `profiles`.
3. Pisado de `google_access_token` tras login base (`openid email profile`) y posterior intento de sync.

## Checklist de validacion

### A. Variables de entorno (runtime real)
1. Confirmar en entorno de despliegue:
   - `GOOGLE_OAUTH_CLIENT_ID`
   - `GOOGLE_OAUTH_CLIENT_SECRET` (si aplica)
2. Confirmar que el `client_id` coincide exactamente con el cliente OAuth configurado en Supabase Google provider para Sync.
3. Verificar que no haya mezcla de proyectos Google Cloud distintos entre:
   - Supabase Auth provider
   - Variables consumidas por API routes de refresh

### B. Estado de datos por usuario afectado
1. En `profiles`, revisar:
   - `google_access_token` no nulo
   - `google_refresh_token` no nulo
   - `google_last_sync_error`
   - `google_last_synced_at`
2. Verificar si el error aparece concatenado (`... | ...`), indicando falla en tasks y calendar en la misma corrida.
3. Revisar si `google_refresh_token` cambia o queda estable tras reconectar Google Sync.

### C. Reproduccion controlada
1. Caso manual:
   - Abrir configuracion sync.
   - Ejecutar "Sincronizar ahora".
   - Registrar timestamp exacto y resultado.
2. Caso reapertura:
   - Cerrar pestaña/app.
   - Reabrir `/app`.
   - Confirmar si al `visibilitychange` aparece error.
3. Caso multi-dispositivo:
   - Iniciar sesion en dispositivo A y luego B.
   - Forzar sync en B y observar si A/B pisan token de sync.

### D. Evidencia de API externa
1. Capturar respuesta completa de `https://oauth2.googleapis.com/token` cuando falla refresh:
   - `status`
   - `error`
   - `error_description`
2. Clasificar:
   - `invalid_grant` -> refresh token invalido/revocado o client mismatch.
   - `unauthorized_client` -> client no autorizado para ese token.
   - `invalid_client` -> credenciales de cliente incorrectas.

### E. Decisiones segun hallazgo
1. Si hay client mismatch:
   - Unificar cliente OAuth entre Supabase provider y backend refresh.
2. Si refresh token viene nulo/ausente:
   - Ajustar flujo de captura/persistencia de `provider_refresh_token`.
3. Si token revocado:
   - Forzar reconexion de Google Sync y validar nueva concesion offline.

## Datos minimos a reportar en cada incidencia
- Usuario afectado (id)
- Dispositivo/navegador
- Hora exacta (ISO)
- Ruta que fallo (`sync`, `calendar/events`, `calendar/lists`)
- HTTP status del refresh
- Payload de error de Google (si disponible)
- Valor de `google_last_sync_error`

## Criterio de cierre del diagnostico
- Se identifica una causa raiz unica o un set acotado con evidencia reproducible.
- Existe reproduccion controlada con pasos consistentes.
- Quedan definidos cambios tecnicos concretos para el fix posterior.
