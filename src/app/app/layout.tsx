import { PersistentMusicPlayer } from '@/components/persistent-music-player';
import { PomodoroProvider } from "@/pomodoro/pomodoro-provider";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <PomodoroProvider>{children}</PomodoroProvider>
      <PersistentMusicPlayer />
    </>
  );
}
