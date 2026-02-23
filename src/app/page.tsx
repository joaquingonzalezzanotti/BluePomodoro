
"use client"

import * as React from "react"
import { 
  LayoutDashboard, 
  Calendar as CalendarIcon, 
  Settings, 
  User, 
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
  Music
} from "lucide-react"
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroup, SidebarGroupLabel, SidebarTrigger } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/toaster"
import { PomodoroTimer } from "@/components/pomodoro-timer"
import { TaskManager } from "@/components/task-manager"
import { FocusMusic } from "@/components/focus-music"
import { GamifiedProgress } from "@/components/gamified-progress"
import { DistractionBlocker } from "@/components/distraction-blocker"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth, useUser, useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, setDocumentNonBlocking, useDoc } from "@/firebase"
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { doc, collection, serverTimestamp } from "firebase/firestore"
import { prioritizeTasks } from "@/ai/flows/ai-powered-task-prioritization-flow"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export default function FocusFlowDashboard() {
  const [activeTab, setActiveTab] = React.useState("dashboard")
  const { user, isUserLoading } = useUser()
  const { toast } = useToast()
  const auth = useAuth()
  const db = useFirestore()
  const [isPrioritizing, setIsPrioritizing] = React.useState(false)

  // Obtener datos del usuario para el Escudo Zen global
  const userRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "usuarios", user.uid)
  }, [db, user])

  const { data: userData } = useDoc(userRef)
  const isBlocking = userData?.modoEstrictoActivo || false

  // Sincronizar perfil de usuario en Firestore al iniciar sesión
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
        <div className="h-20 w-20 bg-primary rounded-3xl flex items-center justify-center mb-8 shadow-xl">
          <CloudLightning className="text-white h-12 w-12" />
        </div>
        <h1 className="text-4xl font-bold text-primary mb-4">BluePomodoro</h1>
        <p className="text-muted-foreground max-w-md mb-8">
          La herramienta definitiva para el enfoque profundo. Combina la técnica Pomodoro con IA para dominar tu día.
        </p>
        <Button size="lg" onClick={handleLogin} className="gap-2 px-8 py-6 text-lg rounded-2xl">
          <LogIn className="h-5 w-5" /> Iniciar sesión con Google
        </Button>
        <Toaster />
      </div>
    )
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">Mis Tareas</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs h-7 gap-1"
                    onClick={handleAIPrioritization}
                    disabled={isPrioritizing || !tasks?.length}
                  >
                    <Sparkles className={`h-3 w-3 ${isPrioritizing ? "animate-spin" : ""}`} />
                    Priorizar por IA
                  </Button>
                </div>
                <TaskManager />
              </section>
            </div>
            <div className="space-y-8">
              <section>
                <PomodoroTimer />
              </section>
              <section>
                <GamifiedProgress />
              </section>
            </div>
          </div>
        )
      case "pomodoro":
        return (
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-8">
              <PomodoroTimer />
              <FocusMusic />
            </div>
            <div className="space-y-8">
              <GamifiedProgress />
              <div className="p-6 bg-primary/10 rounded-2xl border border-primary/20">
                <h4 className="font-bold mb-2 flex items-center gap-2 text-primary">
                  <Zap className="h-4 w-4" /> Consejos de Enfoque
                </h4>
                <p className="text-sm text-muted-foreground italic">
                  "El enfoque profundo no es solo hacer más, es hacer lo que importa sin distracciones."
                </p>
              </div>
            </div>
          </div>
        )
      case "tasks":
        return (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold">Gestor de Tareas de Enfoque</h3>
              <Button 
                onClick={handleAIPrioritization}
                disabled={isPrioritizing || !tasks?.length}
                className="gap-2"
              >
                <Sparkles className={`h-4 w-4 ${isPrioritizing ? "animate-spin" : ""}`} />
                Optimizar con IA
              </Button>
            </div>
            <TaskManager />
          </div>
        )
      case "stats":
        return (
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            <GamifiedProgress />
            <div className="bg-card p-8 rounded-2xl border flex flex-col items-center justify-center text-center">
              <BarChart3 className="h-16 w-16 text-primary/20 mb-4" />
              <h4 className="font-bold text-lg mb-2">Estadísticas Detalladas</h4>
              <p className="text-muted-foreground text-sm">
                Completa más sesiones Pomodoro para desbloquear el análisis profundo de tu productividad semanal.
              </p>
            </div>
          </div>
        )
      default:
        return <div>Sección en construcción...</div>
    }
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background font-body">
        <Sidebar className="border-r border-primary/10">
          <SidebarHeader className="p-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                <CloudLightning className="text-white h-5 w-5" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-primary">BluePomodoro</h1>
            </div>
          </SidebarHeader>
          
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Menú Principal</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")}>
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Tablero</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={activeTab === "pomodoro"} onClick={() => setActiveTab("pomodoro")}>
                    <TimerIcon className="h-4 w-4" />
                    <span>Pomodoro</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={activeTab === "tasks"} onClick={() => setActiveTab("tasks")}>
                    <CheckSquare className="h-4 w-4" />
                    <span>Tareas</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Herramientas</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={activeTab === "stats"} onClick={() => setActiveTab("stats")}>
                    <BarChart3 className="h-4 w-4" />
                    <span>Estadísticas</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={activeTab === "calendar"} onClick={() => setActiveTab("calendar")}>
                    <CalendarIcon className="h-4 w-4" />
                    <span>Calendario</span>
                    <Badge variant="outline" className="ml-auto text-[10px] h-4">Beta</Badge>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-4 border-t border-primary/10">
            <div className="flex items-center gap-3 px-2 py-3 bg-primary/5 rounded-xl">
              <Avatar className="h-10 w-10 border-2 border-primary/20">
                <AvatarImage src={user.photoURL || undefined} />
                <AvatarFallback>{user.displayName?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{user.displayName || "Usuario"}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-tighter font-bold">MAESTRO NIVEL {Math.floor((userData?.puntosTotales || 0) / 500) + 1}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 overflow-auto">
          <header className="h-16 border-b border-primary/10 bg-white/50 backdrop-blur-md sticky top-0 z-10 px-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="md:hidden" />
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  {user.displayName?.split(" ")[0]} <span className="animate-wave text-base">✨</span>
                </h2>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full border border-primary/5">
                <Label htmlFor="zen-mode" className="flex items-center gap-2 cursor-pointer">
                  {isBlocking ? <Shield className="h-4 w-4 text-primary" /> : <ShieldAlert className="h-4 w-4 text-muted-foreground" />}
                  <span className="text-xs font-bold uppercase tracking-wider">{isBlocking ? "Zen Activo" : "Escudo Zen"}</span>
                </Label>
                <Switch 
                  id="zen-mode" 
                  checked={isBlocking} 
                  onCheckedChange={toggleZenMode}
                  className="scale-75"
                />
              </div>
              
              <Button 
                size="sm" 
                className="bg-primary hover:bg-primary/80 gap-2 rounded-full px-4"
                onClick={() => setActiveTab("pomodoro")}
              >
                <Zap className="h-4 w-4 fill-current" /> ENFOQUE
              </Button>
            </div>
          </header>

          <div className="p-8 max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
        <Toaster />
      </div>
    </SidebarProvider>
  )
}
