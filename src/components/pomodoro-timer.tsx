"use client"

import * as React from "react"
import { Play, Pause, RotateCcw, Settings2, Flame } from "lucide-react"
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
    ? "text-slate-900" 
    : (isLongBreakMode ? "text-purple-600" : "text-primary")

  return (
    <div className={cn("flex flex-col items-center w-full max-w-md mx-auto", large ? "scale-105" : "scale-90")}>
      <div className="relative w-72 h-72 flex items-center justify-center mb-8">
        {/* Hyper-Modern Glow Ring */}
        <div className={cn(
          "absolute inset-0 rounded-full blur-[40px] opacity-20 transition-all duration-1000",
          isActive ? "scale-110 opacity-40 pulse-glow" : "scale-100",
          mode === "work" ? "bg-primary" : "bg-accent"
        )} />

        {/* Outer Ring (Static) */}
        <div className="absolute inset-0 border-[2px] border-slate-100 rounded-full" />

        {/* Progress Ring (Modern Slim) */}
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle
            cx="144"
            cy="144"
            r="138"
            fill="transparent"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 138}
            strokeDashoffset={2 * Math.PI * 138 * (1 - progress / 100)}
            className={cn(
              "transition-all duration-1000 ease-linear",
              mode === "work" ? "text-primary" : "text-accent"
            )}
          />
        </svg>

        <div className="flex flex-col items-center z-10">
          <div className={cn(
            "text-7xl font-black font-mono tracking-tight transition-all duration-500",
            colorClass,
            isActive && "drop-shadow-2xl"
          )}>
            {formatTime(timeLeft)}
          </div>
          <div className="mt-4 flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 text-white shadow-lg">
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">
              {mode === "work" ? "FOCUS MODE" : "REST TIME"}
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
                <h4 className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Ajustes</h4>
                <div className="grid gap-2">
                  <Label className="text-[9px] font-black uppercase opacity-60">Tiempo Focus</Label>
                  <Input type="number" value={localWork} onChange={(e) => setLocalWork(e.target.value)} className="rounded-xl border-none bg-muted/30 h-10 font-bold" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-[9px] font-black uppercase opacity-60">Tiempo Break</Label>
                  <Input type="number" value={localBreak} onChange={(e) => setLocalBreak(e.target.value)} className="rounded-xl border-none bg-muted/30 h-10 font-bold" />
                </div>
                <Button onClick={handleApplyChanges} className="w-full rounded-xl font-black h-12">GUARDAR</Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="mt-12 flex items-center justify-center gap-8 w-full">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 font-black text-2xl text-slate-900">
             <Flame className="h-5 w-5 text-orange-500 fill-orange-500" />
             {sessionsCompleted}
          </div>
          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-1">Sesiones</span>
        </div>
        <div className="w-px h-8 bg-slate-100" />
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 font-black text-2xl text-slate-900">
             {workMinutes}
             <span className="text-xs text-muted-foreground">min</span>
          </div>
          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-1">Ritmo</span>
        </div>
      </div>

      <style jsx global>{`
        @keyframes pulse-glow {
          0% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.05); }
          100% { opacity: 0.2; transform: scale(1); }
        }
        .pulse-glow {
          animation: pulse-glow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
