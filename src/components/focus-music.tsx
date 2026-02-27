
"use client"

import * as React from "react"
import { Music, Headphones, ChevronUp, ChevronDown, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useProfile } from "@/supabase/hooks"
import { cn } from "@/lib/utils"

interface FocusMusicProps {
  layout?: "sidebar" | "dashboard" | "dock"
}

export function FocusMusic({ layout = "dashboard" }: FocusMusicProps) {
  const { data: profile } = useProfile()
  const [isExpanded, setIsExpanded] = React.useState(false)
  const activeUrl = profile?.spotify_playlist_url || "https://open.spotify.com/playlist/0vvXsWCC9xrXsKd4FyS8kM"

  const getEmbedUrl = (url: string) => {
    if (!url) return "https://open.spotify.com/embed/playlist/0vvXsWCC9xrXsKd4FyS8kM?utm_source=generator"
    if (url.includes("/embed/")) return url
    const match = url.match(/(playlist|album|track)[\/|:]([a-zA-Z0-9]+)/)
    if (match) {
      return `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator&theme=0`
    }
    return "https://open.spotify.com/embed/playlist/0vvXsWCC9xrXsKd4FyS8kM?utm_source=generator&theme=0"
  }

  const finalUrl = getEmbedUrl(activeUrl)

  if (layout === "dock") {
    return (
      <div className={cn(
        "fixed bottom-6 right-6 z-50 transition-all duration-500 ease-in-out",
        isExpanded ? "w-[380px]" : "w-[180px]"
      )}>
        <div className={cn(
          "bg-white/70 backdrop-blur-2xl border border-white/40 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2rem] overflow-hidden transition-all duration-500",
          isExpanded ? "p-4 h-[180px]" : "p-3 h-[56px]"
        )}>
          <div className="flex items-center justify-between mb-3 h-8 px-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className={cn(
                "h-2 w-2 bg-primary rounded-full shrink-0",
                isExpanded && "animate-pulse"
              )} />
              <span className="text-[10px] font-black uppercase tracking-widest text-primary/80 truncate">
                Focus Radio
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-8 w-8 rounded-full hover:bg-primary/5 text-primary/60 transition-transform duration-300"
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          <div className={cn(
            "rounded-2xl overflow-hidden transition-opacity duration-500",
            isExpanded ? "opacity-100" : "opacity-0 pointer-events-none"
          )}>
            <iframe 
              src={finalUrl} 
              width="100%" 
              height="80" 
              frameBorder="0" 
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
              loading="lazy"
              title="Spotify Focus Player"
              className="rounded-xl"
            ></iframe>
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
    <Card className="border-none shadow-xl bg-white/60 backdrop-blur-xl overflow-hidden rounded-[2.5rem] border border-white/40">
      <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-primary/5 px-6">
        <CardTitle className="text-primary text-[10px] font-black flex items-center gap-2 uppercase tracking-widest">
          <Music className="h-3 w-3" />
          Reproductor de Enfoque
        </CardTitle>
        <Headphones className="h-4 w-4 text-primary/20" />
      </CardHeader>
      <CardContent className="p-6">
        <div className="rounded-[2rem] overflow-hidden border border-slate-100 bg-slate-50">
          <iframe 
            src={finalUrl} 
            width="100%" 
            height="152" 
            frameBorder="0" 
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
            loading="lazy"
            title="Spotify Player"
            className="opacity-95"
          ></iframe>
        </div>
      </CardContent>
    </Card>
  )
}
