# Checklist manual pendiente (Supabase / Deploy / Secrets / Cron)

- [ ] Aplicar migración SQL `supabase/migrations/20260327_push_jobs_installations.sql`.
- [ ] Configurar secrets en deploy (`SUPABASE_SERVICE_ROLE_KEY`, `PUSH_DISPATCH_SECRET`, VAPID).
- [ ] Confirmar que `pg_cron` y `pg_net` están habilitados.
- [ ] Crear job de cron para `/api/push/dispatch` cada minuto.
- [ ] Verificar que el dominio del cron apunta al entorno correcto (staging/prod).
- [ ] Validar registro de instalación desde web y móvil.
- [ ] Validar targeting por dispositivo (no broadcast).
- [ ] Validar cancelación de jobs en pause/reset/skip.
- [ ] Validar resume sin duplicados.
- [ ] Revisar logs de dispatch (`sent/failed/canceled/invalidSubscriptionCleanup`).
