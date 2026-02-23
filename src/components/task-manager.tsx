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
  PlusCircle,
  Edit2,
  Check,
  ChevronDown,
  ChevronUp
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

export function TaskManager() {
  const [newTaskText, setNewTaskText] = React.useState("")
  const [isBreakingDown, setIsBreakingDown] = React.useState<string | null>(null)
  const [editingTaskId, setEditingTaskId] = React.useState<string | null>(null)
  const [editText, setEditText] = React.useState("")
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

  const startEditing = (id: string, currentTitle: string) => {
    setEditingTaskId(id)
    setEditText(currentTitle)
  }

  const saveEdit = (taskId: string) => {
    if (!user || !db || !editText.trim()) return
    const taskRef = doc(db, "usuarios", user.uid, "tareas", taskId)
    updateDocumentNonBlocking(taskRef, { titulo: editText })
    setEditingTaskId(null)
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
      const newSubTasks = result.subTasks.map(text => ({
        id: Math.random().toString(36).substring(2, 9),
        text,
        completed: false
      }))
      
      const taskRef = doc(db, "usuarios", user.uid, "tareas", taskId)
      updateDocumentNonBlocking(taskRef, { subtareas: newSubTasks })
      
      toast({ 
        title: "Desglose completado", 
        description: `IA ha generado ${newSubTasks.length} pasos accionables en español.` 
      })
    } catch (error) {
      toast({ 
        variant: "destructive", 
        title: "Error de IA", 
        description: "No se pudo realizar el desglose. Inténtalo de nuevo." 
      })
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
    
    // Si todas las subtareas se completan, podríamos sugerir completar la tarea principal
    const allCompleted = updatedSubTasks.every(st => st.completed)
    const updates: any = { subtareas: updatedSubTasks }
    if (allCompleted && updatedSubTasks.length > 0) {
      // updates.estado = "Completada" // Opcional: auto-completar
    }

    updateDocumentNonBlocking(taskRef, updates)
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
            const isEditing = editingTaskId === task.id

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
                        {isEditing ? (
                          <div className="flex gap-2 flex-1 mr-4">
                            <Input 
                              value={editText} 
                              onChange={(e) => setEditText(e.target.value)}
                              className="h-8 text-sm"
                              autoFocus
                              onKeyDown={(e) => e.key === "Enter" && saveEdit(task.id)}
                            />
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => saveEdit(task.id)}>
                              <Check className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <h4 className={`text-base font-bold truncate ${isCompleted ? "line-through text-muted-foreground opacity-60" : "text-foreground"}`}>
                            {task.titulo}
                          </h4>
                        )}
                        <div className="flex items-center gap-1">
                          {!isEditing && (
                            <Button variant="ghost" size="icon" onClick={() => startEditing(task.id, task.titulo)} className="h-8 w-8 text-muted-foreground/40 hover:text-primary hover:bg-primary/5">
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          )}
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
                        <div className="mt-2 mb-4 bg-muted/30 p-4 rounded-2xl border border-primary/5">
                          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.1em] mb-3">
                            <span className="text-primary flex items-center gap-2">
                              <Sparkles className="h-3.5 w-3.5" /> Progreso del desglose
                            </span>
                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                              {completedSubTasks}/{totalSubTasks} · {Math.round(progress)}%
                            </span>
                          </div>
                          <Progress value={progress} className="h-2 bg-primary/10" />
                          
                          <div className="mt-4 space-y-2.5">
                            {task.subtareas.map((subTask: any) => (
                              <div key={subTask.id} className="flex items-center gap-3 text-sm font-semibold group/sub bg-white/40 p-2 rounded-lg hover:bg-white/80 transition-all border border-transparent hover:border-primary/10">
                                <button 
                                  onClick={() => toggleSubTask(task.id, task.subtareas, subTask.id)} 
                                  className="transition-transform active:scale-90"
                                >
                                  {subTask.completed ? (
                                    <CheckCircle2 className="h-4.5 w-4.5 text-primary" />
                                  ) : (
                                    <Circle className="h-4.5 w-4.5 text-muted-foreground/30 group-hover/sub:text-primary/40" />
                                  )}
                                </button>
                                <span className={`flex-1 transition-colors ${subTask.completed ? "line-through text-muted-foreground/50 italic" : "text-foreground/90"}`}>
                                  {subTask.text}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-3">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-9 text-[11px] font-black uppercase tracking-widest gap-2 text-primary border-primary/20 hover:bg-primary/5 rounded-xl px-5 transition-all active:scale-95"
                          onClick={() => breakdownTask(task.id, task.titulo)}
                          disabled={isBreakingDown === task.id || isCompleted}
                        >
                          <Sparkles className={`h-4 w-4 ${isBreakingDown === task.id ? "animate-spin" : ""}`} />
                          {isBreakingDown === task.id ? "IA Pensando..." : totalSubTasks > 0 ? "Actualizar con IA" : "Desglosar con IA"}
                        </Button>
                      </div>
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
