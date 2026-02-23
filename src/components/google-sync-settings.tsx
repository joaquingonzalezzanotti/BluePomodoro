
"use client"

import * as React from "react"
import { Calendar as CalendarIcon, CheckSquare, RefreshCw, ExternalLink, Cloud, AlertCircle, CheckCircle2 } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useFirestore, useUser, useMemoFirebase, setDocumentNonBlocking, useDoc } from "@/firebase"
import { doc } from "firebase/firestore"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function GoogleSyncSettings() {
  const { user } = useUser()
  const db = useFirestore()
  const [isSyncing, setIsSyncing] = React.useState(false)

  const syncRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "usuarios", user.uid, "configuracionesSincronizacionGoogle", "default")
  }, [db, user])

  const { data: syncData } = useDoc(syncRef)

  const handleToggle = (key: string, value: boolean) => {
    if (!syncRef) return
    setDocumentNonBlocking(syncRef, { [key]: value }, { merge: true })
  }

  const simulateSync = () => {
    setIsSyncing(true)
    setTimeout(() => setIsSyncing(false), 2000)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Centro de Sincronización</h2>
          <p className="text-muted-foreground">Conecta BluePomodoro con tu ecosistema de Google.</p>
        </div>
        <Button 
          variant="outline" 
          onClick={simulateSync} 
          disabled={isSyncing || (!syncData?.calendarSync && !syncData?.tasksSync)}
          className="gap-2 rounded-xl border-primary/20 hover:bg-primary/5"
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "Sincronizando..." : "Sincronizar ahora"}
        </Button>
      </div>

      <Alert className="bg-primary/5 border-primary/20 rounded-2xl p-6">
        <AlertCircle className="h-5 w-5 text-primary" />
        <AlertTitle className="font-bold text-primary">Nota de Implementación</AlertTitle>
        <AlertDescription className="text-primary/80 text-xs mt-1">
          La sincronización bidireccional requiere que habilites las APIs de <strong>Google Calendar</strong> y <strong>Google Tasks</strong> en tu consola de Google Cloud y configures los "OAuth Scopes" correspondientes. Esta interfaz ya está conectada a tu base de datos de Firestore.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-blue-500/5 pb-6">
            <div className="flex items-center justify-between">
              <div className="h-12 w-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600">
                <CalendarIcon className="h-6 w-6" />
              </div>
              <Switch 
                checked={!!syncData?.calendarSync}
                onCheckedChange={(v) => handleToggle("calendarSync", v)} 
              />
            </div>
            <CardTitle className="mt-4 text-xl font-bold">Google Calendar</CardTitle>
            <CardDescription>Convierte tus eventos en bloques de enfoque.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ul className="space-y-3">
              {[
                "Bloqueo automático de tiempo",
                "Recordatorios en el escritorio",
                "Sincronización de descansos"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-green-500/5 pb-6">
            <div className="flex items-center justify-between">
              <div className="h-12 w-12 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-600">
                <CheckSquare className="h-6 w-6" />
              </div>
              <Switch 
                checked={!!syncData?.tasksSync}
                onCheckedChange={(v) => handleToggle("tasksSync", v)} 
              />
            </div>
            <CardTitle className="mt-4 text-xl font-bold">Google Tasks</CardTitle>
            <CardDescription>Sincroniza tus listas de tareas pendientes.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ul className="space-y-3">
              {[
                "Importación automática",
                "Marcado de completado real",
                "Sincronización de subtareas"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="p-8 bg-slate-900 text-white rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
          <Cloud className="h-32 w-32" />
        </div>
        <div className="relative z-10">
          <h3 className="text-xl font-black mb-4 flex items-center gap-3">
            <Cloud className="h-6 w-6 text-blue-400" />
            Estado de la Conexión IA
          </h3>
          <p className="text-slate-400 text-sm leading-relaxed max-w-2xl mb-6">
            Nuestra IA analiza tus eventos de Google Calendar para sugerirte los mejores momentos para tus sesiones de Pomodoro según tus "huecos" libres. Activa la sincronización para que BluePomodoro aprenda de tu agenda real.
          </p>
          <Button variant="secondary" className="gap-2 rounded-xl font-bold">
            <ExternalLink className="h-4 w-4" /> Guía de Configuración API
          </Button>
        </div>
      </div>
    </div>
  )
}
