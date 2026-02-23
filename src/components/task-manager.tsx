
"use client"

import * as React from "react"
import { 
  Plus, 
  Trash2, 
  Zap,
  Calendar,
  Play,
  Briefcase
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { collection, doc, serverTimestamp, query, orderBy } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface TaskManagerProps {
  onTaskSelect?: (id: string) => void
  activeTaskId?: string | null
}

export function TaskManager({ onTaskSelect, activeTaskId }: TaskManagerProps) {
  const [newTaskText, setNewTaskText] = React.useState("")
  const [selectedProject, setSelectedProject] = React.useState<string>("ninguno")
  const [deadline, setDeadline] = React.useState("")
  const { toast } = useToast()
  const db = useFirestore()
  const { user } = useUser()

  const tasksQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "usuarios", user.uid, "tareas"), orderBy("fechaCreacion", "desc"))
  }, [db, user])

  const projectsQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "usuarios", user.uid, "proyectos"), orderBy("nombre", "asc"))
  }, [db, user])

  const { data: tasks, isLoading } = useCollection(tasksQuery)
  const { data: projects } = useCollection(projectsQuery)

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
      proyectoId: selectedProject === "ninguno" ? null : selectedProject,
      fechaVencimiento: deadline || null,
      fechaCreacion: serverTimestamp(),
      subtareas: []
    })
    setNewTaskText("")
    setDeadline("")
    toast({ title: "Tarea creada" })
  }

  const deleteTask = (id: string) => {
    if (!user || !db) return
    deleteDocumentNonBlocking(doc(db, "usuarios", user.uid, "tareas", id))
  }

  const getProjectName = (id: string) => {
    const p = projects?.find(proj => proj.id === id)
    return p ? p.nombre : "Sin Proyecto"
  }

  if (isLoading) return <div className="py-20 text-center animate-pulse">Cargando tareas...</div>

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-primary/5 space-y-4">
        <div className="flex gap-2">
          <Input 
            placeholder="¿Qué tienes pendiente?" 
            value={newTaskText} 
            onChange={(e) => setNewTaskText(e.target.value)} 
            className="h-12 rounded-2xl bg-muted/20 border-none shadow-none"
          />
          <Button onClick={addTask} className="h-12 rounded-2xl px-6 bg-primary shadow-lg shadow-primary/20"><Plus className="h-5 w-5" /></Button>
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-[180px] h-9 rounded-xl border-none bg-muted/30 text-xs font-bold">
                <SelectValue placeholder="Vincular a Proyecto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ninguno">Sin Proyecto</SelectItem>
                {projects?.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input 
              type="date" 
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="h-9 rounded-xl border-none bg-muted/30 text-xs font-bold w-[160px]"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {tasks?.map(task => (
          <Card key={task.id} className={cn("border-none shadow-sm transition-all hover:shadow-md", activeTaskId === task.id ? "ring-2 ring-primary bg-primary/5" : "bg-white")}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <Button 
                  variant={activeTaskId === task.id ? "default" : "ghost"} 
                  size="icon" 
                  className="rounded-full h-10 w-10 shrink-0"
                  onClick={() => onTaskSelect?.(task.id)}
                >
                  <Play className={cn("h-5 w-5", activeTaskId === task.id ? "fill-current" : "")} />
                </Button>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm truncate">{task.titulo}</h4>
                  <div className="flex flex-wrap items-center gap-3 mt-1">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-black uppercase">
                      <Zap className="h-3 w-3 text-orange-500" />
                      {task.completadosPomodoros || 0} Pomos
                    </div>
                    {task.proyectoId && (
                      <Badge variant="outline" className="text-[9px] h-4 bg-primary/5 border-primary/10">
                        {getProjectName(task.proyectoId)}
                      </Badge>
                    )}
                    {task.fechaVencimiento && (
                      <Badge variant="secondary" className="text-[9px] h-4">
                        Vence: {task.fechaVencimiento}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => deleteTask(task.id)} className="text-muted-foreground/30 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
            </CardContent>
          </Card>
        ))}
        {tasks?.length === 0 && (
          <div className="py-20 text-center text-muted-foreground italic text-sm">
            Empieza por añadir tu primera tarea...
          </div>
        )}
      </div>
    </div>
  )
}
