import { useEffect, useRef, useState } from 'react'

export type ColorOption = { value: string; label: string }

type Props = {
  value: string
  onChange: (color: string) => void
  options: ColorOption[]
  label?: string
}

export function ColorPicker({ value, onChange, options, label = 'Color' }: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const selected = options.find((o) => o.value === value) ?? options[0]

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [open])

  return (
    <div className="color-picker" ref={containerRef}>
      <label className="color-picker-label">{label}</label>
      <button
        type="button"
        className="color-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span className="color-dot" style={{ background: selected.value }} />
        <span className="color-name">{selected.label}</span>
        <span className="chevron">▾</span>
      </button>
      {open && (
        <div className="color-popover">
          <div className="color-popover-grid">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`color-swatch ${selected.value === opt.value ? 'active' : ''}`}
                style={{ background: opt.value }}
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
                aria-label={`Color ${opt.label}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
