"use client"

import * as React from "react"
import { Timer as TimerIcon, Play, Pause, RotateCcw, Coffee } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

export function PomodoroTimer() {
  const [timeLeft, setTimeLeft] = React.useState(25 * 60)
  const [isActive, setIsActive] = React.useState(false)
  const [mode, setMode] = React.useState<"work" | "break">("work")
  const [sessionsCompleted, setSessionsCompleted] = React.useState(0)

  const initialTime = mode === "work" ? 25 * 60 : 5 * 60

  React.useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1)
      }, 1000)
    } else if (timeLeft === 0) {
      if (mode === "work") {
        setSessionsCompleted((prev) => prev + 1)
        setMode("break")
        setTimeLeft(5 * 60)
      } else {
        setMode("work")
        setTimeLeft(25 * 60)
      }
      setIsActive(false)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isActive, timeLeft, mode])

  const toggleTimer = () => setIsActive(!isActive)
  const resetTimer = () => {
    setIsActive(false)
    setTimeLeft(initialTime)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const progress = ((initialTime - timeLeft) / initialTime) * 100

  return (
    <Card className="w-full bg-card shadow-lg border-none overflow-hidden">
      <CardHeader className="bg-primary/10 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            {mode === "work" ? <TimerIcon className="h-5 w-5 text-primary" /> : <Coffee className="h-5 w-5 text-accent" />}
            {mode === "work" ? "Deep Focus Session" : "Refreshing Break"}
          </CardTitle>
          <span className="text-xs font-semibold px-2 py-1 bg-primary/20 rounded-full text-primary">
            Sprints: {sessionsCompleted}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center py-8">
        <div className="relative w-48 h-48 flex items-center justify-center mb-6">
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle
              cx="96"
              cy="96"
              r="88"
              fill="transparent"
              stroke="hsl(var(--muted))"
              strokeWidth="8"
            />
            <circle
              cx="96"
              cy="96"
              r="88"
              fill="transparent"
              stroke={mode === "work" ? "hsl(var(--primary))" : "hsl(var(--accent))"}
              strokeWidth="8"
              strokeDasharray={2 * Math.PI * 88}
              strokeDashoffset={2 * Math.PI * 88 * (1 - progress / 100)}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="text-5xl font-bold font-mono tracking-tighter">
            {formatTime(timeLeft)}
          </div>
        </div>

        <div className="flex gap-4">
          <Button
            size="lg"
            variant={isActive ? "outline" : "default"}
            className="rounded-full w-14 h-14 p-0"
            onClick={toggleTimer}
          >
            {isActive ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
          </Button>
          <Button
            size="lg"
            variant="ghost"
            className="rounded-full w-14 h-14 p-0 hover:bg-muted"
            onClick={resetTimer}
          >
            <RotateCcw className="h-6 w-6" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
