import type { Metadata, Viewport } from "next";
import './globals.css';
import { SupabaseProvider } from "@/supabase";
import { PwaRegister } from "@/components/pwa-register";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'BluePomodoro - Domina tu Productividad con IA y Focus TDAH',
  description: 'La herramienta definitiva de productividad diseñada para mentes neurodivergentes. Desglose de tareas con IA, técnica Pomodoro gamificada y modo de enfoque profundo sin distracciones.',
  keywords: ['pomodoro', 'IA', 'TDAH', 'productividad', 'gestión de tareas', 'enfoque', 'focus', 'neurodivergente'],
  authors: [{ name: 'BluePomodoro Team' }],
  manifest: "/manifest.json",
  openGraph: {
    title: 'BluePomodoro - Domina tu Tiempo',
    description: 'Gestión de tareas impulsada por IA para mentes extraordinarias.',
    url: 'https://blue-pomodoro-fire-base.vercel.app',
    siteName: 'BluePomodoro',
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: 'BluePomodoro Preview',
      },
    ],
    locale: 'es_ES',
    type: 'website',
  },
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="font-sans antialiased selection:bg-primary/20">
        <SupabaseProvider>
          <PwaRegister />
          {children}
        </SupabaseProvider>
      </body>
    </html>
  );
}
