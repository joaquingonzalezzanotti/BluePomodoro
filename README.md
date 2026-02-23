
# BluePomodoro 🚀

Tu herramienta definitiva de productividad con la técnica Pomodoro e IA.

## 🛠️ Despliegue en Vercel (PASO A PASO)

### 1. Variables de Entorno
En el panel de Vercel (Settings > Environment Variables), añade:
- `GEMINI_API_KEY`: Tu clave de Google AI Studio.
- `NEXT_PUBLIC_SPOTIFY_CLIENT_ID`: Tu Client ID de [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).

### 2. Configurar Spotify OAuth
1. Ve al [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Crea una app y entra en "Settings".
3. En **Redirect URIs**, añade:
   - `http://localhost:9002` (Para desarrollo)
   - `https://tu-app.vercel.app` (Para producción)
4. Copia el **Client ID** y ponlo en tu variable de entorno de Vercel.

### 3. Autorizar Dominios de Google (CRÍTICO)
Si no haces esto, el login de Google fallará en Vercel:
1. **Firebase Console**: Ve a `Authentication` > `Settings` > `Authorized domains`. Haz clic en **Add domain** y pega la URL de tu app en Vercel.
2. **Google Cloud Console**: 
   - Edita tu `OAuth 2.0 Client ID`.
   - En **Authorized JavaScript origins**, añade la URL de tu app en Vercel.

## 💰 Costos
- **Firebase**: Plan Spark (Gratis hasta 50k lecturas/día).
- **Gemini**: Nivel gratuito (1.5 Flash).
- **Vercel**: Plan Hobby (Gratis).
- **Spotify**: Gratis (Usa la API oficial y el reproductor Embed).

## 📝 Privacidad
La app incluye una página de privacidad en `/privacy` para cumplir con los requisitos de Google OAuth y Spotify.
