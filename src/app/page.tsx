
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
  XCircle,
  ChevronLeft,
  UserCircle,
  Sparkles,
  Zap,
  Target,
  Brain,
  ArrowRight,
  ShieldCheck,
  Music,
  Trophy,
  ChevronDown
} from "lucide-react"
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroup, SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/toaster"
import { PomodoroTimer } from "@/components/pomodoro-timer"
import { TaskManager } from "@/components/task-manager"
import { FocusMusic } from "@/components/focus-music"
import { ConfigurationView } from "@/components/configuration-view"
import { StatsView } from "@/components/stats-view"
import { ProjectManager } from "@/components/project-manager"
import { KanbanBoard } from "@/components/kanban-board"
import { Button } from "@/components/ui/button"
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

/**
 * COMPONENTE LANDING PAGE
 * Se muestra solo a usuarios NO autenticados.
 */
function LandingPage({ onLoginGoogle, onLoginGuest }: { onLoginGoogle: () => void, onLoginGuest: () => void }) {
  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-primary/20">
      {/* Navegación de la Landing */}
      <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-md border-b border-slate-100 h-20 flex items-center px-6 md:px-12 justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 relative">
            <Image src="/logo.png" alt="Logo" fill className="object-contain" />
          </div>
          <span className="font-black text-xl tracking-tighter">BluePomodoro</span>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" className="hidden md:flex font-bold" onClick={onLoginGuest}>Probar Demo</Button>
          <Button onClick={onLoginGoogle} className="rounded-full px-6 font-bold shadow-lg shadow-primary/20">Empezar ahora</Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 text-primary text-xs font-black uppercase tracking-widest mb-8 border border-primary/10 animate-in fade-in slide-in-from-bottom-4">
          <Sparkles className="h-3.5 w-3.5" /> Impulsado por Inteligencia Artificial
        </div>
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[0.95] mb-8 text-slate-900">
          Domina tu tiempo, <br />
          <span className="text-primary italic">no al revés.</span>
        </h1>
        <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-500 font-medium mb-10 leading-relaxed">
          La primera herramienta de productividad diseñada específicamente para el cerebro moderno y TDAH. 
          Desglose de tareas con IA, gamificación real y enfoque profundo.
        </p>
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-16">
          <Button size="lg" onClick={onLoginGoogle} className="h-16 px-10 rounded-2xl text-lg font-bold gap-3 shadow-xl shadow-primary/25 w-full md:w-auto">
            <LogIn className="h-5 w-5" /> Iniciar con Google
          </Button>
          <Button size="lg" variant="outline" onClick={onLoginGuest} className="h-16 px-10 rounded-2xl text-lg font-bold border-2 w-full md:w-auto">
             Acceso Invitado
          </Button>
        </div>
        <div className="relative max-w-5xl mx-auto rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-slate-100 animate-in zoom-in-95 duration-1000">
          <Image 
            src="https://picsum.photos/seed/dashboard/1200/800" 
            alt="App Preview" 
            width={1200} 
            height={800}
            className="w-full object-cover"
            data-ai-hint="dashboard preview"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent pointer-events-none" />
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-black">Tu cerebro externo.</h2>
            <p className="text-slate-500 font-medium">Todo lo que necesitas para vencer la procrastinación.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-10 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
              <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Brain className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-2xl font-black mb-4">IA Task Breakdown</h3>
              <p className="text-slate-500 leading-relaxed font-medium">¿Te abruma una tarea gigante? Nuestra IA la desglosa en pasos accionables de 25 minutos automáticamente.</p>
            </div>
            <div className="p-10 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
              <div className="h-14 w-14 bg-accent/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Target className="h-7 w-7 text-accent" />
              </div>
              <h3 className="text-2xl font-black mb-4">Neurodivergente</h3>
              <p className="text-slate-500 leading-relaxed font-medium">Diseñado con temporizadores visuales, alarmas intrusivas y alertas de transición para mentes con TDAH.</p>
            </div>
            <div className="p-10 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
              <div className="h-14 w-14 bg-green-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Trophy className="h-7 w-7 text-green-600" />
              </div>
              <h3 className="text-2xl font-black mb-4">Gamificación Pura</h3>
              <p className="text-slate-500 leading-relaxed font-medium">Gana XP, sube de nivel y desbloquea insignias. Convierte tu lista de tareas en un RPG de productividad.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ADHD Specific Section */}
      <section className="py-24 px-6 max-w-7xl mx-auto overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-flex px-4 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-black uppercase tracking-widest border border-accent/20">
              Zero-Distraction Mode
            </div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight">El fin de la "Ceguera del Tiempo".</h2>
            <p className="text-xl text-slate-500 leading-relaxed font-medium">
              Nuestro temporizador analógico y los avisos de transición te preparan mentalmente para el cambio. 
              Sin números abstractos, solo percepción real de tu progreso.
            </p>
            <ul className="space-y-4">
              {[
                { icon: ShieldCheck, text: "Escudo Focus: Bloqueo de sitios distractores." },
                { icon: Music, text: "Integración Spotify: Música de enfoque persistente." },
                { icon: Users, text: "Body Doubling Virtual: Siente el apoyo de la comunidad." },
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 font-bold text-slate-700">
                  <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
             <div className="absolute -inset-4 bg-primary/10 blur-[100px] rounded-full" />
             <div className="relative bg-white p-8 rounded-[3rem] shadow-2xl border border-slate-100">
                <Image 
                  src="https://picsum.photos/seed/timer/800/800" 
                  alt="Timer Feature" 
                  width={800} 
                  height={800}
                  className="rounded-[2rem]"
                  data-ai-hint="pomodoro timer visual"
                />
             </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-32 bg-slate-900 text-white text-center px-6">
        <h2 className="text-4xl md:text-6xl font-black mb-8">¿Listo para recuperar el control?</h2>
        <p className="text-slate-400 text-lg mb-12 max-w-xl mx-auto font-medium">
          Únete a miles de personas que han dejado de procrastinar y han empezado a ejecutar con BluePomodoro.
        </p>
        <div className="flex flex-col md:flex-row items-center justify-center gap-4">
          <Button size="lg" onClick={onLoginGoogle} className="h-16 px-12 rounded-2xl text-xl font-bold bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/20">
            Empezar Gratis
          </Button>
          <Button size="lg" variant="ghost" onClick={onLoginGuest} className="h-16 px-12 rounded-2xl text-xl font-bold text-white hover:bg-white/10">
            Ver Demo
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-100 text-center text-slate-400 font-medium text-sm">
        <div className="flex items-center justify-center gap-3 mb-6 grayscale opacity-50">
          <Image src="/logo.png" alt="Logo" width={30} height={30} />
          <span className="font-black text-slate-900">BluePomodoro</span>
        </div>
        <p>© 2025 BluePomodoro. Diseñado para mentes extraordinarias.</p>
        <div className="flex items-center justify-center gap-6 mt-6">
          <Link href="/privacy" className="hover:text-primary transition-colors">Privacidad</Link>
          <a href="#" className="hover:text-primary transition-colors">Términos</a>
          <a href="#" className="hover:text-primary transition-colors">Soporte</a>
        </div>
      </footer>
    </div>
  )
}

/**
 * COMPONENTE DASHBOARD PRINCIPAL
 */
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
      <div className="flex min-h-screen w-full bg-slate-50/50">
        <Sidebar collapsible="icon" className="border-r border-primary/5 bg-white/80 backdrop-blur-xl">
          <SidebarHeader className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 relative overflow-hidden rounded-xl bg-white shadow-sm border border-slate-100 p-1.5">
                <Image src="/logo.png" alt="Logo" fill className="object-contain p-1" />
              </div>
              <h1 className="text-lg font-black group-data-[collapsible=icon]:hidden tracking-tight">BluePomodoro</h1>
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
          </SidebarContent>
          <SidebarFooter className="p-4 border-t border-primary/5">
            <div className="flex flex-col gap-3">
               <FocusMusic layout="sidebar" />
               <div className="flex flex-col gap-1">
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
                    <AvatarFallback>{user.displayName?.charAt(0) || <UserCircle className="h-5 w-5" />}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 group-data-[collapsible=icon]:hidden overflow-hidden">
                    <p className="text-[10px] font-black truncate">{user.isAnonymous ? "Invitado" : user.displayName}</p>
                    <p className="text-[8px] text-muted-foreground truncate">{user.isAnonymous ? "Sesión Temporal" : user.email}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 group-data-[collapsible=icon]:hidden" onClick={signOutAction}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
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

          <div className={cn("flex-1", activeTab === "pomodoro" ? "p-0 bg-white" : "p-8")}>
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
                      <TaskManager onTaskSelect={(id: string) => setActiveTaskId(id)} activeTaskId={activeTaskId} />
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
              <div className="h-full flex flex-col items-center justify-center p-8 animate-in fade-in duration-500 relative bg-white">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-8 left-8 h-12 w-12 rounded-2xl bg-white shadow-md border border-slate-100"
                  onClick={() => setActiveTab("dashboard")}
                >
                  <ChevronLeft className="h-6 w-6 text-muted-foreground" />
                </Button>
                <div className="max-w-xl w-full flex flex-col items-center">
                  {activeTaskId && (
                    <div className="mb-12 text-center space-y-2">
                      <Badge variant="secondary" className="px-4 py-1 text-[10px] font-black uppercase tracking-[0.2em] bg-primary/10 text-primary border-none">Tarea Activa</Badge>
                      <h2 className="text-4xl font-black tracking-tight text-slate-900">{activeTask?.titulo || "Enfoque Profundo"}</h2>
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
      const usersCount = Math.floor(Math.random() * 20) + 6 
      if (usersCount >= 5) {
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
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setIsAlarmModalOpen(false)
    if (mode === "work") {
      setMode("break"); const isLongBreak = (sessionsCompleted + 1) % 3 === 0 && sessionsCompleted > 0;
      setTimeLeft((isLongBreak ? 20 : breakMinutes) * 60)
    } else {
      setMode("work"); setTimeLeft(workMinutes * 60)
    }
  }

  const toggleTimer = () => setIsActive(!isActive)
  const resetTimer = () => {
    setIsActive(false); setTimeLeft(mode === "work" ? workMinutes * 60 : breakMinutes * 60)
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
                DETENER ALARMA
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      <Toaster />
    </>
  )
}
