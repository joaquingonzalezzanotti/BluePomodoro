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
  AlertCircle,
  Zap,
  Calendar
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { aiAssistedTaskBreakdown } from "@/ai/flows/ai-assisted-task-breakdown-flow"
import { useToast } from "@/hooks/use-toast"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"

interface SubTask {
  id: string
  text: string
  completed: boolean
}

interface Task {
  id: string
  text: string
  completed: boolean
  priority: "High" | "Medium" | "Low"
  deadline: string
  effort: "High" | "Medium" | "Low"
  subTasks: SubTask[]
  expanded?: boolean
}

export function TaskManager() {
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [newTaskText, setNewTaskText] = React.useState("")
  const [isBreakingDown, setIsBreakingDown] = React.useState<string | null>(null)
  const { toast } = useToast()

  const addTask = () => {
    if (!newTaskText.trim()) return
    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      text: newTaskText,
      completed: false,
      priority: "Medium",
      deadline: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      effort: "Medium",
      subTasks: [],
      expanded: false
    }
    setTasks([newTask, ...tasks])
    setNewTaskText("")
  }

  const toggleTask = (taskId: string) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t))
  }

  const deleteTask = (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId))
  }

  const toggleSubTask = (taskId: string, subTaskId: string) => {
    setTasks(tasks.map(t => {
      if (t.id === taskId) {
        const updatedSubTasks = t.subTasks.map(st => 
          st.id === subTaskId ? { ...st, completed: !st.completed } : st
        )
        const allCompleted = updatedSubTasks.every(st => st.completed)
        return { ...t, subTasks: updatedSubTasks, completed: allCompleted && updatedSubTasks.length > 0 }
      }
      return t
    }))
  }

  const breakdownTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    setIsBreakingDown(taskId)
    try {
      const result = await aiAssistedTaskBreakdown({ largeTaskDescription: task.text })
      const subTasks: SubTask[] = result.subTasks.map(text => ({
        id: Math.random().toString(36).substr(2, 9),
        text,
        completed: false
      }))
      
      setTasks(tasks.map(t => t.id === taskId ? { ...t, subTasks, expanded: true } : t))
      toast({ title: "Task Broken Down", description: `Added ${subTasks.length} sub-tasks for clarity.` })
    } catch (error) {
      toast({ variant: "destructive", title: "Breakdown Failed", description: "AI could not process this task." })
    } finally {
      setIsBreakingDown(null)
    }
  }

  const toggleExpand = (taskId: string) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, expanded: !t.expanded } : t))
  }

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-md overflow-hidden bg-white/50 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input 
              placeholder="What are you focusing on today?" 
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
              className="bg-white border-primary/20 focus-visible:ring-primary"
            />
            <Button onClick={addTask} className="bg-primary hover:bg-primary/80">
              <Plus className="h-4 w-4 mr-2" /> Add Task
            </Button>
          </div>
        </CardContent>
      </Card>

      <ScrollArea className="h-[600px] pr-4">
        <div className="space-y-4">
          {tasks.map((task) => (
            <Card key={task.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <button onClick={() => toggleTask(task.id)} className="mt-1">
                    {task.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className={`text-base font-semibold truncate ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                        {task.text}
                      </h4>
                      <div className="flex items-center gap-2">
                        <Badge variant={task.priority === "High" ? "destructive" : task.priority === "Medium" ? "default" : "secondary"}>
                          {task.priority}
                        </Badge>
                        <Button variant="ghost" size="icon" onClick={() => deleteTask(task.id)} className="h-8 w-8 text-destructive/50 hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {task.deadline}
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap className="h-3 w-3" /> {task.effort} effort
                      </span>
                    </div>

                    {task.subTasks.length > 0 && (
                      <div className="mt-2 mb-4">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span>Progress</span>
                          <span>{Math.round((task.subTasks.filter(s => s.completed).length / task.subTasks.length) * 100)}%</span>
                        </div>
                        <Progress value={(task.subTasks.filter(s => s.completed).length / task.subTasks.length) * 100} className="h-1.5" />
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-7 text-xs gap-1 border-primary/20 text-primary hover:bg-primary/10"
                        onClick={() => breakdownTask(task.id)}
                        disabled={isBreakingDown === task.id}
                      >
                        <Sparkles className={`h-3 w-3 ${isBreakingDown === task.id ? "animate-pulse" : ""}`} />
                        {isBreakingDown === task.id ? "Analyzing..." : "AI Breakdown"}
                      </Button>
                      {task.subTasks.length > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-xs gap-1"
                          onClick={() => toggleExpand(task.id)}
                        >
                          {task.expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          {task.subTasks.length} Steps
                        </Button>
                      )}
                    </div>

                    {task.expanded && task.subTasks.length > 0 && (
                      <div className="mt-4 pl-4 border-l-2 border-primary/20 space-y-2 animate-in slide-in-from-top-2 duration-200">
                        {task.subTasks.map(subTask => (
                          <div key={subTask.id} className="flex items-center gap-2 text-sm py-1">
                            <button onClick={() => toggleSubTask(task.id, subTask.id)}>
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
          ))}
          
          {tasks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <div className="p-4 bg-primary/10 rounded-full mb-4">
                <Plus className="h-10 w-10 text-primary/40" />
              </div>
              <p className="text-sm font-medium">No tasks yet. Start your journey by adding one!</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
