
# BluePomodoro 🚀

Tu herramienta definitiva de productividad con la técnica Pomodoro e IA.

## 🛠️ Configuración Inicial (CRÍTICO)

Para que todas las funciones operen correctamente, necesitas configurar tu entorno en **Vercel** (Panel de Environment Variables):

### 1. Variables de Entorno en Vercel
- `GEMINI_API_KEY`: Consíguela en [Google AI Studio](https://aistudio.google.com/).
- `NEXT_PUBLIC_SPOTIFY_CLIENT_ID`: 
  1. Ve al [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
  2. Crea una "App".
  3. Copia el **Client ID** y pégalo en Vercel con este nombre exacto.
  4. En **Redirect URIs**, añade: `http://localhost:9002` y la URL de tu app en Vercel (ej: `https://tu-app.vercel.app`).

**Nota:** No necesitas poner estas llaves en la consola de Firebase. Firebase se encarga de la base de datos y los usuarios, pero Spotify y Gemini se configuran directamente en Vercel.

### 2. Autorizar Dominios en Firebase (Para el Login de Google)
Si el login de Google falla al desplegar en Vercel:
1. **Firebase Console**: `Authentication` > `Settings` > `Authorized domains` > Añade tu URL de Vercel.
2. **Google Cloud Console**: Edita tu ID de OAuth > "Authorized JavaScript origins" > Añade tu URL de Vercel.

## 💰 Costos y Límites
- **IA (Gemini)**: Gratis (Nivel Free Tier de AI Studio).
- **Firebase**: Plan Spark (Gratis hasta 50k lecturas/día).
- **Vercel**: Plan Hobby (Gratis).
- **Spotify**: Gratis (Uso de Embed y API estándar).

**En resumen: El costo de mantener esta app para uso personal es de $0.**
