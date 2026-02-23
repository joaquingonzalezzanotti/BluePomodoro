# BluePomodoro 🚀

Tu herramienta definitiva de productividad con la técnica Pomodoro e IA.

## 🛠️ Despliegue en Vercel (PASO A PASO)

Para que la aplicación funcione en producción, sigue estos pasos obligatorios:

### 1. Variables de Entorno
En el panel de Vercel (Settings > Environment Variables), añade:
- `GEMINI_API_KEY`: Tu clave de Google AI Studio.

### 2. Autorizar Dominios (CRÍTICO)
Si no haces esto, el login de Google fallará en Vercel:
1. **Firebase Console**: Ve a `Authentication` > `Settings` > `Authorized domains`. Haz clic en **Add domain** y pega la URL de tu app en Vercel (ej: `mi-app.vercel.app`).
2. **Google Cloud Console**: 
   - Ve a [Credentials](https://console.cloud.google.com/apis/credentials).
   - Edita tu `OAuth 2.0 Client ID`.
   - En **Authorized JavaScript origins**, añade la URL de tu app en Vercel.
   - En **Authorized redirect URIs**, asegúrate de que esté la de Firebase (terminada en `/__/auth/handler`).

### 3. Pantalla de Consentimiento
- Si ves el mensaje "Google hasn't verified this app", haz clic en **Advanced** (Configuración avanzada) y luego en **Go to BluePomodoro (unsafe)**. Esto es normal hasta que Google verifique tu marca.

## 💰 Costos
- **Firebase**: Plan Spark (Gratis).
- **Gemini**: Nivel gratuito de AI Studio.
- **Vercel**: Plan Hobby (Gratis).

## 📝 Privacidad
La app incluye una página de privacidad en `/privacy` para cumplir con los requisitos de Google OAuth.
