
"use client";

import { useEffect, useRef, useState } from "react";
import { useProfile } from "@/supabase/hooks";
import { useSession } from "@/supabase";

export function SpotifyRealTime() {
  const { data: profile } = useProfile();
  const { session } = useSession();
  const [currentlyPlaying, setCurrentlyPlaying] = useState<any>(null);
  const refreshInFlight = useRef(false);

  useEffect(() => {
    const fetchCurrentlyPlaying = async () => {
      if (!profile?.spotify_access_token) return;

      let token = profile.spotify_access_token;
      let response = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401 && session?.access_token && !refreshInFlight.current) {
        refreshInFlight.current = true;
        const refreshRes = await fetch("/api/spotify/refresh", {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        refreshInFlight.current = false;

        if (refreshRes.ok) {
          const refreshJson = await refreshRes.json();
          if (refreshJson?.access_token) {
            token = refreshJson.access_token;
            response = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
              headers: { Authorization: `Bearer ${token}` },
            });
          }
        }
      }

      if (response.status === 204) {
        setCurrentlyPlaying(null);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setCurrentlyPlaying(data);
      }
    };

    fetchCurrentlyPlaying();
    const interval = setInterval(fetchCurrentlyPlaying, 5000);

    return () => clearInterval(interval);
  }, [profile?.spotify_access_token, session?.access_token]);

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
