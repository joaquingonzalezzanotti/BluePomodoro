
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
    : (isLongBreakMode ? "text-primary" : "text-accent")

  return (
    <div className={cn(
      "flex flex-col items-center w-full max-w-lg mx-auto transition-all duration-700",
      large ? "scale-110 py-12" : "scale-100"
    )}>
      {/* Timer Display Circle */}
      <div className={cn(
        "relative flex items-center justify-center mb-16 transition-all duration-500",
        large ? "w-96 h-96" : "w-80 h-80"
      )}>
        {/* Glow Effect */}
        <div className={cn(
          "absolute inset-0 rounded-full blur-[60px] opacity-10 transition-all duration-1000",
          isActive ? "scale-125 opacity-30 pulse-glow" : "scale-100",
          mode === "work" ? "bg-primary" : "bg-accent"
        )} />

        {/* Outer Ring Background */}
        <div className="absolute inset-0 border-[3px] border-slate-100 rounded-full" />

        {/* Progress Ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle
            cx={large ? "192" : "160"}
            cy={large ? "192" : "160"}
            r={large ? "188" : "156"}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * (large ? 188 : 156)}
            strokeDashoffset={2 * Math.PI * (large ? 188 : 156) * (1 - progress / 100)}
            className={cn(
              "transition-all duration-1000 ease-linear",
              mode === "work" ? "text-primary" : "text-accent"
            )}
          />
        </svg>

        <div className="flex flex-col items-center z-10">
          <div className={cn(
            "font-black font-mono tracking-tighter transition-all duration-500 leading-none",
            large ? "text-8xl md:text-9xl" : "text-7xl md:text-8xl",
            colorClass,
            isActive && "drop-shadow-[0_10px_30px_rgba(0,0,0,0.1)]"
          )}>
            {formatTime(timeLeft)}
          </div>
          <div className={cn(
            "mt-6 flex items-center gap-2 px-6 py-2 rounded-full shadow-lg transition-all",
            mode === "work" ? "bg-slate-900 text-white" : "bg-accent text-white"
          )}>
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">
              {mode === "work" ? "MODO ENFOQUE" : "DESCANSO"}
            </span>
          </div>
        </div>
      </div>

      {/* Control Buttons Group */}
      <div className="flex gap-6 items-center">
        <Button
          size="lg"
          onClick={toggleTimer}
          className={cn(
            "rounded-3xl h-20 w-40 font-black text-xl shadow-2xl transition-all hover:scale-105 active:scale-95",
            isActive ? "bg-slate-800 text-white" : "bg-primary text-white"
          )}
        >
          {isActive ? <Pause className="h-8 w-8 mr-2" /> : <Play className="h-8 w-8 mr-2 fill-current" />}
          {isActive ? "PAUSA" : "INICIAR"}
        </Button>
        
        <div className="flex gap-3">
          <Button size="icon" variant="outline" className="rounded-2xl h-20 w-20 border-2 border-slate-100 hover:bg-slate-50 transition-all" onClick={resetTimer}>
            <RotateCcw className="h-7 w-7 text-slate-400" />
          </Button>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-2xl h-20 w-20 border-2 border-slate-100 hover:bg-slate-50 transition-all">
                <Settings2 className="h-7 w-7 text-slate-400" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 rounded-[2.5rem] p-8 shadow-2xl border-none" align="end">
              <div className="space-y-6">
                <div>
                  <h4 className="font-black text-[10px] uppercase tracking-widest text-primary mb-1">Ajustes Rápidos</h4>
                  <p className="text-[10px] text-muted-foreground font-medium">Personaliza tus intervalos.</p>
                </div>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase opacity-60">Tiempo Focus (min)</Label>
                    <Input type="number" value={localWork} onChange={(e) => setLocalWork(e.target.value)} className="rounded-xl border-none bg-muted/40 h-12 font-bold px-4" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase opacity-60">Tiempo Break (min)</Label>
                    <Input type="number" value={localBreak} onChange={(e) => setLocalBreak(e.target.value)} className="rounded-xl border-none bg-muted/40 h-12 font-bold px-4" />
                  </div>
                </div>
                <Button onClick={handleApplyChanges} className="w-full rounded-2xl font-black h-14 shadow-lg shadow-primary/20">GUARDAR CAMBIOS</Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Sessions Summary */}
      <div className="mt-16 flex items-center justify-center gap-12 w-full max-w-xs">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 font-black text-3xl text-slate-900">
             <Flame className="h-6 w-6 text-orange-500 fill-orange-500" />
             {sessionsCompleted}
          </div>
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-2 opacity-50">Sesiones</span>
        </div>
        <div className="w-px h-10 bg-slate-100" />
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 font-black text-3xl text-slate-900">
             {workMinutes}
             <span className="text-sm text-muted-foreground ml-1">min</span>
          </div>
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-2 opacity-50">Ritmo</span>
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
