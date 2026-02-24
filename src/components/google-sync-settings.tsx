
"use client"

import * as React from "react"
import { Calendar as CalendarIcon, CheckSquare, RefreshCw, ExternalLink, Cloud, AlertCircle, CheckCircle2, ListFilter, Clock } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useFirestore, useUser, useMemoFirebase, setDocumentNonBlocking, useDoc } from "@/firebase"
import { doc } from "firebase/firestore"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

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
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Centro de Sincronización</h2>
          <p className="text-muted-foreground">Visualiza y gestiona tu conexión con Google Calendar y Google Tasks.</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Alert className="bg-primary/5 border-primary/20 rounded-2xl p-6">
            <AlertCircle className="h-5 w-5 text-primary" />
            <AlertTitle className="font-bold text-primary">Estado de la Sincronización</AlertTitle>
            <AlertDescription className="text-primary/80 text-xs mt-1">
              {syncData?.calendarSync || syncData?.tasksSync 
                ? "Conexión establecida. Los datos se actualizan cada 15 minutos automáticamente."
                : "Configura los interruptores a la derecha para empezar a importar tus datos."}
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Vista Previa de Calendario */}
            <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
              <CardHeader className="border-b border-slate-50">
                <CardTitle className="text-sm font-black flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-blue-500" /> EVENTOS PRÓXIMOS
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {!syncData?.calendarSync ? (
                  <div className="p-8 text-center text-muted-foreground italic text-xs">
                    Activa la sincronización de calendario para ver tus eventos.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {[
                      { title: "Reunión de Equipo", time: "10:00 AM", type: "Trabajo" },
                      { title: "Clase de Diseño", time: "02:30 PM", type: "Estudio" },
                      { title: "Revisión Proyecto", time: "05:00 PM", type: "Trabajo" }
                    ].map((event, i) => (
                      <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold">{event.title}</span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {event.time}
                          </span>
                        </div>
                        <Badge variant="secondary" className="text-[9px]">{event.type}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Vista Previa de Tareas */}
            <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
              <CardHeader className="border-b border-slate-50">
                <CardTitle className="text-sm font-black flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-green-500" /> GOOGLE TASKS
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {!syncData?.tasksSync ? (
                  <div className="p-8 text-center text-muted-foreground italic text-xs">
                    Activa la sincronización de tareas para importar tus pendientes.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {[
                      "Terminar reporte mensual",
                      "Enviar email a clientes",
                      "Actualizar repositorio"
                    ].map((task, i) => (
                      <div key={i} className="p-4 flex items-center gap-3 hover:bg-slate-50/50 transition-colors">
                        <div className="h-4 w-4 rounded border-2 border-green-500/30 flex-shrink-0" />
                        <span className="text-sm font-medium">{task}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Panel de Control Lateral */}
        <div className="space-y-6">
          <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
            <CardHeader className="bg-slate-50">
              <CardTitle className="text-sm font-black">AJUSTES DE CONEXIÓN</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">Google Calendar</Label>
                  <p className="text-[10px] text-muted-foreground">Importar eventos como bloques.</p>
                </div>
                <Switch 
                  checked={!!syncData?.calendarSync}
                  onCheckedChange={(v) => handleToggle("calendarSync", v)} 
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">Google Tasks</Label>
                  <p className="text-[10px] text-muted-foreground">Sincronizar listas de pendientes.</p>
                </div>
                <Switch 
                  checked={!!syncData?.tasksSync}
                  onCheckedChange={(v) => handleToggle("tasksSync", v)} 
                />
              </div>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase text-muted-foreground">Preferencias de IA</h4>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Auto-planificar con IA</span>
                  <Switch checked className="scale-75" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-slate-900 text-white rounded-[2rem] overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <div className="h-10 w-10 bg-blue-500 rounded-xl flex items-center justify-center">
                <Cloud className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-black uppercase">¿Cómo funciona?</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Nuestra IA analiza los huecos en tu <strong>Google Calendar</strong> para sugerirte sesiones de Pomodoro. Las tareas de <strong>Google Tasks</strong> se integran en tu Tablero Kanban automáticamente.
              </p>
              <Button variant="secondary" size="sm" className="w-full gap-2 rounded-xl text-xs">
                <ExternalLink className="h-3 w-3" /> Ver Guía de API
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
