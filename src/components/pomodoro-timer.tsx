
"use client"

import * as React from "react"
import { Timer as TimerIcon, Play, Pause, RotateCcw, Settings2, Flame } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

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
  large?: boolean
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
  large = false
}: PomodoroTimerProps) {
  const [localWork, setLocalWork] = React.useState(workMinutes.toString())
  const [localBreak, setLocalBreak] = React.useState(breakMinutes.toString())

  React.useEffect(() => { setLocalWork(workMinutes.toString()) }, [workMinutes])
  React.useEffect(() => { setLocalBreak(breakMinutes.toString()) }, [breakMinutes])

  const isLongBreakMode = mode === "break" && sessionsCompleted > 0 && sessionsCompleted % 4 === 0
  
  const initialTime = mode === "work" 
    ? workMinutes * 60 
    : (isLongBreakMode ? 20 * 60 : breakMinutes * 60)
    
  const progress = ((initialTime - timeLeft) / initialTime) * 100

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleApplyChanges = () => {
    const w = parseInt(localWork); const b = parseInt(localBreak)
    if (!isNaN(w) && w > 0) setWorkMinutes(w)
    if (!isNaN(b) && b > 0) setBreakMinutes(b)
  }

  const colorClass = mode === "work" 
    ? "text-primary" 
    : (isLongBreakMode ? "text-purple-500" : "text-accent")

  const strokeColor = mode === "work" 
    ? "hsl(var(--primary))" 
    : (isLongBreakMode ? "hsl(262, 83%, 58%)" : "hsl(var(--accent))")

  return (
    <div className={cn("flex flex-col items-center w-full max-w-md mx-auto", large ? "scale-100" : "scale-90")}>
      <div className="relative w-72 h-72 flex items-center justify-center mb-8">
        {/* Glow Effect Background */}
        <div className={cn(
          "absolute inset-0 rounded-full blur-3xl opacity-20 transition-all duration-1000",
          isActive ? "scale-110 opacity-30" : "scale-100",
          mode === "work" ? "bg-primary" : "bg-accent"
        )} />

        {/* Outer Ring (Static) */}
        <div className="absolute inset-0 border-[10px] border-slate-100 rounded-full" />

        {/* Progress Ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle
            cx="144"
            cy="144"
            r="134"
            fill="transparent"
            stroke={strokeColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 134}
            strokeDashoffset={2 * Math.PI * 134 * (1 - progress / 100)}
            className={cn(
              "transition-all duration-1000 ease-linear",
              isActive && "drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]"
            )}
          />
        </svg>

        <div className="flex flex-col items-center z-10">
          <div className={cn(
            "text-6xl font-black font-mono tracking-tighter mb-1 transition-colors duration-500",
            colorClass
          )}>
            {formatTime(timeLeft)}
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200">
            <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", mode === "work" ? "bg-primary" : "bg-accent")} />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              {mode === "work" ? "Enfoque" : "Descanso"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <Button
          size="lg"
          onClick={toggleTimer}
          className={cn(
            "rounded-2xl h-16 w-32 font-black text-lg shadow-xl transition-all hover:scale-105 active:scale-95",
            isActive ? "bg-slate-900 text-white" : "bg-primary text-white"
          )}
        >
          {isActive ? <Pause className="h-6 w-6 mr-2" /> : <Play className="h-6 w-6 mr-2 fill-current" />}
          {isActive ? "PAUSA" : "INICIAR"}
        </Button>
        
        <div className="flex gap-2">
          <Button size="icon" variant="outline" className="rounded-xl h-16 w-16 border-2" onClick={resetTimer}>
            <RotateCcw className="h-6 w-6 text-slate-500" />
          </Button>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-xl h-16 w-16 border-2">
                <Settings2 className="h-6 w-6 text-slate-500" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 rounded-3xl p-6 shadow-2xl border-none" align="end">
              <div className="space-y-4">
                <h4 className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Preferencias de Sesión</h4>
                <div className="grid gap-2">
                  <Label className="text-[9px] font-black uppercase opacity-60">Tiempo Focus (min)</Label>
                  <Input type="number" value={localWork} onChange={(e) => setLocalWork(e.target.value)} className="rounded-xl border-none bg-muted/30 h-10 font-bold" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-[9px] font-black uppercase opacity-60">Tiempo Break (min)</Label>
                  <Input type="number" value={localBreak} onChange={(e) => setLocalBreak(e.target.value)} className="rounded-xl border-none bg-muted/30 h-10 font-bold" />
                </div>
                <Button onClick={handleApplyChanges} className="w-full rounded-xl font-black h-12">GUARDAR CAMBIOS</Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 w-full">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center">
          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider mb-1">Sesiones</span>
          <div className="flex items-center gap-1.5 font-black text-xl">
             <Flame className="h-5 w-5 text-orange-500 fill-orange-500" />
             {sessionsCompleted}
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center">
          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider mb-1">Ratio</span>
          <div className="flex items-center gap-1.5 font-black text-xl">
             <TimerIcon className="h-5 w-5 text-primary" />
             {workMinutes}m
          </div>
        </div>
      </div>
    </div>
  )
}
