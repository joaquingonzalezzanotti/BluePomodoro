"use client"

import * as React from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSupabase, useUser } from "@/supabase"
import { useProfile, useSupabaseQuery } from "@/supabase/hooks"
import type { PomodoroSession } from "@/supabase/types"
import { BarChart3, Flame, Trophy } from "lucide-react"
import { GamifiedProgress } from "@/components/gamified-progress"
import {
  buildPomodoroStats,
  buildRewardSummary,
  getMonthKeyInTimeZone,
} from "@/pomodoro/stats"

function monthKeyToLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number)
  const date = new Date(year, (month ?? 1) - 1, 1)
  const value = date.toLocaleDateString("es-AR", { month: "long", year: "numeric" })
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function previousMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number)
  const date = new Date(year, (month ?? 1) - 1, 1)
  date.setMonth(date.getMonth() - 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

export function StatsView() {
  const { user } = useUser()
  const supabase = useSupabase()
  const { data: profile } = useProfile()
  const timeZone = profile?.timezone ?? "UTC"
  const currentMonthKey = React.useMemo(() => getMonthKeyInTimeZone(new Date(), timeZone), [timeZone])
  const [selectedMonthKey, setSelectedMonthKey] = React.useState(currentMonthKey)

  const { data: sessions } = useSupabaseQuery<PomodoroSession[]>(
    async (client) => {
      if (!user) return []
      const { data, error } = await client
        .from("pomodoro_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false })
      if (error) throw error
      return (data ?? []) as PomodoroSession[]
    },
    [supabase, user?.id],
    user ? { table: "pomodoro_sessions", filter: `user_id=eq.${user.id}` } : null
  )

  const monthBuckets = React.useMemo(() => {
    const buckets: Record<string, PomodoroSession[]> = {}
    for (const session of sessions ?? []) {
      if (!session.completed_at) continue
      const key = getMonthKeyInTimeZone(session.completed_at, timeZone)
      if (!key) continue
      if (!buckets[key]) buckets[key] = []
      buckets[key].push(session)
    }
    return buckets
  }, [sessions, timeZone])

  const monthOptions = React.useMemo(() => {
    const set = new Set<string>([currentMonthKey])
    Object.keys(monthBuckets).forEach((key) => set.add(key))
    return Array.from(set).sort((a, b) => b.localeCompare(a))
  }, [currentMonthKey, monthBuckets])

  React.useEffect(() => {
    if (monthOptions.includes(selectedMonthKey)) return
    setSelectedMonthKey(monthOptions[0] ?? currentMonthKey)
  }, [currentMonthKey, monthOptions, selectedMonthKey])

  const selectedSessions = monthBuckets[selectedMonthKey] ?? []
  const prevMonthKey = previousMonthKey(selectedMonthKey)
  const previousSessions = monthBuckets[prevMonthKey] ?? []
  const isCurrentPeriod = selectedMonthKey === currentMonthKey

  const stats = React.useMemo(
    () => buildPomodoroStats(selectedSessions, { timeZone }),
    [selectedSessions, timeZone]
  )
  const previousStats = React.useMemo(
    () => buildPomodoroStats(previousSessions, { timeZone }),
    [previousSessions, timeZone]
  )

  const rewards = React.useMemo(
    () =>
      buildRewardSummary(profile ?? null, selectedSessions, stats, {
        isCurrentPeriod,
        timeZone,
      }),
    [isCurrentPeriod, profile, selectedSessions, stats, timeZone]
  )

  const previousRewards = React.useMemo(
    () =>
      buildRewardSummary(profile ?? null, previousSessions, previousStats, {
        isCurrentPeriod: false,
        timeZone,
      }),
    [previousSessions, previousStats, profile, timeZone]
  )

  const comparisonDeltaPercent = React.useMemo(() => {
    const prev = previousRewards.points
    const curr = rewards.points
    if (prev <= 0) return curr > 0 ? 100 : 0
    return Math.round(((curr - prev) / prev) * 100)
  }, [previousRewards.points, rewards.points])

  const hasSessions = stats.workSessionsCount > 0
  const chartData = React.useMemo(() => stats.sessionsByDay, [stats.sessionsByDay])

  const periodLabel = monthKeyToLabel(selectedMonthKey)
  const prevPeriodLabel = monthKeyToLabel(prevMonthKey)

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Trophy className="h-8 w-8 text-accent" />
          <div>
            <h2 className="text-2xl font-black">Mi Centro de Logros</h2>
            <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">{periodLabel}</p>
          </div>
        </div>
        <div className="w-full sm:w-[280px]">
          <Select value={selectedMonthKey} onValueChange={setSelectedMonthKey}>
            <SelectTrigger className="rounded-xl bg-white">
              <SelectValue placeholder="Seleccionar mes" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((monthKey) => (
                <SelectItem key={monthKey} value={monthKey}>
                  {monthKeyToLabel(monthKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <GamifiedProgress
          rewards={rewards}
          comparisonDeltaPercent={comparisonDeltaPercent}
          periodLabel={periodLabel}
          comparisonLabel={`vs ${prevPeriodLabel}`}
        />
        <Card className="border-none shadow-xl bg-white rounded-3xl">
          <CardHeader>
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" /> Actividad del Mes
            </CardTitle>
            {!hasSessions && (
              <CardDescription className="text-xs font-medium text-slate-400">
                No hay sesiones de enfoque en {periodLabel.toLowerCase()}.
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="h-[300px]">
            {hasSessions ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                  <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} />
                  <RechartsTooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={26} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-black text-slate-700">Sin actividad en este mes</p>
                  <p className="text-xs text-slate-400 font-medium">Cambia el mes en el selector para ver historicos.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-none shadow-xl bg-primary text-white p-6 rounded-3xl">
          <h4 className="text-[10px] font-black uppercase opacity-60">Sesiones del Mes</h4>
          <p className="text-4xl font-black">{stats.workSessionsCount}</p>
        </Card>
        <Card className="border-none shadow-xl bg-accent text-white p-6 rounded-3xl">
          <h4 className="text-[10px] font-black uppercase opacity-60">Horas Foco Mes</h4>
          <p className="text-4xl font-black">{stats.focusHours}h</p>
        </Card>
        <Card className="border-none shadow-xl bg-orange-500 text-white p-6 rounded-3xl">
          <h4 className="text-[10px] font-black uppercase opacity-60">Descanso Extra Mes</h4>
          <p className="text-4xl font-black">{stats.breakOvertimeMinutes > 0 ? `-${stats.breakOvertimeMinutes}m` : "0m"}</p>
        </Card>
        <Card className="border-none shadow-xl bg-slate-900 text-white p-6 rounded-3xl">
          <h4 className="text-[10px] font-black uppercase opacity-60">Racha del Mes</h4>
          <p className="text-4xl font-black flex items-center gap-2">{rewards.streakDays} <Flame className="h-8 w-8 text-orange-500 fill-current" /></p>
        </Card>
      </div>
    </div>
  )
}
