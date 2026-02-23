
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase"
import { collection, doc, query, orderBy } from "firebase/firestore"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronRight, ChevronLeft, Zap, Calendar } from "lucide-react"

const COLUMNS = [
  { id: "Pendiente", title: "Por Hacer", color: "bg-muted" },
  { id: "En Proceso", title: "En Proceso", color: "bg-primary/20" },
  { id: "Completada", title: "Finalizado", color: "bg-green-100" },
]

export function KanbanBoard() {
  const { user } = useUser()
  const db = useFirestore()

  const tasksQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "usuarios", user.uid, "tareas"), orderBy("fechaCreacion", "desc"))
  }, [db, user])

  const { data: tasks } = useCollection(tasksQuery)

  const moveTask = (taskId: string, newStatus: string) => {
    if (!user || !db) return
    const taskRef = doc(db, "usuarios", user.uid, "tareas", taskId)
    updateDocumentNonBlocking(taskRef, { estado: newStatus })
  }

  const renderColumn = (col: typeof COLUMNS[0]) => {
    const colTasks = tasks?.filter(t => t.estado === col.id || (!t.estado && col.id === "Pendiente")) || []

    return (
      <div key={col.id} className="flex flex-col gap-4 min-w-[300px] flex-1">
        <div className={`p-3 rounded-t-xl font-bold flex items-center justify-between ${col.color}`}>
          <span>{col.title}</span>
          <Badge variant="outline">{colTasks.length}</Badge>
        </div>
        <div className="flex flex-col gap-3 p-2 bg-muted/20 rounded-b-xl min-h-[500px]">
          {colTasks.map(task => (
            <Card key={task.id} className="border-none shadow-sm group">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <h4 className="text-sm font-bold leading-tight">{task.titulo}</h4>
                  <Badge variant={task.prioridad === "Alta" ? "destructive" : "outline"} className="text-[9px]">
                    {task.prioridad}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {task.fechaVencimiento}</span>
                  <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> {task.esfuerzoEstimadoPomodoros}</span>
                </div>

                <div className="flex justify-between pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6" 
                    disabled={col.id === "Pendiente"}
                    onClick={() => moveTask(task.id, col.id === "En Proceso" ? "Pendiente" : "En Proceso")}
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6" 
                    disabled={col.id === "Completada"}
                    onClick={() => moveTask(task.id, col.id === "Pendiente" ? "En Proceso" : "Completada")}
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-6 overflow-x-auto pb-6">
      {COLUMNS.map(renderColumn)}
    </div>
  )
}
