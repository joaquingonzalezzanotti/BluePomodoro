
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
  LogIn
} from "lucide-react"
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroup, SidebarGroupLabel } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/toaster"
import { PomodoroTimer } from "@/components/pomodoro-timer"
import { TaskManager } from "@/components/task-manager"
import { FocusMusic } from "@/components/focus-music"
import { GamifiedProgress } from "@/components/gamified-progress"
import { DistractionBlocker } from "@/components/distraction-blocker"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth, useUser } from "@/firebase"
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"

export default function FocusFlowDashboard() {
  const [activeTab, setActiveTab] = React.useState("dashboard")
  const { user, isUserLoading } = useUser()
  const { toast } = useToast()
  const auth = useAuth()

  const handleLogin = () => {
    const provider = new GoogleAuthProvider()
    signInWithPopup(auth, provider).catch((error: any) => {
      if (error.code === 'auth/operation-not-allowed') {
        toast({
          variant: "destructive",
          title: "Error de Configuración",
          description: "El inicio de sesión con Google no está habilitado en la consola de Firebase. Por favor, actívalo en Authentication > Sign-in method.",
        })
      } else {
        toast({
          variant: "destructive",
          title: "Error de Inicio de Sesión",
          description: error.message || "No se pudo iniciar sesión con Google.",
        })
      }
    })
  }

  const handleLogout = () => {
    signOut(auth).catch((error: any) => {
      toast({
        variant: "destructive",
        title: "Error al cerrar sesión",
        description: error.message || "Ocurrió un problema inesperado.",
      })
    })
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
              <SidebarGroupLabel>Espacio de Trabajo</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")}>
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Tablero</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={activeTab === "tasks"} onClick={() => setActiveTab("tasks")}>
                    <CheckSquare className="h-4 w-4" />
                    <span>Tareas de Enfoque</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={activeTab === "calendar"} onClick={() => setActiveTab("calendar")}>
                    <CalendarIcon className="h-4 w-4" />
                    <span>Sincronización</span>
                    <Badge variant="outline" className="ml-auto text-[10px] h-4">Conectado</Badge>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={activeTab === "stats"} onClick={() => setActiveTab("stats")}>
                    <BarChart3 className="h-4 w-4" />
                    <span>Estadísticas</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Ajustes</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    <Settings className="h-4 w-4" />
                    <span>Configuración</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-4 border-t border-primary/10">
            <div className="flex items-center gap-3 px-2 py-3 bg-primary/5 rounded-xl">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.photoURL || undefined} />
                <AvatarFallback>{user.displayName?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{user.displayName || "Usuario"}</p>
                <p className="text-xs text-muted-foreground truncate">Plan Gratuito</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 overflow-auto">
          <header className="h-16 border-b border-primary/10 bg-white/50 backdrop-blur-md sticky top-0 z-10 px-8 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                Buenos días, {user.displayName?.split(" ")[0]} <span className="animate-wave">👋</span>
              </h2>
              <p className="text-xs text-muted-foreground">¿Listo para una sesión productiva?</p>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" className="gap-2 border-primary/20 hover:bg-primary/5">
                <RefreshCw className="h-4 w-4" /> Sincronizar Calendario
              </Button>
              <Button size="sm" className="bg-primary hover:bg-primary/80 gap-2">
                <Zap className="h-4 w-4 fill-current" /> ENFOQUE PROFUNDO
              </Button>
            </div>
          </header>

          <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">Flujo de Enfoque Hoy</h3>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="text-xs h-7">Por Fecha</Button>
                      <Button variant="ghost" size="sm" className="text-xs h-7">Priorizar por IA</Button>
                    </div>
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-8">
                  <section>
                    <FocusMusic />
                  </section>
                  
                  <section>
                    <DistractionBlocker />
                  </section>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Toaster />
      </div>
    </SidebarProvider>
  )
}
