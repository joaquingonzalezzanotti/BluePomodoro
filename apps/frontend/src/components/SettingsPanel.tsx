import { useState } from 'react'
import { useAppStore } from '../state/useAppStore'
import { Switch } from './ui/Switch'

export function SettingsPanel() {
  const { settings, updateSettings } = useAppStore()
  const [focusMinutes, setFocusMinutes] = useState(settings.focusMinutes)
  const [breakMinutes, setBreakMinutes] = useState(settings.breakMinutes)
  const [dailyTarget, setDailyTarget] = useState(settings.dailyTarget)
  const [autoStartBreak, setAutoStartBreak] = useState(settings.autoStartBreak)
  const [autoStartPomodoro, setAutoStartPomodoro] = useState(settings.autoStartPomodoro)
  const [soundOnComplete, setSoundOnComplete] = useState(settings.soundOnComplete)

  const save = () => {
    updateSettings({
      focusMinutes: Math.max(5, focusMinutes),
      breakMinutes: Math.max(1, breakMinutes),
      dailyTarget: Math.max(1, dailyTarget),
      autoStartBreak,
      autoStartPomodoro,
      soundOnComplete,
    })
  }

  return (
    <div className="preferences-shell">
      <section className="pref-card">
        <div className="pref-header">
          <div>
            <p className="eyebrow">Preferencias</p>
            <h2>Temporizador y objetivo</h2>
            <p className="muted">Ajusta las duraciones y el auto-arranque.</p>
          </div>
        </div>

        <div className="pref-grid-3">
          <div className="pref-field">
            <p className="muted small">Pomodoro (min)</p>
            <input
              id="focus"
              type="number"
              min={5}
              max={90}
              value={focusMinutes}
              onChange={(e) => setFocusMinutes(Number(e.target.value))}
            />
          </div>
          <div className="pref-field">
            <p className="muted small">Descanso corto (min)</p>
            <input
              id="break"
              type="number"
              min={1}
              max={30}
              value={breakMinutes}
              onChange={(e) => setBreakMinutes(Number(e.target.value))}
            />
          </div>
          <div className="pref-field">
            <p className="muted small">Objetivo diario (pomodoros)</p>
            <input
              id="target"
              type="number"
              min={1}
              max={30}
              value={dailyTarget}
              onChange={(e) => setDailyTarget(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="pref-toggles">
          <Switch checked={autoStartBreak} onChange={setAutoStartBreak} label="Auto-iniciar descanso" />
          <Switch checked={autoStartPomodoro} onChange={setAutoStartPomodoro} label="Auto-iniciar pomodoro" />
          <Switch checked={soundOnComplete} onChange={setSoundOnComplete} label="Sonido breve al completar" />
        </div>

        <div className="controls" style={{ justifyContent: 'flex-end' }}>
          <button className="primary" onClick={save}>
            Guardar ajustes
          </button>
        </div>
      </section>
    </div>
  )
}
