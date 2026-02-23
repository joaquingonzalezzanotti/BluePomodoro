
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
  RefreshCw,
  LogIn,
  Sparkles,
  Timer as TimerIcon,
  Shield,
  ShieldAlert,
  FolderKanban,
  Library,
  Music,
  Play,
  Pause,
  SkipForward
} from "lucide-react"
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroup, SidebarGroupLabel, SidebarTrigger } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/toaster"
import { PomodoroTimer } from "@/components/pomodoro-timer"
import { TaskManager } from "@/components/task-manager"
import { FocusMusic } from "@/components/focus-music"
import { GamifiedProgress } from "@/components/gamified-progress"
import { DistractionBlocker } from "@/components/distraction-blocker"
import { KanbanBoard } from "@/components/kanban-board"
import { ProjectManager } from "@/components/project-manager"
import { GoogleSyncSettings } from "@/components/google-sync-settings"
import { StatsView } from "@/components/stats-view"
import { Button } from "@/components/ui/button"
import { useAuth, useUser, useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, setDocumentNonBlocking, useDoc } from "@/firebase"
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { doc, collection, serverTimestamp } from "firebase/firestore"
import { prioritizeTasks } from "@/ai/flows/ai-powered-task-prioritization-flow"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function FocusFlowDashboard() {
  const [activeTab, setActiveTab] = React.useState("dashboard")
  const { user, isUserLoading } = useUser()
  const { toast } = useToast()
  const auth = useAuth()
  const db = useFirestore()
  const [isPrioritizing, setIsPrioritizing] = React.useState(false)
  const [isMusicPlaying, setIsMusicPlaying] = React.useState(false)

  const userRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "usuarios", user.uid)
  }, [db, user])

  const { data: userData } = useDoc(userRef)
  const isBlocking = userData?.modoEstrictoActivo || false

  React.useEffect(() => {
    if (user && db) {
      const userDocRef = doc(db, "usuarios", user.uid)
      setDocumentNonBlocking(userDocRef, {
        id: user.uid,
        nombre: user.displayName || "Usuario",
        email: user.email,
        puntosTotales: userData?.puntosTotales || 0,
        fechaRegistro: serverTimestamp(),
      }, { merge: true })
    }
  }, [user, db, userData?.puntosTotales])

  const tasksQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return collection(db, "usuarios", user.uid, "tareas")
  }, [db, user])

  const { data: tasks } = useCollection(tasksQuery)

  const handleLogin = () => {
    const provider = new GoogleAuthProvider()
    provider.addScope('https://www.googleapis.com/auth/calendar.readonly')
    provider.addScope('https://www.googleapis.com/auth/tasks.readonly')
    
    signInWithPopup(auth, provider).catch((error: any) => {
      toast({
        variant: "destructive",
        title: "Error de Inicio de Sesión",
        description: "Asegúrate de haber habilitado el proveedor de Google en la consola de Firebase.",
      })
    })
  }

  const handleLogout = () => {
    signOut(auth).catch((error: any) => {
      toast({
        variant: "destructive",
        title: "Error al cerrar sesión",
        description: error.message,
      })
    })
  }

  const toggleZenMode = (checked: boolean) => {
    if (!userRef) return
    updateDocumentNonBlocking(userRef, { modoEstrictoActivo: checked })
    toast({
      title: checked ? "Escudo Zen Activado" : "Escudo Zen Desactivado",
      description: checked ? "Distracciones bloqueadas." : "Vuelves al modo normal.",
    })
  }

  const handleAIPrioritization = async () => {
    if (!tasks || tasks.length === 0 || !user || !db) return
    
    setIsPrioritizing(true)
    try {
      const inputTasks = tasks.map(t => ({
        id: t.id,
        title: t.titulo,
        priority: t.prioridad,
        deadline: t.fechaVencimiento || "Mañana",
        effort: t.esfuerzoEstimadoPomodoros || 1
      }))

      const result = await prioritizeTasks({
        tasks: inputTasks,
        userEnergyLevel: "Alto"
      })

      result.prioritizedTaskIds.forEach((id, index) => {
        const taskDocRef = doc(db, "usuarios", user.uid, `tareas/${id}`)
        let newPriority = "Media"
        if (index < result.prioritizedTaskIds.length / 3) newPriority = "Alta"
        else if (index > (result.prioritizedTaskIds.length * 2) / 3) newPriority = "Baja"
        
        updateDocumentNonBlocking(taskDocRef, { prioridad: newPriority })
      })

      toast({
        title: "IA ha reorganizado tu día",
        description: result.reasoning,
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error de IA",
        description: "No se pudo completar la priorización.",
      })
    } finally {
      setIsPrioritizing(false)
    }
  }

  if (isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <CloudLightning className="h-12 w-12 text-primary animate-pulse" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <div className="h-24 w-24 bg-primary rounded-[2.5rem] flex items-center justify-center mb-10 shadow-2xl shadow-primary/30 transform hover:scale-110 transition-transform">
          <CloudLightning className="text-white h-12 w-12" />
        </div>
        <h1 className="text-5xl font-extrabold text-foreground tracking-tighter mb-4">BluePomodoro</h1>
        <p className="text-muted-foreground max-w-sm mb-10 leading-relaxed font-medium">
          El ecosistema definitivo de enfoque profundo impulsado por IA.
        </p>
        <Button size="lg" onClick={handleLogin} className="gap-3 px-10 py-7 text-lg rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all font-bold">
          <LogIn className="h-5 w-5" /> Empezar ahora
        </Button>
        <Toaster />
      </div>
    )
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="lg:col-span-2 space-y-8">
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-extrabold tracking-tight text-foreground">Tu flujo de trabajo</h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-[11px] font-bold uppercase tracking-widest h-8 gap-2 bg-white/50 border-primary/10 hover:bg-primary/5 hover:text-primary rounded-full transition-all"
                    onClick={handleAIPrioritization}
                    disabled={isPrioritizing || !tasks?.length}
                  >
                    <Sparkles className={`h-3.5 w-3.5 ${isPrioritizing ? "animate-spin" : ""}`} />
                    Optimizar con IA
                  </Button>
                </div>
                <TaskManager />
              </section>
            </div>
            <div className="space-y-8">
              <section><PomodoroTimer /></section>
              <section><GamifiedProgress /></section>
            </div>
          </div>
        )
      case "pomodoro":
        return (
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 animate-in zoom-in-95 duration-500">
            <div className="space-y-8">
              <PomodoroTimer />
              <FocusMusic />
            </div>
            <div className="space-y-8">
              <GamifiedProgress />
              <DistractionBlocker />
            </div>
          </div>
        )
      case "tasks":
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <Tabs defaultValue="list" className="w-full">
              <TabsList className="bg-muted/50 p-1 mb-8 rounded-xl">
                <TabsTrigger value="list" className="gap-2 rounded-lg font-bold text-xs"><CheckSquare className="h-4 w-4" /> LISTA</TabsTrigger>
                <TabsTrigger value="kanban" className="gap-2 rounded-lg font-bold text-xs"><FolderKanban className="h-4 w-4" /> TABLERO</TabsTrigger>
              </TabsList>
              <TabsContent value="list" className="mt-0"><TaskManager /></TabsContent>
              <TabsContent value="kanban" className="mt-0"><KanbanBoard /></TabsContent>
            </Tabs>
          </div>
        )
      case "projects":
        return <div className="animate-in fade-in duration-500"><ProjectManager /></div>
      case "sync":
        return <div className="animate-in fade-in duration-500"><GoogleSyncSettings /></div>
      case "stats":
        return <StatsView />
      default:
        return <div className="py-20 text-center text-muted-foreground font-medium">Sección en construcción...</div>
    }
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background font-sans selection:bg-primary/10">
        <Sidebar className="border-r border-primary/5 bg-white/80 backdrop-blur-xl">
          <SidebarHeader className="p-8">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                <CloudLightning className="text-white h-5 w-5" />
              </div>
              <h1 className="text-xl font-extrabold tracking-tighter text-foreground">BluePomodoro</h1>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="px-4">
            <SidebarGroup>
              <SidebarGroupLabel className="text-[10px] font-extrabold text-muted-foreground/50 tracking-[0.2em] uppercase mb-2">Ecosistema</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} className="rounded-xl h-11 font-semibold text-sm">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Tablero General</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={activeTab === "pomodoro"} onClick={() => setActiveTab("pomodoro")} className="rounded-xl h-11 font-semibold text-sm">
                    <TimerIcon className="h-4 w-4" />
                    <span>Zona de Enfoque</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={activeTab === "tasks"} onClick={() => setActiveTab("tasks")} className="rounded-xl h-11 font-semibold text-sm">
                    <CheckSquare className="h-4 w-4" />
                    <span>Tareas & Kanban</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={activeTab === "projects"} onClick={() => setActiveTab("projects")} className="rounded-xl h-11 font-semibold text-sm">
                    <Library className="h-4 w-4" />
                    <span>Proyectos</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>

            <SidebarGroup className="mt-4">
              <SidebarGroupLabel className="text-[10px] font-extrabold text-muted-foreground/50 tracking-[0.2em] uppercase mb-2">Análisis</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={activeTab === "sync"} onClick={() => setActiveTab("sync")} className="rounded-xl h-11 font-semibold text-sm">
                    <RefreshCw className="h-4 w-4" />
                    <span>Conexión Google</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={activeTab === "stats"} onClick={() => setActiveTab("stats")} className="rounded-xl h-11 font-semibold text-sm">
                    <BarChart3 className="h-4 w-4" />
                    <span>Estadísticas</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>

            <SidebarGroup className="mt-4">
              <SidebarGroupLabel className="text-[10px] font-extrabold text-muted-foreground/50 tracking-[0.2em] uppercase mb-2">Audio Zen</SidebarGroupLabel>
              <div className="px-2 py-3 bg-muted/30 rounded-2xl border border-primary/5">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center ${isMusicPlaying ? "animate-pulse" : ""}`}>
                    <Music className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold truncate">Focus Beats</p>
                    <p className="text-[8px] text-muted-foreground uppercase font-black">Lo-Fi Study</p>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => setIsMusicPlaying(!isMusicPlaying)}>
                    {isMusicPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-current" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                    <SkipForward className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-6 border-t border-primary/5">
            <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-2xl hover:bg-muted/60 transition-colors">
              <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                <AvatarImage src={user.photoURL || undefined} />
                <AvatarFallback className="font-bold">{user.displayName?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-extrabold truncate text-foreground">{user.displayName || "Usuario"}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">MAESTRO L{Math.floor((userData?.puntosTotales || 0) / 500) + 1}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/5 rounded-lg" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 overflow-auto bg-slate-50/50">
          <header className="h-20 border-b border-primary/5 bg-white/70 backdrop-blur-md sticky top-0 z-20 px-10 flex items-center justify-between shadow-sm shadow-primary/5">
            <div className="flex items-center gap-6">
              <SidebarTrigger className="md:hidden" />
              <div>
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground/60 mb-0.5">
                  Navegación / {activeTab}
                </h2>
                <h3 className="text-xl font-extrabold tracking-tight text-foreground">
                  {activeTab === "dashboard" ? "Mi Tablero" : activeTab === "pomodoro" ? "Modo Enfoque" : activeTab === "stats" ? "Productividad" : activeTab}
                </h3>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-white rounded-2xl border border-primary/10 shadow-sm">
                <Label htmlFor="zen-mode" className="flex items-center gap-2.5 cursor-pointer">
                  {isBlocking ? <Shield className="h-4 w-4 text-primary" /> : <ShieldAlert className="h-4 w-4 text-muted-foreground/40" />}
                  <span className="text-[10px] font-black uppercase tracking-widest text-foreground">{isBlocking ? "Zen Activo" : "Escudo Zen"}</span>
                </Label>
                <Switch 
                  id="zen-mode" 
                  checked={isBlocking} 
                  onCheckedChange={toggleZenMode}
                  className="scale-90"
                />
              </div>
              
              <Button 
                size="lg" 
                className="bg-primary hover:bg-primary/90 gap-3 rounded-2xl px-8 shadow-lg shadow-primary/10 font-bold transition-all transform hover:scale-105"
                onClick={() => setActiveTab("pomodoro")}
              >
                <Zap className="h-4 w-4 fill-current" /> ENFOCARSE
              </Button>
            </div>
          </header>

          <div className="p-10 max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
        <Toaster />
      </div>
    </SidebarProvider>
  )
}
