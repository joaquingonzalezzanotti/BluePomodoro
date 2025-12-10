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
          <h2 style={{ fontWeight: 600, color: '#1f2432' }}>{compact ? 'Stats rápidas' : 'Resumen'}</h2>
        </div>
      </div>
      <div
        className="stat-bar"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
          alignItems: 'center',
        }}
      >
        <StatChip label="Pomodoros" value={totals.pomodoros} sub={`Meta: ${settings.dailyTarget}`} icon="⏱" />
        <StatChip label="Tiempo de foco" value={formatDuration(totals.focusSeconds)} icon="🔥" />
        <StatChip label="Descansos" value={formatDuration(totals.breaksSeconds)} icon="🌿" />
      </div>
    </div>
  )
}

function StatChip({
  label,
  value,
  sub,
  icon,
}: {
  label: string
  value: string | number
  sub?: string
  icon: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 12px',
        background: '#f5f7fb',
        borderRadius: '10px',
        minHeight: '56px',
      }}
    >
      <span style={{ fontSize: '18px' }}>{icon}</span>
      <div>
        <p className="muted small" style={{ margin: 0 }}>
          {label}
        </p>
        <p style={{ margin: 0, fontWeight: 700, color: '#1f2a3d' }}>{value}</p>
        {sub && (
          <p className="muted small" style={{ margin: 0 }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  )
}
