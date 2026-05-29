"use client"

import * as React from "react"
import { Search, Timer, CheckSquare, BarChart3, Settings, CalendarDays, Target, Plus, Play, Pause, RotateCcw, SkipForward, FolderKanban, Award, Clock } from "lucide-react"
import { useSupabase, useUser } from "@/supabase"
import type { Task } from "@/supabase/types"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

type CommandItem = {
  id: string
  title: string
  subtitle?: string
  category: "Timer" | "Tareas" | "Navegación" | "Acción"
  icon: React.ElementType
  action: () => void | Promise<void>
  shortcut?: string
}

type CommandPaletteProps = {
  isOpen: boolean
  onClose: () => void
  activeTab: string
  setActiveTab: (tab: string) => void
  tasks: Task[]
  activeTaskId: string | null
  setActiveTaskId: (id: string | null) => void
  isActive: boolean
  toggleTimer: () => void
  resetTimer: () => void
  skipToNext: () => void
  registerManualPomodoro: () => Promise<void>
  mode: "work" | "break"
}

export function CommandPalette({
  isOpen,
  onClose,
  setActiveTab,
  tasks,
  activeTaskId,
  setActiveTaskId,
  isActive,
  toggleTimer,
  resetTimer,
  skipToNext,
  registerManualPomodoro,
  mode,
}: CommandPaletteProps) {
  const [query, setQuery] = React.useState("")
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLDivElement>(null)
  const supabase = useSupabase()
  const { user } = useUser()
  const { toast } = useToast()

  // Reset indices and focus on open
  React.useEffect(() => {
    if (isOpen) {
      setQuery("")
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [isOpen])

  // Smooth scroll helper
  React.useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-active="true"]') as HTMLElement
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        })
      }
    }
  }, [selectedIndex])

  const activeTasks = React.useMemo(() => {
    return tasks.filter(t => t.status !== "Completada")
  }, [tasks])

  // Commands List Definition
  const commands = React.useMemo(() => {
    const list: CommandItem[] = []

    list.push({
      id: "toggle-timer",
      title: isActive ? "Pausar Temporizador de Foco" : "Iniciar Temporizador de Foco",
      subtitle: mode === "work" ? "Activar modo enfoque profundo" : "Terminar descanso y volver al foco",
      category: "Timer",
      icon: isActive ? Pause : Play,
      shortcut: "Space",
      action: () => {
        toggleTimer()
        onClose()
      }
    })

    list.push({
      id: "skip-timer",
      title: "Saltar al siguiente bloque",
      subtitle: mode === "work" ? "Saltar a descanso" : "Saltar a enfoque",
      category: "Timer",
      icon: SkipForward,
      action: () => {
        skipToNext()
        onClose()
      }
    })

    list.push({
      id: "reset-timer",
      title: "Reiniciar Temporizador",
      subtitle: "Vuelve a iniciar el contador de este bloque",
      category: "Timer",
      icon: RotateCcw,
      action: () => {
        resetTimer()
        onClose()
      }
    })

    list.push({
      id: "manual-pomodoro",
      title: "Registrar Pomodoro Manual",
      subtitle: "Añadir 25m de concentración de forma directa",
      category: "Timer",
      icon: Award,
      action: async () => {
        try {
          await registerManualPomodoro()
          toast({ title: "¡Pomodoro registrado!", description: "Has ganado 100 puntos extra." })
        } catch {
          toast({ variant: "destructive", title: "Error", description: "No se pudo registrar." })
        }
        onClose()
      }
    })

    const navs: { tab: string; title: string; icon: React.ElementType }[] = [
      { tab: "dashboard", title: "Ir al Tablero Principal", icon: Timer },
      { tab: "agenda", title: "Ir a la Agenda Inteligente", icon: CalendarDays },
      { tab: "foco", title: "Ir al Modo Zen (Pantalla Completa)", icon: Target },
      { tab: "tareas", title: "Ir a la Gestión de Tareas", icon: CheckSquare },
      { tab: "proyectos", title: "Ir a Mis Proyectos", icon: FolderKanban },
      { tab: "stats", title: "Ir a las Estadísticas", icon: BarChart3 },
      { tab: "config", title: "Ir a Configuración Global", icon: Settings },
    ]

    navs.forEach(nav => {
      list.push({
        id: `nav-${nav.tab}`,
        title: nav.title,
        category: "Navegación",
        icon: nav.icon,
        action: () => {
          setActiveTab(nav.tab)
          onClose()
        }
      })
    })

    activeTasks.forEach(task => {
      const isActiveTask = activeTaskId === task.id
      list.push({
        id: `task-select-${task.id}`,
        title: `Enfocar en: ${task.title}`,
        subtitle: `${task.status} • 🍅 ${task.pomodoros_completed} completados • Est: ${task.effort_estimated}`,
        category: "Tareas",
        icon: Target,
        shortcut: isActiveTask ? "Activa" : undefined,
        action: () => {
          if (isActiveTask) {
            setActiveTaskId(null)
          } else {
            setActiveTaskId(task.id)
          }
          onClose()
        }
      })
    })

    return list
  }, [isActive, mode, activeTasks, activeTaskId, toggleTimer, resetTimer, skipToNext, registerManualPomodoro, setActiveTab, setActiveTaskId, onClose])

  const filteredCommands = React.useMemo(() => {
    if (!query.trim()) return commands
    const terms = query.toLowerCase().split(" ")
    return commands.filter(cmd => {
      const matchText = `${cmd.title} ${cmd.subtitle || ""} ${cmd.category}`.toLowerCase()
      return terms.every(term => matchText.includes(term))
    })
  }, [commands, query])

  const handleCreateTask = async (taskTitle: string) => {
    if (!user || !taskTitle.trim()) return
    try {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          user_id: user.id,
          title: taskTitle.trim(),
          status: "Pendiente",
          effort_estimated: 1,
        })
        .select()
        .single()

      if (error) throw error

      toast({ title: "Tarea creada", description: `"${taskTitle.trim()}" ha sido agregada y seleccionada.` })
      setActiveTaskId(data.id)
      onClose()
    } catch {
      toast({ variant: "destructive", title: "Error", description: "No se pudo crear la tarea." })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose()
      return
    }

    const maxIndex = filteredCommands.length + (query.trim() ? 1 : 0) - 1

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex(prev => (prev >= maxIndex ? 0 : prev + 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex(prev => (prev <= 0 ? maxIndex : prev - 1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (selectedIndex === filteredCommands.length && query.trim()) {
        handleCreateTask(query)
      } else if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action()
      }
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-md z-50 flex items-start justify-center pt-[12vh] p-4 transition-all duration-300 animate-in fade-in duration-300"
      onClick={onClose}
    >
      {/* Outer wrapper with conic gradient glow effect */}
      <div 
        className="relative w-full max-w-xl rounded-[2rem] p-[1.5px] overflow-hidden shadow-2xl transition-all duration-300 animate-in zoom-in-95 slide-in-from-top-4 duration-300"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Glowing border background */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 opacity-60 animate-pulse duration-[6000ms] -z-10" />
        
        {/* Soft atmospheric backlight glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-2xl -z-20 pointer-events-none" />

        {/* Main Glass Box Container */}
        <div className="bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl rounded-[1.95rem] overflow-hidden flex flex-col max-h-[520px]">
          
          {/* Header Search Area */}
          <div className="h-16 px-6 flex items-center border-b border-slate-100 dark:border-white/5 gap-4 relative">
            <Search className="h-5 w-5 text-indigo-500 shrink-0 animate-pulse" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Escribe comandos o crea tareas al instante..."
              value={query}
              onChange={e => {
                setQuery(e.target.value)
                setSelectedIndex(0)
              }}
              className="flex-1 bg-transparent border-none outline-none text-slate-800 dark:text-slate-100 font-bold placeholder-slate-400 dark:placeholder-slate-600 h-full text-sm"
            />

            {/* Live Indicator / State badge */}
            <div className="flex items-center gap-3">
              {isActive && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 animate-pulse">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  <span className="text-[10px] font-black uppercase text-blue-500 tracking-wider">Foco Activo</span>
                </div>
              )}
              <kbd className="hidden sm:inline-flex h-6 select-none items-center gap-1 rounded border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 px-2 font-mono text-[9px] font-black text-slate-400 dark:text-slate-500">
                ESC
              </kbd>
            </div>
          </div>

          {/* Results Area */}
          <div 
            ref={listRef} 
            className="flex-1 overflow-y-auto p-3 space-y-1.5 scroll-smooth min-h-0"
          >
            {filteredCommands.map((cmd, index) => {
              const Icon = cmd.icon
              const isSelected = selectedIndex === index
              return (
                <button
                  key={cmd.id}
                  data-active={isSelected}
                  onClick={cmd.action}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    "w-full text-left flex items-center gap-4 p-3 rounded-2xl transition-all duration-200 ease-out transform",
                    isSelected 
                      ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 scale-[1.01]" 
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                  )}
                >
                  {/* Icon with hover rotation animation */}
                  <div className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300",
                    isSelected 
                      ? "bg-white/15 text-white rotate-6 scale-110" 
                      : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400"
                  )}>
                    <Icon className={cn("h-5 w-5", isSelected && cmd.id === "config" && "animate-spin")} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs truncate leading-snug">{cmd.title}</p>
                    {cmd.subtitle && (
                      <p className={cn(
                        "text-[10px] truncate leading-normal mt-0.5",
                        isSelected ? "text-white/80" : "text-slate-400 dark:text-slate-500"
                      )}>
                        {cmd.subtitle}
                      </p>
                    )}
                  </div>

                  {/* Badges / Shortcuts */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={cn(
                      "text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full",
                      isSelected 
                        ? "bg-white/20 text-white" 
                        : "bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500"
                    )}>
                      {cmd.category}
                    </span>
                    {cmd.shortcut && (
                      <kbd className={cn(
                        "font-mono text-[9px] px-2 py-0.5 rounded border select-none transition-colors",
                        isSelected 
                          ? "border-white/30 bg-white/10 text-white" 
                          : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500"
                      )}>
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </div>
                </button>
              )
            })}

            {/* Special Action: Create Task Option */}
            {query.trim() && (
              <button
                data-active={selectedIndex === filteredCommands.length}
                onClick={() => handleCreateTask(query)}
                onMouseEnter={() => setSelectedIndex(filteredCommands.length)}
                className={cn(
                  "w-full text-left flex items-center gap-4 p-3 rounded-2xl transition-all duration-200 ease-out transform",
                  selectedIndex === filteredCommands.length
                    ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 scale-[1.01]"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                )}
              >
                <div className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300",
                  selectedIndex === filteredCommands.length ? "bg-white/15 text-white rotate-6 scale-110" : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400"
                )}>
                  <Plus className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-xs truncate leading-snug">Crear nueva tarea</p>
                  <p className={cn("text-[10px] truncate leading-normal mt-0.5", selectedIndex === filteredCommands.length ? "text-white/80" : "text-slate-400 dark:text-slate-500")}>
                    Añadir "{query.trim()}" a tus pendientes
                  </p>
                </div>
                <span className={cn(
                  "text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shrink-0",
                  selectedIndex === filteredCommands.length ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500"
                )}>
                  Acción
                </span>
              </button>
            )}

            {filteredCommands.length === 0 && !query.trim() && (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400 dark:text-slate-600">
                <Clock className="h-8 w-8 animate-pulse text-indigo-500/40" />
                <span className="text-xs font-bold uppercase tracking-wider">No se encontraron resultados</span>
              </div>
            )}
          </div>
          
          {/* Futuristic command footer */}
          <div className="h-12 px-6 bg-slate-50/50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5"><kbd className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 px-1 rounded">▲</kbd><kbd className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 px-1 rounded">▼</kbd> navegar</span>
              <span>•</span>
              <span className="flex items-center gap-1.5"><kbd className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 px-1 rounded">Enter</kbd> seleccionar</span>
            </div>
            <div className="flex items-center gap-1 text-indigo-500/80 font-black">
              <span>CTRL + K</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
