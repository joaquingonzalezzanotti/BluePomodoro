import { useNavigate, useLocation } from 'react-router-dom'
import { useMemo } from 'react'
import { useTimerStore } from '../state/useTimerStore'
import { formatDuration } from '../lib/time'
import { useAppStore } from '../state/useAppStore'

export function TimerWidget() {
  const navigate = useNavigate()
  const location = useLocation()

  const timeLeft = useTimerStore((s) => s.timeLeft)
  const isActive = useTimerStore((s) => s.isActive)
  const mode = useTimerStore((s) => s.mode)
  const pause = useTimerStore((s) => s.pause)
  const resume = useTimerStore((s) => s.resume)

  const tasks = useAppStore((s) => s.tasks)
  const currentTaskId = useTimerStore((s) => s.currentTaskId)
  const taskName = useMemo(
    () => tasks.find((t) => t.id === currentTaskId)?.title ?? 'Sin tarea',
    [tasks, currentTaskId]
  )

  // Ocultar en Tablero y en la vista de foco para no duplicar el timer
  if (location.pathname === '/' || location.pathname === '/foco') return null

  const isBreak = mode !== 'focus'

  return (
    <div
      className="timer-widget"
      style={{
        background: isBreak ? 'rgba(18, 185, 129, 0.08)' : 'rgba(31, 86, 255, 0.08)',
        borderColor: isBreak ? 'rgba(18, 185, 129, 0.18)' : 'rgba(31, 86, 255, 0.18)',
      }}
    >
      <div className="timer-widget-header">
        <span className={`timer-chip ${isBreak ? 'break' : 'focus'}`}>{isBreak ? 'Descanso' : 'Foco'}</span>
        <button className="ghost small" onClick={() => navigate('/foco')}>
          Abrir
        </button>
      </div>
      <div className="timer-widget-time">{formatDuration(timeLeft)}</div>
      <p className="muted small" style={{ margin: '0 0 6px' }}>
        {isActive ? 'En curso' : 'Pausado'} · {taskName}
      </p>
      <div className="timer-widget-actions">
        {isActive ? (
          <button className="secondary small" onClick={() => pause()}>
            Pausar
          </button>
        ) : (
          <button className="secondary small" onClick={() => resume()}>
            Reanudar
          </button>
        )}
        <button className="secondary small" onClick={() => navigate('/foco')}>
          Ver Pomodoro
        </button>
      </div>
    </div>
  )
}
