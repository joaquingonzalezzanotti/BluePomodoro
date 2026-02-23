
"use client"

import * as React from "react"
import { Timer as TimerIcon, Play, Pause, RotateCcw, Coffee, Settings2, Check, Flame } from "lucide-react"
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

  // Generar marcadores analógicos sutiles
  const markers = Array.from({ length: 60 }, (_, i) => (
    <div
      key={i}
      className={cn(
        "absolute w-0.5 h-2 rounded-full transition-all duration-700",
        i % 5 === 0 ? "h-3.5 w-1 opacity-60" : "opacity-20",
        (i / 60) * 100 < progress ? "bg-primary" : "bg-slate-300"
      )}
      style={{
        transform: `rotate(${i * 6}deg) translateY(-85px)`,
        transformOrigin: "center"
      }}
    />
  ))

  return (
    <div className={cn("flex flex-col items-center", large ? "scale-100" : "scale-75")}>
      <div className="relative w-64 h-64 flex items-center justify-center mb-8 group transition-transform duration-500 hover:scale-[1.02]">
        {/* Marcadores Analógicos */}
        <div className="absolute inset-0 flex items-center justify-center">
          {markers}
        </div>
        
        {/* Anillo de progreso */}
        <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none drop-shadow-sm">
          <circle cx="128" cy="128" r="105" fill="transparent" stroke="hsl(var(--muted)/0.1)" strokeWidth="4" />
          <circle
            cx="128"
            cy="128"
            r="105"
            fill="transparent"
            stroke={mode === "work" ? "hsl(var(--primary))" : (isLongBreakMode ? "hsl(var(--chart-4))" : "hsl(var(--accent))")}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 105}
            strokeDashoffset={2 * Math.PI * 105 * (1 - progress / 100)}
            className="transition-all duration-1000 ease-linear"
          />
        </svg>

        <div className="flex flex-col items-center z-10 animate-in fade-in zoom-in duration-700">
           <div className="text-5xl font-black font-mono tracking-tighter text-slate-900">
            {formatTime(timeLeft)}
          </div>
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/40 mt-1">
            {mode === "work" ? "Enfoque" : (isLongBreakMode ? "Gran Descanso" : "Descanso")}
          </div>
        </div>
      </div>

      <div className="flex gap-6 items-center">
        <Button
          size="lg"
          variant={isActive ? "outline" : "default"}
          className={cn(
            "rounded-2xl w-16 h-16 p-0 shadow-xl border-none transition-all hover:scale-110 active:scale-95",
            !isActive && "bg-primary text-white"
          )}
          onClick={toggleTimer}
        >
          {isActive ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 fill-current" />}
        </Button>
        <div className="flex gap-2">
           <Button size="icon" variant="ghost" className="rounded-xl w-10 h-10 bg-slate-100/50 hover:bg-slate-200" onClick={resetTimer}>
              <RotateCcw className="h-5 w-5 text-muted-foreground" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-slate-100/50 hover:bg-slate-200"><Settings2 className="h-5 w-5 text-muted-foreground" /></Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 rounded-2xl p-6 shadow-2xl border-none">
                <div className="space-y-4">
                  <h4 className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Preferencias</h4>
                  <div className="grid gap-2">
                    <Label className="text-[9px] font-black uppercase opacity-60">Focus (min)</Label>
                    <Input type="number" value={localWork} onChange={(e) => setLocalWork(e.target.value)} className="rounded-xl border-none bg-muted/30 h-9 text-sm" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-[9px] font-black uppercase opacity-60">Break (min)</Label>
                    <Input type="number" value={localBreak} onChange={(e) => setLocalBreak(e.target.value)} className="rounded-xl border-none bg-muted/30 h-9 text-sm" />
                  </div>
                  <Button onClick={handleApplyChanges} className="w-full rounded-xl font-black h-10 shadow-lg shadow-primary/10">Aplicar</Button>
                </div>
              </PopoverContent>
            </Popover>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-6 px-5 py-2.5 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm animate-in slide-in-from-bottom-2 duration-700">
        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-muted-foreground/80">
          <Flame className="h-3.5 w-3.5 text-orange-500" /> Sprints: {sessionsCompleted}
        </div>
        <div className="w-px h-3 bg-slate-200" />
        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-muted-foreground/80">
          <TimerIcon className="h-3.5 w-3.5 text-primary" /> {workMinutes}m / {breakMinutes}m
        </div>
      </div>
    </div>
  )
}
