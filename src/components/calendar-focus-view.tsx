"use client"

import * as React from "react"
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, RefreshCw, Search, Sparkles, Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { useProfile, useSupabaseQuery } from "@/supabase/hooks"
import { useSession, useSupabase, useUser } from "@/supabase/provider"
import type { Task } from "@/supabase/types"

type CalendarEvent = {
  id: string
  summary: string
  description: string
  location: string
  status: string
  htmlLink: string | null
  start: string
  end: string
  allDay: boolean
  calendarId?: string
  calendarSummary?: string
  calendarPrimary?: boolean
  calendarColor?: string | null
}

type Slot = {
  start: Date
  end: Date
  durationMinutes: number
  pomodorosFit: number
}

type CalendarFocusViewProps = {
  activeTaskId?: string | null
  onTaskSelect?: (taskId: string | null) => void
  onOpenFocusTab?: () => void
}

type CalendarSelectionMode = "all" | "none" | "some"

type CalendarOption = {
  id: string
  summary: string
  primary: boolean
  accessRole: string
  backgroundColor: string | null
}

function pad2(value: number): string {
  return value.toString().padStart(2, "0")
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0)
}

function startOfWeekMonday(date: Date): Date {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  const day = value.getDay()
  const diff = day === 0 ? -6 : 1 - day
  value.setDate(value.getDate() + diff)
  return value
}

function addDays(base: Date, days: number): Date {
  const result = new Date(base)
  result.setDate(result.getDate() + days)
  return result
}

function overlap(rangeStart: Date, rangeEnd: Date, eventStart: Date, eventEnd: Date): boolean {
  return eventStart < rangeEnd && eventEnd > rangeStart
}

function formatHour(value: Date): string {
  return value.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function formatDayChip(value: Date): string {
  return value.toLocaleDateString("es-AR", { weekday: "short", day: "2-digit", month: "2-digit" })
}

function formatDueDate(dueDate: string | null): string {
  if (!dueDate) return "Sin vencimiento"
  const parsed = new Date(`${dueDate}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return "Sin vencimiento"
  return parsed.toLocaleDateString("es-AR", { day: "2-digit", month: "short" })
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

function formatCalendarName(summary: string): string {
  const value = summary.trim()
  if (!value) return "Sin nombre"
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value)
      const path = url.pathname && url.pathname !== "/" ? url.pathname.slice(0, 28) : ""
      return `${url.hostname}${path}${url.pathname.length > 28 ? "..." : ""}`
    } catch {
      return value.length > 40 ? `${value.slice(0, 40)}...` : value
    }
  }
  return value.length > 56 ? `${value.slice(0, 56)}...` : value
}

function formatLocationText(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ""
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed)
      return `${url.hostname}${url.pathname && url.pathname !== "/" ? url.pathname : ""}`.slice(0, 70)
    } catch {
      return trimmed.length > 70 ? `${trimmed.slice(0, 70)}...` : trimmed
    }
  }
  return trimmed.length > 90 ? `${trimmed.slice(0, 90)}...` : trimmed
}

function computeFocusSlots(day: Date, events: CalendarEvent[], workMinutes: number): Slot[] {
  const windowStart = new Date(day)
  windowStart.setHours(8, 0, 0, 0)
  const windowEnd = new Date(day)
  windowEnd.setHours(22, 0, 0, 0)

  const busyIntervals: Array<{ start: Date; end: Date }> = []

  for (const event of events) {
    const eventStart = new Date(event.start)
    const eventEnd = new Date(event.end)
    if (Number.isNaN(eventStart.getTime()) || Number.isNaN(eventEnd.getTime())) continue
    if (!overlap(windowStart, windowEnd, eventStart, eventEnd)) continue

    if (event.allDay) {
      busyIntervals.push({ start: new Date(windowStart), end: new Date(windowEnd) })
      continue
    }

    const start = eventStart < windowStart ? new Date(windowStart) : eventStart
    const end = eventEnd > windowEnd ? new Date(windowEnd) : eventEnd
    if (end > start) busyIntervals.push({ start, end })
  }

  busyIntervals.sort((a, b) => a.start.getTime() - b.start.getTime())
  const merged: Array<{ start: Date; end: Date }> = []
  for (const interval of busyIntervals) {
    const last = merged[merged.length - 1]
    if (!last || interval.start > last.end) {
      merged.push({ start: new Date(interval.start), end: new Date(interval.end) })
    } else if (interval.end > last.end) {
      last.end = new Date(interval.end)
    }
  }

  const slots: Slot[] = []
  let cursor = new Date(windowStart)
  for (const interval of merged) {
    if (interval.start > cursor) {
      const durationMinutes = Math.floor((interval.start.getTime() - cursor.getTime()) / 60000)
      if (durationMinutes >= workMinutes) {
        slots.push({
          start: new Date(cursor),
          end: new Date(interval.start),
          durationMinutes,
          pomodorosFit: Math.floor(durationMinutes / workMinutes),
        })
      }
    }
    if (interval.end > cursor) cursor = new Date(interval.end)
  }

  if (windowEnd > cursor) {
    const durationMinutes = Math.floor((windowEnd.getTime() - cursor.getTime()) / 60000)
    if (durationMinutes >= workMinutes) {
      slots.push({
        start: new Date(cursor),
        end: new Date(windowEnd),
        durationMinutes,
        pomodorosFit: Math.floor(durationMinutes / workMinutes),
      })
    }
  }

  return slots
}

export function CalendarFocusView({ activeTaskId, onTaskSelect, onOpenFocusTab }: CalendarFocusViewProps) {
  const { session } = useSession()
  const { user } = useUser()
  const supabase = useSupabase()
  const { toast } = useToast()
  const { data: profile, refetch: refetchProfile } = useProfile()

  const [weekStart, setWeekStart] = React.useState(() => startOfWeekMonday(new Date()))
  const [selectedDayKey, setSelectedDayKey] = React.useState(() => toDateKey(new Date()))
  const [events, setEvents] = React.useState<CalendarEvent[]>([])
  const [isLoadingEvents, setIsLoadingEvents] = React.useState(false)
  const [eventsError, setEventsError] = React.useState<string | null>(null)
  const [eventsInfo, setEventsInfo] = React.useState<string | null>(null)
  const [calendarOptions, setCalendarOptions] = React.useState<CalendarOption[]>([])
  const [calendarSelectionMode, setCalendarSelectionMode] = React.useState<CalendarSelectionMode>("all")
  const [selectedCalendarIds, setSelectedCalendarIds] = React.useState<string[]>([])
  const [calendarSearch, setCalendarSearch] = React.useState("")
  const [isLoadingCalendarOptions, setIsLoadingCalendarOptions] = React.useState(false)
  const [isSavingCalendarSelection, setIsSavingCalendarSelection] = React.useState(false)
  const [calendarSelectionError, setCalendarSelectionError] = React.useState<string | null>(null)
  const [calendarSaveMessage, setCalendarSaveMessage] = React.useState<string | null>(null)

  const weekDates = React.useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const weekEnd = React.useMemo(() => {
    const end = addDays(weekStart, 7)
    end.setHours(0, 0, 0, 0)
    return end
  }, [weekStart])

  React.useEffect(() => {
    if (!profile) return
    const mode = normalizeSelectionMode(profile.google_calendar_selection_mode)
    const ids = (profile.google_calendar_selected_ids ?? []).filter(
      (id): id is string => typeof id === "string" && id.length > 0
    )
    setCalendarSelectionMode(mode)
    setSelectedCalendarIds(Array.from(new Set(ids)))
  }, [profile?.google_calendar_selected_ids, profile?.google_calendar_selection_mode])

  const allCalendarIds = React.useMemo(() => calendarOptions.map((calendar) => calendar.id), [calendarOptions])
  const effectiveSelectedCalendarIds = React.useMemo(() => {
    if (calendarSelectionMode === "all") return allCalendarIds
    if (calendarSelectionMode === "none") return []
    const available = new Set(allCalendarIds)
    return selectedCalendarIds.filter((id) => available.has(id))
  }, [allCalendarIds, calendarSelectionMode, selectedCalendarIds])
  const selectedCalendarSet = React.useMemo(() => new Set(effectiveSelectedCalendarIds), [effectiveSelectedCalendarIds])
  const sortedCalendarOptions = React.useMemo(() => {
    return [...calendarOptions].sort((a, b) => {
      const aSelected = selectedCalendarSet.has(a.id) ? 0 : 1
      const bSelected = selectedCalendarSet.has(b.id) ? 0 : 1
      if (aSelected !== bSelected) return aSelected - bSelected
      return a.summary.localeCompare(b.summary, "es")
    })
  }, [calendarOptions, selectedCalendarSet])
  const filteredCalendarOptions = React.useMemo(() => {
    const query = calendarSearch.trim().toLowerCase()
    if (!query) return sortedCalendarOptions
    return sortedCalendarOptions.filter((calendar) => {
      const label = formatCalendarName(calendar.summary).toLowerCase()
      const raw = calendar.summary.toLowerCase()
      return label.includes(query) || raw.includes(query)
    })
  }, [calendarSearch, sortedCalendarOptions])
  const selectedFilteredCalendars = React.useMemo(
    () => filteredCalendarOptions.filter((calendar) => selectedCalendarSet.has(calendar.id)),
    [filteredCalendarOptions, selectedCalendarSet]
  )
  const unselectedFilteredCalendars = React.useMemo(
    () => filteredCalendarOptions.filter((calendar) => !selectedCalendarSet.has(calendar.id)),
    [filteredCalendarOptions, selectedCalendarSet]
  )

  React.useEffect(() => {
    const key = toDateKey(weekStart)
    if (selectedDayKey < key || selectedDayKey > toDateKey(addDays(weekStart, 6))) {
      setSelectedDayKey(key)
    }
  }, [selectedDayKey, weekStart])

  const { data: pendingTasks } = useSupabaseQuery<Task[]>(
    async (client) => {
      if (!user) return []
      const { data, error } = await client
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .neq("status", "Completada")
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false })
      if (error) throw error
      return (data ?? []) as Task[]
    },
    [user?.id],
    user ? { table: "tasks", filter: `user_id=eq.${user.id}` } : null
  )

  const loadCalendarOptions = React.useCallback(async () => {
    if (!session?.access_token || !profile?.google_calendar_sync) {
      setCalendarOptions([])
      setCalendarSelectionError(null)
      return
    }

    setIsLoadingCalendarOptions(true)
    setCalendarSelectionError(null)
    try {
      const response = await fetch("/api/google/calendar/lists", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        const message = typeof payload?.error === "string" ? payload.error : "No se pudo leer la lista de calendarios."
        throw new Error(message)
      }

      const options = Array.isArray(payload?.calendars) ? (payload.calendars as CalendarOption[]) : []
      setCalendarOptions(options)

      const serverMode = normalizeSelectionMode(payload?.selection?.mode ?? profile?.google_calendar_selection_mode)
      const serverIds = Array.isArray(payload?.selection?.selected_calendar_ids)
        ? payload.selection.selected_calendar_ids.filter((id: unknown): id is string => typeof id === "string" && id.length > 0)
        : (profile?.google_calendar_selected_ids ?? []).filter((id): id is string => typeof id === "string" && id.length > 0)

      setCalendarSelectionMode(serverMode)
      setSelectedCalendarIds(Array.from(new Set(serverIds)))
    } catch (error: any) {
      setCalendarSelectionError(error?.message ?? "No se pudo cargar calendarios.")
    } finally {
      setIsLoadingCalendarOptions(false)
    }
  }, [profile?.google_calendar_selected_ids, profile?.google_calendar_selection_mode, profile?.google_calendar_sync, session?.access_token])

  React.useEffect(() => {
    if (!session?.access_token || !profile?.google_calendar_sync) return
    loadCalendarOptions().catch(() => {})
  }, [loadCalendarOptions, profile?.google_calendar_sync, session?.access_token])

  React.useEffect(() => {
    if (!calendarSaveMessage) return
    const timeout = window.setTimeout(() => setCalendarSaveMessage(null), 2000)
    return () => window.clearTimeout(timeout)
  }, [calendarSaveMessage])

  const loadEvents = React.useCallback(async () => {
    if (!session?.access_token) return
    if (!profile?.google_calendar_sync) {
      setEvents([])
      setEventsError("Activa Google Calendar Sync para ver tu agenda.")
      setEventsInfo(null)
      return
    }

    setIsLoadingEvents(true)
    setEventsError(null)
    setEventsInfo(null)
    try {
      const response = await fetch(
        `/api/google/calendar/events?start=${encodeURIComponent(weekStart.toISOString())}&end=${encodeURIComponent(weekEnd.toISOString())}&max=200`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      )
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        const message = typeof payload?.error === "string" ? payload.error : "No se pudieron cargar eventos de calendario."
        throw new Error(message)
      }
      setEvents(Array.isArray(payload?.events) ? (payload.events as CalendarEvent[]) : [])

      const selectionMode =
        payload?.selection?.mode === "all" || payload?.selection?.mode === "none" || payload?.selection?.mode === "some"
          ? payload.selection.mode
          : "all"
      const activeIds = Array.isArray(payload?.selection?.active_calendar_ids)
        ? payload.selection.active_calendar_ids.filter((id: unknown): id is string => typeof id === "string" && id.length > 0)
        : []
      if (selectionMode === "none" || activeIds.length === 0) {
        setEventsInfo("No hay calendarios seleccionados para la agenda. Ajustalo en Agenda > Mis calendarios.")
      }
    } catch (error: any) {
      const message = error?.message ?? "No se pudo cargar Google Calendar."
      setEventsError(message)
      setEventsInfo(null)
      toast({
        variant: "destructive",
        title: "Error de calendario",
        description: message,
      })
    } finally {
      setIsLoadingEvents(false)
    }
  }, [profile?.google_calendar_sync, session?.access_token, toast, weekEnd, weekStart])

  React.useEffect(() => {
    loadEvents().catch(() => {})
  }, [loadEvents])

  const saveCalendarSelection = React.useCallback(
    async (nextMode: CalendarSelectionMode, nextIds: string[]) => {
      if (!user) return false
      setIsSavingCalendarSelection(true)
      setCalendarSelectionError(null)
      setCalendarSaveMessage(null)
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
          throw new Error(error.message)
        }

        setCalendarSelectionMode(nextMode)
        setSelectedCalendarIds(payloadIds)
        await refetchProfile()
        await loadEvents()
        setCalendarSaveMessage("Guardado")
        return true
      } catch (error: any) {
        const message = error?.message ?? "No se pudo guardar la seleccion de calendarios."
        setCalendarSelectionError(message)
        setCalendarSaveMessage(null)
        toast({
          variant: "destructive",
          title: "No se pudo actualizar calendarios",
          description: message,
        })
        return false
      } finally {
        setIsSavingCalendarSelection(false)
      }
    },
    [loadEvents, refetchProfile, supabase, toast, user]
  )

  const handleCalendarChecked = async (calendarId: string, checked: boolean) => {
    const currentSet = new Set(effectiveSelectedCalendarIds)
    if (checked) currentSet.add(calendarId)
    else currentSet.delete(calendarId)

    const nextSelectedIds = Array.from(currentSet)
    const nextMode = deriveSelectionMode(allCalendarIds.length, nextSelectedIds.length)
    const nextPayloadIds = nextMode === "some" ? nextSelectedIds : []
    await saveCalendarSelection(nextMode, nextPayloadIds)
  }

  const selectedDay = fromDateKey(selectedDayKey)

  const selectedDayEvents = React.useMemo(() => {
    const dayStart = new Date(selectedDay)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(selectedDay)
    dayEnd.setHours(23, 59, 59, 999)

    return events
      .filter((event) => {
        const start = new Date(event.start)
        const end = new Date(event.end)
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false
        return overlap(dayStart, dayEnd, start, end)
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
  }, [events, selectedDay])

  const workMinutes = Math.max(profile?.pomodoro_work_minutes ?? 25, 1)
  const focusSlots = React.useMemo(() => computeFocusSlots(selectedDay, selectedDayEvents, workMinutes), [selectedDay, selectedDayEvents, workMinutes])

  const availablePomodoros = React.useMemo(
    () => focusSlots.reduce((acc, slot) => acc + slot.pomodorosFit, 0),
    [focusSlots]
  )
  const pendingPomodoros = React.useMemo(
    () => (pendingTasks ?? []).reduce((acc, task) => acc + Math.max(task.effort_estimated ?? 1, 1), 0),
    [pendingTasks]
  )
  const capacityDelta = availablePomodoros - pendingPomodoros

  const tasksForToday = React.useMemo(() => {
    const todayKey = toDateKey(selectedDay)
    const exactDue = (pendingTasks ?? []).filter((task) => task.due_date && toDateKey(new Date(`${task.due_date}T00:00:00`)) === todayKey)
    if (exactDue.length > 0) return exactDue
    return (pendingTasks ?? []).slice(0, 8)
  }, [pendingTasks, selectedDay])

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
        <CardHeader className="bg-primary/5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-2xl font-black flex items-center gap-2">
                <CalendarDays className="h-6 w-6 text-primary" /> Agenda de Foco
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Combina eventos reales con tareas pendientes para decidir que pomodoro ejecutar ahora.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="rounded-xl"
                onClick={() => setWeekStart((current) => addDays(current, -7))}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="rounded-xl"
                onClick={() => setWeekStart(startOfWeekMonday(new Date()))}
              >
                <Clock3 className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="rounded-xl"
                onClick={() => setWeekStart((current) => addDays(current, 7))}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="default"
                className="rounded-xl gap-2"
                disabled={isLoadingEvents}
                onClick={() => loadEvents().catch(() => {})}
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingEvents ? "animate-spin" : ""}`} />
                Refrescar agenda
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2">
            {weekDates.map((day) => {
              const key = toDateKey(day)
              const dayEvents = events.filter((event) => {
                const start = new Date(event.start)
                const end = new Date(event.end)
                if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false
                const dayStart = new Date(day)
                dayStart.setHours(0, 0, 0, 0)
                const dayEnd = new Date(day)
                dayEnd.setHours(23, 59, 59, 999)
                return overlap(dayStart, dayEnd, start, end)
              })
              const slots = computeFocusSlots(day, dayEvents, workMinutes)
              const freeMin = slots.reduce((acc, slot) => acc + slot.durationMinutes, 0)

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDayKey(key)}
                  className={`rounded-2xl border p-3 text-left transition-colors ${
                    selectedDayKey === key ? "border-primary bg-primary/5" : "border-slate-100 bg-white hover:bg-slate-50"
                  }`}
                >
                  <p className="text-[11px] font-black uppercase text-slate-500">{formatDayChip(day)}</p>
                  <p className="text-xs mt-1 text-slate-700">{dayEvents.length} eventos</p>
                  <p className="text-[10px] text-slate-500">{Math.floor(freeMin / 60)}h libres</p>
                </button>
              )
            })}
          </div>

          <Card className="rounded-2xl border-slate-100 shadow-none">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-black">Mis calendarios</CardTitle>
                  <p className="text-xs text-muted-foreground">Marcá qué calendarios impactan en esta agenda.</p>
                </div>
                <div className="flex items-center gap-2">
                  {calendarSaveMessage ? <span className="text-[11px] text-emerald-600">{calendarSaveMessage}</span> : null}
                  {isSavingCalendarSelection ? <span className="text-[11px] text-slate-500">Guardando...</span> : null}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {!profile?.google_calendar_sync ? (
                <p className="text-xs text-muted-foreground">Activa Google Calendar Sync en Configuracion para elegir calendarios.</p>
              ) : calendarSelectionError ? (
                <div className="space-y-2">
                  <p className="text-xs text-red-600">{calendarSelectionError}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 rounded-md px-2 text-xs"
                    onClick={() => loadCalendarOptions().catch(() => {})}
                    disabled={isLoadingCalendarOptions}
                  >
                    {isLoadingCalendarOptions ? "Cargando..." : "Reintentar"}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={calendarSearch}
                      onChange={(event) => setCalendarSearch(event.target.value)}
                      placeholder="Buscar calendarios..."
                      className="h-9 pl-9 pr-3 text-sm"
                    />
                  </div>

                  <div className="max-h-52 overflow-auto rounded-lg border border-slate-200 bg-white">
                    {filteredCalendarOptions.length === 0 ? (
                      <p className="px-3 py-4 text-xs text-muted-foreground">
                        {isLoadingCalendarOptions
                          ? "Cargando calendarios..."
                          : calendarSearch.trim().length > 0
                          ? "No hay coincidencias para esa busqueda."
                          : "No se encontraron calendarios en tu cuenta."}
                      </p>
                    ) : (
                      <>
                        {selectedFilteredCalendars.length > 0 ? (
                          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 bg-slate-50 border-b border-slate-100">
                            Seleccionados
                          </div>
                        ) : null}
                        {selectedFilteredCalendars.map((calendar) => {
                          const isChecked = true
                          const label = formatCalendarName(calendar.summary)
                          return (
                            <label
                              key={calendar.id}
                              className="flex items-center gap-3 px-3 py-2 border-b border-slate-100 cursor-pointer bg-primary/5"
                              title={calendar.summary}
                            >
                              <Checkbox
                                checked={isChecked}
                                disabled={isSavingCalendarSelection}
                                onCheckedChange={(value) => handleCalendarChecked(calendar.id, value === true)}
                              />
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: calendar.backgroundColor ?? "#94a3b8" }}
                              />
                              <span className="text-sm text-slate-700 truncate flex-1">{label}</span>
                              {calendar.primary ? (
                                <span className="text-[10px] uppercase tracking-wide text-slate-400">principal</span>
                              ) : null}
                            </label>
                          )
                        })}

                        {unselectedFilteredCalendars.length > 0 ? (
                          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 bg-slate-50 border-b border-slate-100">
                            Disponibles
                          </div>
                        ) : null}
                        {unselectedFilteredCalendars.map((calendar, index) => {
                          const label = formatCalendarName(calendar.summary)
                          const isLast = index === unselectedFilteredCalendars.length - 1
                          return (
                            <label
                              key={calendar.id}
                              className={`flex items-center gap-3 px-3 py-2 ${isLast ? "" : "border-b border-slate-100"} cursor-pointer hover:bg-slate-50 transition-colors`}
                              title={calendar.summary}
                            >
                              <Checkbox
                                checked={false}
                                disabled={isSavingCalendarSelection}
                                onCheckedChange={(value) => handleCalendarChecked(calendar.id, value === true)}
                              />
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: calendar.backgroundColor ?? "#94a3b8" }}
                              />
                              <span className="text-sm text-slate-700 truncate flex-1">{label}</span>
                              {calendar.primary ? (
                                <span className="text-[10px] uppercase tracking-wide text-slate-400">principal</span>
                              ) : null}
                            </label>
                          )
                        })}
                      </>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 min-[1700px]:grid-cols-[minmax(0,1.3fr)_340px] gap-6">
            <Card className="rounded-2xl border-slate-100 shadow-none min-w-0">
              <CardHeader>
                <CardTitle className="text-lg font-black">
                  {selectedDay.toLocaleDateString("es-AR", { weekday: "long", day: "2-digit", month: "long" })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {eventsError ? (
                  <p className="text-sm text-red-600">{eventsError}</p>
                ) : eventsInfo ? (
                  <p className="text-sm text-muted-foreground">{eventsInfo}</p>
                ) : selectedDayEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin eventos en este dia.</p>
                ) : (
                  selectedDayEvents.map((event) => (
                    <div key={event.id} className="rounded-xl border border-slate-100 p-3 bg-white">
                      <p className="text-sm font-bold text-slate-900 break-words" title={event.summary}>
                        {event.summary}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {event.allDay
                          ? "Todo el dia"
                          : `${formatHour(new Date(event.start))} - ${formatHour(new Date(event.end))}`}
                      </p>
                      {event.calendarSummary ? (
                        <div className="mt-1 flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: event.calendarColor ?? "#94a3b8" }}
                          />
                          <p className="text-[11px] text-slate-500 truncate" title={event.calendarSummary}>
                            {formatCalendarName(event.calendarSummary)}
                          </p>
                        </div>
                      ) : null}
                      {event.location ? (
                        <p className="text-xs text-slate-500 break-words" title={event.location}>
                          {formatLocationText(event.location)}
                        </p>
                      ) : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <div className="space-y-4 min-w-0">
              <Card className="rounded-2xl border-slate-100 shadow-none min-w-0">
                <CardHeader>
                  <CardTitle className="text-base font-black flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" /> Capacidad de foco
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>Pomodoros libres hoy: <strong>{availablePomodoros}</strong></p>
                  <p>Pendientes estimados: <strong>{pendingPomodoros}</strong></p>
                  <Badge
                    className={
                      capacityDelta >= 0
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }
                  >
                    {capacityDelta >= 0
                      ? `Capacidad OK (+${capacityDelta})`
                      : `Sobrecarga (${capacityDelta})`}
                  </Badge>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-slate-100 shadow-none min-w-0">
                <CardHeader>
                  <CardTitle className="text-base font-black">Slots de enfoque recomendados</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-64 overflow-auto">
                  {focusSlots.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hay bloques libres de al menos {workMinutes} min.</p>
                  ) : (
                    focusSlots.map((slot, idx) => (
                      <div key={`${slot.start.toISOString()}-${idx}`} className="rounded-xl border border-slate-100 p-3">
                        <p className="text-sm font-bold">
                          {formatHour(slot.start)} - {formatHour(slot.end)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {slot.durationMinutes} min ({slot.pomodorosFit} pomodoros)
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-slate-100 shadow-none min-w-0">
                <CardHeader>
                  <CardTitle className="text-base font-black">Tareas sugeridas para este bloque</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-72 overflow-auto">
                  {tasksForToday.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hay tareas pendientes para sugerir.</p>
                  ) : (
                    tasksForToday.map((task) => (
                      <div key={task.id} className="rounded-xl border border-slate-100 p-3">
                        <p className="text-sm font-bold text-slate-900">{task.title}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Vence: {formatDueDate(task.due_date)} | Estimado: {Math.max(task.effort_estimated ?? 1, 1)} pomodoros
                        </p>
                        <Button
                          size="sm"
                          className="mt-2 rounded-xl gap-2"
                          variant={activeTaskId === task.id ? "secondary" : "default"}
                          onClick={() => {
                            onTaskSelect?.(task.id)
                            onOpenFocusTab?.()
                            toast({
                              title: "Tarea vinculada al temporizador",
                              description: "Cambiamos a Modo Foco para que arranques el bloque.",
                            })
                          }}
                        >
                          <Target className="h-4 w-4" />
                          {activeTaskId === task.id ? "Ya vinculada" : "Usar en temporizador"}
                        </Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
