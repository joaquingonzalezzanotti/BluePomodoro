
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
  Play
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
import { cn } from "@/lib/utils"

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
  }

  const deleteTask = (id: string) => {
    if (!user || !db) return
    deleteDocumentNonBlocking(doc(db, "usuarios", user.uid, "tareas", id))
  }

  if (isLoading) return <div className="py-20 text-center animate-pulse">Cargando tareas...</div>

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Input 
          placeholder="Añadir una tarea clave..." 
          value={newTaskText} 
          onChange={(e) => setNewTaskText(e.target.value)} 
          className="h-12 rounded-2xl bg-white border-primary/10 shadow-sm"
        />
        <Button onClick={addTask} className="h-12 rounded-2xl px-6 bg-primary shadow-lg shadow-primary/20"><Plus className="h-5 w-5" /></Button>
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
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-black uppercase">
                      <Zap className="h-3 w-3 text-orange-500" />
                      {task.completadosPomodoros || 0} / {task.esfuerzoEstimadoPomodoros} Pomos
                    </div>
                    <Badge variant="secondary" className="text-[9px] h-4">{task.prioridad}</Badge>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => deleteTask(task.id)} className="text-muted-foreground/30 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
