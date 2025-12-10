import { useEffect, useMemo, useState } from 'react'
import { useUpdateTask } from '../hooks/useTasks'
import { TaskSelector } from './TaskSelector'
import { formatDuration } from '../lib/time'
import { useAppStore } from '../state/useAppStore'
import { useTimerStore, type TimerMode } from '../state/useTimerStore'
import type { TaskStatus } from '../lib/types'
import pomodoroIcon from '../assets/BluePomodoro.png'

const MODE_STYLES: Record<TimerMode, { bg: string; label: string }> = {
  focus: { bg: 'linear-gradient(135deg, #4f8dff, #3b6ee8)', label: 'Pomodoro' },
  short: { bg: 'linear-gradient(135deg, #12b981, #0c9f6c)', label: 'Descanso' },
  long: { bg: 'linear-gradient(135deg, #7b5cf6, #6a3aed)', label: 'Descanso largo' },
}

export function ActiveTimer() {
  const settings = useAppStore((s) => s.settings)
  const sessions = useAppStore((s) => s.sessions)
  const updateTask = useUpdateTask()
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  const timeLeft = useTimerStore((s) => s.timeLeft)
  const isActive = useTimerStore((s) => s.isActive)
  const mode = useTimerStore((s) => s.mode)
  const durations = useTimerStore((s) => s.durations)
  const currentTaskId = useTimerStore((s) => s.currentTaskId)
  const start = useTimerStore((s) => s.start)
  const pause = useTimerStore((s) => s.pause)
  const resume = useTimerStore((s) => s.resume)
  const reset = useTimerStore((s) => s.reset)
  const setDurations = useTimerStore((s) => s.setDurations)

  useEffect(() => {
    setDurations(settings.focusMinutes * 60, settings.breakMinutes * 60, Math.max(settings.breakMinutes * 2 * 60, settings.breakMinutes * 60 + 300))
  }, [settings.breakMinutes, settings.focusMinutes, setDurations])

  useEffect(() => {
    setSelectedTaskId(currentTaskId)
  }, [currentTaskId])

  const style = MODE_STYLES[mode]
  const isPaused = !isActive && timeLeft !== durations[mode]
  const statusLabel = useMemo(() => {
    if (isActive) return 'En curso'
    if (isPaused) return 'Pausado'
    return 'Listo para iniciar'
  }, [isActive, isPaused])

  const focusToday = useMemo(() => {
    const today = new Date()
    return sessions.filter(
      (s) =>
        s.type === 'focus' &&
        s.completed &&
        new Date(s.startedAt).toDateString() === today.toDateString()
    ).length
  }, [sessions])

  return (
    <div
      className="panel timer-panel"
      style={{
        background: style.bg,
        color: '#fff',
        padding: '18px',
        minHeight: '240px',
        display: 'grid',
        gap: '12px',
      }}
    >
      <div className="panel-header" style={{ border: 'none', marginBottom: 0, alignItems: 'flex-start' }}>
        <div>
          <p className="eyebrow">{style.label}</p>
          <h2
            style={{
              fontFamily: 'SFMono-Regular, ui-monospace, Menlo, monospace',
              fontSize: '72px',
              margin: '4px 0 0',
              letterSpacing: '2px',
              fontWeight: 800,
              color: 'rgba(0, 20, 60, 0.9)',
            }}
          >
            {formatDuration(timeLeft)}
          </h2>
          <p className="muted small" style={{ color: 'rgba(255,255,255,0.8)' }}>
            {statusLabel}
          </p>
        </div>
        <div className="timer-badges inline">
          {mode === 'focus' ? (
            <div className="pomodoro-steps">
              {Array.from({ length: 4 }).map((_, idx) => (
                <span
                  key={idx}
                  className={`pomodoro-step ${idx < focusToday % 4 ? 'filled' : ''}`}
                  aria-label={`Pomodoro ${idx + 1} de 4`}
                >
                  <img src={pomodoroIcon} alt="" />
                </span>
              ))}
            </div>
          ) : (
            <div className="badge-pill light">
              {focusToday % 4 + 1}/4
            </div>
          )}
        </div>
      </div>

      <div className="controls" style={{ gap: '8px', display: 'flex', flexWrap: 'wrap' }}>
        {isActive ? (
          <button className="secondary" onClick={() => pause()}>
            Pausar
          </button>
        ) : isPaused ? (
          <button className="secondary" onClick={() => resume()}>
            Continuar
          </button>
        ) : (
          <button
            className="primary"
            onClick={async () => {
              if (mode === 'focus' && selectedTaskId) {
                const taskStatus = 'doing' as TaskStatus
                await updateTask.mutateAsync({ id: selectedTaskId, status: taskStatus })
              }
              start(selectedTaskId, mode)
            }}
          >
            Iniciar {mode === 'focus' ? 'pomodoro' : 'descanso'}
          </button>
        )}
        <button className="secondary" onClick={() => reset(mode)}>
          Reiniciar
        </button>
        {mode === 'focus' ? (
          <button className="secondary" onClick={() => reset('short')}>
            Ir a descanso
          </button>
        ) : (
          <button className="secondary" onClick={() => reset('focus')}>
            Volver a foco
          </button>
        )}
      </div>

      <TaskSelector value={selectedTaskId} onChange={setSelectedTaskId} />

    </div>
  )
}
