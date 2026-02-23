
"use client"

import * as React from "react"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"

/**
 * Este componente mantiene el iframe de Spotify montado en la raíz de la aplicación.
 * Esto evita que la música se pause al cambiar de ruta o pestañas internas.
 */
export function PersistentMusicPlayer() {
  const { user } = useUser()
  const db = useFirestore()

  const userRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "usuarios", user.uid)
  }, [db, user])

  const { data: userData } = useDoc(userRef)
  const activeUrl = userData?.spotifyPlaylistUrl || "https://open.spotify.com/embed/playlist/0vvXsWCC9xrXsKd4FyS8kM?utm_source=generator"

  const getEmbedUrl = (url: string) => {
    if (url.includes("/embed/")) return url
    const playlistMatch = url.match(/playlist[\/|:]([a-zA-Z0-9]+)/)
    if (playlistMatch) return `https://open.spotify.com/embed/playlist/${playlistMatch[1]}?utm_source=generator`
    return url
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
        title="Persistent Focus Radio"
      ></iframe>
    </div>
  )
}
