
"use client"

import * as React from "react"
import { 
  Plus, 
  Trash2, 
  Zap,
  Calendar,
  Play,
  Briefcase,
  CheckCircle2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase"
import { collection, doc, serverTimestamp, query, orderBy } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface TaskManagerProps {
  onTaskSelect?: (id: string) => void
  activeTaskId?: string | null
}

export function TaskManager({ onTaskSelect, activeTaskId }: TaskManagerProps) {
  const [newTaskText, setNewTaskText] = React.useState("")
  const { toast } = useToast()
  const db = useFirestore()
  const { user } = useUser()

  const tasksQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "usuarios", user.uid, "tareas"), orderBy("fechaCreacion", "desc"))
  }, [db, user])

  const { data: tasks, isLoading } = useCollection(tasksQuery)

  const addTask = () => {
    if (!newTaskText.trim() || !user || !db) return
    const tasksRef = collection(db, "usuarios", user.uid, "tareas")
    addDocumentNonBlocking(tasksRef, {
      usuarioId: user.uid,
      titulo: newTaskText,
      estado: "Pendiente",
      prioridad: "Media",
      esfuerzoEstimadoPomodoros: 1,
      completadosPomodoros: 0,
      fechaCreacion: serverTimestamp(),
      subtareas: []
    })
    setNewTaskText("")
    toast({ title: "Tarea creada" })
  }

  const deleteTask = (id: string) => {
    if (!user || !db) return
    deleteDocumentNonBlocking(doc(db, "usuarios", user.uid, "tareas", id))
  }

  const toggleComplete = (taskId: string, currentStatus: string) => {
    if (!user || !db) return
    const taskRef = doc(db, "usuarios", user.uid, "tareas", taskId)
    updateDocumentNonBlocking(taskRef, { estado: currentStatus === "Completada" ? "Pendiente" : "Completada" })
  }

  if (isLoading) return <div className="py-20 text-center animate-pulse">Cargando tareas...</div>

  return (
    <div className="space-y-4">
      <div className="relative group">
        <Input 
          placeholder="Añadir tarea rápida..." 
          value={newTaskText} 
          onChange={(e) => setNewTaskText(e.target.value)} 
          onKeyDown={(e) => e.key === 'Enter' && addTask()}
          className="h-11 rounded-xl bg-white border-slate-100 shadow-sm pr-10"
        />
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={addTask} 
          className="absolute right-1 top-1 h-9 w-9 text-primary opacity-0 group-focus-within:opacity-100 transition-opacity"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      <div className="space-y-2">
        {tasks?.map(task => (
          <Card 
            key={task.id} 
            className={cn(
              "border-none shadow-sm transition-all group",
              activeTaskId === task.id ? "bg-primary/5 ring-1 ring-primary/20" : "bg-white",
              task.estado === "Completada" && "opacity-50"
            )}
          >
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn(
                    "h-8 w-8 rounded-full shrink-0",
                    task.estado === "Completada" ? "text-green-500" : "text-slate-300 hover:text-primary"
                  )}
                  onClick={() => toggleComplete(task.id, task.estado)}
                >
                  <CheckCircle2 className="h-5 w-5" />
                </Button>
                <div 
                  className="min-w-0 cursor-pointer flex-1"
                  onClick={() => onTaskSelect?.(task.id)}
                >
                  <h4 className={cn("text-xs font-bold truncate", task.estado === "Completada" && "line-through")}>
                    {task.titulo}
                  </h4>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => onTaskSelect?.(task.id)} 
                  className={cn("h-8 w-8", activeTaskId === task.id ? "text-primary" : "text-muted-foreground")}
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => deleteTask(task.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
