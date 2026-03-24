
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
  Minus,
  Target
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { useSupabase, useUser } from "@/supabase"
import { useSupabaseQuery } from "@/supabase/hooks"
import type { Task, Subject } from "@/supabase/types"
import { cn } from "@/lib/utils"
import { aiAssistedTaskBreakdown } from "@/ai/flows/ai-assisted-task-breakdown-flow"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface SubTask {
  id: string
  text: string
  completed: boolean
}

interface TaskManagerProps {
  onTaskSelect?: (id: string | null) => void
  activeTaskId?: string | null
  onlyActive?: boolean
}

const EMOJI_CHOICES = ["✨", "🧠", "📝", "🎯", "🚀", "📚", "💼", "🧹", "✅", "⚡", "🎧", "🧩"]

const stripLeadingEmoji = (title: string) => {
  const trimmed = title.trim()
  for (const emoji of EMOJI_CHOICES) {
    if (trimmed.startsWith(emoji)) {
      return trimmed.slice(emoji.length).trimStart()
    }
  }
  return trimmed
}

const getLeadingEmoji = (title: string) => {
  const trimmed = title.trim()
  for (const emoji of EMOJI_CHOICES) {
    if (trimmed.startsWith(emoji)) {
      return emoji
    }
  }
  return EMOJI_CHOICES[0]
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
  const [completedOpen, setCompletedOpen] = React.useState(false)
  
  const { toast } = useToast()
  const supabase = useSupabase()
  const { user } = useUser()

  const { data: tasks, isLoading } = useSupabaseQuery<Task[]>(
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

  const { data: materias } = useSupabaseQuery<Subject[]>(
    async (client) => {
      if (!user) return []
      const { data, error } = await client
        .from("subjects")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
      if (error) throw error
      return (data ?? []) as Subject[]
    },
    [supabase, user?.id],
    user ? { table: "subjects", filter: `user_id=eq.${user.id}` } : null
  )

  const toggleExpand = (taskId: string) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }))
  }

  const addTask = async () => {
    if (!newTaskText.trim() || !user) return
    const { error } = await supabase.from("tasks").insert({
      user_id: user.id,
      subject_id: selectedMateriaId === "none" ? null : selectedMateriaId,
      title: newTaskText,
      status: "Pendiente",
      effort_estimated: 1,
      pomodoros_completed: 0,
      subtasks: [],
      created_at: new Date().toISOString(),
    })
    if (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo crear la tarea." })
      return
    }
    setNewTaskText("")
    toast({ title: "Tarea agregada" })
  }

  const handleAiBreakdown = async (taskId: string, description: string) => {
    if (!user) return
    setIsAiLoading(taskId)
    try {
      const result = await aiAssistedTaskBreakdown({ largeTaskDescription: description })
      
      const formattedSubTasks: SubTask[] = result.subTasks.map((st, idx) => ({
        id: `${Date.now()}-${idx}`,
        text: typeof st === "string" ? st : (st as any).text || String(st),
        completed: false,
      }))

      const { error } = await supabase
        .from("tasks")
        .update({
          subtasks: formattedSubTasks,
          effort_estimated: Math.max(1, Math.ceil(formattedSubTasks.length / 2)),
        })
        .eq("id", taskId)
      if (error) throw error

      toast({ title: "IA: Tarea desglosada", description: `Se han creado ${formattedSubTasks.length} subtareas.` })
      setExpandedTasks(prev => ({ ...prev, [taskId]: true }))
    } catch (error) {
      const message = (error as any)?.message || ""
      const description = message.includes("GEMINI_API_KEY")
        ? "Falta GEMINI_API_KEY en las variables de entorno."
        : "No se pudo desglosar la tarea."
      toast({ variant: "destructive", title: "Error IA", description })
    } finally {
      setIsAiLoading(null)
    }
  }

  const updateTaskTitle = async (taskId: string) => {
    if (!user || !editingText.trim()) return
    await supabase.from("tasks").update({ title: editingText }).eq("id", taskId)
    setEditingTaskId(null)
  }

  const updateTaskEmoji = async (taskId: string, currentTitle: string, emoji: string) => {
    if (!user) return
    const cleaned = stripLeadingEmoji(currentTitle)
    const nextTitle = cleaned ? `${emoji} ${cleaned}` : emoji
    await supabase.from("tasks").update({ title: nextTitle }).eq("id", taskId)
  }

  const updatePomodoros = async (taskId: string, current: number, delta: number) => {
    if (!user) return
    const newVal = Math.max(1, current + delta)
    await supabase.from("tasks").update({ effort_estimated: newVal }).eq("id", taskId)
  }

  const updateSubTaskText = async (taskId: string, subTasks: SubTask[], subId: string) => {
    if (!user || !editingSubText.trim()) return
    const newSubTasks = subTasks.map(st => st.id === subId ? { ...st, text: editingSubText } : st)
    await supabase.from("tasks").update({ subtasks: newSubTasks }).eq("id", taskId)
    setEditingSubTaskId(null)
  }

  const toggleSubTask = async (taskId: string, subTasks: SubTask[], subTaskId: string) => {
    if (!user) return
    const newSubTasks = subTasks.map(st =>
      st.id === subTaskId ? { ...st, completed: !st.completed } : st
    )
    await supabase.from("tasks").update({ subtasks: newSubTasks }).eq("id", taskId)
  }

  const deleteTask = async (id: string) => {
    if (!user) return
    await supabase.from("tasks").delete().eq("id", id)
  }

  const toggleComplete = async (taskId: string, currentStatus: string) => {
    if (!user) return
    const nextStatus = currentStatus === "Completada" ? "Pendiente" : "Completada"
    await supabase.from("tasks").update({ status: nextStatus }).eq("id", taskId)
  }

  const scopedTasks = onlyActive && activeTaskId
    ? (tasks?.filter(t => t.id === activeTaskId) ?? [])
    : (tasks ?? [])

  const activeTasks = scopedTasks.filter(task => task.status !== "Completada")
  const completedTasks = scopedTasks.filter(task => task.status === "Completada")

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
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={addTask} className="h-12 px-8 rounded-2xl font-bold shadow-lg shadow-primary/20">Añadir Tarea</Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {activeTasks.map(task => {
          const materia = materias?.find(m => m.id === task.subject_id)
          const rawSubTasks = task.subtasks || []
          const normalizedSubTasks: SubTask[] = rawSubTasks.map((st: any, i: number) => 
            typeof st === 'string' ? { id: `st-${i}`, text: st, completed: false } : st
          )

          const completedCount = normalizedSubTasks.filter(st => st.completed).length
          const totalCount = normalizedSubTasks.length
          const progressValue = totalCount > 0 ? (completedCount / totalCount) * 100 : 0
          const isExpanded = !!expandedTasks[task.id]
          const esfuerzo = task.effort_estimated || 1
          const displayEmoji = getLeadingEmoji(task.title)
          const displayTitle = stripLeadingEmoji(task.title)
          const isActiveTask = activeTaskId === task.id
          const handleSelectTask = () => {
            onTaskSelect?.(isActiveTask ? null : task.id)
          }
          const handleCardClick = (event: React.MouseEvent<HTMLDivElement>) => {
            const target = event.target as HTMLElement
            if (target.closest("button, a, input, textarea, select")) return
            handleSelectTask()
          }

          return (
            <Collapsible key={task.id} open={isExpanded} onOpenChange={() => toggleExpand(task.id)}>
              <Card className={cn("border-none shadow-sm transition-all rounded-[2rem] overflow-hidden bg-white", activeTaskId === task.id && "ring-2 ring-primary/40")}>
                <CardContent className="p-6" onClick={handleCardClick}>
                  {/* Layout de 2 Filas obligatorio */}
                  <div className="flex flex-col gap-4">
                    
                    {/* Fila 1 (Nombre de la Tarea) - Ocupa todo el ancho */}
                    <div className="flex items-center gap-4 w-full">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-full shrink-0 bg-slate-50 border border-slate-100 text-lg"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span>{displayEmoji}</span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-52 p-3 rounded-2xl" align="start">
                          <div className="grid grid-cols-6 gap-2">
                            {EMOJI_CHOICES.map((emoji) => (
                              <Button
                                key={emoji}
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-xl"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  updateTaskEmoji(task.id, task.title, emoji)
                                }}
                              >
                                <span className="text-lg">{emoji}</span>
                              </Button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>

                      <div className="flex-1 min-w-0 cursor-pointer" onClick={handleSelectTask}>
                        {editingTaskId === task.id ? (
                          <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                            <Input value={editingText} onChange={(e) => setEditingText(e.target.value)} className="h-8 text-sm font-black" autoFocus />
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => updateTaskTitle(task.id)}><Check className="h-4 w-4" /></Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group min-w-0">
                            <h4 className="text-lg font-black truncate leading-tight">{displayTitle || task.title}</h4>
                            <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0" onClick={(e) => { e.stopPropagation(); setEditingTaskId(task.id); setEditingText(task.title); }}><Edit2 className="h-3 w-3" /></Button>
                            {isActiveTask && (
                              <Badge className="bg-primary/10 text-primary border border-primary/20 text-[9px] font-black uppercase tracking-wide">Vinculada</Badge>
                            )}
                          </div>
                        )}
                        {materia && <span className="text-[10px] font-black uppercase text-primary/60 flex items-center gap-1 mt-1 truncate"><BookOpen className="h-3 w-3 shrink-0" /> {materia.name}</span>}
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn("h-10 w-10 rounded-full shrink-0 border-2", task.status === "Completada" ? "text-green-500 border-green-500" : "text-slate-200 border-slate-100")}
                        onClick={(e) => { e.stopPropagation(); toggleComplete(task.id, task.status); }}
                      >
                        <CheckCircle2 className="h-6 w-6" />
                      </Button>
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-9 w-9",
                            isActiveTask ? "text-primary bg-primary/10" : "text-slate-300 hover:text-primary"
                          )}
                          onClick={(e) => { e.stopPropagation(); handleSelectTask(); }}
                        >
                          <Target className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" disabled={isAiLoading === task.id} onClick={() => handleAiBreakdown(task.id, task.title)} className="h-9 w-9 text-primary hover:bg-primary/5"><Sparkles className={cn("h-4 w-4", isAiLoading === task.id && "animate-spin")} /></Button>
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

        {!onlyActive && completedTasks.length > 0 && (
          <Collapsible open={completedOpen} onOpenChange={setCompletedOpen}>
            <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden bg-white">
              <CardContent className="p-0">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-black text-slate-700">Completadas ({completedTasks.length})</span>
                    </div>
                    {completedOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="border-t border-slate-100">
                  <div className="divide-y divide-slate-50">
                    {completedTasks.map((task) => {
                      const materia = materias?.find(m => m.id === task.subject_id)
                      const displayEmoji = getLeadingEmoji(task.title)
                      const displayTitle = stripLeadingEmoji(task.title)
                      return (
                        <div key={task.id} className="flex items-center justify-between gap-3 px-6 py-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-400 line-through truncate">
                              {displayEmoji} {displayTitle || task.title}
                            </p>
                            {materia ? (
                              <p className="text-[10px] font-black uppercase text-slate-400 mt-1 truncate">{materia.name}</p>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 rounded-lg text-xs"
                              onClick={() => toggleComplete(task.id, task.status)}
                            >
                              Reabrir
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-300 hover:text-destructive"
                              onClick={() => deleteTask(task.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CollapsibleContent>
              </CardContent>
            </Card>
          </Collapsible>
        )}
      </div>
    </div>
  )
}
