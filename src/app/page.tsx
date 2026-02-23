"use client"

import * as React from "react"
import { 
  LayoutDashboard, 
  Settings, 
  LogOut,
  Zap,
  CheckSquare,
  BarChart3,
  CloudLightning,
  LogIn,
  Timer as TimerIcon,
  Maximize2,
  Play
} from "lucide-react"
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroup, SidebarTrigger } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/toaster"
import { PomodoroTimer } from "@/components/pomodoro-timer"
import { TaskManager } from "@/components/task-manager"
import { FocusMusic } from "@/components/focus-music"
import { ConfigurationView } from "@/components/configuration-view"
import { StatsView } from "@/components/stats-view"
import { Button } from "@/components/ui/button"
import { useAuth, useUser, useFirestore, useMemoFirebase, updateDocumentNonBlocking, useDoc, useCollection, addDocumentNonBlocking } from "@/firebase"
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { doc, collection, serverTimestamp, increment } from "firebase/firestore"
import { Switch } from "@/components/ui/switch"

const DEFAULT_PLAYLIST = "https://open.spotify.com/embed/playlist/0vvXsWCC9xrXsKd4FyS8kM?utm_source=generator"

export default function FocusFlowDashboard() {
  const [activeTab, setActiveTab] = React.useState("dashboard")
  const { user, isUserLoading } = useUser()
  const { toast } = useToast()
  const auth = useAuth()
  const db = useFirestore()

  // ESTADO GLOBAL DEL POMODORO
  const [workMinutes, setWorkMinutes] = React.useState(25)
  const [breakMinutes, setBreakMinutes] = React.useState(5)
  const [timeLeft, setTimeLeft] = React.useState(25 * 60)
  const [isActive, setIsActive] = React.useState(false)
  const [mode, setMode] = React.useState<"work" | "break">("work")
  const [sessionsCompleted, setSessionsCompleted] = React.useState(0)
  const [activeTaskId, setActiveTaskId] = React.useState<string | null>(null)

  const userRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "usuarios", user.uid)
  }, [db, user])

  const { data: userData } = useDoc(userRef)
  const isBlocking = userData?.modoEstrictoActivo || false

  // Lógica del Timer Global
  React.useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1)
      }, 1000)
    } else if (timeLeft === 0 && isActive) {
      handleSessionEnd()
    }
    return () => { if (interval) clearInterval(interval) }
  }, [isActive, timeLeft])

  const handleSessionEnd = () => {
    setIsActive(false)
    if (mode === "work") {
      setSessionsCompleted(prev => prev + 1)
      setMode("break")
      setTimeLeft(breakMinutes * 60)
      
      if (user && db) {
        const uRef = doc(db, "usuarios", user.uid)
        const sesionesRef = collection(db, "usuarios", user.uid, "sesionesPomodoro")
        
        updateDocumentNonBlocking(uRef, { puntosTotales: increment(100) })

        addDocumentNonBlocking(sesionesRef, {
          usuarioId: user.uid,
          tipo: "trabajo",
          duracionMinutos: workMinutes,
          fecha: serverTimestamp()
        })

        // Incrementar pomodoros de la tarea activa
        if (activeTaskId) {
          const tRef = doc(db, "usuarios", user.uid, "tareas", activeTaskId)
          updateDocumentNonBlocking(tRef, { completadosPomodoros: increment(1) })
        }

        toast({ title: "¡Sesión Completada!", description: "Has ganado 100 XP. Tómate un respiro." })
      }
    } else {
      setMode("work")
      setTimeLeft(workMinutes * 60)
      toast({ title: "Descanso Terminado", description: "¡Es hora de volver a enfocarse!" })
    }
  }

  const toggleTimer = () => setIsActive(!isActive)
  const resetTimer = () => {
    setIsActive(false)
    setTimeLeft(mode === "work" ? workMinutes * 60 : breakMinutes * 60)
  }

  const updateWorkMinutes = (m: number) => {
    setWorkMinutes(m)
    if (!isActive && mode === "work") setTimeLeft(m * 60)
  }

  const updateBreakMinutes = (m: number) => {
    setBreakMinutes(m)
    if (!isActive && mode === "break") setTimeLeft(m * 60)
  }

  const handleLogin = () => {
    const provider = new GoogleAuthProvider()
    signInWithPopup(auth, provider).catch(() => {
      toast({ variant: "destructive", title: "Error de Inicio de Sesión" })
    })
  }

  const handleLogout = () => {
    signOut(auth).catch((e) => toast({ variant: "destructive", title: "Error al cerrar sesión", description: e.message }))
  }

  const toggleFocusMode = (checked: boolean) => {
    if (!userRef) return
    updateDocumentNonBlocking(userRef, { modoEstrictoActivo: checked })
    toast({
      title: checked ? "Modo Focus Activado" : "Modo Focus Desactivado",
      description: checked ? "Tiempo de concentración profunda." : "Regresando al modo normal."
    })
  }

  if (isUserLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><CloudLightning className="h-12 w-12 text-primary animate-pulse" /></div>

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <div className="h-20 w-20 bg-primary rounded-[2rem] flex items-center justify-center mb-10 shadow-2xl">
          <CloudLightning className="text-white h-10 w-10" />
        </div>
        <h1 className="text-4xl font-black mb-4">BluePomodoro</h1>
        <Button size="lg" onClick={handleLogin} className="gap-3 rounded-2xl px-10">
          <LogIn className="h-5 w-5" /> Entrar con Google
        </Button>
      </div>
    )
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black">Mi Día</h3>
                <Button variant="outline" size="sm" onClick={() => setActiveTab("pomodoro")} className="gap-2 rounded-xl">
                  <Maximize2 className="h-4 w-4" /> Ver Reloj
                </Button>
              </div>
              <TaskManager onTaskSelect={(id) => setActiveTaskId(id)} activeTaskId={activeTaskId} />
            </div>
            <div className="space-y-6">
               <FocusMusic layout="dashboard" />
            </div>
          </div>
        )
      case "pomodoro":
        return (
          <div className="max-w-4xl mx-auto flex flex-col items-center justify-center py-20 animate-in zoom-in-95 duration-500">
            <PomodoroTimer 
              timeLeft={timeLeft}
              isActive={isActive}
              mode={mode}
              sessionsCompleted={sessionsCompleted}
              toggleTimer={toggleTimer}
              resetTimer={resetTimer}
              workMinutes={workMinutes}
              setWorkMinutes={updateWorkMinutes}
              breakMinutes={breakMinutes}
              setBreakMinutes={updateBreakMinutes}
              large
            />
            {activeTaskId && (
              <div className="mt-10 px-6 py-3 bg-primary/5 border border-primary/10 rounded-2xl flex items-center gap-3">
                <CheckSquare className="h-5 w-5 text-primary" />
                <span className="text-sm font-bold">Enfocado en: {activeTaskId}</span>
              </div>
            )}
          </div>
        )
      case "config":
        return <ConfigurationView />
      case "stats":
        return <StatsView />
      default:
        return <div className="py-20 text-center">Sección en construcción...</div>
    }
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50/50">
        <Sidebar collapsible="icon" className="border-r border-primary/5 bg-white/80 backdrop-blur-xl">
          <SidebarHeader className="p-6">
            <div className="flex items-center gap-3">
              <CloudLightning className="text-primary h-6 w-6" />
              <h1 className="text-lg font-black group-data-[collapsible=icon]:hidden">BluePomodoro</h1>
            </div>
          </SidebarHeader>
          <SidebarContent className="px-4">
            <SidebarGroup>
              <SidebarMenu>
                {[
                  { id: "dashboard", icon: LayoutDashboard, label: "Tablero" },
                  { id: "pomodoro", icon: TimerIcon, label: "Enfoque" },
                  { id: "stats", icon: BarChart3, label: "Logros" },
                  { id: "config", icon: Settings, label: "Ajustes" },
                ].map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton isActive={activeTab === item.id} onClick={() => setActiveTab(item.id)} className="rounded-xl h-12">
                      <item.icon className="h-5 w-5" />
                      <span className="font-bold">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="p-4 border-t border-primary/5">
            <div className="flex flex-col gap-4">
              <FocusMusic layout="sidebar" />
              <div className="flex items-center gap-3 p-2 bg-muted/30 rounded-xl group-data-[collapsible=icon]:justify-center">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.photoURL || ""} />
                  <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 group-data-[collapsible=icon]:hidden">
                  <p className="text-[10px] font-black truncate">{user.displayName}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 group-data-[collapsible=icon]:hidden" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 overflow-auto flex flex-col">
          <header className="h-16 border-b border-primary/5 bg-white/70 backdrop-blur-md sticky top-0 z-20 px-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground/60">{activeTab}</h2>
            </div>
            <div className="flex items-center gap-4">
              {isActive && (
                <div className="flex items-center gap-2 px-4 py-1.5 bg-primary/10 rounded-full border border-primary/20">
                  <TimerIcon className="h-4 w-4 text-primary" />
                  <span className="text-sm font-black text-primary font-mono">
                    {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Switch checked={isBlocking} onCheckedChange={toggleFocusMode} className="scale-75" />
                <span className="text-[10px] font-black uppercase text-muted-foreground">Focus</span>
              </div>
            </div>
          </header>
          <div className="p-8 flex-1">{renderContent()}</div>
        </main>
        <Toaster />
      </div>
    </SidebarProvider>
  )
}