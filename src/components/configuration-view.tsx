"use client"

import * as React from "react"
import { Settings, Music, Cloud, ExternalLink, Save, Calendar, CheckSquare, Shield } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useFirestore, useUser, useMemoFirebase, updateDocumentNonBlocking, useDoc, setDocumentNonBlocking } from "@/firebase"
import { doc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { DistractionBlocker } from "@/components/distraction-blocker"

export function ConfigurationView() {
  const { user } = useUser()
  const db = useFirestore()
  const { toast } = useToast()
  const [spotifyInput, setSpotifyInput] = React.useState("")

  const userRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "usuarios", user.uid)
  }, [db, user])

  const syncRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "usuarios", user.uid, "configuracionesSincronizacionGoogle", "default")
  }, [db, user])

  const { data: userData } = useDoc(userRef)
  const { data: syncData } = useDoc(syncRef)

  const handleSaveSpotify = () => {
    if (!userRef || !spotifyInput) return
    updateDocumentNonBlocking(userRef, { spotifyPlaylistUrl: spotifyInput })
    toast({ title: "Spotify vinculado", description: "Tu música ha sido actualizada." })
  }

  const handleToggleSync = (key: string, value: boolean) => {
    if (!syncRef) return
    setDocumentNonBlocking(syncRef, { [key]: value }, { merge: true })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 bg-primary rounded-2xl flex items-center justify-center">
          <Settings className="text-white h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-black">Configuración</h2>
          <p className="text-sm text-muted-foreground">Gestiona tus integraciones, música y bloqueos de distracciones.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-8">
          <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
            <CardHeader className="bg-green-500/5">
              <CardTitle className="flex items-center gap-2"><Music className="h-5 w-5 text-green-500" /> Mi Música</CardTitle>
              <CardDescription>Pega aquí el enlace de tu playlist favorita de Spotify.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <Input 
                placeholder="https://open.spotify.com/playlist/..." 
                value={spotifyInput}
                onChange={(e) => setSpotifyInput(e.target.value)}
                className="rounded-xl bg-muted/30"
              />
              <Button onClick={handleSaveSpotify} className="w-full gap-2 rounded-xl font-bold bg-green-500 hover:bg-green-600">
                <Save className="h-4 w-4" /> Vincular Spotify
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
            <CardHeader className="bg-blue-500/5">
              <CardTitle className="flex items-center gap-2"><Cloud className="h-5 w-5 text-blue-500" /> Google Sync</CardTitle>
              <CardDescription>Conecta tus calendarios y tareas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-2xl">
                <Label className="flex items-center gap-2 font-bold"><Calendar className="h-4 w-4" /> Calendario</Label>
                <Switch checked={!!syncData?.calendarSync} onCheckedChange={(v) => handleToggleSync("calendarSync", v)} />
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-2xl">
                <Label className="flex items-center gap-2 font-bold"><CheckSquare className="h-4 w-4" /> Tareas</Label>
                <Switch checked={!!syncData?.tasksSync} onCheckedChange={(v) => handleToggleSync("tasksSync", v)} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <DistractionBlocker />
        </div>
      </div>

      <div className="p-8 bg-slate-900 text-white rounded-[2rem] flex items-center justify-between">
        <div className="space-y-2">
          <h3 className="text-lg font-black flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> Modo Focus Profundo</h3>
          <p className="text-sm text-slate-400">Tus bloqueos y configuraciones se sincronizan en la nube.</p>
        </div>
        <Button variant="secondary" className="gap-2 rounded-xl font-bold">
          <ExternalLink className="h-4 w-4" /> Guía Focus
        </Button>
      </div>
    </div>
  )
}