
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
  X,
  AlertCircle
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
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"

export function TaskManager() {
  const [newTaskText, setNewTaskText] = React.useState("")
  const [isBreakingDown, setIsBreakingDown] = React.useState<string | null>(null)
  const [editingTaskId, setEditingTaskId] = React.useState<string | null>(null)
  const [editText, setEditText] = React.useState("")
  
  const [editingSubTask, setEditingSubTask] = React.useState<{taskId: string, subId: string} | null>(null)
  const [editSubText, setEditSubText] = React.useState("")

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

  const updatePriority = (taskId: string, newPriority: string) => {
    if (!user || !db) return
    const taskRef = doc(db, "usuarios", user.uid, "tareas", taskId)
    updateDocumentNonBlocking(taskRef, { prioridad: newPriority })
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
    updateDocumentNonBlocking(taskRef, { subtareas: updatedSubTasks })
  }

  const startEditSubTask = (taskId: string, subId: string, text: string) => {
    setEditingSubTask({ taskId, subId })
    setEditSubText(text)
  }

  const saveEditSubTask = (taskId: string, subTasks: any[]) => {
    if (!user || !db || !editingSubTask) return
    const updatedSubTasks = subTasks.map(st => 
      st.id === editingSubTask.subId ? { ...st, text: editSubText } : st
    )
    const taskRef = doc(db, "usuarios", user.uid, "tareas", taskId)
    updateDocumentNonBlocking(taskRef, { subtareas: updatedSubTasks })
    setEditingSubTask(null)
  }

  const deleteSubTask = (taskId: string, subTasks: any[], subId: string) => {
    if (!user || !db) return
    const updatedSubTasks = subTasks.filter(st => st.id !== subId)
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
            const isEditing = editingTaskId === task.id

            return (
              <Card key={task.id} className="border-none shadow-sm group hover:shadow-md transition-all duration-300">
                <CardContent className="p-5">
                  <Collapsible defaultOpen={totalSubTasks > 0}>
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
                            
                            {/* Selector de Prioridad/Complejidad */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 px-2 p-0 hover:bg-transparent">
                                  <Badge variant={task.prioridad === "Alta" ? "destructive" : task.prioridad === "Media" ? "default" : "secondary"} className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0 cursor-pointer">
                                    {task.prioridad || "Media"}
                                  </Badge>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => updatePriority(task.id, "Alta")} className="text-xs font-bold text-destructive">Alta (Compleja)</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updatePriority(task.id, "Media")} className="text-xs font-bold">Media</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updatePriority(task.id, "Baja")} className="text-xs font-bold text-muted-foreground">Baja (Simple)</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>

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

                        {/* Barra de Progreso y Trigger de Colapso */}
                        {totalSubTasks > 0 && (
                          <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.1em] text-primary">
                                <Sparkles className="h-3.5 w-3.5" /> Progreso del desglose
                              </div>
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full">
                                  <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                                </Button>
                              </CollapsibleTrigger>
                            </div>
                            <div className="flex items-center gap-4">
                              <Progress value={progress} className="h-2 bg-primary/10 flex-1" />
                              <span className="text-[10px] font-bold text-primary/60 min-w-[50px] text-right">
                                {completedSubTasks}/{totalSubTasks}
                              </span>
                            </div>
                          </div>
                        )}

                        <CollapsibleContent>
                          {totalSubTasks > 0 && (
                            <div className="mt-2 space-y-2 bg-muted/20 p-3 rounded-2xl border border-primary/5">
                              {task.subtareas.map((subTask: any) => {
                                const isSubEditing = editingSubTask?.taskId === task.id && editingSubTask?.subId === subTask.id
                                return (
                                  <div key={subTask.id} className="flex items-center gap-3 text-sm font-semibold group/sub bg-white/60 p-2 rounded-xl hover:bg-white/90 transition-all border border-transparent hover:border-primary/5">
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
                                    
                                    {isSubEditing ? (
                                      <div className="flex items-center gap-2 flex-1">
                                        <Input 
                                          value={editSubText}
                                          onChange={(e) => setEditSubText(e.target.value)}
                                          className="h-7 text-xs py-0"
                                          autoFocus
                                          onKeyDown={(e) => e.key === "Enter" && saveEditSubTask(task.id, task.subtareas)}
                                        />
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-primary" onClick={() => saveEditSubTask(task.id, task.subtareas)}>
                                          <Check className="h-3 w-3" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => setEditingSubTask(null)}>
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <>
                                        <span className={`flex-1 transition-colors ${subTask.completed ? "line-through text-muted-foreground/50 italic" : "text-foreground/90"}`}>
                                          {subTask.text}
                                        </span>
                                        <div className="flex items-center gap-1 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground/40 hover:text-primary" onClick={() => startEditSubTask(task.id, subTask.id, subTask.text)}>
                                            <Edit2 className="h-3 w-3" />
                                          </Button>
                                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground/40 hover:text-destructive" onClick={() => deleteSubTask(task.id, task.subtareas, subTask.id)}>
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </CollapsibleContent>

                        <div className="flex gap-3 mt-4">
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
                  </Collapsible>
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
