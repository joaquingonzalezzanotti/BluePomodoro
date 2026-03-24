"use client"

import * as React from "react"
import { AlertCircle, AlertTriangle, Calendar as CalendarIcon, CheckSquare, RefreshCw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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

type SyncMode = "read_only" | "bidirectional"

export function GoogleSyncSettings() {
  const { user } = useUser()
  const { session } = useSession()
  const supabase = useSupabase()
  const { toast } = useToast()
  const [isSyncing, setIsSyncing] = React.useState(false)
  const [isConnecting, setIsConnecting] = React.useState(false)
  const { data: profile, refetch: refetchProfile } = useProfile()

  const hasSyncGrant = Boolean(profile?.google_access_token)
  const hasAnySyncEnabled = Boolean(profile?.google_tasks_sync || profile?.google_calendar_sync)
  const lastSyncText = formatLastSync(profile?.google_last_synced_at)
  const tasksSyncMode: SyncMode = profile?.google_tasks_sync_mode === "bidirectional" ? "bidirectional" : "read_only"
  const calendarSyncMode: SyncMode =
    profile?.google_calendar_sync_mode === "bidirectional" ? "bidirectional" : "read_only"

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

  const handleModeChange = async (key: "google_tasks_sync_mode" | "google_calendar_sync_mode", value: SyncMode) => {
    if (!user) return
    const { error } = await supabase.from("profiles").update({ [key]: value }).eq("id", user.id)
    if (error) {
      toast({
        variant: "destructive",
        title: "No se pudo guardar el modo",
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
        const needsOAuthReconnect =
          combinedError.toLowerCase().includes("insufficient authentication scopes") ||
          combinedError.toLowerCase().includes("google session is not connected")
        toast({
          variant: "destructive",
          title: "Sincronizacion parcial",
          description: needsOAuthReconnect
            ? "Faltan permisos de Google Sync. Usa 'Conectar Google Sync' para autorizar Tasks/Calendar."
            : combinedError || "Hubo errores al sincronizar.",
        })
        return
      }

      toast({
        title: "Sincronizacion completa",
        description:
          syncResult.tasks.mode === "bidirectional"
            ? `Tasks: ${syncResult.tasks.upserted} pull, ${syncResult.tasks.pushed_remote ?? 0} push (creadas ${syncResult.tasks.created_remote ?? 0}, actualizadas ${syncResult.tasks.updated_remote ?? 0}). Calendar: ${syncResult.calendar.events_fetched} eventos.`
            : `Tasks: ${syncResult.tasks.upserted} upsert, ${syncResult.tasks.removed} removidas. Calendar: ${syncResult.calendar.events_fetched} eventos leidos.`,
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

  const handleConnectGoogleSync = async () => {
    if (!session) {
      toast({
        variant: "destructive",
        title: "Sesion requerida",
        description: "Inicia sesion para conectar Google Sync.",
      })
      return
    }

    setIsConnecting(true)
    try {
      const taskScope =
        tasksSyncMode === "bidirectional"
          ? "https://www.googleapis.com/auth/tasks"
          : "https://www.googleapis.com/auth/tasks.readonly"
      const calendarScope =
        calendarSyncMode === "bidirectional"
          ? "https://www.googleapis.com/auth/calendar"
          : "https://www.googleapis.com/auth/calendar.readonly"

      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/app`,
          scopes: `${taskScope} ${calendarScope}`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
            include_granted_scopes: "true",
          },
        },
      })
    } catch (error: any) {
      setIsConnecting(false)
      toast({
        variant: "destructive",
        title: "No se pudo conectar Google Sync",
        description: error?.message ?? "Error iniciando OAuth para sincronizacion.",
      })
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900">Centro de Sincronizacion</h2>
          <p className="text-muted-foreground">Login separado de Sync. Re-sync on Focus corre automaticamente.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleConnectGoogleSync}
            disabled={isConnecting}
            className="gap-2 rounded-xl h-12 px-5"
          >
            {isConnecting ? "Conectando..." : "Conectar Google Sync"}
          </Button>
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
      </div>

      {!hasSyncGrant && (
        <Alert variant="destructive" className="rounded-2xl border-none shadow-lg bg-red-50 text-red-700">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="font-bold">Google Sync no conectado</AlertTitle>
          <AlertDescription>
            Para sincronizar Tasks/Calendar, usa "Conectar Google Sync". El login normal ya no pide esos permisos.
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
            <AlertDescription className="text-primary/80 text-xs mt-1">Ultima sync: {lastSyncText}</AlertDescription>
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
                    <Badge
                      variant="secondary"
                      className={
                        calendarSyncMode === "bidirectional"
                          ? "bg-amber-50 text-amber-700 border-none font-black text-[9px]"
                          : "bg-blue-50 text-blue-600 border-none font-black text-[9px]"
                      }
                    >
                      {calendarSyncMode === "bidirectional" ? "BIDIRECTIONAL (ROADMAP)" : "READ ONLY"}
                    </Badge>
                    <p className="text-xs font-medium text-slate-500">
                      La seleccion de calendarios se configura desde Agenda, en "Mis calendarios".
                    </p>
                    {calendarSyncMode === "bidirectional" ? (
                      <p className="text-[11px] text-amber-700">
                        Permisos de escritura listos. Falta capa de eventos locales para push seguro.
                      </p>
                    ) : null}
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
                    <Badge
                      variant="secondary"
                      className={
                        tasksSyncMode === "bidirectional"
                          ? "bg-emerald-50 text-emerald-700 border-none font-black text-[9px]"
                          : "bg-green-50 text-green-600 border-none font-black text-[9px]"
                      }
                    >
                      {tasksSyncMode === "bidirectional" ? "PUSH + PULL" : "GOOGLE WINS"}
                    </Badge>
                    <p className="text-xs font-medium text-slate-500">
                      {tasksSyncMode === "bidirectional"
                        ? "Cambios en BluePomodoro y Google Tasks se reconcilian en ambas direcciones."
                        : "Importacion desde lista default con upsert y limpieza de tareas removidas."}
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
                  <p className="text-[10px] text-muted-foreground">Lectura de eventos de Google Calendar.</p>
                </div>
                <Switch
                  checked={!!profile?.google_calendar_sync}
                  onCheckedChange={(value) => handleToggle("google_calendar_sync", value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold">Modo Calendar Sync</Label>
                <Select
                  value={calendarSyncMode}
                  onValueChange={(value) => handleModeChange("google_calendar_sync_mode", value as SyncMode)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="read_only">Solo lectura (estable)</SelectItem>
                    <SelectItem value="bidirectional">Bidireccional (roadmap)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">Importar Tasks</Label>
                  <p className="text-[10px] text-muted-foreground">Sync de lista default de Google Tasks.</p>
                </div>
                <Switch
                  checked={!!profile?.google_tasks_sync}
                  onCheckedChange={(value) => handleToggle("google_tasks_sync", value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold">Modo Tasks Sync</Label>
                <Select
                  value={tasksSyncMode}
                  onValueChange={(value) => handleModeChange("google_tasks_sync_mode", value as SyncMode)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="read_only">Solo lectura (Google gana)</SelectItem>
                    <SelectItem value="bidirectional">Bidireccional (push + pull)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <p className="text-[10px] text-muted-foreground font-bold">
                Seleccion de calendarios: pestaña Agenda &gt; Mis calendarios.
              </p>
              <p className="text-[10px] text-muted-foreground font-bold">Re-sync on Focus: silenciosa, con throttle de 60s.</p>
              <p className="text-[10px] text-muted-foreground font-bold">
                Si cambias el modo a bidireccional, toca "Conectar Google Sync" para renovar scopes.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
