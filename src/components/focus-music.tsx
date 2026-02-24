
"use client"

import * as React from "react"
import { Music, Headphones, Maximize2, ExternalLink, Play, Pause, SkipForward } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import { cn } from "@/lib/utils"

interface FocusMusicProps {
  layout?: "sidebar" | "dashboard" | "dock"
}

export function FocusMusic({ layout = "dashboard" }: FocusMusicProps) {
  const { user } = useUser()
  const db = useFirestore()

  const userRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "usuarios", user.uid)
  }, [db, user])

  const { data: userData } = useDoc(userRef)
  const activeUrl = userData?.spotifyPlaylistUrl || "https://open.spotify.com/playlist/0vvXsWCC9xrXsKd4FyS8kM"

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

  if (layout === "dock") {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 pointer-events-none z-50">
        <div className="bg-white/60 backdrop-blur-2xl border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.05)] rounded-full overflow-hidden h-20 animate-in slide-in-from-bottom-8 duration-1000 pointer-events-auto flex items-center px-4 gap-4">
          <div className="w-12 h-12 shrink-0 bg-primary/10 rounded-full flex items-center justify-center">
            <Music className="h-5 w-5 text-primary animate-pulse" />
          </div>
          
          <div className="flex-1 h-12 overflow-hidden rounded-full relative">
             <iframe 
              src={finalUrl} 
              width="100%" 
              height="80" 
              frameBorder="0" 
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
              loading="lazy"
              title="Spotify Focus Player"
              className="absolute -top-4 opacity-80 hover:opacity-100 transition-opacity"
            ></iframe>
          </div>

          <div className="flex items-center gap-1 pr-2 border-l border-primary/5 pl-4">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-primary/40 hover:text-primary hover:bg-primary/5 transition-all">
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-primary/40 hover:text-primary hover:bg-primary/5 transition-all">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (layout === "sidebar") {
    return (
      <div className="flex flex-col gap-2 group-data-[collapsible=icon]:items-center py-2 border-t border-primary/5">
        <div className="flex items-center justify-center gap-1 bg-primary/5 p-1 rounded-xl">
           <Button variant="ghost" size="icon" className="h-7 w-7 text-primary/60 hover:text-primary transition-colors">
              <Headphones className="h-3.5 w-3.5" />
           </Button>
        </div>
      </div>
    )
  }

  return (
    <Card className="border-none shadow-xl bg-white/40 backdrop-blur-xl overflow-hidden rounded-[2.5rem] border border-white/40">
      <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-primary/5">
        <CardTitle className="text-primary text-[10px] font-black flex items-center gap-2 uppercase tracking-widest">
          <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
          Canal de Enfoque
        </CardTitle>
        <Headphones className="h-4 w-4 text-primary/30" />
      </CardHeader>
      <CardContent className="p-4">
        <div className="rounded-3xl overflow-hidden border border-primary/5 bg-white/50">
          <iframe 
            src={finalUrl} 
            width="100%" 
            height="152" 
            frameBorder="0" 
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
            loading="lazy"
            title="Spotify Player"
            className="opacity-90"
          ></iframe>
        </div>
      </CardContent>
    </Card>
  )
}
