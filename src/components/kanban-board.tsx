
"use client"

import * as React from "react"
import { useSupabase, useUser } from "@/supabase"
import { useSupabaseQuery } from "@/supabase/hooks"
import type { Task } from "@/supabase/types"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronRight, ChevronLeft, Zap, Layout, CheckCircle2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"

const COLUMNS = [
  { id: "Pendiente", title: "Por Hacer", color: "bg-slate-100/50" },
  { id: "En Proceso", title: "En Proceso", color: "bg-primary/10" },
  { id: "Completada", title: "Finalizado", color: "bg-green-50" },
]

export function KanbanBoard() {
  const { user } = useUser()
  const supabase = useSupabase()

  const { data: tasks } = useSupabaseQuery<Task[]>(
    async (client) => {
      if (!user) return []
      const { data, error } = await client
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
      if (error) throw error
      return (data ?? []) as Task[]
    },
    [supabase, user?.id],
    user ? { table: "tasks", filter: `user_id=eq.${user.id}` } : null
  )

  const moveTask = async (taskId: string, newStatus: string) => {
    if (!user) return
    await supabase.from("tasks").update({ status: newStatus }).eq("id", taskId)
  }

  const renderColumn = (col: typeof COLUMNS[0]) => {
    const colTasks = tasks?.filter(t => t.status === col.id || (!t.status && col.id === "Pendiente")) || []

    return (
      <div key={col.id} className="flex flex-col gap-4 min-w-[320px] flex-1">
        <div className={`p-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-between ${col.color}`}>
          <span>{col.title}</span>
          <Badge variant="outline" className="bg-white/50 border-none font-black">{colTasks.length}</Badge>
        </div>
        <div className="flex flex-col gap-4 p-2 min-h-[600px] rounded-2xl">
          {colTasks.map(task => {
            const subTasks = (task.subtasks || [])
            const totalCount = subTasks.length
            const completedCount = subTasks.filter((st: any) => typeof st === 'object' && st.completed).length
            const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

            return (
              <Card key={task.id} className="border-none shadow-sm hover:shadow-md transition-all rounded-2xl bg-white overflow-hidden">
                <CardContent className="p-5 space-y-4">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="text-sm font-black leading-tight flex-1">{task.title}</h4>
                    {task.status === "Completada" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                  </div>
                  
                  {totalCount > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[9px] font-black uppercase text-muted-foreground/60">
                        <span>Progreso</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <Progress value={progress} className="h-1 bg-slate-50" />
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-[10px] font-black uppercase text-muted-foreground/60">
                    <span className="flex items-center gap-1"><Layout className="h-3.5 w-3.5" /> {totalCount} Subtareas</span>
                    <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-primary" /> {task.effort_estimated || 1}</span>
                  </div>

                  <div className="flex justify-between pt-2 border-t border-slate-50">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" disabled={col.id === "Pendiente"} onClick={() => moveTask(task.id, col.id === "En Proceso" ? "Pendiente" : "En Proceso")}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" disabled={col.id === "Completada"} onClick={() => moveTask(task.id, col.id === "Pendiente" ? "En Proceso" : "Completada")}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-8 overflow-x-auto pb-8">
      {COLUMNS.map(renderColumn)}
    </div>
  )
}
