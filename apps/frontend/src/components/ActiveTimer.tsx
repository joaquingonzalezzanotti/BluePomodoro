import { useEffect, useMemo, useRef, useState } from 'react'
import { useUpdateTask } from '../hooks/useTasks'
import { useCreateSession } from '../hooks/useSessions'
import { TaskSelector } from './TaskSelector'
import { formatDuration } from '../lib/time'
import { useAppStore } from '../state/useAppStore'
import type { TaskStatus } from '../lib/types'

type TimerMode = 'focus' | 'short_break' | 'long_break'

const MODE_STYLES: Record<TimerMode, { bg: string; label: string }> = {
  focus: { bg: 'linear-gradient(135deg, #1f4fbf, #2141a6)', label: 'Pomodoro' },
  short_break: { bg: 'linear-gradient(135deg, #12b981, #0c9f6c)', label: 'Descanso corto' },
  long_break: { bg: 'linear-gradient(135deg, #7b5cf6, #6a3aed)', label: 'Descanso largo' },
}

export function ActiveTimer() {
  // Duraciones desde ajustes (pero estado del timer es local)
  const settings = useAppStore((s) => s.settings)
  const focusSeconds = settings.focusMinutes * 60
  const shortBreakSeconds = settings.breakMinutes * 60
  const longBreakSeconds = Math.max(shortBreakSeconds * 2, shortBreakSeconds + 300)

  const [mode, setMode] = useState<TimerMode>('focus')
  const [remaining, setRemaining] = useState(focusSeconds)
  const [running, setRunning] = useState(false)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [focusCount, setFocusCount] = useState(0)
  const intervalRef = useRef<number | null>(null)

  const updateTask = useUpdateTask()
  const createSession = useCreateSession()

  const style = MODE_STYLES[mode]
  const isPaused = !running && remaining !== getDuration(mode, { focusSeconds, shortBreakSeconds, longBreakSeconds })

  useEffect(() => {
    // ajustar duración si cambia settings y timer está detenido
    if (!running) {
      setRemaining(getDuration(mode, { focusSeconds, shortBreakSeconds, longBreakSeconds }))
    }
  }, [focusSeconds, shortBreakSeconds, longBreakSeconds, mode, running])

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    intervalRef.current = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          handleComplete()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [running])

  const handleComplete = async () => {
    setRunning(false)
    const endedAt = new Date()
    const startedDate = startedAt ? new Date(startedAt) : endedAt
    const duration = getDuration(mode, { focusSeconds, shortBreakSeconds, longBreakSeconds }) - remaining

    if (duration > 0) {
      await createSession.mutateAsync({
        taskId: mode === 'focus' ? selectedTaskId : null,
        startedAt: startedDate.toISOString(),
        endedAt: endedAt.toISOString(),
        durationSeconds: duration,
        type: mode === 'focus' ? 'focus' : 'break',
        completed: true,
        note: '',
      })
    }

    if (mode === 'focus') {
      setFocusCount((c) => c + 1)
    }

    playBeep()

    const nextMode = mode === 'focus' ? (shouldLongBreak(focusCount + 1) ? 'long_break' : 'short_break') : 'focus'
    setMode(nextMode)
    setRemaining(getDuration(nextMode, { focusSeconds, shortBreakSeconds, longBreakSeconds }))
    setStartedAt(null)
  }

  const startTimer = async (targetMode: TimerMode = 'focus') => {
    if (targetMode === 'focus' && selectedTaskId) {
      const taskStatus = 'doing' as TaskStatus
      await updateTask.mutateAsync({ id: selectedTaskId, status: taskStatus })
    }
    setMode(targetMode)
    setRemaining(getDuration(targetMode, { focusSeconds, shortBreakSeconds, longBreakSeconds }))
    setRunning(true)
    setStartedAt(Date.now())
  }

  const pauseTimer = () => {
    setRunning(false)
  }

  const resumeTimer = () => {
    setRunning(true)
  }

  const resetTimer = (targetMode: TimerMode = 'focus') => {
    setRunning(false)
    setMode(targetMode)
    setRemaining(getDuration(targetMode, { focusSeconds, shortBreakSeconds, longBreakSeconds }))
    setStartedAt(null)
  }

  const statusLabel = useMemo(() => {
    if (running) return 'En curso'
    if (isPaused) return 'Pausado'
    return 'Listo para iniciar'
  }, [running, isPaused])

  return (
    <div
      className="panel timer-panel"
      style={{
        background: style.bg,
        color: '#fff',
        padding: '18px',
        minHeight: '280px',
        display: 'grid',
        gap: '12px',
      }}
    >
      <div className="panel-header" style={{ border: 'none', marginBottom: 0 }}>
        <div>
          <p className="eyebrow">{style.label}</p>
          <h2
            style={{
              fontFamily: 'SFMono-Regular, ui-monospace, Menlo, monospace',
              fontSize: '72px',
              margin: '4px 0 0',
              letterSpacing: '2px',
              fontWeight: 800,
            }}
          >
            {formatDuration(remaining)}
          </h2>
          <p className="muted small" style={{ color: 'rgba(255,255,255,0.8)' }}>
            {statusLabel}
          </p>
        </div>
        <div className="chip" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
          {mode === 'focus' ? 'Pomodoro' : mode === 'short_break' ? 'Descanso corto' : 'Descanso largo'}
        </div>
      </div>

      <div className="controls" style={{ gap: '8px', display: 'flex', flexWrap: 'wrap' }}>
        {running ? (
          <button className="secondary" onClick={pauseTimer}>
            Pausar
          </button>
        ) : isPaused ? (
          <button className="secondary" onClick={resumeTimer}>
            Continuar
          </button>
        ) : (
          <button className="primary" onClick={() => void startTimer(mode)}>
            Iniciar {mode === 'focus' ? 'pomodoro' : 'descanso'}
          </button>
        )}
        <button className="secondary" onClick={() => resetTimer(mode)}>
          Reiniciar
        </button>
        {mode === 'focus' ? (
          <button className="secondary" onClick={() => resetTimer('short_break')}>
            Ir a descanso
          </button>
        ) : (
          <button className="secondary" onClick={() => resetTimer('focus')}>
            Volver a foco
          </button>
        )}
      </div>

      <TaskSelector value={selectedTaskId} onChange={setSelectedTaskId} />

      <p className="muted small" style={{ color: 'rgba(255,255,255,0.8)' }}>
        Pomodoros hoy: {focusCount}
      </p>
    </div>
  )
}

function getDuration(
  mode: TimerMode,
  durations: { focusSeconds: number; shortBreakSeconds: number; longBreakSeconds: number }
) {
  if (mode === 'focus') return durations.focusSeconds
  if (mode === 'short_break') return durations.shortBreakSeconds
  return durations.longBreakSeconds
}

function shouldLongBreak(focusCount: number) {
  return focusCount > 0 && focusCount % 4 === 0
}

function playBeep() {
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
