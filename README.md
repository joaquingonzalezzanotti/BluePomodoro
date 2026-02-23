# BluePomodoro 🚀

Tu herramienta definitiva de productividad con la técnica Pomodoro e IA.

## 🛠️ Despliegue en Vercel

Para que la aplicación funcione correctamente en producción, debes configurar las siguientes **Environment Variables** en tu panel de Vercel (Settings > Environment Variables):

### 1. IA (Obligatorio)
- `GEMINI_API_KEY`: Tu clave de API de Google AI Studio (consíguela en [aistudio.google.com](https://aistudio.google.com/)). Es la que permite el desglose de tareas y la priorización inteligente.

### 2. Firebase (Opcional - ya incluido en el código)
Si deseas sobreescribir la configuración por seguridad, puedes usar:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`

## 🔑 Configuración de Seguridad (Google Auth)

Para que el inicio de sesión funcione en tu dominio de Vercel:
1. Ve a la [Consola de Firebase](https://console.firebase.google.com/).
2. Entra en **Authentication** > **Settings** > **Authorized domains**.
3. Haz clic en **Add domain** y añade el dominio de tu app (ej: `blue-pomodoro.vercel.app`).
4. **Google Cloud Console**: Asegúrate de añadir la URL de Vercel en los "Orígenes de JavaScript autorizados" de tu ID de cliente OAuth 2.0.

## 🧠 Funcionalidades de IA
- **Desglose de Tareas**: Divide tareas complejas en pasos accionables en español.
- **Priorización Inteligente**: Organiza tu día basándose en niveles de energía y fechas límite.
- **Música Personalizada**: Widget de Spotify integrado en la barra lateral.

## 📝 Licencia
Este proyecto es parte de un prototipo generado en Firebase Studio.