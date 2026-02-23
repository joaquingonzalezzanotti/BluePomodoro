
"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
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
  ChevronLeft,
  UserCircle,
  Sparkles,
  Target,
  Brain,
  ShieldCheck,
  Music,
  Trophy,
  ArrowRight,
  Zap,
  LayoutGrid
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
import { Separator } from "@/components/ui/separator"
import { useAuth, useUser, useFirestore, useMemoFirebase, updateDocumentNonBlocking, useDoc, addDocumentNonBlocking, initiateAnonymousSignIn } from "@/firebase"
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { doc, collection, serverTimestamp, increment } from "firebase/firestore"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { GamifiedProgress } from "@/components/gamified-progress"

function LandingPage({ onLoginGoogle, onLoginGuest }: { onLoginGoogle: () => void, onLoginGuest: () => void }) {
  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">
      <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-md border-b border-slate-100 h-20 flex items-center px-6 md:px-12 justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 relative">
            <Image src="/logo.png" alt="BluePomodoro Logo" fill className="object-contain" />
          </div>
          <span className="font-black text-xl tracking-tighter">BluePomodoro</span>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" className="hidden md:flex font-bold" onClick={onLoginGuest}>Demo Gratis</Button>
          <Button onClick={onLoginGoogle} className="rounded-full px-6 font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
            Empezar ahora
          </Button>
        </div>
      </nav>

      <main>
        <section className="pt-40 pb-20 px-6 max-w-7xl mx-auto text-center">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 text-primary text-xs font-black uppercase tracking-widest mb-8 border border-primary/10">
              <Sparkles className="h-3.5 w-3.5" /> La Productividad del Futuro
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[0.95] mb-8 text-slate-900">
              Domina tu tiempo, <br />
              <span className="text-primary italic">con claridad mental.</span>
            </h1>
            <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-500 font-medium mb-10 leading-relaxed">
              Diseñado específicamente para el cerebro moderno. Desglose de tareas con IA, 
              temporizadores analógicos para TDAH y gamificación real.
            </p>
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-20">
              <Button size="lg" onClick={onLoginGoogle} className="h-16 px-10 rounded-2xl text-lg font-bold gap-3 shadow-xl shadow-primary/25 w-full md:w-auto hover:bg-primary/90 transition-all">
                <LogIn className="h-5 w-5" /> Iniciar con Google
              </Button>
              <Button size="lg" variant="outline" onClick={onLoginGuest} className="h-16 px-10 rounded-2xl text-lg font-bold border-2 w-full md:w-auto hover:bg-slate-50">
                 Acceso Invitado
              </Button>
            </div>
          </div>

          <div className="relative max-w-5xl mx-auto rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-slate-100 animate-in zoom-in-95 duration-1000">
            <Image 
              src="https://picsum.photos/seed/productivity-focus/1200/800" 
              alt="BluePomodoro App Preview" 
              width={1200} 
              height={800}
              className="w-full object-cover"
              data-ai-hint="productivity workspace"
            />
          </div>
        </section>

        <section className="py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16 space-y-4">
              <Badge variant="outline" className="px-4 py-1 text-primary border-primary/20 font-bold uppercase tracking-widest">Características Pro</Badge>
              <h2 className="text-3xl md:text-5xl font-black">Tu aliado contra el hiperfoco.</h2>
              <p className="text-slate-500 font-medium max-w-xl mx-auto">Herramientas diseñadas para vencer la procrastinación y la ceguera del tiempo.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="group p-10 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
                <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                  <Brain className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-2xl font-black mb-4">IA Task Breakdown</h3>
                <p className="text-slate-500 leading-relaxed font-medium">No más parálisis por análisis. Nuestra IA desglosa proyectos enormes en pasos accionables de 25 minutos.</p>
              </div>

              <div className="group p-10 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
                <div className="h-16 w-16 bg-accent/10 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                  <Target className="h-8 w-8 text-accent" />
                </div>
                <h3 className="text-2xl font-black mb-4">Focus Analógico</h3>
                <p className="text-slate-500 leading-relaxed font-medium">Relojes visuales que facilitan el procesamiento del tiempo, evitando la ansiedad de los números digitales.</p>
              </div>

              <div className="group p-10 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
                <div className="h-16 w-16 bg-green-500/10 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                  <Users className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-black mb-4">Body Doubling</h3>
                <p className="text-slate-500 leading-relaxed font-medium">Siente la compañía productiva de otros usuarios enfocados sin distracciones sociales reales.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 border-t border-slate-100 text-center text-slate-400 font-medium text-sm">
        <p>© 2025 BluePomodoro. Diseñado para mentes extraordinarias.</p>
      </footer>
    </div>
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
  activeTask, 
  mode, 
  sessionsCompleted, 
  toggleTimer, 
  resetTimer, 
  workMinutes, 
  setWorkMinutes, 
  breakMinutes, 
  setBreakMinutes, 
  bodyDoublingMessage, 
  signOutAction 
}: any) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50/50 pb-24">
        <Sidebar collapsible="icon" className="border-r border-primary/5 bg-white/80 backdrop-blur-xl">
          <SidebarHeader className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 relative overflow-hidden rounded-xl bg-white shadow-sm border border-slate-100">
                <Image src="/logo.png" alt="Logo" fill className="object-contain p-1.5" />
              </div>
              <h1 className="text-lg font-black group-data-[collapsible=icon]:hidden tracking-tight">BluePomodoro</h1>
            </div>
          </SidebarHeader>
          <SidebarContent className="px-4">
            <SidebarGroup>
              <SidebarMenu>
                {[
                  { id: "dashboard", icon: LayoutDashboard, label: "Tablero" },
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
            <div className="flex flex-col gap-1">
              {bodyDoublingMessage && (
                <div className="px-3 py-1.5 bg-primary/5 border border-primary/10 rounded-xl animate-in fade-in slide-in-from-bottom-2 duration-500 group-data-[collapsible=icon]:hidden mb-2">
                  <p className="text-[9px] font-black text-primary/70 flex items-center gap-2 italic">
                    <Users className="h-3 w-3" /> {bodyDoublingMessage}
                  </p>
                </div>
              )}
              <div className="flex items-center gap-3 p-2 bg-muted/30 rounded-xl group-data-[collapsible=icon]:justify-center">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.photoURL || ""} />
                  <AvatarFallback>{user.displayName?.charAt(0) || <UserCircle className="h-5 w-5" />}</AvatarFallback>
                </Avatar>
                <div className="flex-1 group-data-[collapsible=icon]:hidden overflow-hidden">
                  <p className="text-[10px] font-black truncate">{user.isAnonymous ? "Invitado" : user.displayName}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 group-data-[collapsible=icon]:hidden" onClick={signOutAction}>
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
              <div className="flex items-center gap-2">
                <Switch checked={isBlocking} onCheckedChange={(c) => updateDocumentNonBlocking(userRef!, { modoEstrictoActivo: c })} className="scale-75" />
                <span className="text-[10px] font-black uppercase text-muted-foreground">Modo Focus</span>
              </div>
            </div>
          </header>

          <div className="flex-1 p-8 max-w-7xl mx-auto w-full">
            {activeTab === "dashboard" && (
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                {/* Columna Izquierda: Tareas */}
                <div className="xl:col-span-1 space-y-6">
                   <div className="flex items-center justify-between">
                      <h3 className="text-lg font-black">Mi Día</h3>
                      <Badge variant="secondary" className="bg-primary/5 text-primary">Siguiente</Badge>
                   </div>
                   <TaskManager onTaskSelect={(id: string) => setActiveTaskId(id)} activeTaskId={activeTaskId} />
                </div>

                {/* Centro: Pomodoro (EL CORAZÓN) */}
                <div className="xl:col-span-2 flex flex-col items-center">
                  <div className="w-full bg-white rounded-[3rem] p-8 shadow-sm border border-slate-100 flex flex-col items-center justify-center animate-in zoom-in-95 duration-500">
                    {activeTask && (
                      <div className="mb-4 text-center">
                        <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black uppercase tracking-widest mb-1">Enfocado en</Badge>
                        <h2 className="text-2xl font-black tracking-tight">{activeTask.titulo}</h2>
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

                {/* Columna Derecha: Stats y Proyectos */}
                <div className="xl:col-span-1 space-y-6">
                   <GamifiedProgress />
                   <div className="p-6 bg-slate-900 rounded-[2.5rem] text-white">
                      <h4 className="text-xs font-black uppercase text-primary mb-4 flex items-center gap-2">
                        <Trophy className="h-4 w-4" /> Logro de Hoy
                      </h4>
                      <p className="text-lg font-bold">¡Mantén la racha!</p>
                      <p className="text-[11px] text-slate-400 mt-2">Completa 3 sesiones más para ganar la insignia "Maestro de la Mañana".</p>
                   </div>
                   <ProjectManager compact />
                </div>
              </div>
            )}

            {activeTab === "proyectos" && <ProjectManager />}
            {activeTab === "config" && <ConfigurationView />}
            {activeTab === "stats" && <StatsView />}
          </div>
        </main>
        
        {/* Music Dock Superior Fijo */}
        <div className="fixed bottom-0 left-0 right-0 z-50 px-6 pb-6 pointer-events-none">
          <div className="max-w-4xl mx-auto w-full pointer-events-auto">
            <FocusMusic layout="dock" />
          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}

export default function AppEntry() {
  const [activeTab, setActiveTab] = React.useState("dashboard")
  const { user, isUserLoading } = useUser()
  const { toast } = useToast()
  const auth = useAuth()
  const db = useFirestore()

  const [workMinutes, setWorkMinutes] = React.useState(40)
  const [breakMinutes, setBreakMinutes] = React.useState(10)
  const [timeLeft, setTimeLeft] = React.useState(40 * 60)
  const [isActive, setIsActive] = React.useState(false)
  const [mode, setMode] = React.useState<"work" | "break">("work")
  const [sessionsCompleted, setSessionsCompleted] = React.useState(0)
  const [activeTaskId, setActiveTaskId] = React.useState<string | null>(null)
  
  const [isAlarmModalOpen, setIsAlarmModalOpen] = React.useState(false)
  const [bodyDoublingMessage, setBodyDoublingMessage] = React.useState<string | null>(null)
  const audioRef = React.useRef<HTMLAudioElement | null>(null)

  const userRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "usuarios", user.uid)
  }, [db, user])

  const { data: userData } = useDoc(userRef)
  const isBlocking = userData?.modoEstrictoActivo || false

  React.useEffect(() => {
    if (!user) return
    const showMessage = () => {
      const usersCount = Math.floor(Math.random() * 20) + 12 
      setBodyDoublingMessage(`${usersCount} personas enfocadas contigo`)
      setTimeout(() => setBodyDoublingMessage(null), 8000) 
      const nextInterval = (Math.floor(Math.random() * (15 - 5 + 1)) + 5) * 60 * 1000
      setTimeout(showMessage, nextInterval)
    }
    const initialTimeout = setTimeout(showMessage, 3000)
    return () => clearTimeout(initialTimeout)
  }, [user])

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
      const isLongBreak = (sessionsCompleted) % 4 === 0 && sessionsCompleted > 0
      setTimeLeft((isLongBreak ? 20 : breakMinutes) * 60)
    } else {
      setMode("work"); setTimeLeft(workMinutes * 60)
    }
  }

  const toggleTimer = () => setIsActive(!isActive)
  const resetTimer = () => {
    setIsActive(false)
    setTimeLeft(mode === "work" ? workMinutes * 60 : breakMinutes * 60)
  }

  const handleGoogleSignIn = () => signInWithPopup(auth, new GoogleAuthProvider())
  const handleGuestSignIn = () => initiateAnonymousSignIn(auth)
  const handleSignOut = () => signOut(auth)

  if (isUserLoading) return <div className="min-h-screen flex items-center justify-center bg-white"><CloudLightning className="h-12 w-12 text-primary animate-pulse" /></div>

  if (!user) {
    return <LandingPage onLoginGoogle={handleGoogleSignIn} onLoginGuest={handleGuestSignIn} />
  }

  const activeTask = userData?.tareas?.find((t: any) => t.id === activeTaskId)

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
        activeTask={activeTask} 
        mode={mode} 
        sessionsCompleted={sessionsCompleted} 
        toggleTimer={toggleTimer} 
        resetTimer={resetTimer} 
        workMinutes={workMinutes} 
        setWorkMinutes={setWorkMinutes} 
        breakMinutes={breakMinutes} 
        setBreakMinutes={setBreakMinutes} 
        bodyDoublingMessage={bodyDoublingMessage} 
        signOutAction={handleSignOut} 
      />

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
                {mode === "work" ? "TOMAR DESCANSO" : "VOLVER AL FOCUS"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      <Toaster />
    </>
  )
}
