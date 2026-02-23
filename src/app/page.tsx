
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
  Play,
  Flame,
  FolderKanban,
  Bell,
  Kanban,
  Music as MusicIcon,
  ChevronRight,
  Volume2
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

  const userRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "usuarios", user.uid)
  }, [db, user])

  const { data: userData } = useDoc(userRef)
  const isBlocking = userData?.modoEstrictoActivo || false

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

  const sendBrowserNotification = (title: string, body: string) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, icon: "/favicon.ico" })
    }
  }

  const handleSessionEnd = () => {
    setIsActive(false)
    if (mode === "work") {
      const nextCount = sessionsCompleted + 1
      setSessionsCompleted(nextCount)
      setMode("break")
      
      const isLongBreak = nextCount > 0 && nextCount % 3 === 0
      const nextMinutes = isLongBreak ? longBreakMinutes : breakMinutes
      setTimeLeft(nextMinutes * 60)
      
      const title = isLongBreak ? "¡Descanso Largo!" : "¡Sesión Completada!"
      const desc = isLongBreak ? "Has completado 3 ciclos. Relájate 20 min." : "XP ganado. Tómate 10 min."
      
      sendBrowserNotification(title, desc)
      
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

        toast({ title, description: desc })
      }
    } else {
      setMode("work")
      setTimeLeft(workMinutes * 60)
      sendBrowserNotification("Enfoque Activo", "¡Es hora de volver al trabajo!")
      toast({ title: "Enfoque", description: "¡A trabajar!" })
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
      toast({ variant: "destructive", title: "Error" })
    })
  }

  const handleLogout = () => {
    signOut(auth).catch((e) => toast({ variant: "destructive", title: "Error", description: e.message }))
  }

  if (isUserLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><CloudLightning className="h-12 w-12 text-primary animate-pulse" /></div>

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <div className="h-20 w-20 bg-primary rounded-[2rem] flex items-center justify-center mb-10 shadow-2xl">
          <CloudLightning className="text-white h-10 w-10" />
        </div>
        <h1 className="text-4xl font-black mb-4">BluePomodoro</h1>
        <p className="text-muted-foreground mb-8 max-w-sm">Gestiona tus tareas con IA y domina la técnica Pomodoro en un entorno de alto enfoque.</p>
        <Button size="lg" onClick={handleLogin} className="gap-3 rounded-2xl px-10 h-14 font-bold text-lg">
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
              <Tabs defaultValue="lista" className="w-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-black">Mis Pendientes</h3>
                  <TabsList className="bg-white p-1 rounded-xl shadow-sm border border-slate-100">
                    <TabsTrigger value="lista" className="rounded-lg font-bold">Lista</TabsTrigger>
                    <TabsTrigger value="kanban" className="rounded-lg font-bold">Kanban</TabsTrigger>
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
                  className="w-full h-20 rounded-[2rem] bg-primary text-white font-black text-xl gap-3 shadow-xl shadow-primary/20 animate-pulse border-4 border-white"
                >
                  <TimerIcon className="h-6 w-6" /> ¡ENFÓCATE AHORA! <ChevronRight className="h-5 w-5" />
                </Button>
              )}
              <div className="p-6 bg-primary/5 border border-primary/10 rounded-3xl">
                <h4 className="text-xs font-black uppercase text-muted-foreground mb-4 flex items-center gap-2">
                  <Bell className="h-3 w-3" /> Estado de Alertas
                </h4>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Alertas de escritorio</span>
                  <div className="flex items-center gap-1 text-[10px] font-black text-primary">
                    <Volume2 className="h-3 w-3" /> ACTIVO
                  </div>
                </div>
              </div>
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
              <div className="mt-12 px-8 py-4 bg-primary text-white rounded-[2rem] flex items-center gap-4 shadow-2xl shadow-primary/30">
                <div className="h-8 w-8 bg-white/20 rounded-full flex items-center justify-center">
                  <CheckSquare className="h-4 w-4 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Trabajando en</span>
                  <span className="text-sm font-bold truncate max-w-[200px]">
                    {userData?.tareas?.find((t: any) => t.id === activeTaskId)?.titulo || "Tarea Activa"}
                  </span>
                </div>
              </div>
            )}
          </div>
        )
      case "proyectos":
        return <ProjectManager />
      case "config":
        return <ConfigurationView />
      case "stats":
        return <StatsView />
      default:
        return null
    }
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50/50">
        <Sidebar collapsible="icon" className="border-r border-primary/5 bg-white/80 backdrop-blur-xl">
          <SidebarHeader className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-primary rounded-xl flex items-center justify-center shrink-0">
                <CloudLightning className="text-white h-5 w-5" />
              </div>
              <h1 className="text-lg font-black group-data-[collapsible=icon]:hidden">BluePomodoro</h1>
            </div>
          </SidebarHeader>
          <SidebarContent className="px-4">
            <SidebarGroup>
              <SidebarMenu>
                {[
                  { id: "dashboard", icon: LayoutDashboard, label: "Tablero" },
                  { id: "pomodoro", icon: TimerIcon, label: "Enfoque" },
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
          </SidebarContent>
          <SidebarFooter className="p-4 border-t border-primary/5">
            <div className="flex flex-col gap-4">
              <FocusMusic layout="sidebar" />
              <div className="flex items-center gap-3 p-2 bg-muted/30 rounded-xl group-data-[collapsible=icon]:justify-center">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.photoURL || ""} />
                  <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 group-data-[collapsible=icon]:hidden overflow-hidden">
                  <p className="text-[10px] font-black truncate">{user.displayName}</p>
                  <p className="text-[8px] text-muted-foreground truncate">{user.email}</p>
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
          <div className="p-8 flex-1">{renderContent()}</div>
        </main>
        <Toaster />
      </div>
    </SidebarProvider>
  )
}
