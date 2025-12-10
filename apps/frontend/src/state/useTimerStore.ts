import { create } from 'zustand'

export type TimerMode = 'focus' | 'short' | 'long'

type TimerState = {
  timeLeft: number
  isActive: boolean
  mode: TimerMode
  currentTaskId: string | null
  durations: Record<TimerMode, number>
  intervalId: number | null
}

type TimerActions = {
  setDurations: (focus: number, short: number, long: number) => void
  start: (taskId?: string | null, mode?: TimerMode) => void
  pause: () => void
  resume: () => void
  reset: (mode?: TimerMode) => void
  tick: () => void
}

const DEFAULTS: Record<TimerMode, number> = {
  focus: 25 * 60,
  short: 5 * 60,
  long: 15 * 60,
}

export const useTimerStore = create<TimerState & TimerActions>((set, get) => ({
  timeLeft: DEFAULTS.focus,
  isActive: false,
  mode: 'focus',
  currentTaskId: null,
  durations: DEFAULTS,
  intervalId: null,

  setDurations(focus, short, long) {
    set((state) => {
      const durations = { focus, short, long }
      // si no está activo, actualiza el reloj al modo actual
      if (!state.isActive) {
        const nextTime = durations[state.mode]
        return { ...state, durations, timeLeft: nextTime }
      }
      return { ...state, durations }
    })
  },

  start(taskId = null, mode) {
    const m = mode ?? get().mode
    const durations = get().durations
    const duration = durations[m]
    const existing = get().intervalId
    if (existing) {
      clearInterval(existing)
    }
    const id = window.setInterval(() => useTimerStore.getState().tick(), 1000)
    set({
      mode: m,
      timeLeft: duration,
      isActive: true,
      currentTaskId: taskId,
      intervalId: id,
    })
  },

  pause() {
    const id = get().intervalId
    if (id) clearInterval(id)
    set({ isActive: false, intervalId: null })
  },

  resume() {
    const { isActive, intervalId } = get()
    if (isActive) return
    if (intervalId) clearInterval(intervalId)
    const id = window.setInterval(() => useTimerStore.getState().tick(), 1000)
    set({ isActive: true, intervalId: id })
  },

  reset(mode = 'focus') {
    const durations = get().durations
    const id = get().intervalId
    if (id) clearInterval(id)
    set({
      mode,
      timeLeft: durations[mode],
      isActive: false,
      intervalId: null,
      currentTaskId: null,
    })
  },

  tick() {
    const { timeLeft, intervalId } = get()
    if (timeLeft <= 1) {
      if (intervalId) clearInterval(intervalId)
      set({ timeLeft: 0, isActive: false, intervalId: null })
    } else {
      set({ timeLeft: timeLeft - 1 })
    }
  },
}))
