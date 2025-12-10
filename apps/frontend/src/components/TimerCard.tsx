import { useEffect, useMemo, useState } from 'react'
import { useTimer } from '../features/timer/useTimer'
import { formatDuration } from '../lib/time'
import { useAppStore } from '../state/useAppStore'

function isToday(iso: string) {
  const date = new Date(iso)
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

export function TimerCard() {
  const tasks = useAppStore((s) => s.tasks)
  const sessions = useAppStore((s) => s.sessions)
  const settings = useAppStore((s) => s.settings)
  const { mode, remaining, running, start, pause, resume, reset, defaults } = useTimer({
    focus: settings.focusMinutes * 60,
    break: settings.breakMinutes * 60,
  })
  const [selectedTask, setSelectedTask] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedTask && tasks.length > 0) {
      setSelectedTask(tasks[0].id)
    }
  }, [tasks, selectedTask])

  const activeTask = useMemo(
    () => tasks.find((t) => t.id === selectedTask),
    [tasks, selectedTask]
  )

  const todayFocus = sessions.filter((s) => s.type === 'focus' && isToday(s.startedAt)).length
  const currentPomodoroNumber = running && mode === 'focus' ? todayFocus + 1 : todayFocus
  const isPaused = !running && remaining !== defaults[mode] && remaining > 0

  return (
    <div className="panel timer-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Temporizador</p>
          <h2>{mode === 'focus' ? 'Pomodoro' : 'Descanso'}</h2>
          <p className="muted">{running ? 'En curso' : isPaused ? 'Pausado' : 'Listo para iniciar'}</p>
        </div>
        <div className="pill">{mode === 'focus' ? 'Pomodoro' : 'Break'}</div>
      </div>

      <div className="timer-face">
        <div className="time">{formatDuration(remaining)}</div>
        <p className="muted small">
          {activeTask ? `Tarea: ${activeTask.title}` : 'Sin tarea seleccionada'}
        </p>
        <p className="muted small">Pomodoro #{currentPomodoroNumber || 1} hoy</p>
      </div>

      <div className="controls">
        {running ? (
          <button className="secondary" onClick={pause}>
            Pausar
          </button>
        ) : isPaused ? (
          <button className="primary" onClick={resume}>
            Continuar
          </button>
        ) : (
          <button className="primary" onClick={() => start(selectedTask, mode)}>
            Iniciar {mode === 'focus' ? 'pomodoro' : 'descanso'}
          </button>
        )}
        <button className="ghost" onClick={() => reset(mode)}>
          Reiniciar
        </button>
        <button className="ghost" onClick={() => start(selectedTask, 'break')}>
          Iniciar descanso
        </button>
      </div>

      <div className="selector">
        <label htmlFor="taskSelect">Tarea activa</label>
        <select
          id="taskSelect"
          value={selectedTask ?? ''}
          onChange={(e) => setSelectedTask(e.target.value || null)}
        >
          <option value="">Sin tarea</option>
          {tasks.map((task) => (
            <option key={task.id} value={task.id}>
              {task.title}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
