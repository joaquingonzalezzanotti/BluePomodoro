"use client"

import * as React from "react"
import { AlertCircle, AlertTriangle, Calendar as CalendarIcon, CheckSquare, RefreshCw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { syncGoogleBridge } from "@/lib/google-sync-client"
import { useSession, useSupabase, useUser } from "@/supabase"
import { useProfile } from "@/supabase/hooks"

function formatLastSync(value: string | null | undefined): string {
  if (!value) return "No hay sincronizaciones aun."
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "No hay sincronizaciones aun."
  const elapsedMs = Date.now() - date.getTime()
  if (elapsedMs < 60_000) return "Hace menos de 1 minuto."
  const elapsedMin = Math.floor(elapsedMs / 60_000)
  if (elapsedMin < 60) return `Hace ${elapsedMin} minuto${elapsedMin === 1 ? "" : "s"}.`
  const elapsedHours = Math.floor(elapsedMin / 60)
  if (elapsedHours < 24) return `Hace ${elapsedHours} hora${elapsedHours === 1 ? "" : "s"}.`
  const elapsedDays = Math.floor(elapsedHours / 24)
  return `Hace ${elapsedDays} dia${elapsedDays === 1 ? "" : "s"}.`
}

export function GoogleSyncSettings() {
  const { user } = useUser()
  const { session } = useSession()
  const supabase = useSupabase()
  const { toast } = useToast()
  const [isSyncing, setIsSyncing] = React.useState(false)
  const { data: profile, refetch: refetchProfile } = useProfile()

  const hasBridgeToken = Boolean(profile?.google_access_token)
  const hasAnySyncEnabled = Boolean(profile?.google_tasks_sync || profile?.google_calendar_sync)
  const lastSyncText = formatLastSync(profile?.google_last_synced_at)

  const handleToggle = async (key: "google_calendar_sync" | "google_tasks_sync", value: boolean) => {
    if (!user) return
    const { error } = await supabase.from("profiles").update({ [key]: value }).eq("id", user.id)
    if (error) {
      toast({
        variant: "destructive",
        title: "No se pudo guardar el ajuste",
        description: error.message,
      })
      return
    }
    await refetchProfile()
  }

  const handleManualSync = async () => {
    if (!user || !session?.access_token) {
      toast({
        variant: "destructive",
        title: "Sesion requerida",
        description: "Inicia sesion para sincronizar Google.",
      })
      return
    }

    if (!hasAnySyncEnabled) {
      toast({
        variant: "destructive",
        title: "Sincronizacion desactivada",
        description: "Activa Google Calendar o Google Tasks para ejecutar la sincronizacion.",
      })
      return
    }

    setIsSyncing(true)
    try {
      const syncResult = await syncGoogleBridge({
        accessToken: session.access_token,
        reason: "manual",
        force: true,
      })

      await refetchProfile()

      if (syncResult.errors.auth || syncResult.errors.tasks || syncResult.errors.calendar) {
        const combinedError = [syncResult.errors.auth, syncResult.errors.tasks, syncResult.errors.calendar]
          .filter(Boolean)
          .join(" | ")
        toast({
          variant: "destructive",
          title: "Sincronizacion parcial",
          description: combinedError || "Hubo errores al sincronizar.",
        })
        return
      }

      toast({
        title: "Sincronizacion completa",
        description: `Tasks: ${syncResult.tasks.upserted} upsert, ${syncResult.tasks.removed} removidas. Calendar: ${syncResult.calendar.events_fetched} eventos leidos.`,
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error de sincronizacion",
        description: error?.message ?? "No se pudo sincronizar Google.",
      })
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900">Centro de Sincronizacion</h2>
          <p className="text-muted-foreground">Backend bridge activo. Re-sync on Focus corre automaticamente.</p>
        </div>
        <Button
          variant="default"
          onClick={handleManualSync}
          disabled={isSyncing || !session?.access_token || !hasAnySyncEnabled}
          className="gap-2 rounded-xl shadow-lg shadow-primary/20 h-12 px-6"
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "Sincronizando..." : "Sincronizar ahora"}
        </Button>
      </div>

      {!hasBridgeToken && (
        <Alert variant="destructive" className="rounded-2xl border-none shadow-lg bg-red-50 text-red-700">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="font-bold">Google no conectado</AlertTitle>
          <AlertDescription>
            Cierra sesion e inicia nuevamente con Google para registrar tokens en backend.
          </AlertDescription>
        </Alert>
      )}

      {profile?.google_last_sync_error && (
        <Alert variant="destructive" className="rounded-2xl border-none shadow-lg">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="font-bold">Ultimo error de sincronizacion</AlertTitle>
          <AlertDescription>{profile.google_last_sync_error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Alert className="bg-primary/5 border-primary/20 rounded-2xl p-6">
            <AlertCircle className="h-5 w-5 text-primary" />
            <AlertTitle className="font-bold text-primary">Estado de Integracion</AlertTitle>
            <AlertDescription className="text-primary/80 text-xs mt-1">
              Ultima sync: {lastSyncText}
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
                {!profile?.google_calendar_sync ? (
                  <p className="text-xs text-muted-foreground italic">Desactivado.</p>
                ) : (
                  <div className="space-y-4">
                    <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-none font-black text-[9px]">
                      READ ONLY MVP
                    </Badge>
                    <p className="text-xs font-medium text-slate-500">
                      El backend lee eventos del calendario principal en cada sync.
                    </p>
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
                {!profile?.google_tasks_sync ? (
                  <p className="text-xs text-muted-foreground italic">Desactivado.</p>
                ) : (
                  <div className="space-y-4">
                    <Badge variant="secondary" className="bg-green-50 text-green-600 border-none font-black text-[9px]">
                      GOOGLE WINS
                    </Badge>
                    <p className="text-xs font-medium text-slate-500">
                      Importacion desde lista default con upsert y limpieza de tareas removidas.
                    </p>
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
                  <Label className="text-sm font-bold">Importar Calendar</Label>
                  <p className="text-[10px] text-muted-foreground">Lectura de eventos (read only).</p>
                </div>
                <Switch
                  checked={!!profile?.google_calendar_sync}
                  onCheckedChange={(value) => handleToggle("google_calendar_sync", value)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">Importar Tasks</Label>
                  <p className="text-[10px] text-muted-foreground">Sync de tareas default de Google Tasks.</p>
                </div>
                <Switch
                  checked={!!profile?.google_tasks_sync}
                  onCheckedChange={(value) => handleToggle("google_tasks_sync", value)}
                />
              </div>

              <Separator />

              <p className="text-[10px] text-muted-foreground font-bold">
                Re-sync on Focus: silenciosa, sin toast en exito, con toast solo en error manual.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

