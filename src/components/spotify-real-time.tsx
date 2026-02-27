
"use client";

import { useEffect, useState } from 'react';
import { useProfile } from "@/supabase/hooks";

export function SpotifyRealTime() {
  const { data: profile } = useProfile();
  const [currentlyPlaying, setCurrentlyPlaying] = useState<any>(null);

  useEffect(() => {
    const fetchCurrentlyPlaying = async () => {
      if (profile?.spotify_access_token) {
        const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
          headers: {
            Authorization: `Bearer ${profile.spotify_access_token}`,
          },
        });

        if (response.status === 204) {
          setCurrentlyPlaying(null);
          return;
        }

        if (response.ok) {
          const data = await response.json();
          setCurrentlyPlaying(data);
        }
      }
    };

    fetchCurrentlyPlaying();
    const interval = setInterval(fetchCurrentlyPlaying, 5000);

    return () => clearInterval(interval);
  }, [profile?.spotify_access_token]);

  if (!currentlyPlaying) {
    return <div>No song playing</div>;
  }

  const title = currentlyPlaying?.item?.name ?? "Sin titulo";
  const artistNames = Array.isArray(currentlyPlaying?.item?.artists)
    ? currentlyPlaying.item.artists.map((artist: { name: string }) => artist.name).join(", ")
    : "";

  return (
    <div>
      <h2>Currently Playing</h2>
      <p>{title}</p>
      <p>{artistNames}</p>
    </div>
  );
}
