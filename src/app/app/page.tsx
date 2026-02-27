
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
  CheckSquare,
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
import { useSession, useSupabase, useUser } from "@/supabase"
import { useProfile } from "@/supabase/hooks"
import { usePomodoro } from "@/pomodoro/pomodoro-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

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
  longBreakAfter,
  longBreakThreshold,
  longBreakMinutesHigh,
  longBreakMinutesLow,
  signOutAction 
}: any) {
  const { toggleSidebar, isMobile, setOpenMobile } = useSidebar()
  const displayName =
    (user as any)?.user_metadata?.full_name ||
    (user as any)?.user_metadata?.name ||
    user?.email ||
    "Usuario"
  const photoUrl = (user as any)?.user_metadata?.avatar_url || ""
  const isGuest = (user as any)?.is_anonymous || false

  const tabTitles: Record<string, string> = {
    dashboard: "Tablero de Enfoque",
    foco: "Modo Zen",
    tareas: "Gestión de Tareas",
    proyectos: "Mis Proyectos",
    stats: "Estadísticas",
    config: "Configuración"
  }

  return (
    <SidebarProvider defaultOpen={true} style={{ "--sidebar-width": "16rem", "--sidebar-width-icon": "5rem" } as React.CSSProperties}>
      <div className="flex min-h-screen w-full bg-slate-50/50 pb-24">
        <Sidebar collapsible="icon" className="border-r border-primary/5 bg-white/80 backdrop-blur-xl transition-all duration-300">
          <SidebarHeader className="p-4 flex items-center justify-center">
            <SidebarMenu>
              <SidebarToggle />
            </SidebarMenu>
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
                      onClick={() => {
                        setActiveTab(item.id)
                        if (isMobile) setOpenMobile(false)
                      }} 
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
            <div className="flex items-center gap-3 p-2 bg-muted/30 rounded-xl group-data-[collapsible=icon]:justify-center overflow-hidden transition-all">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={photoUrl} />
                <AvatarFallback>{displayName?.charAt(0) || <UserCircle className="h-5 w-5" />}</AvatarFallback>
              </Avatar>
              <div className="flex-1 group-data-[collapsible=icon]:hidden overflow-hidden">
                <p className="text-[10px] font-black truncate">{isGuest ? "Invitado" : displayName}</p>
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
              <div className="flex items-center gap-3 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
                  className="md:hidden h-9 w-9 rounded-lg"
                  aria-label="Abrir menú"
                >
                  <PanelLeft className="h-5 w-5 text-primary" />
                </Button>
                <div className="h-8 w-8 relative overflow-hidden rounded-lg bg-white shadow-sm border border-slate-100 flex items-center justify-center">
                  <Image src="/logo.png" alt="Logo BluePomodoro" width={24} height={24} className="rounded-md object-contain" />
                </div>
                <h1 className="text-sm font-black tracking-tighter text-primary">BluePomodoro</h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={activeTab === "foco"} onCheckedChange={(checked) => setActiveTab(checked ? "foco" : "dashboard")} className="scale-75" />
                <span className="text-[10px] font-black uppercase text-muted-foreground">Modo Zen</span>
              </div>
            </div>
          </header>

          <div className="flex-1 p-8 w-full max-w-[1600px] mx-auto space-y-8">
            <div className="space-y-1">
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">{tabTitles[activeTab]}</h1>
              <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">{activeTab}</p>
            </div>

            {activeTab === "dashboard" && (
              <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-8 items-start">
                <div className="min-w-0">
                  <TaskManager onTaskSelect={(id: string | null) => setActiveTaskId(id)} activeTaskId={activeTaskId} />
                </div>
                <div className="xl:sticky xl:top-24 w-full">
                  <Card className="bg-white rounded-[2.5rem] p-6 xl:p-8 pt-4 xl:pt-6 shadow-xl border border-slate-100 flex flex-col items-center justify-start overflow-hidden min-h-[140px] xl:min-h-0">
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
                      longBreakAfter={longBreakAfter}
                      longBreakThreshold={longBreakThreshold}
                      longBreakMinutesHigh={longBreakMinutesHigh}
                      longBreakMinutesLow={longBreakMinutesLow}
                    />
                  </Card>
                   <SpotifyRealTime />
                </div>
              </div>
            )}

            {activeTab === "foco" && (
              <div className="flex flex-col items-center justify-center gap-12 min-h-[70vh] animate-in zoom-in-95 duration-700">
                <div className="bg-white rounded-[4rem] p-8 lg:p-16 shadow-2xl border border-slate-100 flex flex-col items-center justify-center w-full max-w-6xl">
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
                    longBreakAfter={longBreakAfter}
                    longBreakThreshold={longBreakThreshold}
                    longBreakMinutesHigh={longBreakMinutesHigh}
                    longBreakMinutesLow={longBreakMinutesLow}
                    large
                  />
                </div>
                <div className="max-w-2xl w-full">
                   <TaskManager onTaskSelect={(id: string | null) => setActiveTaskId(id)} activeTaskId={activeTaskId} onlyActive />
                </div>
              </div>
            )}

            {activeTab === "tareas" && (
              <div className="space-y-6">
                <Tabs defaultValue="lista" className="w-full">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-black">Organiza tus Pendientes</h2>
                    <TabsList className="bg-white p-1 rounded-xl shadow-sm border border-slate-100">
                      <TabsTrigger value="lista" className="rounded-lg px-6 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">Lista</TabsTrigger>
                      <TabsTrigger value="kanban" className="rounded-lg px-6 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">Kanban</TabsTrigger>
                    </TabsList>
                  </div>
                  <TabsContent value="lista" className="animate-in fade-in duration-500">
                    <TaskManager onTaskSelect={(id: string | null) => setActiveTaskId(id)} activeTaskId={activeTaskId} />
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
  const { session } = useSession()
  const supabase = useSupabase()
  const { data: profile } = useProfile()
  const {
    mode,
    isActive,
    timeLeft,
    sessionsCompleted,
    toggleTimer,
    resetTimer,
    workMinutes,
    setWorkMinutes,
    breakMinutes,
    setBreakMinutes,
    longBreakAfter,
    longBreakThreshold,
    longBreakMinutesHigh,
    longBreakMinutesLow,
    stopAlarm,
    alarmOpen,
    activeTaskId,
    setActiveTaskId,
    syncSettingsFromProfile,
  } = usePomodoro()
  const [activeTab, setActiveTab] = React.useState("dashboard")
  const router = useRouter()
  const audioRef = React.useRef<HTMLAudioElement | null>(null)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (profile) {
      syncSettingsFromProfile(profile)
    }
  }, [profile, syncSettingsFromProfile])

  React.useEffect(() => {
    if (!user || typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const code = params.get("code")
    const state = params.get("state")
    if (!code || !state) return

    const storedState = sessionStorage.getItem("spotify_pkce_state")
    const codeVerifier = sessionStorage.getItem("spotify_pkce_verifier")
    const accessToken = session?.access_token
    if (!storedState || storedState !== state || !codeVerifier || !accessToken) return

    const redirectUri = `${window.location.origin}/app`

    const exchange = async () => {
      try {
        await fetch("/api/spotify/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ code, redirectUri, codeVerifier }),
        })
      } finally {
        sessionStorage.removeItem("spotify_pkce_state")
        sessionStorage.removeItem("spotify_pkce_verifier")
        params.delete("code")
        params.delete("state")
        const nextUrl = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`
        window.history.replaceState({}, document.title, nextUrl)
      }
    }

    exchange()
  }, [user, session?.access_token])

  React.useEffect(() => {
    if (!user || !profile) return
    const needsUpdate =
      profile.pomodoro_work_minutes !== workMinutes ||
      profile.pomodoro_break_minutes !== breakMinutes ||
      profile.pomodoro_long_break_after !== longBreakAfter ||
      profile.pomodoro_long_break_threshold !== longBreakThreshold ||
      profile.pomodoro_long_break_minutes_high !== longBreakMinutesHigh ||
      profile.pomodoro_long_break_minutes_low !== longBreakMinutesLow

    if (!needsUpdate) return

    const timeout = setTimeout(() => {
      supabase
        .from("profiles")
        .update({
          pomodoro_work_minutes: workMinutes,
          pomodoro_break_minutes: breakMinutes,
          pomodoro_long_break_after: longBreakAfter,
          pomodoro_long_break_threshold: longBreakThreshold,
          pomodoro_long_break_minutes_high: longBreakMinutesHigh,
          pomodoro_long_break_minutes_low: longBreakMinutesLow,
        })
        .eq("id", user.id)
    }, 500)
    return () => clearTimeout(timeout)
  }, [
    user,
    profile,
    supabase,
    workMinutes,
    breakMinutes,
    longBreakAfter,
    longBreakThreshold,
    longBreakMinutesHigh,
    longBreakMinutesLow,
  ])

  React.useEffect(() => {
    if (!alarmOpen) {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      return
    }

    if (typeof window !== "undefined") {
      const audio = new Audio("https://actions.google.com/sounds/v1/alarms/alarm_clock_beeping.ogg")
      audio.loop = true
      audio.play().catch(() => {})
      audioRef.current = audio
    }
  }, [alarmOpen])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/app`,
        scopes: "https://www.googleapis.com/auth/tasks.readonly https://www.googleapis.com/auth/calendar.readonly",
      },
    })
  }

  if (!mounted) return null
  if (isUserLoading) return <div className="min-h-screen flex items-center justify-center bg-white"><CloudLightning className="h-12 w-12 text-primary animate-pulse" /></div>

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-10 rounded-[2.5rem] shadow-2xl bg-white text-center space-y-8">
          <div className="h-20 w-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto">
            <TimerIcon className="h-10 w-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-slate-900">Acceso Requerido</h2>
            <p className="text-slate-500 font-medium">Inicia sesion para acceder a tu tablero de productividad.</p>
          </div>
          <div className="space-y-4">
            <Button onClick={handleGoogleSignIn} className="w-full h-14 rounded-2xl font-black text-lg gap-3">
              <LogIn className="h-5 w-5" /> Iniciar con Google
            </Button>
            <Button variant="ghost" onClick={() => router.push("/")} className="w-full font-bold">
              Volver a la Landing Page
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <>
      <DashboardContent 
        user={user} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isActive={isActive} 
        timeLeft={timeLeft} 
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
        longBreakAfter={longBreakAfter}
        longBreakThreshold={longBreakThreshold}
        longBreakMinutesHigh={longBreakMinutesHigh}
        longBreakMinutesLow={longBreakMinutesLow}
        signOutAction={handleSignOut} 
      />

      <AlertDialog open={alarmOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-10 max-w-sm">
          <AlertDialogHeader className="items-center text-center">
            <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-4 animate-bounce">
              <TimerIcon className="h-10 w-10 text-primary" />
            </div>
            <AlertDialogTitle className="text-2xl font-black text-primary">Tiempo Cumplido!</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium text-slate-500">
              Has completado tu sesion de {mode === "work" ? "enfoque" : "descanso"}.
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
