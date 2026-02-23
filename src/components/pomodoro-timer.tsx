
"use client"

import * as React from "react"
import { Timer as TimerIcon, Play, Pause, RotateCcw, Coffee, Settings2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

  const initialTime = mode === "work" ? workMinutes * 60 : breakMinutes * 60
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

  return (
    <div className={cn("flex flex-col items-center", large ? "scale-150" : "w-full")}>
      <div className="relative w-64 h-64 flex items-center justify-center mb-8">
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle cx="128" cy="128" r="120" fill="transparent" stroke="hsl(var(--muted))" strokeWidth="8" />
          <circle
            cx="128"
            cy="128"
            r="120"
            fill="transparent"
            stroke={mode === "work" ? "hsl(var(--primary))" : "hsl(var(--accent))"}
            strokeWidth="8"
            strokeDasharray={2 * Math.PI * 120}
            strokeDashoffset={2 * Math.PI * 120 * (1 - progress / 100)}
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
        <div className="text-6xl font-black font-mono tracking-tighter text-foreground">
          {formatTime(timeLeft)}
        </div>
      </div>

      <div className="flex gap-6 items-center">
        <Button
          size="lg"
          variant={isActive ? "outline" : "default"}
          className="rounded-full w-16 h-16 p-0 shadow-xl"
          onClick={toggleTimer}
        >
          {isActive ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 fill-current" />}
        </Button>
        <Button size="lg" variant="ghost" className="rounded-full w-12 h-12 p-0" onClick={resetTimer}>
          <RotateCcw className="h-6 w-6" />
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full"><Settings2 className="h-6 w-6" /></Button>
          </PopoverTrigger>
          <PopoverContent className="w-60">
            <div className="space-y-4">
              <h4 className="font-black text-sm uppercase">Tiempos</h4>
              <div className="grid gap-2">
                <Label className="text-[10px] font-bold">TRABAJO (MIN)</Label>
                <Input type="number" value={localWork} onChange={(e) => setLocalWork(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label className="text-[10px] font-bold">DESCANSO (MIN)</Label>
                <Input type="number" value={localBreak} onChange={(e) => setLocalBreak(e.target.value)} />
              </div>
              <Button onClick={handleApplyChanges} className="w-full rounded-xl font-bold">Aplicar</Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <div className="mt-8 text-xs font-black uppercase tracking-widest text-muted-foreground/50">
        {mode === "work" ? "Modo Enfoque" : "Modo Descanso"} • Sprints: {sessionsCompleted}
      </div>
    </div>
  )
}
