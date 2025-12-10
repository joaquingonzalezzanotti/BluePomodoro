import { useMemo } from 'react'
import { useAppStore } from '../state/useAppStore'
import { formatDuration } from '../lib/time'

export function StatsPanel({ compact = false }: { compact?: boolean }) {
  const sessions = useAppStore((s) => s.sessions)
  const settings = useAppStore((s) => s.settings)

  const totals = useMemo(() => {
    const focusSeconds = sessions
      .filter((s) => s.type === 'focus')
      .reduce((acc, s) => acc + s.durationSeconds, 0)
    const breaksSeconds = sessions
      .filter((s) => s.type === 'break')
      .reduce((acc, s) => acc + s.durationSeconds, 0)
    return { focusSeconds, breaksSeconds, pomodoros: sessions.filter((s) => s.type === 'focus').length }
  }, [sessions])

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Estadísticas</p>
          <h2>{compact ? 'Stats rápidas' : 'Resumen'}</h2>
          {!compact && <p className="muted">Pomodoros y descansos registrados.</p>}
        </div>
      </div>
      <div className="stats-grid">
        <div className="stat">
          <p className="muted small">Pomodoros</p>
          <h3>{totals.pomodoros}</h3>
          <p className="muted small">Meta diaria: {settings.dailyTarget}</p>
        </div>
        <div className="stat">
          <p className="muted small">Tiempo de foco</p>
          <h3>{formatDuration(totals.focusSeconds)}</h3>
        </div>
        <div className="stat">
          <p className="muted small">Descansos</p>
          <h3>{formatDuration(totals.breaksSeconds)}</h3>
        </div>
      </div>
    </div>
  )
}
