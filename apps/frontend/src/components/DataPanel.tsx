import { useRef } from 'react'
import { useAppStore } from '../state/useAppStore'

export function DataPanel() {
  const exportData = useAppStore((s) => s.exportData)
  const importData = useAppStore((s) => s.importData)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleExport = async () => {
    const blob = await exportData()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pomodoro-data-${new Date().toISOString().slice(0, 10)}.sqlite`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer()
    await importData(arrayBuffer)
    alert('Datos importados. Recarga si no ves los cambios.')
  }

  return (
    <div className="preferences-shell">
      <div className="pref-card" style={{ marginTop: '12px' }}>
        <div className="pref-header">
          <div>
            <p className="eyebrow">Respaldos</p>
            <h2>Mantenimiento</h2>
            <p className="muted">Exporta o importa tus datos. Usa esta sección con cuidado.</p>
          </div>
        </div>
        <div className="data-actions">
          <button className="ghost" onClick={handleExport}>
            📤 Exportar
          </button>
          <button
            className="ghost"
            onClick={() => {
              fileInputRef.current?.click()
            }}
          >
            📥 Importar
          </button>
          <input
            type="file"
            accept=".sqlite"
            name="data-import-file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleImport(file)
            }}
          />
        </div>
      </div>
    </div>
  )
}
