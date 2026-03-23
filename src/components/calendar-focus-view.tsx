"use client"

import * as React from "react"
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, RefreshCw, Sparkles, Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useProfile, useSupabaseQuery } from "@/supabase/hooks"
import { useSession, useUser } from "@/supabase/provider"
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
  const { toast } = useToast()
  const { data: profile } = useProfile()

  const [weekStart, setWeekStart] = React.useState(() => startOfWeekMonday(new Date()))
  const [selectedDayKey, setSelectedDayKey] = React.useState(() => toDateKey(new Date()))
  const [events, setEvents] = React.useState<CalendarEvent[]>([])
  const [isLoadingEvents, setIsLoadingEvents] = React.useState(false)
  const [eventsError, setEventsError] = React.useState<string | null>(null)
  const [eventsInfo, setEventsInfo] = React.useState<string | null>(null)

  const weekDates = React.useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const weekEnd = React.useMemo(() => {
    const end = addDays(weekStart, 7)
    end.setHours(0, 0, 0, 0)
    return end
  }, [weekStart])

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
        setEventsInfo("No hay calendarios seleccionados para la agenda. Ajustalo en Centro de Sincronizacion.")
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

          <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_1fr] gap-6">
            <Card className="rounded-2xl border-slate-100 shadow-none">
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
                      <p className="text-sm font-bold text-slate-900">{event.summary}</p>
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
                          <p className="text-[11px] text-slate-500 truncate">{event.calendarSummary}</p>
                        </div>
                      ) : null}
                      {event.location ? <p className="text-xs text-slate-500">{event.location}</p> : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="rounded-2xl border-slate-100 shadow-none">
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

              <Card className="rounded-2xl border-slate-100 shadow-none">
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

              <Card className="rounded-2xl border-slate-100 shadow-none">
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
