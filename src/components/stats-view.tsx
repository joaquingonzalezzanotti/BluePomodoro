
"use client"

import * as React from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useSupabase, useUser } from "@/supabase"
import { useProfile, useSupabaseQuery } from "@/supabase/hooks"
import type { PomodoroSession } from "@/supabase/types"
import { BarChart3, PieChart as PieChartIcon, Flame, Clock, Trophy } from "lucide-react"
import { GamifiedProgress } from "@/components/gamified-progress"
import { buildPomodoroStats, buildRewardSummary } from "@/pomodoro/stats"

export function StatsView() {
  const { user } = useUser()
  const supabase = useSupabase()
  const { data: profile } = useProfile()

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

  const stats = React.useMemo(() => buildPomodoroStats(sessions ?? []), [sessions])
  const rewards = React.useMemo(
    () => buildRewardSummary(profile ?? null, sessions ?? [], stats),
    [profile, sessions, stats]
  )
  const hasSessions = stats.workSessionsCount > 0
  const chartData = React.useMemo(() => {
    if (stats.sessionsByDay.length > 0) return stats.sessionsByDay
    const today = new Date()
    return Array.from({ length: 7 }).map((_, idx) => {
      const date = new Date(today.getTime() - (6 - idx) * 24 * 60 * 60 * 1000)
      const label = `${date.getDate()}/${date.getMonth() + 1}`
      return { date: label, count: 0 }
    })
  }, [stats.sessionsByDay])

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Trophy className="h-8 w-8 text-accent" />
        <h2 className="text-2xl font-black">Mi Centro de Logros</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <GamifiedProgress rewards={rewards} weeklyDeltaPercent={stats.weeklyDeltaPercent} />
        <Card className="border-none shadow-xl bg-white rounded-3xl">
          <CardHeader>
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" /> Actividad Semanal
            </CardTitle>
            {!hasSessions && (
              <CardDescription className="text-xs font-medium text-slate-400">
                Completa una sesión de enfoque para ver tus barras de actividad.
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
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-black text-slate-700">Aún sin actividad</p>
                  <p className="text-xs text-slate-400 font-medium">Tus sesiones aparecerán acá cuando completes tu primer pomodoro.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-none shadow-xl bg-primary text-white p-6 rounded-3xl">
          <h4 className="text-[10px] font-black uppercase opacity-60">Total Sesiones</h4>
          <p className="text-4xl font-black">{stats.workSessionsCount}</p>
        </Card>
        <Card className="border-none shadow-xl bg-accent text-white p-6 rounded-3xl">
          <h4 className="text-[10px] font-black uppercase opacity-60">Horas Foco</h4>
          <p className="text-4xl font-black">{stats.focusHours}h</p>
        </Card>
        <Card className="border-none shadow-xl bg-orange-500 text-white p-6 rounded-3xl">
          <h4 className="text-[10px] font-black uppercase opacity-60">Descanso Extra</h4>
          <p className="text-4xl font-black">{stats.breakOvertimeMinutes > 0 ? `-${stats.breakOvertimeMinutes}m` : "0m"}</p>
        </Card>
        <Card className="border-none shadow-xl bg-slate-900 text-white p-6 rounded-3xl">
          <h4 className="text-[10px] font-black uppercase opacity-60">Racha</h4>
          <p className="text-4xl font-black flex items-center gap-2">{rewards.streakDays} <Flame className="h-8 w-8 text-orange-500 fill-current" /></p>
        </Card>
      </div>
    </div>
  )
}
