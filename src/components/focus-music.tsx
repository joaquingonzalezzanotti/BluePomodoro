
"use client"

import * as React from "react"
import { Music, Play, Pause, SkipForward, SkipBack, Volume2, Headphones, Radio } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const TRACKS = [
  { id: 1, name: "Deep Focus Lo-Fi", artist: "Mezcla BluePomodoro", duration: "3:45" },
  { id: 2, name: "Lluvia Ambiental", artist: "Sonidos de la Naturaleza", duration: "∞" },
  { id: 3, name: "Concentración Piano", artist: "Flujo Clásico", duration: "4:12" },
]

export function FocusMusic() {
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [volume, setVolume] = React.useState([50])
  const [currentTrackIndex, setCurrentTrackIndex] = React.useState(0)

  const currentTrack = TRACKS[currentTrackIndex]

  const nextTrack = () => setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length)
  const prevTrack = () => setCurrentTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length)

  return (
    <Card className="w-full bg-card shadow-lg border-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Headphones className="h-5 w-5 text-primary" />
          Música de Enfoque
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="local" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted/50">
            <TabsTrigger value="local" className="text-xs font-bold">REPRODUCTOR</TabsTrigger>
            <TabsTrigger value="spotify" className="text-xs font-bold flex gap-2">
              <Radio className="h-3 w-3" /> SPOTIFY
            </TabsTrigger>
          </TabsList>

          <TabsContent value="local">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-primary/20 rounded-lg flex items-center justify-center">
                <Music className={`h-8 w-8 text-primary ${isPlaying ? "animate-bounce" : ""}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold truncate text-sm">{currentTrack.name}</h4>
                <p className="text-xs text-muted-foreground">{currentTrack.artist}</p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-center gap-4">
                <Button variant="ghost" size="icon" onClick={prevTrack}>
                  <SkipBack className="h-5 w-5" />
                </Button>
                <Button 
                  className="h-10 w-10 rounded-full bg-primary hover:bg-primary/80" 
                  size="icon"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={nextTrack}>
                  <SkipForward className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex items-center gap-2 px-2">
                <Volume2 className="h-4 w-4 text-muted-foreground" />
                <Slider 
                  value={volume} 
                  onValueChange={setVolume} 
                  max={100} 
                  step={1} 
                  className="flex-1"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="spotify">
            <div className="rounded-xl overflow-hidden shadow-inner bg-slate-900">
              <iframe 
                src="https://open.spotify.com/embed/playlist/37i9dQZF1DWZeKHA6V9KWm?utm_source=generator&theme=0" 
                width="100%" 
                height="152" 
                frameBorder="0" 
                allowFullScreen={true} 
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                loading="lazy"
              ></iframe>
            </div>
            <p className="text-[10px] text-center text-muted-foreground mt-3 font-medium">
              Conecta tu cuenta para escuchar tus propias listas.
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
