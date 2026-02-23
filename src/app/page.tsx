
"use client"

import * as React from "react"
import Image from "next/image"
import { 
  LayoutDashboard, 
  Settings, 
  LogOut,
  BarChart3,
  CloudLightning,
  LogIn,
  Timer as TimerIcon,
  Maximize2,
  FolderKanban,
  Users,
  XCircle
} from "lucide-react"
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroup, SidebarTrigger } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/toaster"
import { PomodoroTimer } from "@/components/pomodoro-timer"
import { TaskManager } from "@/components/task-manager"
import { FocusMusic } from "@/components/focus-music"
import { ConfigurationView } from "@/components/configuration-view"
import { StatsView } from "@/components/stats-view"
import { ProjectManager } from "@/components/project-manager"
import { KanbanBoard } from "@/components/kanban-board"
import { Button } from "@/components/ui/button"
import { useAuth, useUser, useFirestore, useMemoFirebase, updateDocumentNonBlocking, useDoc, addDocumentNonBlocking } from "@/firebase"
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { doc, collection, serverTimestamp, increment } from "firebase/firestore"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

export default function FocusFlowDashboard() {
  const [activeTab, setActiveTab] = React.useState("dashboard")
  const { user, isUserLoading } = useUser()
  const { toast } = useToast()
  const auth = useAuth()
  const db = useFirestore()

  const [workMinutes, setWorkMinutes] = React.useState(40)
  const [breakMinutes, setBreakMinutes] = React.useState(10)
  const [longBreakMinutes] = React.useState(20)
  const [timeLeft, setTimeLeft] = React.useState(40 * 60)
  const [isActive, setIsActive] = React.useState(false)
  const [mode, setMode] = React.useState<"work" | "break">("work")
  const [sessionsCompleted, setSessionsCompleted] = React.useState(0)
  const [activeTaskId, setActiveTaskId] = React.useState<string | null>(null)
  
  // Estados TDAH
  const [isAlarmModalOpen, setIsAlarmModalOpen] = React.useState(false)
  const [bodyDoublingMessage, setBodyDoublingMessage] = React.useState<string | null>(null)
  const audioRef = React.useRef<HTMLAudioElement | null>(null)

  const userRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "usuarios", user.uid)
  }, [db, user])

  const { data: userData } = useDoc(userRef)
  const isBlocking = userData?.modoEstrictoActivo || false

  // Lógica de Body Doubling
  React.useEffect(() => {
    if (!user) return
    
    const showMessage = () => {
      const usersCount = Math.floor(Math.random() * 20) + 6 
      if (usersCount > 5) {
        setBodyDoublingMessage(`${usersCount} personas enfocadas contigo`)
        setTimeout(() => setBodyDoublingMessage(null), 8000) 
      }
      
      const nextInterval = (Math.floor(Math.random() * (30 - 10 + 1)) + 10) * 60 * 1000
      setTimeout(showMessage, nextInterval)
    }

    const initialTimeout = setTimeout(showMessage, 5000)
    return () => clearTimeout(initialTimeout)
  }, [user])

  React.useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1)
        
        // Alertas de Transición TDAH
        const threshold = workMinutes >= 30 ? 5 : 2
        if (timeLeft === threshold * 60) {
          toast({ 
            title: "Aviso de Transición", 
            description: `Te quedan ${threshold} minutos para terminar. ¡Ve cerrando ideas!`,
            variant: "default"
          })
        }
      }, 1000)
    } else if (timeLeft === 0 && isActive) {
      handleSessionEnd()
    }
    return () => { if (interval) clearInterval(interval) }
  }, [isActive, timeLeft, workMinutes, toast])

  const handleSessionEnd = () => {
    setIsActive(false)
    setIsAlarmModalOpen(true)
    
    if (typeof window !== "undefined") {
      const audio = new Audio("https://actions.google.com/sounds/v1/alarms/alarm_clock_beeping.ogg")
      audio.loop = true
      audio.play().catch(() => {})
      audioRef.current = audio
    }

    if (mode === "work") {
      const nextCount = sessionsCompleted + 1
      setSessionsCompleted(nextCount)
      
      if (user && db) {
        const uRef = doc(db, "usuarios", user.uid)
        const sesionesRef = collection(db, "usuarios", user.uid, "sesionesPomodoro")
        updateDocumentNonBlocking(uRef, { puntosTotales: increment(150) })
        addDocumentNonBlocking(sesionesRef, {
          usuarioId: user.uid,
          tipo: "trabajo",
          duracionMinutos: workMinutes,
          fecha: serverTimestamp()
        })

        if (activeTaskId) {
          const tRef = doc(db, "usuarios", user.uid, "tareas", activeTaskId)
          updateDocumentNonBlocking(tRef, { completadosPomodoros: increment(1) })
        }
      }
    }
  }

  const stopAlarm = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setIsAlarmModalOpen(false)
    
    if (mode === "work") {
      setMode("break")
      const isLongBreak = (sessionsCompleted + 1) % 4 === 0 && sessionsCompleted > 0
      setTimeLeft((isLongBreak ? longBreakMinutes : breakMinutes) * 60)
    } else {
      setMode("work")
      setTimeLeft(workMinutes * 60)
    }
  }

  const toggleTimer = () => setIsActive(!isActive)
  const resetTimer = () => {
    setIsActive(false)
    setTimeLeft(mode === "work" ? workMinutes * 60 : breakMinutes * 60)
  }

  if (isUserLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><CloudLightning className="h-12 w-12 text-primary animate-pulse" /></div>

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <div className="mb-10 shadow-2xl relative">
          <Image 
            src="/logo.png" 
            alt="BluePomodoro Logo" 
            width={120} 
            height={120} 
            className="rounded-[2.5rem]"
          />
        </div>
        <h1 className="text-4xl font-black mb-4">BluePomodoro</h1>
        <p className="text-muted-foreground mb-8 max-w-sm">Gestiona tus tareas con IA y domina la técnica Pomodoro en un entorno de alto enfoque.</p>
        <Button size="lg" onClick={() => signInWithPopup(auth, new GoogleAuthProvider())} className="gap-3 rounded-2xl px-10 h-14 font-bold text-lg">
          <LogIn className="h-5 w-5" /> Entrar con Google
        </Button>
      </div>
    )
  }

  const activeTask = userData?.tareas?.find((t: any) => t.id === activeTaskId)

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50/50">
        <Sidebar collapsible="icon" className="border-r border-primary/5 bg-white/80 backdrop-blur-xl">
          <SidebarHeader className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 relative overflow-hidden rounded-xl">
                <Image 
                  src="/logo.png" 
                  alt="Logo" 
                  fill
                  className="object-cover"
                />
              </div>
              <h1 className="text-lg font-black group-data-[collapsible=icon]:hidden">BluePomodoro</h1>
            </div>
          </SidebarHeader>
          <SidebarContent className="px-4">
            <SidebarGroup>
              <SidebarMenu>
                {[
                  { id: "dashboard", icon: LayoutDashboard, label: "Tablero" },
                  { id: "pomodoro", icon: TimerIcon, label: "Modo Focus" },
                  { id: "proyectos", icon: FolderKanban, label: "Proyectos" },
                  { id: "stats", icon: BarChart3, label: "Estadísticas" },
                  { id: "config", icon: Settings, label: "Configuración" },
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
            <SidebarGroup className="mt-auto">
               <FocusMusic layout="sidebar" />
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="p-4 border-t border-primary/5">
            <div className="flex flex-col gap-2">
              {bodyDoublingMessage && (
                <div className="px-3 py-1.5 bg-primary/5 border border-primary/10 rounded-xl animate-in fade-in slide-in-from-bottom-2 duration-500 group-data-[collapsible=icon]:hidden">
                  <p className="text-[9px] font-black text-primary/70 flex items-center gap-2 italic">
                    <Users className="h-3 w-3" /> {bodyDoublingMessage}
                  </p>
                </div>
              )}
              <div className="flex items-center gap-3 p-2 bg-muted/30 rounded-xl group-data-[collapsible=icon]:justify-center">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.photoURL || ""} />
                  <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 group-data-[collapsible=icon]:hidden overflow-hidden">
                  <p className="text-[10px] font-black truncate">{user.displayName}</p>
                  <p className="text-[8px] text-muted-foreground truncate">{user.email}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 group-data-[collapsible=icon]:hidden" onClick={() => signOut(auth)}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 overflow-auto flex flex-col">
          {activeTab !== "pomodoro" && (
            <header className="h-16 border-b border-primary/5 bg-white/70 backdrop-blur-md sticky top-0 z-20 px-8 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">{activeTab}</h2>
              </div>
              <div className="flex items-center gap-4">
                {isActive && (
                  <div className="flex items-center gap-2 px-4 py-1.5 bg-primary/10 rounded-full border border-primary/20 animate-pulse">
                    <TimerIcon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-black text-primary font-mono">
                      {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Switch checked={isBlocking} onCheckedChange={(c) => updateDocumentNonBlocking(userRef!, { modoEstrictoActivo: c })} className="scale-75" />
                  <span className="text-[10px] font-black uppercase text-muted-foreground">Focus</span>
                </div>
              </div>
            </header>
          )}

          <div className={cn("flex-1", activeTab === "pomodoro" ? "p-0 bg-slate-50" : "p-8")}>
            {activeTab === "dashboard" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <Tabs defaultValue="lista" className="w-full">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-black">Tareas Pendientes</h3>
                      <TabsList className="bg-white p-1 rounded-xl shadow-sm border border-slate-100">
                        <TabsTrigger value="lista" className="rounded-lg font-bold">Lista</TabsTrigger>
                        <TabsTrigger value="kanban" className="rounded-lg font-bold">Tablero</TabsTrigger>
                      </TabsList>
                    </div>
                    <TabsContent value="lista">
                      <TaskManager onTaskSelect={(id) => setActiveTaskId(id)} activeTaskId={activeTaskId} />
                    </TabsContent>
                    <TabsContent value="kanban">
                      <KanbanBoard />
                    </TabsContent>
                  </Tabs>
                </div>
                <div className="space-y-6">
                   <FocusMusic layout="dashboard" />
                   {activeTaskId && (
                    <Button 
                      onClick={() => setActiveTab("pomodoro")} 
                      className="w-full h-24 rounded-[2rem] bg-primary text-white font-black text-xl gap-3 shadow-xl shadow-primary/20 border-4 border-white"
                    >
                      <Maximize2 className="h-6 w-6" /> MODO FOCUS TOTAL
                    </Button>
                   )}
                </div>
              </div>
            )}

            {activeTab === "pomodoro" && (
              <div className="h-full flex flex-col items-center justify-center p-8 animate-in fade-in duration-500 relative">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-8 left-8 h-12 w-12 rounded-2xl bg-white shadow-md"
                  onClick={() => setActiveTab("dashboard")}
                >
                  <XCircle className="h-6 w-6 text-muted-foreground" />
                </Button>
                
                <div className="max-w-xl w-full flex flex-col items-center">
                  {activeTaskId && (
                    <div className="mb-12 text-center space-y-2">
                      <Badge variant="secondary" className="px-4 py-1 text-[10px] font-black uppercase tracking-[0.2em] bg-primary/10 text-primary border-none">Tarea Activa</Badge>
                      <h2 className="text-3xl font-black tracking-tight text-slate-800">{activeTask?.titulo || "Enfoque Profundo"}</h2>
                    </div>
                  )}

                  <PomodoroTimer 
                    timeLeft={timeLeft}
                    isActive={isActive}
                    mode={mode}
                    sessionsCompleted={sessionsCompleted}
                    toggleTimer={toggleTimer}
                    resetTimer={resetTimer}
                    workMinutes={workMinutes}
                    setWorkMinutes={setWorkMinutes}
                    breakMinutes={breakMinutes}
                    setBreakMinutes={setBreakMinutes}
                    large
                  />
                </div>
              </div>
            )}

            {activeTab === "proyectos" && <ProjectManager />}
            {activeTab === "config" && <ConfigurationView />}
            {activeTab === "stats" && <StatsView />}
          </div>
        </main>
        
        <AlertDialog open={isAlarmModalOpen}>
          <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-10 max-w-sm">
            <AlertDialogHeader className="items-center text-center">
              <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-4 animate-bounce">
                <TimerIcon className="h-10 w-10 text-primary" />
              </div>
              <AlertDialogTitle className="text-2xl font-black">¡Tiempo Cumplido!</AlertDialogTitle>
              <AlertDialogDescription className="text-sm font-medium">
                Has completado tu sesión de {mode === "work" ? "enfoque" : "descanso"}.
                Es momento de cambiar el ritmo.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="sm:justify-center mt-6">
              <AlertDialogAction 
                onClick={stopAlarm}
                className="w-full h-14 rounded-2xl bg-primary text-white font-black text-lg hover:bg-primary/90"
              >
                DETENER ALARMA
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Toaster />
      </div>
    </SidebarProvider>
  )
}
