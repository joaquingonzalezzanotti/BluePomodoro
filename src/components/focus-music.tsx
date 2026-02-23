
"use client"

import * as React from "react"
import { Music, Play, Pause, SkipForward, SkipBack, Headphones, Radio, Save, ExternalLink, RefreshCw, LogIn, AlertCircle } from "lucide-react"
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
      <div className="space-y-2 group-data-[collapsible=icon]:hidden">
        <div className="flex items-center justify-between px-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Focus Radio</span>
          <Music className="h-3 w-3 text-primary" />
        </div>
        <div className="rounded-xl overflow-hidden shadow-sm border border-primary/5 bg-slate-900 h-20">
          <iframe 
            src={finalUrl} 
            width="100%" 
            height="80" 
            frameBorder="0" 
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
            loading="lazy"
          ></iframe>
        </div>
      </div>
    )
  }

  return (
    <Card className="border-none shadow-xl bg-slate-900 overflow-hidden">
      <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-white/5">
        <CardTitle className="text-white text-sm font-black flex items-center gap-2">
          <Headphones className="h-4 w-4 text-primary" /> FOCUS PLAYER
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <iframe 
          src={finalUrl} 
          width="100%" 
          height="380" 
          frameBorder="0" 
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
          loading="lazy"
        ></iframe>
      </CardContent>
    </Card>
  )
}
