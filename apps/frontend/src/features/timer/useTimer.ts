import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../../state/useAppStore'

export type TimerMode = 'focus' | 'break'

interface TimerState {
  mode: TimerMode
  remaining: number
  running: boolean
  startedAt: number | null
  currentTaskId?: string | null
}

export function useTimer(durations: { focus: number; break: number }) {
  const recordSession = useAppStore((s) => s.recordSession)
  const settings = useAppStore((s) => s.settings)
  const [state, setState] = useState<TimerState>({
    mode: 'focus',
    remaining: durations.focus,
    running: false,
    startedAt: null,
    currentTaskId: null,
  })
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    if (!state.running) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    intervalRef.current = window.setInterval(() => {
      setState((prev) => {
        const nextRemaining = prev.remaining - 1
        if (nextRemaining <= 0) {
          finalizeSession(prev)
          const nextMode: TimerMode = prev.mode === 'focus' ? 'break' : 'focus'
          const shouldAuto =
            (prev.mode === 'focus' && settings.autoStartBreak) ||
            (prev.mode === 'break' && settings.autoStartPomodoro)
          const nextDuration = nextMode === 'focus' ? durations.focus : durations.break
          return {
            mode: nextMode,
            remaining: nextDuration,
            running: shouldAuto,
            startedAt: shouldAuto ? Date.now() : null,
            currentTaskId: prev.currentTaskId,
          }
        }
        return { ...prev, remaining: nextRemaining }
      })
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [state.running])

  useEffect(() => {
    // If durations change and timer is idle, refresh remaining to defaults
    setState((prev) => {
      if (prev.running) return prev
      const nextRemaining = prev.mode === 'focus' ? durations.focus : durations.break
      return { ...prev, remaining: nextRemaining }
    })
  }, [durations.break, durations.focus])

  const finalizeSession = (prevState: TimerState) => {
    const endedAt = new Date()
    const startedAt = prevState.startedAt ? new Date(prevState.startedAt) : endedAt
    const baseDuration = prevState.mode === 'focus' ? durations.focus : durations.break
    const durationSeconds = baseDuration - prevState.remaining

    if (durationSeconds <= 0) return

    recordSession({
      taskId: prevState.currentTaskId,
      durationSeconds,
      type: prevState.mode,
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      completed: prevState.remaining <= 0,
    })

    if (settings.soundOnComplete) {
      void playChime()
    }
  }

  const start = (taskId?: string | null, mode: TimerMode = 'focus') => {
    const duration = mode === 'focus' ? durations.focus : durations.break
    setState({
      mode,
      remaining: duration,
      running: true,
      startedAt: Date.now(),
      currentTaskId: taskId ?? null,
    })
  }

  const pause = () => {
    setState((prev) => ({ ...prev, running: false }))
  }

  const resume = () => {
    setState((prev) => ({ ...prev, running: true }))
  }

  const reset = (mode: TimerMode = 'focus') => {
    setState({
      mode,
      remaining: mode === 'focus' ? durations.focus : durations.break,
      running: false,
      startedAt: null,
      currentTaskId: null,
    })
  }

  return {
    ...state,
    start,
    pause,
    resume,
    reset,
    defaults: durations,
  }
}

async function playChime() {
  const ctx = new AudioContext()
  const duration = 0.2
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.value = 880
  gain.gain.setValueAtTime(0.1, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  oscillator.connect(gain).connect(ctx.destination)
  oscillator.start()
  oscillator.stop(ctx.currentTime + duration)
}
