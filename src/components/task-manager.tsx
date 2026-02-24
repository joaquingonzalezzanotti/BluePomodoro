
"use client"

import * as React from "react"
import { 
  Plus, 
  Trash2, 
  Zap,
  Play,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Clock,
  Layout
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase"
import { collection, doc, serverTimestamp, query, orderBy } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { aiAssistedTaskBreakdown } from "@/ai/flows/ai-assisted-task-breakdown-flow"
import { Progress } from "@/components/ui/progress"

interface TaskManagerProps {
  onTaskSelect?: (id: string) => void
  activeTaskId?: string | null
}

export function TaskManager({ onTaskSelect, activeTaskId }: TaskManagerProps) {
  const [newTaskText, setNewTaskText] = React.useState("")
  const [isAiLoading, setIsAiLoading] = React.useState<string | null>(null)
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
      esfuerzoEstimadoPomodoros: 1,
      completadosPomodoros: 0,
      subtareas: [],
      fechaCreacion: serverTimestamp()
    })
    setNewTaskText("")
    toast({ title: "Tarea añadida" })
  }

  const handleAiBreakdown = async (taskId: string, description: string) => {
    if (!user || !db) return
    setIsAiLoading(taskId)
    try {
      const result = await aiAssistedTaskBreakdown({ largeTaskDescription: description })
      const taskRef = doc(db, "usuarios", user.uid, "tareas", taskId)
      updateDocumentNonBlocking(taskRef, { 
        subtareas: result.subTasks,
        esfuerzoEstimadoPomodoros: Math.max(1, result.subTasks.length) 
      })
      toast({ title: "IA: Tarea desglosada", description: `Se han creado ${result.subTasks.length} pasos.` })
    } catch (error) {
      toast({ variant: "destructive", title: "Error IA", description: "No se pudo desglosar la tarea." })
    } finally {
      setIsAiLoading(null)
    }
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

  if (isLoading) return <div className="py-20 text-center animate-pulse text-xs font-black uppercase text-muted-foreground">Cargando tareas...</div>

  return (
    <div className="space-y-6">
      <div className="relative group">
        <Input 
          placeholder="¿Qué tienes que hacer hoy?..." 
          value={newTaskText} 
          onChange={(e) => setNewTaskText(e.target.value)} 
          onKeyDown={(e) => e.key === 'Enter' && addTask()}
          className="h-14 rounded-2xl bg-white border-slate-100 shadow-sm pr-12 font-bold focus:ring-2 focus:ring-primary/20 transition-all"
        />
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={addTask} 
          className="absolute right-2 top-2 h-10 w-10 text-primary opacity-0 group-focus-within:opacity-100 transition-opacity"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      <div className="space-y-3">
        {tasks?.map(task => (
          <Card 
            key={task.id} 
            className={cn(
              "border-none shadow-sm transition-all group overflow-hidden rounded-2xl",
              activeTaskId === task.id ? "bg-primary/5 ring-2 ring-primary/40" : "bg-white",
              task.estado === "Completada" && "opacity-60 bg-slate-50"
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn(
                      "h-9 w-9 rounded-full shrink-0 border-2",
                      task.estado === "Completada" ? "text-green-500 border-green-500 bg-green-50" : "text-slate-200 border-slate-100 hover:text-primary hover:border-primary"
                    )}
                    onClick={() => toggleComplete(task.id, task.estado)}
                  >
                    <CheckCircle2 className="h-6 w-6" />
                  </Button>
                  <div 
                    className="min-w-0 cursor-pointer flex-1"
                    onClick={() => onTaskSelect?.(task.id)}
                  >
                    <h4 className={cn("text-sm font-black truncate leading-tight", task.estado === "Completada" && "line-through text-slate-400")}>
                      {task.titulo}
                    </h4>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    disabled={isAiLoading === task.id}
                    onClick={() => handleAiBreakdown(task.id, task.titulo)} 
                    className="h-8 w-8 text-primary hover:bg-primary/10"
                  >
                    <Sparkles className={cn("h-4 w-4", isAiLoading === task.id && "animate-spin")} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteTask(task.id)} className="h-8 w-8 text-slate-300 hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground/60 px-1">
                <span className="flex items-center gap-1.5"><Zap className="h-3 w-3 text-primary" /> {task.esfuerzoEstimadoPomodoros || 1} Pomodoros</span>
                <span className="flex items-center gap-1.5"><Layout className="h-3 w-3 text-blue-500" /> {task.subtareas?.length || 0} Pasos</span>
              </div>

              {task.subtareas && task.subtareas.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-50 space-y-2">
                   {task.subtareas.map((sub: string, i: number) => (
                     <div key={i} className="flex items-center gap-2 text-[11px] font-medium text-slate-500 bg-slate-50/50 p-2 rounded-lg">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary/40 shrink-0" />
                        {sub}
                     </div>
                   ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
