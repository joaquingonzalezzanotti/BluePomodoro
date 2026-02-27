
"use client"

import * as React from "react"
import { Play, Pause, RotateCcw, Settings2, Flame } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { getSessionDurationSec, isLongBreakMode, type PomodoroRules } from "@/pomodoro/logic"
import { useSupabase, useUser } from "@/supabase"
import { useSupabaseQuery } from "@/supabase/hooks"
import type { Task } from "@/supabase/types"

interface PomodoroTimerProps {
  timeLeft: number
  isActive: boolean
  mode: "work" | "break"
  sessionsCompleted: number
  toggleTimer: () => void
  resetTimer: () => void
  workMinutes: number
  setWorkMinutes: (m: number) => void
  breakMinutes: number
  setBreakMinutes: (m: number) => void
  longBreakAfter?: number
  longBreakThreshold?: number
  longBreakMinutesHigh?: number
  longBreakMinutesLow?: number
  large?: boolean
  activeTaskId?: string | null
  setActiveTaskId?: (id: string | null) => void
}

export function PomodoroTimer({
  timeLeft,
  isActive,
  mode,
  sessionsCompleted,
  toggleTimer,
  resetTimer,
  workMinutes,
  setWorkMinutes,
  breakMinutes,
  setBreakMinutes,
  longBreakAfter = 4,
  longBreakThreshold = 40,
  longBreakMinutesHigh = 20,
  longBreakMinutesLow = 15,
  large = false,
  activeTaskId = null,
  setActiveTaskId
}: PomodoroTimerProps) {
  const [localWork, setLocalWork] = React.useState(workMinutes.toString())
  const [localBreak, setLocalBreak] = React.useState(breakMinutes.toString())
  const supabase = useSupabase()
  const { user } = useUser()

  React.useEffect(() => { setLocalWork(workMinutes.toString()) }, [workMinutes])
  React.useEffect(() => { setLocalBreak(breakMinutes.toString()) }, [breakMinutes])

  const rules = React.useMemo<PomodoroRules>(() => ({
    workMinutes,
    breakMinutes,
    longBreakAfter,
    longBreakThreshold,
    longBreakMinutesHigh,
    longBreakMinutesLow,
  }), [workMinutes, breakMinutes, longBreakAfter, longBreakThreshold, longBreakMinutesHigh, longBreakMinutesLow])

  const longBreakActive = isLongBreakMode(mode, sessionsCompleted, longBreakAfter)
  const initialTime = getSessionDurationSec(mode, rules, sessionsCompleted)

  const progress = Math.min(100, Math.max(0, ((initialTime - Math.max(0, timeLeft)) / initialTime) * 100))

  const formatTime = (seconds: number) => {
    const isNegative = seconds < 0
    const abs = Math.abs(seconds)
    const mins = Math.floor(abs / 60)
    const secs = abs % 60
    const sign = isNegative ? "-" : ""
    return `${sign}${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleApplyChanges = () => {
    const w = parseInt(localWork); const b = parseInt(localBreak)
    if (!isNaN(w) && w > 0) setWorkMinutes(w)
    if (!isNaN(b) && b > 0) setBreakMinutes(b)
  }

  const isOvertime = mode === "break" && timeLeft < 0
  const colorClass = isOvertime
    ? "text-red-500"
    : mode === "work" 
      ? "text-slate-900" 
      : (longBreakActive ? "text-primary" : "text-accent")

  const primaryLabel = isOvertime ? "FIN DESCANSO" : (isActive ? "PAUSA" : "INICIAR")

  const { data: tasks } = useSupabaseQuery<Task[]>(
    async (client) => {
      if (!user) return []
      const { data, error } = await client
        .from("tasks")
        .select("id,title,status")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
      if (error) throw error
      return (data ?? []) as Task[]
    },
    [supabase, user?.id],
    user ? { table: "tasks", filter: `user_id=eq.${user.id}` } : null
  )

  const activeTaskLabel = React.useMemo(() => {
    if (!tasks || !activeTaskId) return null
    return tasks.find(task => task.id === activeTaskId)?.title ?? null
  }, [tasks, activeTaskId])

  return (
    <div className={cn(
      "w-full transition-all duration-700",
      large ? "flex flex-col items-center py-8 w-full" : "flex flex-col xl:items-center"
    )}>
      {setActiveTaskId && (
        <div className={cn(
          "w-full flex items-center justify-center mb-6",
          large ? "max-w-6xl" : "xl:mb-4"
        )}>
          <div className={cn(
            "flex items-center gap-3 rounded-2xl border border-slate-100 bg-white/80 px-4 py-2 shadow-sm",
            large ? "w-full max-w-2xl justify-center" : "w-full max-w-md"
          )}>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tarea activa</span>
            <Select value={activeTaskId ?? "none"} onValueChange={(value) => setActiveTaskId(value === "none" ? null : value)}>
              <SelectTrigger className="h-9 w-[220px] rounded-xl bg-white border-slate-100 text-xs font-bold">
                <SelectValue placeholder="Sin tarea" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                <SelectItem value="none">Sin tarea</SelectItem>
                {tasks?.map(task => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeTaskLabel && (
              <span className="text-[10px] font-black uppercase tracking-wide text-primary bg-primary/10 px-2 py-1 rounded-full">
                Vinculada
              </span>
            )}
          </div>
        </div>
      )}

      {/* Contenedor Adaptativo Principal */}
      <div className={cn(
        "flex w-full items-center",
        large ? "flex-col items-center gap-8" : "flex-col xl:flex-col lg:flex-row md:flex-row flex-row gap-4 xl:gap-0"
      )}>
        
        {/* Visualización del Tiempo (Reloj) */}
        <div className={cn(
          "relative flex items-center justify-center transition-all duration-500 shrink-0",
          large ? "w-72 h-72 sm:w-80 sm:h-80 lg:w-96 lg:h-96 mb-8 lg:mb-0" : "xl:w-80 xl:h-80 xl:mb-6 w-32 h-32 lg:w-40 lg:h-40 xl:scale-100"
        )}>
          {/* Glow Effect */}
          <div className={cn(
            "absolute inset-0 rounded-full blur-[40px] opacity-10 transition-all duration-1000",
            isActive ? "scale-125 opacity-30 pulse-glow" : "scale-100",
            mode === "work" ? "bg-primary" : "bg-accent"
          )} />

          {/* Outer Ring Background */}
          <div className="absolute inset-0 border-[2px] border-slate-100 rounded-full" />

          {/* Progress Ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="48%"
              fill="transparent"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="301%"
              strokeDashoffset={`${301 * (1 - progress / 100)}%`}
              className={cn(
                "transition-all duration-1000 ease-linear",
                mode === "work" ? "text-primary" : "text-accent"
              )}
            />
          </svg>

          <div className="flex flex-col items-center z-10">
            <div className={cn(
              "font-black font-mono tracking-tighter transition-all duration-500 leading-none",
              large ? "text-8xl md:text-9xl" : "xl:text-7xl lg:text-4xl text-3xl",
              colorClass
            )}>
              {formatTime(timeLeft)}
            </div>
            {/* Solo mostramos la etiqueta de modo si es lo suficientemente grande */}
            <div className={cn(
              "mt-2 xl:flex hidden items-center gap-2 px-3 py-1 rounded-full shadow-sm",
              mode === "work" ? "bg-slate-900 text-white" : "bg-accent text-white"
            )}>
              <span className="text-[8px] font-black uppercase tracking-[0.2em]">
                {mode === "work" ? "ENFOQUE" : "DESCANSO"}
              </span>
            </div>
          </div>
        </div>

        {/* Controles del Temporizador */}
        <div className={cn(
          "flex items-center gap-3 transition-all flex-1 justify-center",
          large ? "gap-6 w-full" : "xl:gap-6 lg:gap-3 gap-2"
        )}>
          <Button
            size="lg"
            onClick={toggleTimer}
            className={cn(
              "font-black shadow-xl transition-all hover:scale-105 active:scale-95",
              large ? "h-20 w-40 text-xl rounded-3xl" : "xl:h-20 xl:w-40 xl:text-xl xl:rounded-3xl h-12 px-6 rounded-2xl text-sm"
            )}
          >
            {isActive ? <Pause className="h-5 w-5 xl:h-8 xl:w-8 mr-2" /> : <Play className="h-5 w-5 xl:h-8 xl:w-8 mr-2 fill-current" />}
            {primaryLabel}
          </Button>
          
          <div className="flex gap-2 xl:gap-3">
            <Button 
              size="icon" 
              variant="outline" 
              className={cn(
                "border-2 border-slate-100 hover:bg-slate-50 transition-all",
                large ? "h-20 w-20 rounded-2xl" : "xl:h-20 xl:w-20 xl:rounded-2xl h-12 w-12 rounded-xl"
              )} 
              onClick={resetTimer}
            >
              <RotateCcw className="h-5 w-5 xl:h-7 xl:w-7 text-slate-400" />
            </Button>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className={cn(
                    "border-2 border-slate-100 hover:bg-slate-50 transition-all",
                    large ? "h-20 w-20 rounded-2xl" : "xl:h-20 xl:w-20 xl:rounded-2xl h-12 w-12 rounded-xl"
                  )}
                >
                  <Settings2 className="h-5 w-5 xl:h-7 xl:w-7 text-slate-400" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 rounded-[2.5rem] p-8 shadow-2xl border-none" align="end">
                <div className="space-y-6">
                  <div>
                    <h4 className="font-black text-[10px] uppercase tracking-widest text-primary mb-1">Ajustes rapidos</h4>
                    <p className="text-[10px] text-muted-foreground font-medium">Personaliza tus intervalos.</p>
                  </div>
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase opacity-60">Enfoque (min)</Label>
                      <Input type="number" value={localWork} onChange={(e) => setLocalWork(e.target.value)} className="rounded-xl border-none bg-muted/40 h-12 font-bold px-4" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase opacity-60">Descanso corto (min)</Label>
                      <Input type="number" value={localBreak} onChange={(e) => setLocalBreak(e.target.value)} className="rounded-xl border-none bg-muted/40 h-12 font-bold px-4" />
                    </div>
                  </div>
                  <Button onClick={handleApplyChanges} className="w-full rounded-2xl font-black h-14 shadow-lg shadow-primary/20">GUARDAR CAMBIOS</Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Resumen de Sesiones / Estadísticas */}
        <div className={cn(
          "flex items-center justify-center transition-all",
          large ? "mt-4 gap-8" : "xl:mt-6 xl:gap-12 lg:gap-6 gap-4 xl:w-full lg:w-auto mt-0 ml-auto hidden md:flex"
        )}>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5 font-black text-xl xl:text-3xl text-slate-900 leading-none">
               <Flame className="h-4 w-4 xl:h-6 xl:w-6 text-orange-500 fill-orange-500" />
               {sessionsCompleted}
            </div>
            <span className="text-[8px] xl:text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1 opacity-50">Sesiones</span>
          </div>
          <div className="w-px h-8 xl:h-10 bg-slate-100" />
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 font-black text-xl xl:text-3xl text-slate-900 leading-none">
               {workMinutes}
               <span className="text-[10px] xl:text-sm text-muted-foreground ml-1">min</span>
            </div>
            <span className="text-[8px] xl:text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1 opacity-50">Ritmo</span>
          </div>
        </div>

      </div>

      <style jsx global>{`
        @keyframes pulse-glow {
          0% { opacity: 0.1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.1); }
          100% { opacity: 0.1; transform: scale(1); }
        }
        .pulse-glow {
          animation: pulse-glow 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
