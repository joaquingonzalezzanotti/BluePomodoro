
"use client"

import * as React from "react"
import { Music, Play, Pause, SkipForward, SkipBack, Volume2, Headphones } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"

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
          
          <div className="text-[10px] text-center text-muted-foreground">
            Integrando con Spotify / YouTube Music...
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
