
# BluePomodoro 🚀

Tu herramienta definitiva de productividad con la técnica Pomodoro e IA.

## 🛠️ Configuración Inicial (CRÍTICO)

Para que todas las funciones operen correctamente, debes configurar las siguientes **Environment Variables** en el panel de **Vercel**:

### 1. Variables de IA
- `GEMINI_API_KEY`: Consíguela en [Google AI Studio](https://aistudio.google.com/). Es vital para el desglose de tareas y la priorización.

### 2. Variables de Spotify (Vincular música interna)
Para que el login de Spotify funcione, ve al [Spotify Developer Dashboard](https://developer.spotify.com/dashboard), crea una app y configura:
- `NEXT_PUBLIC_SPOTIFY_CLIENT_ID`: El ID de tu cliente (Visible en el frontend).
- `SPOTIFY_CLIENT_ID`: El mismo ID de cliente (Para uso en servidor).
- `SPOTIFY_CLIENT_SECRET`: El "Client Secret" que te da Spotify.

**Redirect URIs importantes en Spotify:**
- `http://localhost:9002` (para desarrollo local).
- `https://tu-app.vercel.app` (tu URL de producción).

### 3. Autorizar Dominios en Firebase (Para Login de Google)
Si el login de Google falla al desplegar:
1. **Firebase Console**: `Authentication` > `Settings` > `Authorized domains` > Añade tu URL de Vercel.
2. **Google Cloud Console**: Edita tu ID de OAuth > "Authorized JavaScript origins" > Añade tu URL de Vercel.

## 💰 Costos y Límites
- **IA (Gemini)**: Gratis (Nivel Free Tier de AI Studio).
- **Firebase**: Plan Spark (Gratis hasta 50k lecturas/día).
- **Vercel**: Plan Hobby (Gratis para uso personal).
- **Spotify**: Gratis (Uso de Embed y API estándar).

**En resumen: El costo de mantener esta app para uso personal es de $0.**
