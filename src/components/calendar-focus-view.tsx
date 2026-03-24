"use client"

import * as React from "react"
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useProfile } from "@/supabase/hooks"
import { useSession, useSupabase, useUser } from "@/supabase/provider"

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

type CalendarViewOption = "day" | "week" | "month" | "year" | "agenda" | "seven_days"

const weekdayLabels = ["LUN", "MAR", "MIE", "JUE", "VIE", "SAB", "DOM"]
const miniWeekdayLabels = ["L", "M", "X", "J", "V", "S", "D"]

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

function addDays(base: Date, days: number): Date {
  const result = new Date(base)
  result.setDate(result.getDate() + days)
  return result
}

function startOfWeekMonday(date: Date): Date {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  const day = value.getDay()
  const diff = day === 0 ? -6 : 1 - day
  value.setDate(value.getDate() + diff)
  return value
}

function endOfWeekSunday(date: Date): Date {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  const day = value.getDay()
  const diff = day === 0 ? 0 : 7 - day
  value.setDate(value.getDate() + diff)
  return value
}

function startOfMonth(date: Date): Date {
  const value = new Date(date)
  value.setDate(1)
  value.setHours(0, 0, 0, 0)
  return value
}

function endOfMonth(date: Date): Date {
  const value = new Date(date)
  value.setMonth(value.getMonth() + 1, 0)
  value.setHours(0, 0, 0, 0)
  return value
}

function buildMonthGridDays(monthDate: Date): Date[] {
  const monthStart = startOfMonth(monthDate)
  const monthEnd = endOfMonth(monthDate)
  const gridStart = startOfWeekMonday(monthStart)
  const gridEnd = endOfWeekSunday(monthEnd)

  const days: Date[] = []
  let cursor = new Date(gridStart)
  while (cursor <= gridEnd) {
    days.push(new Date(cursor))
    cursor = addDays(cursor, 1)
  }
  return days
}

function overlap(rangeStart: Date, rangeEnd: Date, eventStart: Date, eventEnd: Date): boolean {
  return eventStart < rangeEnd && eventEnd > rangeStart
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

function formatMonthTitle(date: Date): string {
  const value = date.toLocaleDateString("es-AR", { month: "long", year: "numeric" })
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatEventLine(day: Date, event: CalendarEvent): string {
  if (event.allDay) return event.summary

  const eventStart = new Date(event.start)
  if (Number.isNaN(eventStart.getTime())) return event.summary

  const isStartDay = toDateKey(eventStart) === toDateKey(day)
  const prefix = isStartDay
    ? eventStart.toLocaleTimeString("es-AR", { hour: "numeric", minute: "2-digit" })
    : "->"

  return `${prefix} ${event.summary}`
}

function getNowInTimeZone(timeZone: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone,
  }).format(new Date())
}

export function CalendarFocusView(_props: CalendarFocusViewProps) {
  const { session } = useSession()
  const { user } = useUser()
  const supabase = useSupabase()
  const { toast } = useToast()
  const { data: profile, refetch: refetchProfile } = useProfile()

  const today = React.useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return now
  }, [])

  const [currentMonth, setCurrentMonth] = React.useState(() => startOfMonth(new Date()))
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
  const [isCalendarModalOpen, setIsCalendarModalOpen] = React.useState(false)

  const [viewOption, setViewOption] = React.useState<CalendarViewOption>("month")

  const monthStart = React.useMemo(() => startOfMonth(currentMonth), [currentMonth])
  const monthEnd = React.useMemo(() => endOfMonth(currentMonth), [currentMonth])
  const monthGridDays = React.useMemo(() => buildMonthGridDays(currentMonth), [currentMonth])
  const monthGridStart = React.useMemo(() => startOfWeekMonday(monthStart), [monthStart])
  const monthGridEnd = React.useMemo(() => endOfWeekSunday(monthEnd), [monthEnd])
  const miniMonthDays = React.useMemo(() => buildMonthGridDays(currentMonth), [currentMonth])

  const fetchStartIso = React.useMemo(() => {
    const start = new Date(monthGridStart)
    start.setHours(0, 0, 0, 0)
    return start.toISOString()
  }, [monthGridStart])

  const fetchEndIso = React.useMemo(() => {
    const end = addDays(monthGridEnd, 1)
    end.setHours(0, 0, 0, 0)
    return end.toISOString()
  }, [monthGridEnd])

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
      if (a.primary !== b.primary) return a.primary ? -1 : 1
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

  const selectedCalendarPreview = React.useMemo(() => {
    return sortedCalendarOptions.filter((calendar) => selectedCalendarSet.has(calendar.id)).slice(0, 8)
  }, [selectedCalendarSet, sortedCalendarOptions])

  React.useEffect(() => {
    const selected = fromDateKey(selectedDayKey)
    if (selected < monthGridStart || selected > monthGridEnd) {
      setSelectedDayKey(toDateKey(monthStart))
    }
  }, [selectedDayKey, monthGridEnd, monthGridStart, monthStart])

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
    if (!isCalendarModalOpen || !session?.access_token || !profile?.google_calendar_sync) return
    if (calendarOptions.length > 0) return
    loadCalendarOptions().catch(() => {})
  }, [calendarOptions.length, isCalendarModalOpen, loadCalendarOptions, profile?.google_calendar_sync, session?.access_token])

  React.useEffect(() => {
    if (!calendarSaveMessage) return
    const timeout = window.setTimeout(() => setCalendarSaveMessage(null), 1800)
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
        `/api/google/calendar/events?start=${encodeURIComponent(fetchStartIso)}&end=${encodeURIComponent(fetchEndIso)}&max=250`,
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
        setEventsInfo("No hay calendarios seleccionados para mostrar eventos.")
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
  }, [fetchEndIso, fetchStartIso, profile?.google_calendar_sync, session?.access_token, toast])

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

        if (error) throw new Error(error.message)

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

  const eventsByDay = React.useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()

    for (const day of monthGridDays) {
      const dayStart = new Date(day)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = addDays(dayStart, 1)

      const dayEvents = events
        .filter((event) => {
          const start = new Date(event.start)
          const end = new Date(event.end)
          if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false
          return overlap(dayStart, dayEnd, start, end)
        })
        .sort((a, b) => {
          if (a.allDay && !b.allDay) return -1
          if (!a.allDay && b.allDay) return 1
          return new Date(a.start).getTime() - new Date(b.start).getTime()
        })

      map.set(toDateKey(day), dayEvents)
    }

    return map
  }, [events, monthGridDays])

  const selectedDayEvents = eventsByDay.get(selectedDayKey) ?? []
  const selectedDay = React.useMemo(() => fromDateKey(selectedDayKey), [selectedDayKey])

  const viewLabel = React.useMemo(() => {
    switch (viewOption) {
      case "day":
        return "Dia"
      case "week":
        return "Semana"
      case "month":
        return "Mes"
      case "year":
        return "Ano"
      case "agenda":
        return "Agenda"
      case "seven_days":
        return "7 dias"
      default:
        return "Mes"
    }
  }, [viewOption])

  const localTimeZone = React.useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, [])

  return (
    <div className="rounded-[26px] border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex min-h-[78vh] flex-col lg:flex-row">
        <aside className="w-full lg:w-[300px] xl:w-[320px] border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50/70 p-4 xl:p-5 space-y-5">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full justify-center rounded-xl bg-white"
            onClick={() => {
              const now = new Date()
              setCurrentMonth(startOfMonth(now))
              setSelectedDayKey(toDateKey(now))
            }}
          >
            Hoy
          </Button>

          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">{formatMonthTitle(currentMonth)}</p>
            </div>
            <div className="grid grid-cols-7 gap-y-1 text-center text-[10px] font-semibold text-slate-500 mb-1">
              {miniWeekdayLabels.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-1 text-center text-[11px]">
              {miniMonthDays.map((day) => {
                const key = toDateKey(day)
                const isCurrentMonth = day.getMonth() === currentMonth.getMonth()
                const isToday = key === toDateKey(today)
                const isSelected = key === selectedDayKey
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSelectedDayKey(key)
                      if (!isCurrentMonth) setCurrentMonth(startOfMonth(day))
                    }}
                    className={cn(
                      "mx-auto h-6 w-6 rounded-full transition-colors",
                      isSelected && "bg-blue-600 text-white",
                      !isSelected && isToday && "bg-blue-100 text-blue-700",
                      !isCurrentMonth && "text-slate-400",
                      isCurrentMonth && !isSelected && !isToday && "text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    {day.getDate()}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">Mis calendarios</h3>
              <span className="text-xs text-slate-500">{effectiveSelectedCalendarIds.length}</span>
            </div>

            <Button
              type="button"
              variant="outline"
              className="h-9 w-full justify-center rounded-lg"
              onClick={() => setIsCalendarModalOpen(true)}
            >
              Seleccionar calendarios
            </Button>

            {!profile?.google_calendar_sync ? (
              <p className="text-xs text-slate-500">Activa Google Calendar Sync en Configuracion.</p>
            ) : selectedCalendarPreview.length === 0 ? (
              <p className="text-xs text-slate-500">No hay calendarios activos.</p>
            ) : (
              <div className="space-y-1.5">
                {selectedCalendarPreview.map((calendar) => (
                  <div key={calendar.id} className="flex items-center gap-2 text-xs text-slate-700">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: calendar.backgroundColor ?? "#94a3b8" }} />
                    <span className="truncate" title={calendar.summary}>
                      {formatCalendarName(calendar.summary)}
                    </span>
                    {calendar.primary ? <span className="text-[10px] text-slate-400">principal</span> : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2 text-xs text-slate-600">
            <p>
              <span className="font-semibold text-slate-800">Hora local:</span> {getNowInTimeZone(localTimeZone)}
            </p>
            <p>
              <span className="font-semibold text-slate-800">Hora UTC:</span> {getNowInTimeZone("UTC")}
            </p>
            <p>
              <span className="font-semibold text-slate-800">Dia seleccionado:</span>{" "}
              {selectedDay.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <p>
              <span className="font-semibold text-slate-800">Eventos:</span> {selectedDayEvents.length}
            </p>
          </div>
        </aside>

        <section className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 xl:px-6 xl:py-4 bg-white">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl px-5"
                onClick={() => {
                  const now = new Date()
                  setCurrentMonth(startOfMonth(now))
                  setSelectedDayKey(toDateKey(now))
                }}
              >
                Hoy
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={() => setCurrentMonth((previous) => startOfMonth(new Date(previous.getFullYear(), previous.getMonth() - 1, 1)))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={() => setCurrentMonth((previous) => startOfMonth(new Date(previous.getFullYear(), previous.getMonth() + 1, 1)))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <h2 className="ml-2 text-2xl font-semibold text-slate-900">{formatMonthTitle(currentMonth)}</h2>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl px-3"
                onClick={() => loadEvents().catch(() => {})}
                disabled={isLoadingEvents}
              >
                <RefreshCw className={cn("h-4 w-4", isLoadingEvents && "animate-spin")} />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" className="h-10 rounded-xl px-4 gap-2">
                    {viewLabel}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onSelect={() => setViewOption("day")}>Dia</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setViewOption("week")}>Semana</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setViewOption("month")} className="font-semibold text-blue-700">
                    Mes
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setViewOption("year")}>Ano</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setViewOption("agenda")}>Agenda</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setViewOption("seven_days")}>7 dias</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl px-4"
                onClick={() => setIsCalendarModalOpen(true)}
              >
                Calendarios
              </Button>
            </div>
          </div>

          {eventsError ? (
            <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 xl:px-6">{eventsError}</div>
          ) : null}
          {!eventsError && eventsInfo ? (
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600 xl:px-6">{eventsInfo}</div>
          ) : null}

          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                {weekdayLabels.map((label) => (
                  <div key={label} className="px-3 py-2 text-center text-[11px] font-semibold tracking-wide text-slate-600">
                    {label}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {monthGridDays.map((day) => {
                  const dayKey = toDateKey(day)
                  const dayEvents = eventsByDay.get(dayKey) ?? []
                  const isCurrentMonth = day.getMonth() === currentMonth.getMonth()
                  const isToday = dayKey === toDateKey(today)
                  const isSelected = dayKey === selectedDayKey
                  const visibleEvents = dayEvents.slice(0, 4)
                  const remaining = Math.max(dayEvents.length - visibleEvents.length, 0)

                  return (
                    <button
                      key={dayKey}
                      type="button"
                      onClick={() => {
                        setSelectedDayKey(dayKey)
                        if (!isCurrentMonth) setCurrentMonth(startOfMonth(day))
                      }}
                      className={cn(
                        "relative min-h-[138px] border-b border-r border-slate-200 px-2 py-2 text-left align-top transition-colors",
                        !isCurrentMonth && "bg-slate-50/80",
                        isSelected && "bg-blue-50/70",
                        !isSelected && "hover:bg-slate-50"
                      )}
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span
                          className={cn(
                            "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-sm",
                            isToday && "bg-blue-600 text-white",
                            !isToday && isCurrentMonth && "text-slate-900",
                            !isCurrentMonth && "text-slate-400"
                          )}
                        >
                          {day.getDate()}
                        </span>
                      </div>

                      <div className="space-y-1">
                        {visibleEvents.map((event) => (
                          <div
                            key={`${dayKey}-${event.id}`}
                            className="flex items-start gap-1 rounded-md bg-blue-50/40 px-1.5 py-0.5 text-[11px] text-slate-800"
                            title={event.summary}
                          >
                            <span
                              className="mt-1 h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: event.calendarColor ?? "#3b82f6" }}
                            />
                            <span className="truncate">{formatEventLine(day, event)}</span>
                          </div>
                        ))}
                        {remaining > 0 ? <p className="px-1.5 text-[11px] font-medium text-slate-500">+{remaining} mas</p> : null}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </section>
      </div>

      <Dialog open={isCalendarModalOpen} onOpenChange={setIsCalendarModalOpen}>
        <DialogContent className="max-w-2xl rounded-2xl p-0 overflow-hidden">
          <DialogHeader className="border-b border-slate-200 px-5 py-4">
            <DialogTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-blue-600" /> Seleccion de calendarios
            </DialogTitle>
            <DialogDescription>
              Elige que calendarios se usan para mostrar eventos y calcular disponibilidad.
            </DialogDescription>
          </DialogHeader>

          <div className="p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-500">Activos: {effectiveSelectedCalendarIds.length}</span>
              <div className="flex items-center gap-2">
                {calendarSaveMessage ? <span className="text-emerald-600">{calendarSaveMessage}</span> : null}
                {isSavingCalendarSelection ? <span className="text-slate-500">Guardando...</span> : null}
              </div>
            </div>

            {!profile?.google_calendar_sync ? (
              <p className="text-sm text-slate-600">Activa Google Calendar Sync en Configuracion para elegir calendarios.</p>
            ) : calendarSelectionError ? (
              <div className="space-y-2">
                <p className="text-sm text-red-600">{calendarSelectionError}</p>
                <Button
                  variant="outline"
                  className="h-9 rounded-lg"
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
                    className="h-10 pl-9"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 rounded-lg px-3 text-xs"
                    disabled={isSavingCalendarSelection || allCalendarIds.length === 0}
                    onClick={() => saveCalendarSelection("all", [])}
                  >
                    Seleccionar todos
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 rounded-lg px-3 text-xs"
                    disabled={isSavingCalendarSelection}
                    onClick={() => saveCalendarSelection("none", [])}
                  >
                    Deseleccionar todos
                  </Button>
                </div>

                <div className="max-h-[46vh] overflow-auto rounded-xl border border-slate-200">
                  {filteredCalendarOptions.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-slate-500">
                      {isLoadingCalendarOptions
                        ? "Cargando calendarios..."
                        : calendarSearch.trim().length > 0
                        ? "No hay coincidencias para esa busqueda."
                        : "No se encontraron calendarios en tu cuenta."}
                    </p>
                  ) : (
                    filteredCalendarOptions.map((calendar, index) => {
                      const checked = selectedCalendarSet.has(calendar.id)
                      return (
                        <label
                          key={calendar.id}
                          className={cn(
                            "flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors",
                            index < filteredCalendarOptions.length - 1 && "border-b border-slate-100",
                            checked ? "bg-blue-50/70" : "hover:bg-slate-50"
                          )}
                          title={calendar.summary}
                        >
                          <Checkbox
                            checked={checked}
                            disabled={isSavingCalendarSelection}
                            onCheckedChange={(value) => handleCalendarChecked(calendar.id, value === true)}
                          />
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: calendar.backgroundColor ?? "#94a3b8" }}
                          />
                          <span className="text-sm text-slate-700 truncate flex-1">{formatCalendarName(calendar.summary)}</span>
                          {calendar.primary ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-blue-700">
                              <Check className="h-3 w-3" /> principal
                            </span>
                          ) : null}
                        </label>
                      )
                    })
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
