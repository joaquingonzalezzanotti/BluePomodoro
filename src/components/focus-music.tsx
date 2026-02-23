
"use client"

import * as React from "react"
import { Music, Headphones, SkipForward, SkipBack } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"

interface FocusMusicProps {
  layout?: "sidebar" | "dashboard"
}

export function FocusMusic({ layout = "dashboard" }: FocusMusicProps) {
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

  if (layout === "sidebar") {
    return (
      <div className="flex flex-col gap-2 group-data-[collapsible=icon]:items-center py-2 border-t border-primary/5">
        <div className="flex items-center justify-between px-2 group-data-[collapsible=icon]:hidden">
          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Controles</span>
          <Music className="h-3 w-3 text-primary/40" />
        </div>
        
        <div className="flex items-center justify-center gap-1 bg-primary/5 p-1 rounded-xl">
           <Button variant="ghost" size="icon" className="h-7 w-7 text-primary/60 hover:text-primary transition-colors">
              <SkipBack className="h-4 w-4" />
           </Button>
           <div className="h-7 w-7 flex items-center justify-center bg-primary/10 rounded-lg group-data-[collapsible=icon]:hidden">
              <Headphones className="h-3.5 w-3.5 text-primary" />
           </div>
           <Button variant="ghost" size="icon" className="h-7 w-7 text-primary/60 hover:text-primary transition-colors">
              <SkipForward className="h-4 w-4" />
           </Button>
        </div>
      </div>
    )
  }

  return (
    <Card className="border-none shadow-xl bg-slate-900 overflow-hidden rounded-[2rem]">
      <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-white/5">
        <CardTitle className="text-white text-sm font-black flex items-center gap-2">
          <Headphones className="h-4 w-4 text-primary" /> MÚSICA DE ENFOQUE
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <iframe 
          src={finalUrl} 
          width="100%" 
          height="152" 
          frameBorder="0" 
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
          loading="lazy"
        ></iframe>
      </CardContent>
    </Card>
  )
}
