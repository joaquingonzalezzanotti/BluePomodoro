
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
        .limit(50)
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
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.sessionsByDay}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} />
                <RechartsTooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
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
