
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
  FolderKanban,
  UserCircle,
  Sparkles,
  CheckSquare,
  Zap,
  Target,
  PanelLeft
} from "lucide-react"
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroup, useSidebar } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/toaster"
import { PomodoroTimer } from "@/components/pomodoro-timer"
import { TaskManager } from "@/components/task-manager"
import { ConfigurationView } from "@/components/configuration-view"
import { StatsView } from "@/components/stats-view"
import { ProjectManager } from "@/components/project-manager"
import { KanbanBoard } from "@/components/kanban-board"
import { FocusMusic } from "@/components/focus-music"
import { SpotifyRealTime } from "@/components/spotify-real-time"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useAuth, useUser, useFirestore, useMemoFirebase, updateDocumentNonBlocking, useDoc, initiateAnonymousSignIn } from "@/firebase"
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { doc, increment } from "firebase/firestore"
import { Switch } from "@/components/ui/switch"
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

function LandingPage({ onLoginGoogle, onLoginGuest }: { onLoginGoogle: () => void, onLoginGuest: () => void }) {
  const [mounted, setMounted] = React.useState(false)
  
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return <div className="min-h-screen bg-white" />

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden font-sans">
      <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-md border-b border-slate-100 h-20 flex items-center px-6 md:px-12 justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 relative">
             <Image src="/logo.png" alt="Logo BluePomodoro" width={40} height={40} className="rounded-xl object-contain" />
          </div>
          <span className="font-black text-xl tracking-tighter text-primary">BluePomodoro</span>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" className="hidden md:flex font-bold" onClick={onLoginGuest}>Demo Gratis</Button>
          <Button onClick={onLoginGoogle} className="rounded-full px-6 font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
            Empezar ahora
          </Button>
        </div>
      </nav>

      <main className="pt-40 pb-20 px-6 max-w-7xl mx-auto text-center">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 text-primary text-xs font-black uppercase tracking-widest mb-8 border border-primary/10">
            <Sparkles className="h-3.5 w-3.5" /> La Productividad del Futuro
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[0.95] mb-8 text-slate-900">
            Domina tu tiempo, <br />
            <span className="text-primary italic">con claridad mental.</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-500 font-medium mb-10 leading-relaxed">
            Diseñado específicamente para el cerebro moderno. Desglose de tareas con IA, 
            temporizadores visuales para TDAH y gamificación real.
          </p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <Button size="lg" onClick={onLoginGoogle} className="h-16 px-10 rounded-2xl text-lg font-bold gap-3 shadow-xl shadow-primary/25 w-full md:w-auto hover:bg-primary/90 transition-all">
              <LogIn className="h-5 w-5" /> Iniciar con Google
            </Button>
            <Button size="lg" variant="outline" onClick={onLoginGuest} className="h-16 px-10 rounded-2xl text-lg font-bold border-2 w-full md:w-auto hover:bg-slate-50">
               Acceso Invitado
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}

function SidebarToggle() {
  const { toggleSidebar, state } = useSidebar()
  return (
    <SidebarMenuItem>
      <SidebarMenuButton 
        onClick={toggleSidebar} 
        className="rounded-xl h-10 w-full flex items-center justify-center hover:bg-primary/5 transition-colors"
        tooltip={state === "expanded" ? "Colapsar menú" : "Expandir menú"}
      >
        <PanelLeft className={cn("h-5 w-5 text-primary transition-transform duration-300", state === "collapsed" && "rotate-180")} />
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function DashboardContent({ 
  user, 
  activeTab, 
  setActiveTab, 
  isActive, 
  timeLeft, 
  isBlocking, 
  userRef, 
  activeTaskId, 
  setActiveTaskId, 
  mode, 
  sessionsCompleted, 
  toggleTimer, 
  resetTimer, 
  workMinutes, 
  setWorkMinutes, 
  breakMinutes, 
  setBreakMinutes, 
  signOutAction 
}: any) {
  return (
    <SidebarProvider defaultOpen={true} style={{ "--sidebar-width": "16rem", "--sidebar-width-icon": "5rem" } as React.CSSProperties}>
      <div className="flex min-h-screen w-full bg-slate-50/50 pb-24">
        <Sidebar collapsible="icon" className="border-r border-primary/5 bg-white/80 backdrop-blur-xl transition-all duration-300">
          <SidebarHeader className="p-6 flex-shrink-0">
            <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
              <div className="h-10 w-10 shrink-0 relative overflow-hidden rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center">
                <Image src="/logo.png" alt="Logo BluePomodoro" width={32} height={32} className="rounded-lg object-contain" />
              </div>
              <h1 className="text-lg font-bold group-data-[collapsible=icon]:hidden tracking-tight text-primary">BluePomodoro</h1>
            </div>
          </SidebarHeader>
          <SidebarContent className="px-4">
            <SidebarGroup>
              <SidebarMenu>
                {[
                  { id: "dashboard", icon: LayoutDashboard, label: "Tablero" },
                  { id: "foco", icon: Target, label: "Foco" },
                  { id: "tareas", icon: CheckSquare, label: "Tareas" },
                  { id: "proyectos", icon: FolderKanban, label: "Proyectos" },
                  { id: "stats", icon: BarChart3, label: "Estadísticas" },
                  { id: "config", icon: Settings, label: "Configuración" },
                ].map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton 
                      isActive={activeTab === item.id} 
                      onClick={() => setActiveTab(item.id)} 
                      className="rounded-xl h-12 flex items-center group-data-[collapsible=icon]:justify-center transition-all" 
                      tooltip={item.label}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span className="font-bold group-data-[collapsible=icon]:hidden ml-3">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="p-4 border-t border-primary/5">
            <SidebarMenu>
              <SidebarToggle />
            </SidebarMenu>
            <div className="flex items-center gap-3 p-2 bg-muted/30 rounded-xl group-data-[collapsible=icon]:justify-center mt-2 overflow-hidden transition-all">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={user.photoURL || ""} />
                <AvatarFallback>{user.displayName?.charAt(0) || <UserCircle className="h-5 w-5" />}</AvatarFallback>
              </Avatar>
              <div className="flex-1 group-data-[collapsible=icon]:hidden overflow-hidden">
                <p className="text-[10px] font-black truncate">{user.isAnonymous ? "Invitado" : user.displayName}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 group-data-[collapsible=icon]:hidden shrink-0" onClick={signOutAction}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 min-w-0 overflow-auto flex flex-col">
          <header className="h-16 border-b border-primary/5 bg-white/70 backdrop-blur-md sticky top-0 z-20 px-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">{activeTab}</h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={isBlocking} onCheckedChange={(c) => userRef && updateDocumentNonBlocking(userRef, { modoEstrictoActivo: c })} className="scale-75" />
                <span className="text-[10px] font-black uppercase text-muted-foreground">Modo Focus</span>
              </div>
            </div>
          </header>

          <div className="flex-1 p-8 w-full max-w-[1600px] mx-auto">
            {activeTab === "dashboard" && (
              <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-8 items-start">
                {/* Lista de Tareas (Flexible) */}
                <div className="min-w-0">
                  <TaskManager onTaskSelect={(id: string) => setActiveTaskId(id)} activeTaskId={activeTaskId} />
                </div>
                {/* Temporizador (Side / Bottom Bar) */}
                <div className="xl:sticky xl:top-24 w-full">
                  <Card className="bg-white rounded-[2.5rem] p-6 xl:p-8 shadow-xl border border-slate-100 flex flex-col items-center justify-center overflow-hidden min-h-[140px] xl:min-h-0">
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
                    />
                  </Card>
                   <SpotifyRealTime />
                </div>
              </div>
            )}

            {activeTab === "foco" && (
              <div className="flex flex-col items-center justify-center gap-12 min-h-[70vh] animate-in zoom-in-95 duration-700">
                <div className="bg-white rounded-[4rem] p-16 shadow-2xl border border-slate-100 flex flex-col items-center justify-center">
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
                <div className="max-w-2xl w-full">
                   <TaskManager onTaskSelect={(id: string) => setActiveTaskId(id)} activeTaskId={activeTaskId} onlyActive />
                </div>
              </div>
            )}

            {activeTab === "tareas" && (
              <div className="space-y-6">
                <Tabs defaultValue="lista" className="w-full">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-3xl font-black">Gestión de Tareas</h2>
                    <TabsList className="bg-white p-1 rounded-xl shadow-sm border border-slate-100">
                      <TabsTrigger value="lista" className="rounded-lg px-6 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">Lista</TabsTrigger>
                      <TabsTrigger value="kanban" className="rounded-lg px-6 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">Kanban</TabsTrigger>
                    </TabsList>
                  </div>
                  <TabsContent value="lista" className="animate-in fade-in duration-500">
                    <TaskManager onTaskSelect={(id: string) => setActiveTaskId(id)} activeTaskId={activeTaskId} />
                  </TabsContent>
                  <TabsContent value="kanban" className="animate-in slide-in-from-bottom-4 duration-500">
                    <KanbanBoard />
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {activeTab === "proyectos" && <ProjectManager />}
            {activeTab === "config" && <ConfigurationView />}
            {activeTab === "stats" && <StatsView />}
          </div>

          <FocusMusic layout="dock" />
        </main>
      </div>
    </SidebarProvider>
  )
}

export default function AppEntry() {
  const [mounted, setMounted] = React.useState(false)
  const { user, isUserLoading } = useUser()
  const [activeTab, setActiveTab] = React.useState("dashboard")
  const auth = useAuth()
  const db = useFirestore()
  const { toast } = useToast()

  const [workMinutes, setWorkMinutes] = React.useState(40)
  const [breakMinutes, setBreakMinutes] = React.useState(10)
  const [timeLeft, setTimeLeft] = React.useState(40 * 60)
  const [isActive, setIsActive] = React.useState(false)
  const [mode, setMode] = React.useState<"work" | "break">("work")
  const [sessionsCompleted, setSessionsCompleted] = React.useState(0)
  const [activeTaskId, setActiveTaskId] = React.useState<string | null>(null)
  
  const [isAlarmModalOpen, setIsAlarmModalOpen] = React.useState(false)
  const audioRef = React.useRef<HTMLAudioElement | null>(null)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const userRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "usuarios", user.uid)
  }, [db, user])

  const { data: userData } = useDoc(userRef)
  const isBlocking = userData?.modoEstrictoActivo || false

  React.useEffect(() => {
    if (window.location.hash.includes("access_token")) {
      const params = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = params.get("access_token");
      if (accessToken && userRef) {
        updateDocumentNonBlocking(userRef, { spotifyAccessToken: accessToken });
        toast({ title: "¡Spotify Conectado!", description: "Tu cuenta ha sido vinculada exitosamente." });
        window.location.hash = "";
      }
    }
  }, [userRef, toast]);


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
    setIsAlarmModalOpen(true)
    if (typeof window !== "undefined") {
      const audio = new Audio("https://actions.google.com/sounds/v1/alarms/alarm_clock_beeping.ogg")
      audio.loop = true
      audio.play().catch(() => {})
      audioRef.current = audio
    }
    if (mode === "work") {
      setSessionsCompleted(prev => prev + 1)
      if (userRef) {
        updateDocumentNonBlocking(userRef, { puntosTotales: increment(100) })
      }
    }
  }

  const stopAlarm = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setIsAlarmModalOpen(false)
    if (mode === "work") {
      setMode("break")
      setTimeLeft(breakMinutes * 60)
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

  const handleGoogleSignIn = async () => {
    if (!auth) {
      toast({ variant: "destructive", title: "Configuración Requerida", description: "Firebase Auth no está inicializado. Verifica tus variables de entorno en Vercel." })
      return
    }

    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/tasks.readonly');
      provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        sessionStorage.setItem('google_access_token', credential.accessToken);
      }
      toast({ title: "¡Éxito!", description: "Sesión iniciada con Google." });
    } catch (e: any) {
      console.error("Login Error Details:", e);
      let errorMsg = "Ocurrió un error al iniciar sesión.";
      
      if (e.code === 'auth/popup-blocked') {
        errorMsg = "El navegador bloqueó el popup. Habilítalos para este sitio.";
      } else if (e.code === 'auth/popup-closed-by-user') {
        errorMsg = "La ventana se cerró inesperadamente. Si el error persiste, verifica los dominios autorizados en Firebase Console.";
      } else {
        errorMsg = e.message;
      }

      toast({ variant: "destructive", title: "Error de Login", description: errorMsg });
    }
  }

  const handleGuestSignIn = async () => {
    if (!auth) {
      toast({ variant: "destructive", title: "Configuración Requerida", description: "Firebase Auth no está inicializado. Verifica tus variables de entorno en Vercel." })
      return
    }
    initiateAnonymousSignIn(auth)
  }

  const handleSignOut = () => {
    if (!auth) return
    sessionStorage.removeItem('google_access_token');
    signOut(auth)
  }

  if (!mounted) return null
  if (isUserLoading) return <div className="min-h-screen flex items-center justify-center bg-white"><CloudLightning className="h-12 w-12 text-primary animate-pulse" /></div>

  if (!user) {
    return <LandingPage onLoginGoogle={handleGoogleSignIn} onLoginGuest={handleGuestSignIn} />
  }

  return (
    <>
      <DashboardContent 
        user={user} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isActive={isActive} 
        timeLeft={timeLeft} 
        isBlocking={isBlocking} 
        userRef={userRef} 
        activeTaskId={activeTaskId} 
        setActiveTaskId={setActiveTaskId} 
        mode={mode} 
        sessionsCompleted={sessionsCompleted} 
        toggleTimer={toggleTimer} 
        resetTimer={resetTimer} 
        workMinutes={workMinutes} 
        setWorkMinutes={setWorkMinutes} 
        breakMinutes={breakMinutes} 
        setBreakMinutes={setBreakMinutes} 
        signOutAction={handleSignOut} 
      />

      <AlertDialog open={isAlarmModalOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-10 max-w-sm">
          <AlertDialogHeader className="items-center text-center">
            <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-4 animate-bounce">
              <TimerIcon className="h-10 w-10 text-primary" />
            </div>
            <AlertDialogTitle className="text-2xl font-black text-primary">¡Tiempo Cumplido!</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium">
              Has completado tu sesión de {mode === "work" ? "enfoque" : "descanso"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center mt-6">
            <AlertDialogAction 
              onClick={stopAlarm}
              className="w-full h-14 rounded-2xl bg-primary text-white font-black text-lg hover:bg-primary/90"
            >
              {mode === "work" ? "TOMAR DESCANSO" : "VOLVER AL FOCUS"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />
    </>
  )
}
