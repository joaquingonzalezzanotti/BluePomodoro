
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
  PanelLeft,
  CalendarDays
} from "lucide-react"
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroup, useSidebar } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/toaster"
import { PomodoroTimer } from "@/components/pomodoro-timer"
import { ZenTimer } from "@/components/zen-timer"
import { TaskManager } from "@/components/task-manager"
import { ConfigurationView } from "@/components/configuration-view"
import { StatsView } from "@/components/stats-view"
import { ProjectManager } from "@/components/project-manager"
import { KanbanBoard } from "@/components/kanban-board"
import { CalendarFocusView } from "@/components/calendar-focus-view"
import { FocusMusic } from "@/components/focus-music"
import { SpotifyRealTime } from "@/components/spotify-real-time"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useSession, useSupabase, useUser } from "@/supabase"
import { useProfile, useSupabaseQuery } from "@/supabase/hooks"
import { usePomodoro } from "@/pomodoro/pomodoro-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { syncGoogleBridge } from "@/lib/google-sync-client"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import type { Task } from "@/supabase/types"

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

function MobileSidebarTrigger() {
  const { toggleSidebar } = useSidebar()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      className="md:hidden h-9 w-9 rounded-lg"
      aria-label="Abrir menú"
    >
      <PanelLeft className="h-5 w-5 text-primary" />
    </Button>
  )
}

function SidebarNavButton({
  item,
  activeTab,
  setActiveTab
}: {
  item: { id: string; label: string; icon: React.ElementType }
  activeTab: string
  setActiveTab: (id: string) => void
}) {
  const { isMobile, setOpenMobile } = useSidebar()

  return (
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
  )
}

function MobileSidebarHotZone() {
  const { isMobile, openMobile, setOpenMobile } = useSidebar()
  const startRef = React.useRef<{ x: number; y: number } | null>(null)

  if (!isMobile || openMobile) return null

  const handleStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0]
    if (!touch) return
    startRef.current = { x: touch.clientX, y: touch.clientY }
  }

  const handleMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!startRef.current) return
    const touch = event.touches[0]
    if (!touch) return
    const deltaX = touch.clientX - startRef.current.x
    const deltaY = touch.clientY - startRef.current.y
    if (deltaX > 50 && Math.abs(deltaY) < 30) {
      setOpenMobile(true)
      startRef.current = null
    }
  }

  const handleEnd = () => {
    startRef.current = null
  }

  return (
    <div
      aria-hidden="true"
      className="fixed left-0 top-0 z-40 h-full w-4 bg-transparent touch-pan-y md:hidden"
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      onTouchCancel={handleEnd}
    />
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
  skipToNext,
  registerManualPomodoro,
  workMinutes, 
  setWorkMinutes, 
  breakMinutes, 
  setBreakMinutes, 
  longBreakAfter,
  longBreakThreshold,
  longBreakMinutesHigh,
  longBreakMinutesLow,
  focusBoardRestOpen,
  onFocusBoardRestOpenChange,
  signOutAction 
}: any) {
  const displayName =
    (user as any)?.user_metadata?.full_name ||
    (user as any)?.user_metadata?.name ||
    user?.email ||
    "Usuario"
  const photoUrl = (user as any)?.user_metadata?.avatar_url || ""
  const isGuest = (user as any)?.is_anonymous || false

  const tabTitles: Record<string, string> = {
    dashboard: "Tablero de Enfoque",
    agenda: "Agenda Inteligente",
    foco: "Modo Zen",
    tareas: "Gestión de Tareas",
    proyectos: "Mis Proyectos",
    stats: "Estadísticas",
    config: "Configuración"
  }
  const isZenMode = activeTab === "foco"

  return (
    <SidebarProvider defaultOpen={true} style={{ "--sidebar-width": "16rem", "--sidebar-width-icon": "5rem" } as React.CSSProperties}>
      <div
        className={cn(
          "flex w-full bg-slate-50/50",
          isZenMode ? "h-screen overflow-hidden" : "min-h-screen pb-24"
        )}
        style={isZenMode ? { height: "100dvh" } : undefined}
      >
        <MobileSidebarHotZone />
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
                  { id: "agenda", icon: CalendarDays, label: "Agenda" },
                  { id: "foco", icon: Target, label: "Foco" },
                  { id: "tareas", icon: CheckSquare, label: "Tareas" },
                  { id: "proyectos", icon: FolderKanban, label: "Proyectos" },
                  { id: "stats", icon: BarChart3, label: "Estadísticas" },
                  { id: "config", icon: Settings, label: "Configuración" },
                ].map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarNavButton item={item} activeTab={activeTab} setActiveTab={setActiveTab} />
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

        <main className={cn("flex-1 min-w-0 flex flex-col", isZenMode ? "overflow-hidden" : "overflow-auto")}>
          <header className="h-16 border-b border-primary/5 bg-white/70 backdrop-blur-md sticky top-0 z-20 px-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 shrink-0">
                <MobileSidebarTrigger />
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

          <div
            className={cn(
              "flex-1 w-full mx-auto",
              isZenMode
                ? "max-w-[1700px] px-4 py-3 md:px-6 md:py-4 flex flex-col overflow-hidden"
                : "max-w-[1600px] p-8 space-y-8"
            )}
          >
            {activeTab !== "dashboard" && !isZenMode && (
              <div className="space-y-1">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">{tabTitles[activeTab]}</h1>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">{activeTab}</p>
              </div>
            )}

            {activeTab === "dashboard" && (
              <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-8 items-start">
                <div className="min-w-0 space-y-8">
                  <div className="space-y-1">
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">{tabTitles[activeTab]}</h1>
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">{activeTab}</p>
                  </div>
                  <TaskManager
                    onTaskSelect={(id: string | null) => setActiveTaskId(id)}
                    activeTaskId={activeTaskId}
                    focusBoard
                    restDropdownOpen={focusBoardRestOpen}
                    onRestDropdownOpenChange={onFocusBoardRestOpenChange}
                  />
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
                      skipToNext={skipToNext}
                      registerManualPomodoro={registerManualPomodoro}
                      activeTaskId={activeTaskId}
                      setActiveTaskId={setActiveTaskId}
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

            {activeTab === "agenda" && (
              <CalendarFocusView
                activeTaskId={activeTaskId}
                onTaskSelect={(id) => setActiveTaskId(id)}
                onOpenFocusTab={() => setActiveTab("foco")}
              />
            )}

            {activeTab === "foco" && (
              <div className="flex flex-1 min-h-0 flex-col items-center justify-center animate-in zoom-in-95 duration-700 w-full h-full relative z-0">
                <div className="w-full h-full flex items-center justify-center">
                  <ZenTimer 
                    timeLeft={timeLeft}
                    isActive={isActive}
                    mode={mode}
                    toggleTimer={toggleTimer}
                  />
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

          {!isZenMode && <FocusMusic layout="dock" />}
        </main>
      </div>
    </SidebarProvider>
  )
}

export default function AppEntry() {
  const [mounted, setMounted] = React.useState(false)
  const [focusBoardRestOpen, setFocusBoardRestOpen] = React.useState(false)
  const { user, isUserLoading } = useUser()
  const { session } = useSession()
  const supabase = useSupabase()
  const { data: profile } = useProfile()
  const { data: tasks } = useSupabaseQuery<Task[]>(
    async (client) => {
      if (!user) return []
      const { data, error } = await client
        .from("tasks")
        .select("id,title,status,effort_estimated,pomodoros_completed,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
      if (error) throw error
      return (data ?? []) as Task[]
    },
    [supabase, user?.id],
    user ? { table: "tasks", filter: `user_id=eq.${user.id}` } : null
  )
  const {
    mode,
    isActive,
    timeLeft,
    sessionsCompleted,
    toggleTimer,
    resetTimer,
    skipToNext,
    registerManualPomodoro,
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
  const focusSyncInFlightRef = React.useRef(false)
  const hasHydratedPomodoroSettingsRef = React.useRef(false)
  const previousActiveTaskIdRef = React.useRef<string | null>(null)
  const previousPomodoroCountRef = React.useRef<Record<string, number>>({})
  const taskStatusUpdateInFlightRef = React.useRef<Set<string>>(new Set())
  const completionResolveInFlightRef = React.useRef(false)
  const [pendingCompletionPrompt, setPendingCompletionPrompt] = React.useState<{
    taskId: string
    taskTitle: string
    eventKey: string
  } | null>(null)
  const [taskCompletionPrompt, setTaskCompletionPrompt] = React.useState<{
    taskId: string
    taskTitle: string
    eventKey: string
  } | null>(null)
  const [remainingPomodorosInput, setRemainingPomodorosInput] = React.useState("1")

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (typeof window === "undefined") return
    if (!activeTaskId) return
    window.localStorage.setItem("bluepomodoro:last-used-task-id", activeTaskId)
  }, [activeTaskId])

  React.useEffect(() => {
    if (!profile || hasHydratedPomodoroSettingsRef.current) return
    syncSettingsFromProfile(profile)
    hasHydratedPomodoroSettingsRef.current = true
  }, [profile, syncSettingsFromProfile])

  React.useEffect(() => {
    if (typeof document === "undefined") return
    if (!user || !session?.access_token) return
    if (!profile?.google_tasks_sync && !profile?.google_calendar_sync) return

    const runFocusSync = async () => {
      if (focusSyncInFlightRef.current) return
      focusSyncInFlightRef.current = true
      try {
        await syncGoogleBridge({
          accessToken: session.access_token,
          reason: "focus",
        })
      } catch {
        // Silent by design. Manual sync in settings surfaces errors to the user.
      } finally {
        focusSyncInFlightRef.current = false
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        runFocusSync().catch(() => {})
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange)
    if (document.visibilityState === "visible") {
      runFocusSync().catch(() => {})
    }

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [profile?.google_calendar_sync, profile?.google_tasks_sync, session?.access_token, user])

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

  const updateTaskStatus = React.useCallback(
    async (taskId: string, status: Task["status"]) => {
      if (!user) return
      const lockKey = `${taskId}:${status}`
      if (taskStatusUpdateInFlightRef.current.has(lockKey)) return
      taskStatusUpdateInFlightRef.current.add(lockKey)
      try {
        await supabase
          .from("tasks")
          .update({ status })
          .eq("id", taskId)
          .eq("user_id", user.id)
          .neq("status", status)
      } finally {
        taskStatusUpdateInFlightRef.current.delete(lockKey)
      }
    },
    [supabase, user]
  )

  const resolveTaskCompletion = React.useCallback(
    async (resolution: "finalize" | "estimate") => {
      if (!user || !taskCompletionPrompt) return
      if (completionResolveInFlightRef.current) return
      completionResolveInFlightRef.current = true
      const targetTaskId = taskCompletionPrompt.taskId
      try {
        if (resolution === "estimate") {
          const parsed = Number.parseInt(remainingPomodorosInput, 10)
          const nextEstimated = Number.isFinite(parsed) && parsed > 0 ? parsed : 1
          await supabase
            .from("tasks")
            .update({ effort_estimated: nextEstimated, status: "Pendiente" })
            .eq("id", targetTaskId)
            .eq("user_id", user.id)
        } else {
          await supabase
            .from("tasks")
            .update({ status: "Completada" })
            .eq("id", targetTaskId)
            .eq("user_id", user.id)
        }

        if (activeTaskId === targetTaskId) {
          setActiveTaskId(null)
        }
      } finally {
        completionResolveInFlightRef.current = false
        setTaskCompletionPrompt(null)
        setRemainingPomodorosInput("1")
      }
    },
    [activeTaskId, remainingPomodorosInput, setActiveTaskId, supabase, taskCompletionPrompt, user]
  )

  React.useEffect(() => {
    if (!tasks || !user) return
    const byId = new Map(tasks.map((task) => [task.id, task]))
    const previousActiveTaskId = previousActiveTaskIdRef.current

    if (previousActiveTaskId && previousActiveTaskId !== activeTaskId) {
      const previousTask = byId.get(previousActiveTaskId)
      if (
        previousTask &&
        previousTask.status !== "Completada" &&
        Math.max(previousTask.effort_estimated ?? 0, 0) > 0
      ) {
        updateTaskStatus(previousTask.id, "Pendiente")
      }
    }

    if (activeTaskId) {
      const currentTask = byId.get(activeTaskId)
      if (
        currentTask &&
        currentTask.status !== "Completada" &&
        Math.max(currentTask.effort_estimated ?? 0, 0) > 0
      ) {
        updateTaskStatus(currentTask.id, "En Proceso")
      }
    }

    previousActiveTaskIdRef.current = activeTaskId
  }, [activeTaskId, tasks, updateTaskStatus, user])

  React.useEffect(() => {
    if (!tasks) return
    const nextCounts: Record<string, number> = {}
    for (const task of tasks) {
      nextCounts[task.id] = Math.max(task.pomodoros_completed ?? 0, 0)
    }

    const focusedTask = activeTaskId ? tasks.find((task) => task.id === activeTaskId) ?? null : null
    if (focusedTask) {
      const prevCount = previousPomodoroCountRef.current[focusedTask.id] ?? nextCounts[focusedTask.id]
      const currentCount = nextCounts[focusedTask.id]
      const remainingPomodoros = Math.max(focusedTask.effort_estimated ?? 0, 0)
      const eventKey = `${focusedTask.id}:${currentCount}`
      const alreadyQueued =
        pendingCompletionPrompt?.eventKey === eventKey || taskCompletionPrompt?.eventKey === eventKey

      if (currentCount > prevCount && remainingPomodoros <= 0 && !alreadyQueued) {
        setPendingCompletionPrompt({
          taskId: focusedTask.id,
          taskTitle: focusedTask.title,
          eventKey,
        })
      }
    }

    previousPomodoroCountRef.current = nextCounts
  }, [activeTaskId, pendingCompletionPrompt?.eventKey, taskCompletionPrompt?.eventKey, tasks])

  React.useEffect(() => {
    if (!pendingCompletionPrompt || alarmOpen || taskCompletionPrompt) return
    setTaskCompletionPrompt(pendingCompletionPrompt)
    setPendingCompletionPrompt(null)
    setRemainingPomodorosInput("1")
  }, [alarmOpen, pendingCompletionPrompt, taskCompletionPrompt])

  React.useEffect(() => {
    if (!taskCompletionPrompt) return
    const timeout = window.setTimeout(() => {
      resolveTaskCompletion("finalize")
    }, 60_000)
    return () => window.clearTimeout(timeout)
  }, [resolveTaskCompletion, taskCompletionPrompt])

  React.useEffect(() => {
    if (!alarmOpen) {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
        audioRef.current = null
      }
      return
    }

    if (typeof window !== "undefined") {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
        audioRef.current = null
      }

      const audio = new Audio("/sounds/pomodoro-alarm.wav")
      audio.loop = false
      audio.preload = "auto"
      audio.play().catch((error) => {
        console.warn("No se pudo reproducir el sonido de alarma:", error)
      })
      audioRef.current = audio

      return () => {
        audio.pause()
        audio.currentTime = 0
        if (audioRef.current === audio) {
          audioRef.current = null
        }
      }
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
        scopes: "openid email profile",
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
        skipToNext={skipToNext}
        registerManualPomodoro={registerManualPomodoro}
        workMinutes={workMinutes} 
        setWorkMinutes={setWorkMinutes} 
        breakMinutes={breakMinutes} 
        setBreakMinutes={setBreakMinutes} 
        longBreakAfter={longBreakAfter}
        longBreakThreshold={longBreakThreshold}
        longBreakMinutesHigh={longBreakMinutesHigh}
        longBreakMinutesLow={longBreakMinutesLow}
        focusBoardRestOpen={focusBoardRestOpen}
        onFocusBoardRestOpenChange={setFocusBoardRestOpen}
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

      <AlertDialog
        open={Boolean(taskCompletionPrompt)}
        onOpenChange={(open) => {
          if (!open && taskCompletionPrompt) {
            resolveTaskCompletion("finalize")
          }
        }}
      >
        <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8 max-w-md">
          <AlertDialogHeader className="space-y-2">
            <AlertDialogTitle className="text-xl font-black text-slate-900">Pomos completados</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-600">
              La tarea "{taskCompletionPrompt?.taskTitle ?? "sin titulo"}" se quedo sin pomodoros asignados.
              Si no respondes en 60 segundos, se marcara como finalizada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">Pomos que faltan (opcional)</p>
            <Input
              type="number"
              min={1}
              value={remainingPomodorosInput}
              onChange={(event) => setRemainingPomodorosInput(event.target.value)}
              className="h-11 rounded-xl"
            />
          </div>
          <AlertDialogFooter className="gap-2 sm:justify-end">
            <Button
              variant="outline"
              className="h-11 rounded-xl"
              onClick={() => resolveTaskCompletion("estimate")}
            >
              Guardar Pendiente
            </Button>
            <AlertDialogAction
              className="h-11 rounded-xl"
              onClick={() => resolveTaskCompletion("finalize")}
            >
              Finalizar Tarea
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />
    </>
  )
}
