
# BluePomodoro 🚀

Tu herramienta definitiva de productividad con la técnica Pomodoro e IA.

## 🛠️ Configuración Inicial (CRÍTICO)

Para que todas las funciones operen correctamente, necesitas configurar un par de cosas en tu entorno (archivo `.env` local o en el panel de Vercel):

### 1. Variables de Entorno Obligatorias
- `GEMINI_API_KEY`: Consíguela en [Google AI Studio](https://aistudio.google.com/).
- `NEXT_PUBLIC_SPOTIFY_CLIENT_ID`: **Necesario para la vinculación interna**.
  1. Ve al [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
  2. Crea una "App" (ponle cualquier nombre).
  3. En "Settings", copia el **Client ID**.
  4. En **Redirect URIs**, añade: `http://localhost:9002` y la URL de tu app en Vercel.

### 2. Configurar Spotify OAuth
Si ves un error de "Configuración requerida", es porque falta el Client ID arriba mencionado. Una vez puesto, el botón "Conectar con Spotify" funcionará mágicamente.

### 3. Autorizar Dominios de Google (Para Vercel)
Si el login de Google falla al desplegar:
1. **Firebase Console**: `Authentication` > `Settings` > `Authorized domains` > Añade tu URL de Vercel.
2. **Google Cloud Console**: Edita tu ID de OAuth > "Authorized JavaScript origins" > Añade tu URL de Vercel.

## 💰 Costos y Límites
- **IA (Gemini)**: Gratis hasta un límite muy alto de peticiones/minuto.
- **Firebase**: Plan Spark (Gratis hasta 50k lecturas/día).
- **Vercel**: Plan Hobby (Gratis).
- **Spotify**: Gratis.

**En resumen: El costo de mantener esta app para uso personal es de $0.**
