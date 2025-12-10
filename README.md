BluePomodoro
BluePomodoro es una aplicación personal para planificar proyectos, gestionar tareas y registrar sesiones de la técnica Pomodoro. El repositorio contiene un backend con Fastify + Prisma y un frontend en React + Vite que consumen la misma base de datos SQLite.

Tecnologías principales
Frontend: React 19, TypeScript, Vite, TanStack Query y Zustand.
Backend: Fastify, Prisma y SQLite, con compilación vía tsup/tsx.
Infra: Monorepo sencillo con los proyectos separados en apps/backend y apps/frontend.
Estructura del repositorio
apps/backend/: API REST para proyectos, materias, tareas, subtareas y sesiones Pomodoro.
apps/frontend/: interfaz web para planificar y ejecutar las sesiones.
deprecated/: artefactos legados no utilizados en el flujo principal.
Requisitos previos
Node.js 20+ y npm.
SQLite (se usa un archivo local; no requiere servidor dedicado).
Puesta en marcha rápida
Configurar el backend

cd apps/backend
npm install
cp .env.example .env   # si existe; de lo contrario crea uno con tus valores
Variables recomendadas:

DATABASE_URL="file:./dev.db" (ruta del archivo SQLite).
API_KEY (opcional; protege la API con encabezado X-API-Key).
CORS_ORIGIN (por ejemplo http://localhost:5173).
PORT y HOST si quieres sobrescribir los valores por defecto 4000 y 0.0.0.0.
Después de definir el entorno:

npm run prisma:migrate   # aplica el esquema inicial
npx tsx prisma/seed.ts   # opcional: crea datos de ejemplo
npm run dev              # inicia Fastify en modo watch
Configurar el frontend

cd apps/frontend
npm install
Variables recomendadas en .env o .env.local:

VITE_API_BASE_URL=http://localhost:4000 (URL del backend; por defecto usa /api).
VITE_API_KEY si el backend requiere API key.
Luego ejecuta:

npm run dev   # arranca Vite en http://localhost:5173
Build de producción (opcional)

Backend: npm run build en apps/backend genera los artefactos en dist/ y puede iniciarse con npm start.
Frontend: npm run build en apps/frontend produce la versión estática en dist/.
Endpoints principales
/projects, /subjects, /tasks, /subtasks, /sessions admiten operaciones CRUD básicas.
/health expone un chequeo simple y está libre de API key.
Notas adicionales
El backend sirve archivos estáticos desde la carpeta public generada por el build del frontend, o desde la ruta indicada en STATIC_DIR.
Para pruebas locales, basta con mantener ambos servicios (npm run dev) y apuntar el frontend al backend usando las variables de entorno anteriores.
