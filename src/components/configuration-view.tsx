
"use client"

import * as React from "react"
import { Settings, Music, Cloud, ExternalLink, Save, Shield, LayoutGrid } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useFirestore, useUser, useMemoFirebase, updateDocumentNonBlocking, useDoc } from "@/firebase"
import { doc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { DistractionBlocker } from "@/components/distraction-blocker"
import { GoogleSyncSettings } from "@/components/google-sync-settings"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

export function ConfigurationView() {
  const { user } = useUser()
  const db = useFirestore()
  const { toast } = useToast()
  const [spotifyInput, setSpotifyInput] = React.useState("")

  const userRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "usuarios", user.uid)
  }, [db, user])

  const { data: userData } = useDoc(userRef)

  const handleSaveSpotify = () => {
    if (!userRef || !spotifyInput) return
    updateDocumentNonBlocking(userRef, { spotifyPlaylistUrl: spotifyInput })
    toast({ title: "Spotify vinculado", description: "Tu música ha sido actualizada." })
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 bg-primary rounded-2xl flex items-center justify-center">
          <Settings className="text-white h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-black">Configuración Global</h2>
          <p className="text-sm text-muted-foreground">Centraliza tus integraciones y reglas de enfoque.</p>
        </div>
      </div>

      <Tabs defaultValue="integraciones" className="w-full">
        <TabsList className="bg-white p-1 rounded-2xl shadow-sm border border-slate-100 mb-8 h-12">
          <TabsTrigger value="integraciones" className="rounded-xl px-8 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
            <Cloud className="h-4 w-4 mr-2" /> Google & Spotify
          </TabsTrigger>
          <TabsTrigger value="bloqueos" className="rounded-xl px-8 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
            <Shield className="h-4 w-4 mr-2" /> Escudo Focus
          </TabsTrigger>
        </TabsList>

        <TabsContent value="integraciones" className="space-y-8">
          <GoogleSyncSettings />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
              <CardHeader className="bg-green-500/5">
                <CardTitle className="flex items-center gap-2"><Music className="h-5 w-5 text-green-500" /> Mi Música de Enfoque</CardTitle>
                <CardDescription>Pega aquí el enlace de tu playlist favorita de Spotify.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <Input 
                  placeholder="https://open.spotify.com/playlist/..." 
                  value={spotifyInput}
                  onChange={(e) => setSpotifyInput(e.target.value)}
                  className="rounded-xl bg-muted/30 border-none h-12 font-medium"
                />
                <Button onClick={handleSaveSpotify} className="w-full h-12 gap-2 rounded-xl font-bold bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/20">
                  <Save className="h-4 w-4" /> Vincular Playlist
                </Button>
              </CardContent>
            </Card>

            <div className="p-8 bg-slate-900 text-white rounded-[2rem] flex flex-col justify-center">
              <h3 className="text-lg font-black flex items-center gap-2 mb-2"><Shield className="h-5 w-5 text-primary" /> Modo Focus Profundo</h3>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Tus bloqueos de sitios y configuraciones se sincronizan en la nube. Activa el Modo Focus en el tablero para aplicar estas reglas.
              </p>
              <Button variant="secondary" className="gap-2 rounded-xl font-bold w-fit">
                <ExternalLink className="h-4 w-4" /> Guía de Productividad
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="bloqueos">
          <DistractionBlocker />
        </TabsContent>
      </Tabs>
    </div>
  )
}
