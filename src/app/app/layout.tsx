import { PersistentMusicPlayer } from '@/components/persistent-music-player';

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {children}
      <PersistentMusicPlayer />
    </>
  );
}
