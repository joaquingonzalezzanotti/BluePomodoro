
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

  const isLongBreakMode = mode === "break" && sessionsCompleted > 0 && sessionsCompleted % 3 === 0
  
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

  // Generar marcadores analógicos
  const markers = Array.from({ length: 60 }, (_, i) => (
    <div
      key={i}
      className={cn(
        "absolute w-1 h-3 rounded-full transition-colors duration-500",
        i % 5 === 0 ? "h-5 w-1.5" : "opacity-30",
        (i / 60) * 100 < progress ? "bg-primary" : "bg-slate-200"
      )}
      style={{
        transform: `rotate(${i * 6}deg) translateY(-118px)`,
        transformOrigin: "center"
      }}
    />
  ))

  return (
    <div className={cn("flex flex-col items-center", large ? "scale-[1.3] md:scale-[1.8]" : "w-full")}>
      <div className="relative w-80 h-80 flex items-center justify-center mb-10">
        {/* Marcadores Analógicos TDAH */}
        <div className="absolute inset-0 flex items-center justify-center">
          {markers}
        </div>
        
        {/* Anillo de progreso suave */}
        <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
          <circle cx="160" cy="160" r="140" fill="transparent" stroke="hsl(var(--muted)/0.3)" strokeWidth="4" />
          <circle
            cx="160"
            cy="160"
            r="140"
            fill="transparent"
            stroke={mode === "work" ? "hsl(var(--primary))" : (isLongBreakMode ? "hsl(var(--chart-4))" : "hsl(var(--accent))")}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 140}
            strokeDashoffset={2 * Math.PI * 140 * (1 - progress / 100)}
            className="transition-all duration-1000 ease-linear shadow-lg"
          />
        </svg>

        <div className="flex flex-col items-center z-10">
           <div className="text-7xl font-black font-mono tracking-tighter text-slate-900 mb-2">
            {formatTime(timeLeft)}
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">
            {mode === "work" ? "Trabajo" : "Descanso"}
          </div>
        </div>
      </div>

      <div className="flex gap-8 items-center">
        <Button
          size="lg"
          variant={isActive ? "outline" : "default"}
          className="rounded-[1.5rem] w-20 h-20 p-0 shadow-2xl border-none"
          onClick={toggleTimer}
        >
          {isActive ? <Pause className="h-10 w-10" /> : <Play className="h-10 w-10 fill-current" />}
        </Button>
        <div className="flex flex-col gap-2">
           <Button size="icon" variant="ghost" className="rounded-2xl w-10 h-10 bg-slate-100/50" onClick={resetTimer}>
              <RotateCcw className="h-5 w-5" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl bg-slate-100/50"><Settings2 className="h-5 w-5" /></Button>
              </PopoverTrigger>
              <PopoverContent className="w-60 rounded-3xl p-6 shadow-2xl border-none">
                <div className="space-y-4">
                  <h4 className="font-black text-xs uppercase tracking-widest text-muted-foreground">Preferencias</h4>
                  <div className="grid gap-2">
                    <Label className="text-[9px] font-black uppercase opacity-60">Enfoque (Min)</Label>
                    <Input type="number" value={localWork} onChange={(e) => setLocalWork(e.target.value)} className="rounded-xl border-none bg-muted/30" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-[9px] font-black uppercase opacity-60">Descanso (Min)</Label>
                    <Input type="number" value={localBreak} onChange={(e) => setLocalBreak(e.target.value)} className="rounded-xl border-none bg-muted/30" />
                  </div>
                  <Button onClick={handleApplyChanges} className="w-full rounded-xl font-black h-12 shadow-lg shadow-primary/20">Aplicar</Button>
                </div>
              </PopoverContent>
            </Popover>
        </div>
      </div>

      <div className="mt-12 flex items-center gap-6 px-6 py-2 bg-white rounded-full shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
          <Flame className="h-3 w-3 text-orange-500" /> Sprints: {sessionsCompleted}
        </div>
        <div className="w-px h-4 bg-slate-100" />
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
          <TimerIcon className="h-3 w-3 text-primary" /> {workMinutes}m / {breakMinutes}m
        </div>
      </div>
    </div>
  )
}
