type SwitchProps = {
  checked: boolean
  onChange: (value: boolean) => void
  label?: string
}

export function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <div className="switch-row">
      {label && <span className="switch-label">{label}</span>}
      <button
        type="button"
        className={`switch ${checked ? 'on' : ''}`}
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
      >
        <span className="switch-handle" />
      </button>
    </div>
  )
}
