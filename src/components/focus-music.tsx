
"use client"

import * as React from "react"
import { Music, Play, Pause, SkipForward, SkipBack, Volume2, Headphones, Radio, Save, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { useUser, useFirestore, useDoc, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase"
import { doc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

const DEFAULT_PLAYLIST = "https://open.spotify.com/embed/playlist/0vvXsWCC9xrXsKd4FyS8kM?utm_source=generator"

const TRACKS = [
  { id: 1, name: "Deep Focus Lo-Fi", artist: "Mezcla BluePomodoro", duration: "3:45" },
  { id: 2, name: "Lluvia Ambiental", artist: "Sonidos de la Naturaleza", duration: "∞" },
  { id: 3, name: "Concentración Piano", artist: "Flujo Clásico", duration: "4:12" },
]

export function FocusMusic() {
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [volume, setVolume] = React.useState([50])
  const [currentTrackIndex, setCurrentTrackIndex] = React.useState(0)
  const [spotifyUrlInput, setSpotifyUrlInput] = React.useState("")
  
  const { user } = useUser()
  const db = useFirestore()
  const { toast } = useToast()

  const userRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "usuarios", user.uid)
  }, [db, user])

  const { data: userData } = useDoc(userRef)

  const currentTrack = TRACKS[currentTrackIndex]

  const nextTrack = () => setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length)
  const prevTrack = () => setCurrentTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length)

  const getEmbedUrl = (url: string) => {
    if (!url) return DEFAULT_PLAYLIST
    if (url.includes("/embed/")) return url
    
    const playlistMatch = url.match(/playlist[\/|:]([a-zA-Z0-9]+)/)
    const albumMatch = url.match(/album[\/|:]([a-zA-Z0-9]+)/)
    const trackMatch = url.match(/track[\/|:]([a-zA-Z0-9]+)/)
    
    if (playlistMatch) return `https://open.spotify.com/embed/playlist/${playlistMatch[1]}?utm_source=generator`
    if (albumMatch) return `https://open.spotify.com/embed/album/${albumMatch[1]}?utm_source=generator`
    if (trackMatch) return `https://open.spotify.com/embed/track/${trackMatch[1]}?utm_source=generator`
    
    return DEFAULT_PLAYLIST
  }

  const handleSaveSpotifyUrl = () => {
    if (!userRef || !spotifyUrlInput) return
    
    updateDocumentNonBlocking(userRef, {
      spotifyPlaylistUrl: spotifyUrlInput
    })

    toast({
      title: "Música guardada",
      description: "Tu lista personalizada ha sido actualizada.",
    })
  }

  const activeSpotifyUrl = userData?.spotifyPlaylistUrl 
    ? getEmbedUrl(userData.spotifyPlaylistUrl) 
    : DEFAULT_PLAYLIST

  return (
    <Card className="w-full bg-card shadow-lg border-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Headphones className="h-5 w-5 text-primary" />
          Música de Enfoque
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="spotify" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted/50">
            <TabsTrigger value="spotify" className="text-xs font-bold flex gap-2">
              <Radio className="h-3 w-3" /> SPOTIFY
            </TabsTrigger>
            <TabsTrigger value="local" className="text-xs font-bold">REPRODUCTOR</TabsTrigger>
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

          <TabsContent value="spotify" className="space-y-4">
            <div className="flex gap-2 mb-2">
              <Input 
                placeholder="Pega tu playlist/álbum de Spotify..." 
                value={spotifyUrlInput}
                onChange={(e) => setSpotifyUrlInput(e.target.value)}
                className="text-xs h-8 bg-muted/30"
              />
              <Button size="sm" variant="secondary" className="h-8 px-3" onClick={handleSaveSpotifyUrl}>
                <Save className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="rounded-xl overflow-hidden shadow-inner bg-slate-900 min-h-[152px]">
              <iframe 
                src={activeSpotifyUrl} 
                width="100%" 
                height="152" 
                frameBorder="0" 
                allowFullScreen={true} 
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                loading="lazy"
              ></iframe>
            </div>
            
            <div className="flex items-center justify-center gap-4 mt-2">
              <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">
                {userData?.spotifyPlaylistUrl ? "Tu lista está lista" : "Usando lista predeterminada"}
              </p>
              <a 
                href="https://open.spotify.com" 
                target="_blank" 
                rel="noreferrer" 
                className="text-[9px] font-bold text-primary flex items-center gap-1 hover:underline"
              >
                ABRIR SPOTIFY <ExternalLink className="h-2 w-2" />
              </a>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
