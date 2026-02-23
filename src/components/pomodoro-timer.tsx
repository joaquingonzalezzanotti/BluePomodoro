
"use client"

import * as React from "react"
import { Timer as TimerIcon, Play, Pause, RotateCcw, Coffee, Trophy, Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useFirestore, useUser, updateDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase"
import { doc, collection, increment, serverTimestamp } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

export function PomodoroTimer() {
  const [workMinutes, setWorkMinutes] = React.useState(25)
  const [breakMinutes, setBreakMinutes] = React.useState(5)
  const [timeLeft, setTimeLeft] = React.useState(workMinutes * 60)
  const [isActive, setIsActive] = React.useState(false)
  const [mode, setMode] = React.useState<"work" | "break">("work")
  const [sessionsCompleted, setSessionsCompleted] = React.useState(0)
  const { user } = useUser()
  const db = useFirestore()
  const { toast } = useToast()

  const initialTime = mode === "work" ? workMinutes * 60 : breakMinutes * 60

  React.useEffect(() => {
    setTimeLeft(initialTime)
  }, [workMinutes, breakMinutes, mode])

  React.useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1)
      }, 1000)
    } else if (timeLeft === 0) {
      handleSessionEnd()
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isActive, timeLeft])

  const handleSessionEnd = () => {
    setIsActive(false)
    if (mode === "work") {
      setSessionsCompleted((prev) => prev + 1)
      setMode("break")
      
      if (user && db) {
        const userRef = doc(db, "usuarios", user.uid)
        const sesionesRef = collection(db, "usuarios", user.uid, "sesionesPomodoro")
        
        updateDocumentNonBlocking(userRef, {
          puntosTotales: increment(100)
        })

        addDocumentNonBlocking(sesionesRef, {
          usuarioId: user.uid,
          tipo: "trabajo",
          duracionMinutos: workMinutes,
          fecha: serverTimestamp()
        })

        toast({
          title: "¡Sesión Completada!",
          description: "Has ganado 100 XP. Tómate un respiro.",
          icon: <Trophy className="h-4 w-4 text-accent" />
        })
      }
    } else {
      setMode("work")
      toast({
        title: "Descanso Terminado",
        description: "¡Es hora de volver a enfocarse!",
      })
    }
  }

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
            {mode === "work" ? "Sesión de Enfoque" : "Descanso Relajante"}
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-1 bg-primary/20 rounded-full text-primary">
              Sprints: {sessionsCompleted}
            </span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-60">
                <div className="space-y-4">
                  <h4 className="font-bold text-sm">Ajustar Tiempos</h4>
                  <div className="grid gap-2">
                    <Label htmlFor="work" className="text-xs">Trabajo (min)</Label>
                    <Input 
                      id="work" 
                      type="number" 
                      value={workMinutes} 
                      onChange={(e) => setWorkMinutes(Number(e.target.value))}
                      className="h-8"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="break" className="text-xs">Descanso (min)</Label>
                    <Input 
                      id="break" 
                      type="number" 
                      value={breakMinutes} 
                      onChange={(e) => setBreakMinutes(Number(e.target.value))}
                      className="h-8"
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
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
            className="rounded-full w-14 h-14 p-0 shadow-lg"
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
