
# BluePomodoro 🚀

Tu herramienta definitiva de productividad con la técnica Pomodoro e IA.

## 🛠️ Configuración Inicial (CRÍTICO)

Para que todas las funciones operen correctamente, debes configurar las siguientes **Environment Variables** en el panel de **Vercel**:

### 1. Variables de IA
- `GEMINI_API_KEY`: Consíguela en [Google AI Studio](https://aistudio.google.com/). Es vital para el desglose de tareas y la priorización.

### 2. Variables de Firebase
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`

### 3. Variables de Spotify
Para que el login de Spotify funcione:
- `NEXT_PUBLIC_SPOTIFY_CLIENT_ID`: El ID de tu cliente (Usado en frontend y backend).
- `SPOTIFY_CLIENT_SECRET`: El "Client Secret" que te da Spotify.

**Redirect URIs importantes en Spotify:**
- `https://tu-app.vercel.app/` (La URL de tu despliegue).

## 💰 Costos y Límites
- **IA (Gemini)**: Gratis (Nivel Free Tier de AI Studio).
- **Firebase**: Plan Spark (Gratis hasta 50k lecturas/día).
- **Spotify**: Gratis (Uso de Embed y API estándar).
