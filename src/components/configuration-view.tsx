
"use client"

import * as React from "react"
import { Settings, Music, Cloud, ExternalLink, Save, Shield, Bell, CheckCircle2 } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useFirestore, useUser, useMemoFirebase, updateDocumentNonBlocking, useDoc } from "@/firebase"
import { doc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { DistractionBlocker } from "@/components/distraction-blocker"
import { GoogleSyncSettings } from "@/components/google-sync-settings"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"

export function ConfigurationView() {
  const { user } = useUser()
  const db = useFirestore()
  const { toast } = useToast()
  const [spotifyInput, setSpotifyInput] = React.useState("")
  const [notifPermission, setNotifPermission] = React.useState<"default" | "granted" | "denied">("default")

  const userRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "usuarios", user.uid)
  }, [db, user])

  const { data: userData } = useDoc(userRef)

  React.useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifPermission(Notification.permission)
    }
  }, [])

  const requestPermission = async () => {
    if (!("Notification" in window)) {
      toast({ variant: "destructive", title: "No soportado", description: "Tu navegador no soporta notificaciones." })
      return
    }
    const permission = await Notification.requestPermission()
    setNotifPermission(permission)
    if (permission === "granted") {
      toast({ title: "¡Permiso Concedido!", description: "Recibirás alertas al terminar tus sesiones." })
    }
  }

  const handleSaveSpotify = () => {
    if (!userRef || !spotifyInput) return
    updateDocumentNonBlocking(userRef, { spotifyPlaylistUrl: spotifyInput })
    toast({ title: "Spotify vinculado", description: "Tu música ha sido actualizada." })
  }

  const handleLinkSpotifyReal = () => {
    const clientId = "b5df5cc5dcbc45e8a34738bd946675ac"
    const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/app` : ''
    const scopes = "user-read-currently-playing user-read-playback-state"
    window.location.href = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}`
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 bg-primary rounded-2xl flex items-center justify-center">
          <Settings className="text-white h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-black">Configuración Global</h2>
          <p className="text-sm text-muted-foreground">Personaliza tus integraciones, bloqueos y alertas.</p>
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
          <TabsTrigger value="alertas" className="rounded-xl px-8 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
            <Bell className="h-4 w-4 mr-2" /> Notificaciones
          </TabsTrigger>
        </TabsList>

        <TabsContent value="integraciones" className="space-y-8">
          <GoogleSyncSettings />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
              <CardHeader className="bg-green-500/5">
                <CardTitle className="flex items-center gap-2 text-green-700"><Music className="h-5 w-5" /> Mi Música de Enfoque</CardTitle>
                <CardDescription>Vincula tu cuenta o pega una playlist personalizada.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <Button onClick={handleLinkSpotifyReal} className="w-full h-12 gap-2 rounded-xl font-bold bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/20 mb-4">
                  <Music className="h-4 w-4" /> Vincular Spotify Real
                </Button>
                <div className="flex items-center gap-2 mb-2">
                  <Separator className="flex-1" />
                  <span className="text-[10px] text-muted-foreground font-black uppercase">O pega un enlace</span>
                  <Separator className="flex-1" />
                </div>
                <Input 
                  placeholder="https://open.spotify.com/playlist/..." 
                  value={spotifyInput}
                  onChange={(e) => setSpotifyInput(e.target.value)}
                  className="rounded-xl bg-muted/30 border-none h-12 font-medium"
                />
                <Button onClick={handleSaveSpotify} variant="outline" className="w-full h-12 gap-2 rounded-xl font-bold border-green-200 text-green-700">
                  <Save className="h-4 w-4" /> Guardar Playlist
                </Button>
              </CardContent>
            </Card>

            <div className="p-8 bg-slate-900 text-white rounded-[2rem] flex flex-col justify-center">
              <h3 className="text-lg font-black flex items-center gap-2 mb-2"><Shield className="h-5 w-5 text-primary" /> Sincronización en la Nube</h3>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Tus bloqueos de sitios y configuraciones de tiempo se guardan en tu perfil. Inicia sesión en cualquier dispositivo para mantener tu flujo.
              </p>
              <Button variant="secondary" className="gap-2 rounded-xl font-bold w-fit">
                <ExternalLink className="h-4 w-4" /> Guía de Uso
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="bloqueos">
          <DistractionBlocker />
        </TabsContent>

        <TabsContent value="alertas">
          <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /> Alertas del Sistema</CardTitle>
              <CardDescription>Configura cómo quieres que te avisemos al terminar tus sesiones.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-center justify-between p-6 bg-muted/30 rounded-2xl">
                <div className="space-y-1">
                  <h4 className="font-bold">Notificaciones de Escritorio</h4>
                  <p className="text-xs text-muted-foreground">Recibe alertas nativas aunque el navegador esté minimizado.</p>
                </div>
                {notifPermission === "granted" ? (
                  <div className="flex items-center gap-2 text-green-600 font-bold bg-green-50 px-4 py-2 rounded-full border border-green-100">
                    <CheckCircle2 className="h-4 w-4" /> Activadas
                  </div>
                ) : (
                  <Button onClick={requestPermission} variant="outline" className="rounded-xl font-bold">
                    Habilitar
                  </Button>
                )}
              </div>

              <div className="p-6 border border-dashed border-muted-foreground/20 rounded-2xl text-center">
                <h4 className="text-xs font-black uppercase text-muted-foreground mb-2">Próximamente</h4>
                <p className="text-sm text-muted-foreground">Sincronización con Firebase Cloud Messaging (FCM) para alertas móviles nativas.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
