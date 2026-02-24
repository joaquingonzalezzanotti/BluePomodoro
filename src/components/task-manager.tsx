
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
  ChevronDown,
  ChevronUp,
  Minus
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase"
import { collection, doc, serverTimestamp, query, orderBy } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { aiAssistedTaskBreakdown } from "@/ai/flows/ai-assisted-task-breakdown-flow"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface SubTask {
  id: string
  text: string
  completed: boolean
}

interface TaskManagerProps {
  onTaskSelect?: (id: string) => void
  activeTaskId?: string | null
  onlyActive?: boolean
}

export function TaskManager({ onTaskSelect, activeTaskId, onlyActive }: TaskManagerProps) {
  const [newTaskText, setNewTaskText] = React.useState("")
  const [selectedMateriaId, setSelectedMateriaId] = React.useState<string>("none")
  const [isAiLoading, setIsAiLoading] = React.useState<string | null>(null)
  
  const [editingTaskId, setEditingTaskId] = React.useState<string | null>(null)
  const [editingText, setEditingText] = React.useState("")
  const [editingSubTaskId, setEditingSubTaskId] = React.useState<{taskId: string, subId: string} | null>(null)
  const [editingSubText, setEditingSubText] = React.useState("")

  const [expandedTasks, setExpandedTasks] = React.useState<Record<string, boolean>>({})
  
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

  const toggleExpand = (taskId: string) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }))
  }

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
      toast({ title: "IA: Tarea desglosada", description: `Se han creado ${formattedSubTasks.length} subtareas.` })
      setExpandedTasks(prev => ({ ...prev, [taskId]: true }))
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

  const updatePomodoros = (taskId: string, current: number, delta: number) => {
    if (!user || !db) return
    const taskRef = doc(db, "usuarios", user.uid, "tareas", taskId)
    const newVal = Math.max(1, current + delta)
    updateDocumentNonBlocking(taskRef, { esfuerzoEstimadoPomodoros: newVal })
  }

  const updateSubTaskText = (taskId: string, subTasks: SubTask[], subId: string) => {
    if (!user || !db || !editingSubText.trim()) return
    const taskRef = doc(db, "usuarios", user.uid, "tareas", taskId)
    const newSubTasks = subTasks.map(st => st.id === subId ? { ...st, text: editingSubText } : st)
    updateDocumentNonBlocking(taskRef, { subtareas: newSubTasks })
    setEditingSubTaskId(null)
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

  const filteredTasks = onlyActive && activeTaskId 
    ? tasks?.filter(t => t.id === activeTaskId) 
    : tasks

  if (isLoading) return <div className="py-20 text-center animate-pulse text-xs font-black uppercase text-muted-foreground">Cargando tareas...</div>

  return (
    <div className="space-y-6">
      {!onlyActive && (
        <div className="flex flex-col gap-3 p-6 bg-white rounded-[2.5rem] shadow-sm border border-slate-100">
          <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground/60 px-2">Nueva Tarea</h3>
          <div className="flex flex-col gap-3">
            <Input 
              placeholder="¿Qué tienes que hacer?" 
              value={newTaskText} 
              onChange={(e) => setNewTaskText(e.target.value)} 
              className="h-14 rounded-2xl bg-slate-50 border-none font-bold text-lg"
            />
            <div className="flex gap-3">
              <Select value={selectedMateriaId} onValueChange={setSelectedMateriaId}>
                <SelectTrigger className="flex-1 h-12 rounded-2xl bg-slate-50 border-none text-[11px] font-bold">
                  <SelectValue placeholder="Vincular Materia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin Materia</SelectItem>
                  {materias?.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={addTask} className="h-12 px-8 rounded-2xl font-bold shadow-lg shadow-primary/20">Añadir Tarea</Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {filteredTasks?.map(task => {
          const materia = materias?.find(m => m.id === task.materiaId)
          const rawSubTasks = task.subtareas || []
          const normalizedSubTasks: SubTask[] = rawSubTasks.map((st: any, i: number) => 
            typeof st === 'string' ? { id: `st-${i}`, text: st, completed: false } : st
          )

          const completedCount = normalizedSubTasks.filter(st => st.completed).length
          const totalCount = normalizedSubTasks.length
          const progressValue = totalCount > 0 ? (completedCount / totalCount) * 100 : 0
          const isExpanded = !!expandedTasks[task.id]
          const esfuerzo = task.esfuerzoEstimadoPomodoros || 1

          return (
            <Collapsible key={task.id} open={isExpanded} onOpenChange={() => toggleExpand(task.id)}>
              <Card className={cn("border-none shadow-sm transition-all rounded-[2rem] overflow-hidden bg-white", activeTaskId === task.id && "ring-2 ring-primary/40", task.estado === "Completada" && "opacity-60")}>
                <CardContent className="p-6">
                  {/* Layout de 2 Filas obligatorio */}
                  <div className="flex flex-col gap-4">
                    
                    {/* Fila 1 (Nombre de la Tarea) - Ocupa todo el ancho */}
                    <div className="flex items-center gap-4 w-full" onClick={() => onTaskSelect?.(task.id)}>
                      <Button 
                        variant="ghost" size="icon" 
                        className={cn("h-10 w-10 rounded-full shrink-0 border-2", task.estado === "Completada" ? "text-green-500 border-green-500" : "text-slate-200 border-slate-100")}
                        onClick={(e) => { e.stopPropagation(); toggleComplete(task.id, task.estado); }}
                      >
                        <CheckCircle2 className="h-6 w-6" />
                      </Button>
                      <div className="flex-1 min-w-0 cursor-pointer">
                        {editingTaskId === task.id ? (
                          <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                            <Input value={editingText} onChange={(e) => setEditingText(e.target.value)} className="h-8 text-sm font-black" autoFocus />
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => updateTaskTitle(task.id)}><Check className="h-4 w-4" /></Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group min-w-0">
                            <h4 className={cn("text-lg font-black truncate leading-tight", task.estado === "Completada" && "line-through text-slate-400")}>{task.titulo}</h4>
                            <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0" onClick={(e) => { e.stopPropagation(); setEditingTaskId(task.id); setEditingText(task.titulo); }}><Edit2 className="h-3 w-3" /></Button>
                          </div>
                        )}
                        {materia && <span className="text-[10px] font-black uppercase text-primary/60 flex items-center gap-1 mt-1 truncate"><BookOpen className="h-3 w-3 shrink-0" /> {materia.nombre}</span>}
                      </div>
                    </div>

                    {/* Fila 2 (Acciones y Metadatos) - Alineado a la derecha */}
                    <div className="flex items-center justify-end gap-6 w-full">
                      {totalCount > 0 && (
                        <div className="w-24 space-y-1 hidden sm:block">
                          <div className="flex justify-between text-[9px] font-black uppercase text-muted-foreground/60">
                            <span>{Math.round(progressValue)}%</span>
                          </div>
                          <Progress value={progressValue} className="h-1 bg-slate-100" />
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4 text-[10px] font-black uppercase text-muted-foreground/60">
                        {/* Selector de Pomodoros con edición */}
                        <div className="flex items-center gap-2 bg-primary/5 px-2 py-1 rounded-lg group/pomodoro">
                          <Zap className="h-3.5 w-3.5 text-primary" />
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" size="icon" 
                              className="h-4 w-4 p-0 opacity-0 group-hover/pomodoro:opacity-100 transition-opacity"
                              onClick={(e) => { e.stopPropagation(); updatePomodoros(task.id, esfuerzo, -1); }}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="min-w-[1ch] text-center">{esfuerzo}</span>
                            <Button 
                              variant="ghost" size="icon" 
                              className="h-4 w-4 p-0 opacity-0 group-hover/pomodoro:opacity-100 transition-opacity"
                              onClick={(e) => { e.stopPropagation(); updatePomodoros(task.id, esfuerzo, 1); }}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <span className="flex items-center gap-1.5 bg-blue-50 px-2 py-1 rounded-lg"><Layout className="h-3.5 w-3.5 text-blue-500" /> {totalCount}</span>
                      </div>

                      <div className="flex items-center gap-1 border-l pl-4 border-slate-100">
                        <Button variant="ghost" size="icon" disabled={isAiLoading === task.id} onClick={() => handleAiBreakdown(task.id, task.titulo)} className="h-9 w-9 text-primary hover:bg-primary/5"><Sparkles className={cn("h-4 w-4", isAiLoading === task.id && "animate-spin")} /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteTask(task.id)} className="h-9 w-9 text-slate-300 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </div>
                  </div>

                  <CollapsibleContent className="mt-6 pt-6 border-t border-slate-50 space-y-3">
                     {normalizedSubTasks.length > 0 ? normalizedSubTasks.map(sub => (
                       <div key={sub.id} className="flex items-center gap-3 group/sub animate-in slide-in-from-top-2 duration-300 min-w-0">
                          <div 
                            className={cn("h-5 w-5 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all shrink-0", sub.completed ? "bg-green-500 border-green-500 text-white" : "border-slate-200 hover:border-primary/40")}
                            onClick={() => toggleSubTask(task.id, normalizedSubTasks, sub.id)}
                          >
                            {sub.completed && <Check className="h-3.5 w-3.5" />}
                          </div>
                          {editingSubTaskId?.subId === sub.id ? (
                            <Input value={editingSubText} onChange={(e) => setEditingSubText(e.target.value)} onBlur={() => updateSubTaskText(task.id, normalizedSubTasks, sub.id)} className="h-8 text-sm font-medium" autoFocus />
                          ) : (
                            <span className={cn("text-sm font-medium flex-1 truncate", sub.completed ? "line-through text-slate-400" : "text-slate-600")}>{sub.text}</span>
                          )}
                          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover/sub:opacity-100 shrink-0" onClick={() => { setEditingSubTaskId({taskId: task.id, subId: sub.id}); setEditingSubText(sub.text); }}><Edit2 className="h-3 w-3" /></Button>
                       </div>
                     )) : (
                       <p className="text-xs text-center text-muted-foreground font-medium italic">Sin subtareas. ¡Usa la IA para desglosar este pendiente!</p>
                     )}
                  </CollapsibleContent>
                </CardContent>
              </Card>
            </Collapsible>
          )
        })}
      </div>
    </div>
  )
}
