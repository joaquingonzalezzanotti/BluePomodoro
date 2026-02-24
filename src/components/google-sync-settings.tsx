
"use client"

import * as React from "react"
import { Calendar as CalendarIcon, CheckSquare, RefreshCw, ExternalLink, Cloud, AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useFirestore, useUser, useMemoFirebase, setDocumentNonBlocking, useDoc, addDocumentNonBlocking } from "@/firebase"
import { doc, collection, serverTimestamp } from "firebase/firestore"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"

export function GoogleSyncSettings() {
  const { user } = useUser()
  const db = useFirestore()
  const { toast } = useToast()
  const [isSyncing, setIsSyncing] = React.useState(false)
  const [hasToken, setHasToken] = React.useState(false)

  const syncRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "usuarios", user.uid, "configuracionesSincronizacionGoogle", "default")
  }, [db, user])

  const { data: syncData } = useDoc(syncRef)

  React.useEffect(() => {
    const token = sessionStorage.getItem('google_access_token');
    setHasToken(!!token);
  }, []);

  const handleToggle = (key: string, value: boolean) => {
    if (!syncRef) return
    setDocumentNonBlocking(syncRef, { [key]: value }, { merge: true })
  }

  const handleRealSync = async () => {
    const token = sessionStorage.getItem('google_access_token');
    if (!token) {
      toast({
        variant: "destructive",
        title: "Sesión de Google expirada",
        description: "Por favor, cierra sesión e inicia de nuevo con Google para actualizar los permisos."
      });
      return;
    }

    if (!db || !user) return
    setIsSyncing(true)

    try {
      // 1. Obtener tareas de Google Tasks REALES
      // Usamos el endpoint oficial de Google Tasks API
      const response = await fetch('https://www.googleapis.com/tasks/v1/lists/@default/tasks', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Error al conectar con Google Tasks');
      
      const data = await response.json();
      const googleTasks = data.items || [];

      if (googleTasks.length === 0) {
        toast({ title: "Sin tareas", description: "No se encontraron tareas en tu cuenta de Google." });
        setIsSyncing(false);
        return;
      }

      // 2. Importar a Firestore
      const tareasRef = collection(db, "usuarios", user.uid, "tareas")
      let importedCount = 0;

      for (const task of googleTasks) {
        if (task.title) {
          addDocumentNonBlocking(tareasRef, {
            titulo: task.title,
            estado: "Pendiente",
            esfuerzoEstimadoPomodoros: 1,
            completadosPomodoros: 0,
            subtareas: [],
            fechaCreacion: serverTimestamp(),
            importadoDeGoogle: true,
            googleTaskId: task.id
          });
          importedCount++;
        }
      }

      toast({
        title: "Sincronización Exitosa",
        description: `Se han importado ${importedCount} tareas reales desde Google Tasks.`
      })
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error de integración",
        description: "Asegúrate de haber aceptado los permisos de Google Tasks al iniciar sesión."
      })
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900">Centro de Sincronización Real</h2>
          <p className="text-muted-foreground">Importa tus tareas y eventos genuinos desde tu cuenta de Google.</p>
        </div>
        <Button 
          variant="default" 
          onClick={handleRealSync} 
          disabled={isSyncing || !hasToken}
          className="gap-2 rounded-xl shadow-lg shadow-primary/20 h-12 px-6"
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "Importando..." : "Sincronizar ahora"}
        </Button>
      </div>

      {!hasToken && (
        <Alert variant="destructive" className="rounded-2xl border-none shadow-lg bg-red-50 text-red-700">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="font-bold">Permisos Requeridos</AlertTitle>
          <AlertDescription>
            Para usar la sincronización real, debes cerrar sesión e iniciar de nuevo eligiendo tu cuenta de Google y aceptando los permisos de lectura.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Alert className="bg-primary/5 border-primary/20 rounded-2xl p-6">
            <AlertCircle className="h-5 w-5 text-primary" />
            <AlertTitle className="font-bold text-primary">Estado de la Sincronización</AlertTitle>
            <AlertDescription className="text-primary/80 text-xs mt-1">
              {hasToken 
                ? "Conexión autorizada. Al sincronizar, extraemos tus tareas de Google Tasks y eventos de Calendar para convertirlos en sesiones de enfoque locales."
                : "Habilita los servicios a la derecha para empezar a importar tus pendientes reales."}
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
              <CardHeader className="border-b border-slate-50">
                <CardTitle className="text-xs font-black flex items-center gap-2 uppercase tracking-widest text-blue-600">
                  <CalendarIcon className="h-4 w-4" /> Google Calendar
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 text-center">
                {!syncData?.calendarSync ? (
                  <p className="text-xs text-muted-foreground italic">Desactivado.</p>
                ) : (
                  <div className="space-y-4">
                    <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-none font-black text-[9px]">LECTURA ACTIVA</Badge>
                    <p className="text-xs font-medium text-slate-500">Tus eventos se verán como bloques de tiempo.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
              <CardHeader className="border-b border-slate-50">
                <CardTitle className="text-xs font-black flex items-center gap-2 uppercase tracking-widest text-green-600">
                  <CheckSquare className="h-4 w-4" /> Google Tasks
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 text-center">
                {!syncData?.tasksSync ? (
                  <p className="text-xs text-muted-foreground italic">Desactivado.</p>
                ) : (
                  <div className="space-y-4">
                    <Badge variant="secondary" className="bg-green-50 text-green-600 border-none font-black text-[9px]">SISTEMA DE IMPORTACIÓN LISTO</Badge>
                    <p className="text-xs font-medium text-slate-500">Importaremos tus tareas de la lista principal (@default).</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
            <CardHeader className="bg-slate-50">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest">Ajustes de API</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">Importar Calendario</Label>
                  <p className="text-[10px] text-muted-foreground">Lectura de eventos.</p>
                </div>
                <Switch 
                  checked={!!syncData?.calendarSync}
                  onCheckedChange={(v) => handleToggle("calendarSync", v)} 
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">Importar Tareas</Label>
                  <p className="text-[10px] text-muted-foreground">Sincronizar con Tareas Blue.</p>
                </div>
                <Switch 
                  checked={!!syncData?.tasksSync}
                  onCheckedChange={(v) => handleToggle("tasksSync", v)} 
                />
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase text-muted-foreground/60">Preferencias de IA</h4>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Auto-priorización</span>
                  <Switch checked className="scale-75" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-slate-900 text-white rounded-[2rem] overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <div className="h-10 w-10 bg-primary/20 rounded-xl flex items-center justify-center">
                <Cloud className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-widest">Integración Directa</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Usamos el Token de Acceso de Google para leer tus datos de forma privada. Tus tareas nunca salen de tu dispositivo y tu base de datos de Firestore.
              </p>
              <Button variant="secondary" size="sm" className="w-full gap-2 rounded-xl text-xs font-bold h-10">
                <ExternalLink className="h-3 w-3" /> Ver Documentación
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
