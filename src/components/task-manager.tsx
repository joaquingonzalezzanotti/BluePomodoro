
"use client"

import * as React from "react"
import { 
  Plus, 
  Trash2, 
  Zap,
  CheckCircle2,
  Sparkles,
  Layout,
  BookOpen,
  Edit2,
  Check,
  X,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase"
import { collection, doc, serverTimestamp, query, orderBy, where } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { aiAssistedTaskBreakdown } from "@/ai/flows/ai-assisted-task-breakdown-flow"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface SubTask {
  id: string
  text: string
  completed: boolean
}

interface TaskManagerProps {
  onTaskSelect?: (id: string) => void
  activeTaskId?: string | null
}

export function TaskManager({ onTaskSelect, activeTaskId }: TaskManagerProps) {
  const [newTaskText, setNewTaskText] = React.useState("")
  const [selectedMateriaId, setSelectedMateriaId] = React.useState<string>("none")
  const [isAiLoading, setIsAiLoading] = React.useState<string | null>(null)
  const [editingTaskId, setEditingTaskId] = React.useState<string | null>(null)
  const [editingText, setEditingText] = React.useState("")
  
  const { toast } = useToast()
  const db = useFirestore()
  const { user } = useUser()

  const tasksQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "usuarios", user.uid, "tareas"), orderBy("fechaCreacion", "desc"))
  }, [db, user])

  const materiasQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return collection(db, "usuarios", user.uid, "materias")
  }, [db, user])

  const { data: tasks, isLoading } = useCollection(tasksQuery)
  const { data: materias } = useCollection(materiasQuery)

  const addTask = () => {
    if (!newTaskText.trim() || !user || !db) return
    const tasksRef = collection(db, "usuarios", user.uid, "tareas")
    addDocumentNonBlocking(tasksRef, {
      usuarioId: user.uid,
      materiaId: selectedMateriaId === "none" ? null : selectedMateriaId,
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
      
      const formattedSubTasks: SubTask[] = result.subTasks.map((st, idx) => ({
        id: `${Date.now()}-${idx}`,
        text: typeof st === 'string' ? st : (st as any).text || String(st),
        completed: false
      }))

      updateDocumentNonBlocking(taskRef, { 
        subtareas: formattedSubTasks,
        esfuerzoEstimadoPomodoros: Math.max(1, Math.ceil(formattedSubTasks.length / 2)) 
      })
      toast({ title: "IA: Tarea desglosada", description: `Se han creado ${formattedSubTasks.length} pasos.` })
    } catch (error) {
      toast({ variant: "destructive", title: "Error IA", description: "No se pudo desglosar la tarea." })
    } finally {
      setIsAiLoading(null)
    }
  }

  const updateTaskTitle = (taskId: string) => {
    if (!user || !db || !editingText.trim()) return
    const taskRef = doc(db, "usuarios", user.uid, "tareas", taskId)
    updateDocumentNonBlocking(taskRef, { titulo: editingText })
    setEditingTaskId(null)
  }

  const toggleSubTask = (taskId: string, subTasks: SubTask[], subTaskId: string) => {
    if (!user || !db) return
    const taskRef = doc(db, "usuarios", user.uid, "tareas", taskId)
    const newSubTasks = subTasks.map(st => 
      st.id === subTaskId ? { ...st, completed: !st.completed } : st
    )
    updateDocumentNonBlocking(taskRef, { subtareas: newSubTasks })
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
      <div className="flex flex-col gap-3 p-4 bg-white rounded-[2rem] shadow-sm border border-slate-100">
        <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground/60 px-2">Nueva Tarea</h3>
        <div className="flex flex-col gap-2">
          <Input 
            placeholder="¿Qué tienes que hacer?" 
            value={newTaskText} 
            onChange={(e) => setNewTaskText(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            className="h-12 rounded-xl bg-slate-50 border-none font-bold focus:ring-2 focus:ring-primary/20 transition-all"
          />
          <div className="flex gap-2">
            <Select value={selectedMateriaId} onValueChange={setSelectedMateriaId}>
              <SelectTrigger className="flex-1 h-10 rounded-xl bg-slate-50 border-none text-[11px] font-bold">
                <SelectValue placeholder="Vincular Materia" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-xl">
                <SelectItem value="none">Sin Materia</SelectItem>
                {materias?.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={addTask} 
              className="h-10 px-6 rounded-xl shadow-lg shadow-primary/20 font-bold"
            >
              Añadir
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {tasks?.map(task => {
          const materia = materias?.find(m => m.id === task.materiaId)
          const subTasks = (task.subtareas || []) as (string | SubTask)[]
          
          // Normalización para visualización segura
          const normalizedSubTasks: SubTask[] = subTasks.map((st, i) => 
            typeof st === 'string' ? { id: `st-${i}`, text: st, completed: false } : st
          )

          const completedCount = normalizedSubTasks.filter(st => st.completed).length
          const totalCount = normalizedSubTasks.length
          const progressValue = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

          return (
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
                      className="min-w-0 flex-1"
                    >
                      <div className="flex flex-col">
                        {editingTaskId === task.id ? (
                          <div className="flex items-center gap-2">
                            <Input 
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              className="h-8 rounded-lg text-sm font-black"
                              autoFocus
                            />
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => updateTaskTitle(task.id)}>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400" onClick={() => setEditingTaskId(null)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <h4 
                              onClick={() => onTaskSelect?.(task.id)}
                              className={cn("text-sm font-black truncate leading-tight cursor-pointer", task.estado === "Completada" && "line-through text-slate-400")}
                            >
                              {task.titulo}
                            </h4>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-5 w-5 opacity-0 group-hover:opacity-100"
                              onClick={() => { setEditingTaskId(task.id); setEditingText(task.titulo); }}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        {materia && (
                          <span className="text-[9px] font-black uppercase text-primary/60 flex items-center gap-1 mt-1">
                            <BookOpen className="h-2.5 w-2.5" /> {materia.nombre}
                          </span>
                        )}
                      </div>
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

                {totalCount > 0 && (
                  <div className="mb-3 space-y-1">
                    <div className="flex justify-between text-[9px] font-black uppercase text-muted-foreground/60">
                      <span>Progreso</span>
                      <span>{Math.round(progressValue)}%</span>
                    </div>
                    <Progress value={progressValue} className="h-1 bg-slate-100" />
                  </div>
                )}

                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground/60 px-1">
                  <span className="flex items-center gap-1.5"><Zap className="h-3 w-3 text-primary" /> {task.esfuerzoEstimadoPomodoros || 1} Pomos</span>
                  <span className="flex items-center gap-1.5"><Layout className="h-3 w-3 text-blue-500" /> {totalCount} Pasos</span>
                </div>

                {normalizedSubTasks.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-50 space-y-2">
                     {normalizedSubTasks.map((sub, i) => (
                       <div 
                        key={sub.id || i} 
                        className={cn(
                          "flex items-center gap-2 text-[11px] font-medium p-2 rounded-lg cursor-pointer transition-colors",
                          sub.completed ? "bg-green-50/50 text-green-700/60" : "bg-slate-50/50 text-slate-600 hover:bg-slate-100"
                        )}
                        onClick={() => toggleSubTask(task.id, normalizedSubTasks, sub.id)}
                       >
                          <div className={cn(
                            "h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0",
                            sub.completed ? "bg-green-500 border-green-500 text-white" : "border-slate-300 bg-white"
                          )}>
                            {sub.completed && <Check className="h-2.5 w-2.5" />}
                          </div>
                          <span className={cn(sub.completed && "line-through")}>{sub.text}</span>
                       </div>
                     ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
