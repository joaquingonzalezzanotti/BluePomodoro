
"use client"

import * as React from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, limit, doc } from "firebase/firestore"
import { BarChart3, PieChart as PieChartIcon, Flame, Clock, Trophy } from "lucide-react"
import { GamifiedProgress } from "@/components/gamified-progress"

export function StatsView() {
  const { user } = useUser()
  const db = useFirestore()

  const sessionsQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "usuarios", user.uid, "sesionesPomodoro"), orderBy("fecha", "desc"), limit(50))
  }, [db, user])

  const { data: sessions } = useCollection(sessionsQuery)

  const statsData = React.useMemo(() => {
    if (!sessions) return []
    const groups: Record<string, number> = {}
    sessions.forEach(s => {
      const date = s.fecha?.seconds ? new Date(s.fecha.seconds * 1000).toLocaleDateString() : 'Desconocido'
      groups[date] = (groups[date] || 0) + 1
    })
    return Object.entries(groups).map(([date, count]) => ({ date, count })).reverse()
  }, [sessions])

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Trophy className="h-8 w-8 text-accent" />
        <h2 className="text-2xl font-black">Mi Centro de Logros</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <GamifiedProgress />
        <Card className="border-none shadow-xl bg-white rounded-3xl">
          <CardHeader>
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" /> Actividad Semanal
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statsData}>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-xl bg-primary text-white p-6 rounded-3xl">
          <h4 className="text-[10px] font-black uppercase opacity-60">Total Sesiones</h4>
          <p className="text-4xl font-black">{sessions?.length || 0}</p>
        </Card>
        <Card className="border-none shadow-xl bg-accent text-white p-6 rounded-3xl">
          <h4 className="text-[10px] font-black uppercase opacity-60">Horas Foco</h4>
          <p className="text-4xl font-black">{Math.round((sessions?.length || 0) * 25 / 60)}h</p>
        </Card>
        <Card className="border-none shadow-xl bg-slate-900 text-white p-6 rounded-3xl">
          <h4 className="text-[10px] font-black uppercase opacity-60">Racha</h4>
          <p className="text-4xl font-black flex items-center gap-2">1 <Flame className="h-8 w-8 text-orange-500 fill-current" /></p>
        </Card>
      </div>
    </div>
  )
}
