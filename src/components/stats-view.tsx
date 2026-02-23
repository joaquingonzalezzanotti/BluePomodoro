
"use client"

import * as React from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, limit } from "firebase/firestore"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart3, PieChart as PieChartIcon, Flame, Clock } from "lucide-react"

export function StatsView() {
  const { user } = useUser()
  const db = useFirestore()

  const sessionsQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(
      collection(db, "usuarios", user.uid, "sesionesPomodoro"),
      orderBy("fecha", "desc"),
      limit(50)
    )
  }, [db, user])

  const { data: sessions } = useCollection(sessionsQuery)

  const statsData = React.useMemo(() => {
    if (!sessions) return []
    const groups: Record<string, number> = {}
    sessions.forEach(s => {
      const date = new Date(s.fecha?.seconds * 1000).toLocaleDateString()
      groups[date] = (groups[date] || 0) + 1
    })
    return Object.entries(groups).map(([date, count]) => ({ date, count })).reverse()
  }, [sessions])

  const typeData = React.useMemo(() => {
    if (!sessions) return []
    const work = sessions.filter(s => s.tipo === 'trabajo').length
    const rest = sessions.filter(s => s.tipo === 'descanso').length
    return [
      { name: 'Trabajo', value: work, color: 'hsl(var(--primary))' },
      { name: 'Descanso', value: rest, color: 'hsl(var(--accent))' }
    ]
  }, [sessions])

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm bg-primary text-primary-foreground">
          <CardHeader className="pb-2">
            <CardDescription className="text-primary-foreground/70 uppercase text-[10px] font-bold">Total Sesiones</CardDescription>
            <CardTitle className="text-3xl font-extrabold">{sessions?.length || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs opacity-80">
              <Clock className="h-3 w-3" />
              <span>{Math.round((sessions?.length || 0) * 25 / 60)} horas enfocadas</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="uppercase text-[10px] font-bold">Racha Actual</CardDescription>
            <CardTitle className="text-3xl font-extrabold flex items-center gap-2">
              1 <Flame className="h-6 w-6 text-orange-500 fill-current" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">¡Sigue así, vas por buen camino!</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="uppercase text-[10px] font-bold">Eficiencia IA</CardDescription>
            <CardTitle className="text-3xl font-extrabold">92%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Mejora respecto a la semana pasada</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Actividad Semanal
            </CardTitle>
            <CardDescription>Número de Pomodoros completados por día</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statsData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} />
                <RechartsTooltip 
                  cursor={{fill: 'hsl(var(--muted))', opacity: 0.4}}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-popover border p-2 rounded-lg shadow-xl text-[10px] font-bold">
                          {payload[0].value} SESIONES
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-primary" />
              Distribución de Tiempo
            </CardTitle>
            <CardDescription>Balance entre trabajo y descanso</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2">
              {typeData.map(t => (
                <div key={t.name} className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full" style={{backgroundColor: t.color}} />
                  <span className="font-bold">{t.name}: {t.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
