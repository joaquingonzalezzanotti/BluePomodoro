"use client"

import * as React from "react"
import { AlertCircle, AlertTriangle, Calendar as CalendarIcon, CheckSquare, RefreshCw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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

type CalendarSelectionMode = "all" | "none" | "some"

type CalendarOption = {
  id: string
  summary: string
  primary: boolean
  accessRole: string
  backgroundColor: string | null
}

function normalizeSelectionMode(value: string | null | undefined): CalendarSelectionMode {
  if (value === "all" || value === "none" || value === "some") return value
  return "all"
}

function deriveSelectionMode(total: number, selected: number): CalendarSelectionMode {
  if (total <= 0 || selected <= 0) return "none"
  if (selected >= total) return "all"
  return "some"
}

export function GoogleSyncSettings() {
  const { user } = useUser()
  const { session } = useSession()
  const supabase = useSupabase()
  const { toast } = useToast()
  const [isSyncing, setIsSyncing] = React.useState(false)
  const [isConnecting, setIsConnecting] = React.useState(false)
  const [isLoadingCalendars, setIsLoadingCalendars] = React.useState(false)
  const [isSavingSelection, setIsSavingSelection] = React.useState(false)
  const [calendarLoadError, setCalendarLoadError] = React.useState<string | null>(null)
  const [calendarOptions, setCalendarOptions] = React.useState<CalendarOption[]>([])
  const [calendarMode, setCalendarMode] = React.useState<CalendarSelectionMode>("all")
  const [selectedCalendarIds, setSelectedCalendarIds] = React.useState<string[]>([])
  const { data: profile, refetch: refetchProfile } = useProfile()

  const hasSyncGrant = Boolean(profile?.google_access_token)
  const hasAnySyncEnabled = Boolean(profile?.google_tasks_sync || profile?.google_calendar_sync)
  const lastSyncText = formatLastSync(profile?.google_last_synced_at)

  const applySelectionState = React.useCallback((mode: CalendarSelectionMode, ids: string[]) => {
    setCalendarMode(mode)
    setSelectedCalendarIds(Array.from(new Set(ids)))
  }, [])

  React.useEffect(() => {
    if (!profile) return
    const mode = normalizeSelectionMode(profile.google_calendar_selection_mode)
    const ids = (profile.google_calendar_selected_ids ?? []).filter(
      (id): id is string => typeof id === "string" && id.length > 0
    )
    applySelectionState(mode, ids)
  }, [applySelectionState, profile?.google_calendar_selected_ids, profile?.google_calendar_selection_mode])

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

  const loadCalendarOptions = React.useCallback(async () => {
    if (!session?.access_token || !hasSyncGrant) {
      setCalendarOptions([])
      return
    }

    setIsLoadingCalendars(true)
    setCalendarLoadError(null)
    try {
      const response = await fetch("/api/google/calendar/lists", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        const message =
          typeof payload?.error === "string" ? payload.error : "No se pudo leer la lista de calendarios."
        throw new Error(message)
      }

      const options = Array.isArray(payload?.calendars) ? (payload.calendars as CalendarOption[]) : []
      setCalendarOptions(options)

      const serverMode = normalizeSelectionMode(payload?.selection?.mode ?? profile?.google_calendar_selection_mode)
      const serverIds = Array.isArray(payload?.selection?.selected_calendar_ids)
        ? payload.selection.selected_calendar_ids.filter((id: unknown): id is string => typeof id === "string" && id.length > 0)
        : (profile?.google_calendar_selected_ids ?? []).filter((id): id is string => typeof id === "string" && id.length > 0)
      applySelectionState(serverMode, serverIds)
    } catch (error: any) {
      setCalendarLoadError(error?.message ?? "No se pudo cargar la lista de calendarios.")
    } finally {
      setIsLoadingCalendars(false)
    }
  }, [applySelectionState, hasSyncGrant, profile?.google_calendar_selected_ids, profile?.google_calendar_selection_mode, session?.access_token])

  React.useEffect(() => {
    if (!session?.access_token || !hasSyncGrant) return
    loadCalendarOptions().catch(() => {})
  }, [hasSyncGrant, loadCalendarOptions, session?.access_token])

  const saveCalendarSelection = React.useCallback(
    async (nextMode: CalendarSelectionMode, nextIds: string[]) => {
      if (!user) return
      setIsSavingSelection(true)
      try {
        const uniqueIds = Array.from(new Set(nextIds))
        const payloadIds = nextMode === "some" ? uniqueIds : []

        const { error } = await supabase
          .from("profiles")
          .update({
            google_calendar_selection_mode: nextMode,
            google_calendar_selected_ids: payloadIds,
          })
          .eq("id", user.id)

        if (error) {
          toast({
            variant: "destructive",
            title: "No se pudo guardar la seleccion",
            description: error.message,
          })
          return
        }

        await refetchProfile()
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "No se pudo guardar la seleccion",
          description: error?.message ?? "Error actualizando calendarios.",
        })
      } finally {
        setIsSavingSelection(false)
      }
    },
    [refetchProfile, supabase, toast, user]
  )

  const allCalendarIds = React.useMemo(() => calendarOptions.map((calendar) => calendar.id), [calendarOptions])
  const effectiveSelectedCalendarIds = React.useMemo(() => {
    if (calendarMode === "all") return allCalendarIds
    if (calendarMode === "none") return []
    const available = new Set(allCalendarIds)
    return selectedCalendarIds.filter((id) => available.has(id))
  }, [allCalendarIds, calendarMode, selectedCalendarIds])

  const handleSelectAllCalendars = async () => {
    applySelectionState("all", [])
    await saveCalendarSelection("all", [])
  }

  const handleClearCalendars = async () => {
    applySelectionState("none", [])
    await saveCalendarSelection("none", [])
  }

  const handleCalendarChecked = async (calendarId: string, checked: boolean) => {
    const currentSet = new Set(effectiveSelectedCalendarIds)
    if (checked) currentSet.add(calendarId)
    else currentSet.delete(calendarId)
    const nextSelectedIds = Array.from(currentSet)
    const nextMode = deriveSelectionMode(allCalendarIds.length, nextSelectedIds.length)
    const nextPayloadIds = nextMode === "some" ? nextSelectedIds : []
    applySelectionState(nextMode, nextPayloadIds)
    await saveCalendarSelection(nextMode, nextPayloadIds)
  }

  const activeCalendarCount = effectiveSelectedCalendarIds.length
  const currentSelectionMode = deriveSelectionMode(allCalendarIds.length, activeCalendarCount)

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
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/app`,
          scopes: "https://www.googleapis.com/auth/tasks.readonly https://www.googleapis.com/auth/calendar.readonly",
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
                      READ ONLY
                    </Badge>
                    <p className="text-xs font-medium text-slate-500">
                      El backend lee eventos de todos, ninguno o algunos calendarios segun tu seleccion.
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

              <div className="space-y-3 rounded-2xl border border-slate-100 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">Calendarios incluidos</Label>
                    <p className="text-[10px] text-muted-foreground">Todos, ninguno o una seleccion manual.</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 text-[10px]"
                    onClick={() => loadCalendarOptions().catch(() => {})}
                    disabled={!hasSyncGrant || isLoadingCalendars || isSavingSelection}
                  >
                    {isLoadingCalendars ? "Actualizando..." : "Actualizar"}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold">Mis calendarios</p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-7 px-2 text-[10px]"
                      disabled={!hasSyncGrant || isSavingSelection || calendarOptions.length === 0}
                      onClick={() => handleSelectAllCalendars().catch(() => {})}
                    >
                      Seleccionar todos
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-7 px-2 text-[10px]"
                      disabled={!hasSyncGrant || isSavingSelection}
                      onClick={() => handleClearCalendars().catch(() => {})}
                    >
                      Quitar todos
                    </Button>
                  </div>
                </div>

                <div className="max-h-56 overflow-auto rounded-xl border border-slate-100 bg-slate-50/40 p-2 space-y-2">
                  {calendarOptions.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground">No se encontraron calendarios en la cuenta.</p>
                  ) : (
                    calendarOptions.map((calendar) => {
                      const checked = effectiveSelectedCalendarIds.includes(calendar.id)
                      const accent = calendar.backgroundColor ?? "#64748b"
                      return (
                        <label
                          key={calendar.id}
                          className="flex items-start gap-2 rounded-lg bg-white border border-slate-100 p-2 cursor-pointer"
                        >
                          <Checkbox
                            checked={checked}
                            disabled={isSavingSelection}
                            onCheckedChange={(value) => handleCalendarChecked(calendar.id, value === true)}
                          />
                          <span className="h-4 w-4 rounded-[3px] border mt-[1px]" style={{ backgroundColor: accent, borderColor: accent }} />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate">{calendar.summary}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {calendar.primary ? "Principal" : "Secundario"} - {calendar.accessRole}
                            </p>
                          </div>
                        </label>
                      )
                    })
                  )}
                </div>

                {calendarLoadError ? (
                  <p className="text-[10px] text-red-600">{calendarLoadError}</p>
                ) : (
                  <p className="text-[10px] text-muted-foreground">
                    Activos para Agenda/Sync: {activeCalendarCount}. Modo actual:{" "}
                    {currentSelectionMode === "all" ? "Todos" : currentSelectionMode === "none" ? "Ninguno" : "Algunos"}.
                  </p>
                )}
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

