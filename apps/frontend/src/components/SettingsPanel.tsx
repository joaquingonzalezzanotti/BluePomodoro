import { useState } from 'react'
import { useAppStore } from '../state/useAppStore'

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
    <div className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Configuración</p>
          <h2>Duraciones y objetivo</h2>
          <p className="muted">Ajusta tiempos, auto-start y sonido.</p>
        </div>
      </div>

      <div className="grid-3">
        <div className="field">
          <label htmlFor="focus">Pomodoro (min)</label>
          <input
            id="focus"
            type="number"
            min={5}
            max={90}
            value={focusMinutes}
            onChange={(e) => setFocusMinutes(Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label htmlFor="break">Descanso (min)</label>
          <input
            id="break"
            type="number"
            min={1}
            max={30}
            value={breakMinutes}
            onChange={(e) => setBreakMinutes(Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label htmlFor="target">Objetivo diario (pomodoros)</label>
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

      <div className="grid-2">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={autoStartBreak}
            onChange={(e) => setAutoStartBreak(e.target.checked)}
          />
          Autoiniciar descanso al terminar un pomodoro
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={autoStartPomodoro}
            onChange={(e) => setAutoStartPomodoro(e.target.checked)}
          />
          Autoiniciar pomodoro al terminar descanso
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={soundOnComplete}
            onChange={(e) => setSoundOnComplete(e.target.checked)}
          />
          Sonido breve al completar
        </label>
      </div>

      <div className="controls">
        <button className="primary" onClick={save}>
          Guardar ajustes
        </button>
      </div>
    </div>
  )
}
