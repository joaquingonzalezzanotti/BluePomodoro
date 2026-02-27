
"use client"

import * as React from "react"
import { useProfile } from "@/supabase/hooks"

export function PersistentMusicPlayer() {
  const { data: profile } = useProfile()
  const activeUrl = profile?.spotify_playlist_url || "https://open.spotify.com/embed/playlist/0vvXsWCC9xrXsKd4FyS8kM?utm_source=generator"

  const getEmbedUrl = (url: string) => {
    if (!url) return "https://open.spotify.com/embed/playlist/0vvXsWCC9xrXsKd4FyS8kM?utm_source=generator"
    if (url.includes("/embed/")) return url
    const match = url.match(/(playlist|album|track)[\/|:]([a-zA-Z0-9]+)/)
    if (match) {
      return `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator`
    }
    return "https://open.spotify.com/embed/playlist/0vvXsWCC9xrXsKd4FyS8kM?utm_source=generator"
  }

  const finalUrl = getEmbedUrl(activeUrl)

  return (
    <div className="fixed bottom-0 left-0 h-0 w-0 opacity-0 overflow-hidden pointer-events-none z-[-1]">
       <iframe 
        src={finalUrl} 
        width="1" 
        height="1" 
        frameBorder="0" 
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
        loading="lazy"
        title="Persistent Background Radio"
      ></iframe>
    </div>
  )
}
