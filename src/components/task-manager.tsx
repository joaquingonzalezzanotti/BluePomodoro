
"use client"

import * as React from "react"
import { 
  CheckCircle2, 
  Circle, 
  Plus, 
  Sparkles, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Zap,
  Calendar
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { aiAssistedTaskBreakdown } from "@/ai/flows/ai-assisted-task-breakdown-flow"
import { useToast } from "@/hooks/use-toast"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useFirestore, useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { collection, doc, serverTimestamp, query, orderBy } from "firebase/firestore"

export function TaskManager() {
  const [newTaskText, setNewTaskText] = React.useState("")
  const [isBreakingDown, setIsBreakingDown] = React.useState<string | null>(null)
  const { toast } = useToast()
  const db = useFirestore()
  const { user } = useUser()

  const tasksQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(
      collection(db, "usuarios", user.uid, "tareas"),
      orderBy("fechaCreacion", "desc")
    )
  }, [db, user])

  const { data: tasks, isLoading } = useCollection(tasksQuery)

  const addTask = () => {
    if (!newTaskText.trim() || !user || !db) return
    
    const tasksRef = collection(db, "usuarios", user.uid, "tareas")
    addDocumentNonBlocking(tasksRef, {
      usuarioId: user.uid,
      titulo: newTaskText,
      descripcion: "",
      estado: "Pendiente",
      prioridad: "Media",
      esfuerzoEstimadoPomodoros: 1,
      fechaVencimiento: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      fechaCreacion: serverTimestamp(),
      subtareas: []
    })
    setNewTaskText("")
  }

  const toggleTask = (taskId: string, currentStatus: string) => {
    if (!user || !db) return
    const taskRef = doc(db, "usuarios", user.uid, "tareas", taskId)
    const newStatus = currentStatus === "Completada" ? "Pendiente" : "Completada"
    updateDocumentNonBlocking(taskRef, { estado: newStatus })
  }

  const deleteTask = (taskId: string) => {
    if (!user || !db) return
    const taskRef = doc(db, "usuarios", user.uid, "tareas", taskId)
    deleteDocumentNonBlocking(taskRef)
  }

  const breakdownTask = async (taskId: string, taskText: string) => {
    if (!user || !db) return
    setIsBreakingDown(taskId)
    try {
      const result = await aiAssistedTaskBreakdown({ largeTaskDescription: taskText })
      const subTasks = result.subTasks.map(text => ({
        id: Math.random().toString(36).substr(2, 9),
        text,
        completed: false
      }))
      
      const taskRef = doc(db, "usuarios", user.uid, "tareas", taskId)
      updateDocumentNonBlocking(taskRef, { subtareas: subTasks })
      toast({ title: "Tarea Desglosada", description: `Se añadieron ${subTasks.length} sub-tareas.` })
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "La IA no pudo procesar esta tarea." })
    } finally {
      setIsBreakingDown(null)
    }
  }

  const toggleSubTask = (taskId: string, subTasks: any[], subTaskId: string) => {
    if (!user || !db) return
    const updatedSubTasks = subTasks.map(st => 
      st.id === subTaskId ? { ...st, completed: !st.completed } : st
    )
    const taskRef = doc(db, "usuarios", user.uid, "tareas", taskId)
    updateDocumentNonBlocking(taskRef, { subtareas: updatedSubTasks })
  }

  if (isLoading) {
    return <div className="py-10 text-center text-muted-foreground">Cargando tareas...</div>
  }

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-md overflow-hidden bg-white/50 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input 
              placeholder="¿En qué te vas a enfocar hoy?" 
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
              className="bg-white border-primary/20 focus-visible:ring-primary"
            />
            <Button onClick={addTask} className="bg-primary hover:bg-primary/80">
              <Plus className="h-4 w-4 mr-2" /> Añadir Tarea
            </Button>
          </div>
        </CardContent>
      </Card>

      <ScrollArea className="h-[600px] pr-4">
        <div className="space-y-4">
          {tasks?.map((task) => {
            const completedSubTasks = task.subtareas?.filter((s: any) => s.completed).length || 0
            const totalSubTasks = task.subtareas?.length || 0
            const progress = totalSubTasks > 0 ? (completedSubTasks / totalSubTasks) * 100 : 0
            const isCompleted = task.estado === "Completada"

            return (
              <Card key={task.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <button onClick={() => toggleTask(task.id, task.estado)} className="mt-1">
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className={`text-base font-semibold truncate ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
                          {task.titulo}
                        </h4>
                        <div className="flex items-center gap-2">
                          <Badge variant={task.prioridad === "Alta" ? "destructive" : task.prioridad === "Media" ? "default" : "secondary"}>
                            {task.prioridad}
                          </Badge>
                          <Button variant="ghost" size="icon" onClick={() => deleteTask(task.id)} className="h-8 w-8 text-destructive/50 hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {task.fechaVencimiento}
                        </span>
                        <span className="flex items-center gap-1">
                          <Zap className="h-3 w-3" /> {task.esfuerzoEstimadoPomodoros} Pomodoros
                        </span>
                      </div>

                      {totalSubTasks > 0 && (
                        <div className="mt-2 mb-4">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span>Progreso</span>
                            <span>{Math.round(progress)}%</span>
                          </div>
                          <Progress value={progress} className="h-1.5" />
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7 text-xs gap-1 border-primary/20 text-primary hover:bg-primary/10"
                          onClick={() => breakdownTask(task.id, task.titulo)}
                          disabled={isBreakingDown === task.id}
                        >
                          <Sparkles className={`h-3 w-3 ${isBreakingDown === task.id ? "animate-pulse" : ""}`} />
                          {isBreakingDown === task.id ? "Analizando..." : "Desglose por IA"}
                        </Button>
                      </div>

                      {task.subtareas && task.subtareas.length > 0 && (
                        <div className="mt-4 pl-4 border-l-2 border-primary/20 space-y-2">
                          {task.subtareas.map((subTask: any) => (
                            <div key={subTask.id} className="flex items-center gap-2 text-sm py-1">
                              <button onClick={() => toggleSubTask(task.id, task.subtareas, subTask.id)}>
                                {subTask.completed ? (
                                  <CheckCircle2 className="h-4 w-4 text-primary/70" />
                                ) : (
                                  <Circle className="h-4 w-4 text-muted-foreground/50" />
                                )}
                              </button>
                              <span className={subTask.completed ? "line-through text-muted-foreground" : ""}>
                                {subTask.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          
          {tasks?.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <div className="p-4 bg-primary/10 rounded-full mb-4">
                <Plus className="h-10 w-10 text-primary/40" />
              </div>
              <p className="text-sm font-medium">No hay tareas. ¡Añade una para empezar!</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
