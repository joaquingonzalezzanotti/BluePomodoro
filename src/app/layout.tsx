
import type {Metadata} from 'next';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase';
import { PersistentMusicPlayer } from '@/components/persistent-music-player';

export const metadata: Metadata = {
  title: 'BluePomodoro - Domina tu Productividad con IA y Focus TDAH',
  description: 'La herramienta definitiva de productividad diseñada para mentes neurodivergentes. Desglose de tareas con IA, técnica Pomodoro gamificada y modo de enfoque profundo sin distracciones.',
  keywords: ['pomodoro', 'IA', 'TDAH', 'productividad', 'gestión de tareas', 'enfoque', 'focus', 'neurodivergente'],
  authors: [{ name: 'BluePomodoro Team' }],
  openGraph: {
    title: 'BluePomodoro - Domina tu Tiempo',
    description: 'Gestión de tareas impulsada por IA para mentes extraordinarias.',
    url: 'https://blue-pomodoro-fire-base.vercel.app',
    siteName: 'BluePomodoro',
    images: [
      {
        url: 'https://picsum.photos/seed/productivity/1200/630',
        width: 1200,
        height: 630,
        alt: 'BluePomodoro Preview',
      },
    ],
    locale: 'es_ES',
    type: 'website',
  },
  icons: {
    icon: '/favicon.ico?v=2',
    shortcut: '/favicon.ico?v=2',
    apple: '/favicon.ico?v=2',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.Node;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased selection:bg-primary/20">
        <FirebaseClientProvider>
          {children}
          <PersistentMusicPlayer />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
