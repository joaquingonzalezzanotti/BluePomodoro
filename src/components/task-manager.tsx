"use client"

import * as React from "react"
import { 
  CheckCircle2, 
  Circle, 
  Plus, 
  Sparkles, 
  Trash2, 
  Zap,
  Calendar,
  MinusCircle,
  PlusCircle
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

  const updatePomodoroCount = (taskId: string, current: number, delta: number) => {
    if (!user || !db) return
    const newCount = Math.max(1, current + delta)
    const taskRef = doc(db, "usuarios", user.uid, "tareas", taskId)
    updateDocumentNonBlocking(taskRef, { esfuerzoEstimadoPomodoros: newCount })
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
    return <div className="py-10 text-center text-muted-foreground font-medium animate-pulse">Cargando tus tareas...</div>
  }

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input 
              placeholder="¿Qué quieres lograr hoy?" 
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
              className="bg-background border-primary/10 focus-visible:ring-primary/30 h-11 text-sm font-medium"
            />
            <Button onClick={addTask} className="bg-primary hover:bg-primary/90 h-11 px-6 shadow-sm shadow-primary/20">
              <Plus className="h-4 w-4 mr-2" /> Añadir
            </Button>
          </div>
        </CardContent>
      </Card>

      <ScrollArea className="h-[650px] pr-4">
        <div className="space-y-4">
          {tasks?.map((task) => {
            const completedSubTasks = task.subtareas?.filter((s: any) => s.completed).length || 0
            const totalSubTasks = task.subtareas?.length || 0
            const progress = totalSubTasks > 0 ? (completedSubTasks / totalSubTasks) * 100 : 0
            const isCompleted = task.estado === "Completada"

            return (
              <Card key={task.id} className="border-none shadow-sm group hover:shadow-md transition-all duration-300">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <button onClick={() => toggleTask(task.id, task.estado)} className="mt-1 transition-transform active:scale-90">
                      {isCompleted ? (
                        <CheckCircle2 className="h-6 w-6 text-primary fill-primary/10" />
                      ) : (
                        <Circle className="h-6 w-6 text-muted-foreground/30 hover:text-primary/50" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className={`text-base font-bold truncate ${isCompleted ? "line-through text-muted-foreground opacity-60" : "text-foreground"}`}>
                          {task.titulo}
                        </h4>
                        <div className="flex items-center gap-2">
                          <Badge variant={task.prioridad === "Alta" ? "destructive" : task.prioridad === "Media" ? "default" : "secondary"} className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0">
                            {task.prioridad}
                          </Badge>
                          <Button variant="ghost" size="icon" onClick={() => deleteTask(task.id)} className="h-8 w-8 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/5 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-muted-foreground mb-4">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Calendar className="h-3.5 w-3.5" /> {task.fechaVencimiento}
                        </span>
                        <div className="flex items-center gap-2 group/pomos">
                          <Zap className="h-3.5 w-3.5 text-orange-500" /> 
                          <span className="font-bold text-foreground">{task.esfuerzoEstimadoPomodoros}</span>
                          <span className="font-medium">Pomodoros</span>
                          <div className="flex items-center gap-1 opacity-0 group-hover/pomos:opacity-100 transition-opacity ml-2">
                            <button onClick={() => updatePomodoroCount(task.id, task.esfuerzoEstimadoPomodoros, -1)} className="hover:text-primary"><MinusCircle className="h-3.5 w-3.5" /></button>
                            <button onClick={() => updatePomodoroCount(task.id, task.esfuerzoEstimadoPomodoros, 1)} className="hover:text-primary"><PlusCircle className="h-3.5 w-3.5" /></button>
                          </div>
                        </div>
                      </div>

                      {totalSubTasks > 0 && (
                        <div className="mt-2 mb-4 bg-muted/30 p-3 rounded-xl">
                          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider mb-2">
                            <span>Progreso IA</span>
                            <span>{Math.round(progress)}%</span>
                          </div>
                          <Progress value={progress} className="h-1.5 bg-primary/10" />
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-[11px] font-bold uppercase tracking-wider gap-2 text-primary hover:bg-primary/5 rounded-full px-4"
                          onClick={() => breakdownTask(task.id, task.titulo)}
                          disabled={isBreakingDown === task.id}
                        >
                          <Sparkles className={`h-3.5 w-3.5 ${isBreakingDown === task.id ? "animate-spin" : ""}`} />
                          {isBreakingDown === task.id ? "Analizando..." : "Desglose por IA"}
                        </Button>
                      </div>

                      {task.subtareas && task.subtareas.length > 0 && (
                        <div className="mt-4 pl-4 border-l-2 border-primary/10 space-y-3 animate-in slide-in-from-left-2 duration-300">
                          {task.subtareas.map((subTask: any) => (
                            <div key={subTask.id} className="flex items-center gap-3 text-sm font-medium py-0.5 group/sub">
                              <button onClick={() => toggleSubTask(task.id, task.subtareas, subTask.id)} className="transition-transform active:scale-90">
                                {subTask.completed ? (
                                  <CheckCircle2 className="h-4 w-4 text-primary" />
                                ) : (
                                  <Circle className="h-4 w-4 text-muted-foreground/30 group-hover/sub:text-primary/40" />
                                )}
                              </button>
                              <span className={`transition-colors ${subTask.completed ? "line-through text-muted-foreground/60" : "text-foreground/80"}`}>
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
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground/40 bg-muted/5 rounded-3xl border-2 border-dashed border-primary/5">
              <div className="p-5 bg-primary/5 rounded-full mb-6">
                <Zap className="h-12 w-12 text-primary/20" />
              </div>
              <p className="text-sm font-bold uppercase tracking-widest">Empieza tu racha hoy</p>
              <p className="text-xs mt-1">Añade tu primera tarea arriba</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
