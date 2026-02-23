
"use client"

import * as React from "react"
import { Music, Play, Pause, SkipForward, SkipBack, Volume2, Headphones, Radio, Save, ExternalLink, RefreshCw, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { useUser, useFirestore, useDoc, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase"
import { doc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

const DEFAULT_PLAYLIST = "https://open.spotify.com/embed/playlist/0vvXsWCC9xrXsKd4FyS8kM?utm_source=generator"

const SPOTIFY_CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || ""
const REDIRECT_URI = typeof window !== 'undefined' ? `${window.location.origin}` : ""
const SCOPES = "user-read-private user-read-email playlist-read-private"

export function FocusMusic() {
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [volume, setVolume] = React.useState([50])
  const [spotifyUrlInput, setSpotifyUrlInput] = React.useState("")
  const [isConnecting, setIsConnecting] = React.useState(false)
  
  const { user } = useUser()
  const db = useFirestore()
  const { toast } = useToast()

  const userRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "usuarios", user.uid)
  }, [db, user])

  const { data: userData } = useDoc(userRef)

  const handleSpotifyLogin = () => {
    if (!SPOTIFY_CLIENT_ID) {
      toast({
        variant: "destructive",
        title: "Configuración requerida",
        description: "Falta el SPOTIFY_CLIENT_ID en las variables de entorno.",
      })
      return
    }

    setIsConnecting(true)
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}`
    window.location.href = authUrl
  }

  const handleSaveSpotifyUrl = (url: string) => {
    if (!userRef) return
    
    updateDocumentNonBlocking(userRef, {
      spotifyPlaylistUrl: url
    })

    toast({
      title: "Música actualizada",
      description: "Tu selección ha sido guardada.",
    })
  }

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

  const activeSpotifyUrl = getEmbedUrl(userData?.spotifyPlaylistUrl || "")

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
              <Radio className="h-3 w-3" /> MI SPOTIFY
            </TabsTrigger>
            <TabsTrigger value="manual" className="text-xs font-bold">POR ENLACE</TabsTrigger>
          </TabsList>

          <TabsContent value="spotify" className="space-y-4">
            {!userData?.spotifyAccessToken ? (
              <div className="flex flex-col items-center justify-center py-6 text-center space-y-4 bg-primary/5 rounded-2xl border border-dashed border-primary/20">
                <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Music className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold">Vincula tu cuenta</p>
                  <p className="text-[10px] text-muted-foreground px-6">Accede a tus playlists personales directamente.</p>
                </div>
                <Button onClick={handleSpotifyLogin} disabled={isConnecting} className="gap-2 bg-green-500 hover:bg-green-600 text-white rounded-full font-bold text-xs h-9 px-6">
                  <LogIn className="h-3.5 w-3.5" />
                  {isConnecting ? "CONECTANDO..." : "CONECTAR CON SPOTIFY"}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-xl border border-green-500/20">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center text-white">
                    <Music className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-bold">Cuenta Vinculada</p>
                </div>
                <Button variant="ghost" size="sm" onClick={handleSpotifyLogin} className="text-[10px] font-bold text-green-600 hover:bg-green-500/10">
                  RECONECTAR
                </Button>
              </div>
            )}

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
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <div className="flex gap-2 mb-2">
              <Input 
                placeholder="Pega enlace de playlist o álbum..." 
                value={spotifyUrlInput}
                onChange={(e) => setSpotifyUrlInput(e.target.value)}
                className="text-xs h-9 bg-muted/30"
              />
              <Button size="sm" variant="secondary" className="h-9 px-3" onClick={() => handleSaveSpotifyUrl(spotifyUrlInput)}>
                <Save className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[9px] text-muted-foreground leading-tight italic">
              Ejemplo: https://open.spotify.com/playlist/37i9dQZF1DWZeKHA6uMp6M
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
