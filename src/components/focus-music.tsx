
"use client"

import * as React from "react"
import { Music, Headphones, SkipForward, SkipBack, Maximize2, ExternalLink } from "lucide-react"
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
      <Card className="bg-slate-900/95 backdrop-blur-xl border-none shadow-2xl rounded-3xl overflow-hidden h-20 animate-in slide-in-from-bottom-8 duration-700 pointer-events-auto">
        <CardContent className="p-0 flex items-center h-full">
          <div className="w-16 h-16 shrink-0 bg-primary/10 flex items-center justify-center ml-2 rounded-2xl">
            <Music className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 px-4 overflow-hidden">
             <iframe 
              src={finalUrl} 
              width="100%" 
              height="80" 
              frameBorder="0" 
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
              loading="lazy"
              title="Spotify Focus Player"
              className="opacity-90"
            ></iframe>
          </div>
          <div className="px-4 border-l border-white/5 h-full flex items-center gap-2">
             <Button variant="ghost" size="icon" className="text-white/40 hover:text-white h-10 w-10">
                <Maximize2 className="h-4 w-4" />
             </Button>
          </div>
        </CardContent>
      </Card>
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
    <Card className="border-none shadow-xl bg-slate-900 overflow-hidden rounded-[2.5rem]">
      <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-white/5">
        <CardTitle className="text-white text-xs font-black flex items-center gap-2">
          <Headphones className="h-4 w-4 text-primary" /> CANAL DE ENFOQUE
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
          title="Spotify Focus Player"
        ></iframe>
      </CardContent>
    </Card>
  )
}
