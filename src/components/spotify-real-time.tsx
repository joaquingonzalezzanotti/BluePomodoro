
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

  const item = currentlyPlaying?.item;
  const isPlaying = Boolean(currentlyPlaying && item);
  const title = item?.name ?? "Sin titulo";
  const artistNames = Array.isArray(item?.artists)
    ? item.artists.map((artist: { name: string }) => artist.name).join(", ")
    : "";
  const cover = item?.album?.images?.[0]?.url as string | undefined;

  if (!isPlaying) {
    return (
      <div className="mt-6 rounded-3xl border border-slate-100 bg-white/80 px-5 py-4 text-center text-xs font-bold uppercase tracking-widest text-slate-300 shadow-sm">
        Sin reproduccion activa
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-3xl border border-slate-100 bg-white px-5 py-4 shadow-sm flex items-center gap-4">
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="Album cover" className="h-12 w-12 rounded-xl object-cover" />
      ) : (
        <div className="h-12 w-12 rounded-xl bg-slate-100" />
      )}
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Now Playing</p>
        <p className="text-sm font-black truncate text-slate-900">{title}</p>
        <p className="text-xs font-medium text-slate-400 truncate">{artistNames}</p>
      </div>
    </div>
  );
}
