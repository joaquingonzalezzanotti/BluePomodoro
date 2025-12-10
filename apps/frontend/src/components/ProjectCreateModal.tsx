import { useEffect, useState } from 'react'

type ProjectDraft = {
  name: string
  description: string
  color: string
  dueDate: string | null
}

type Props = {
  open: boolean
  onClose: () => void
  onCreate: (draft: ProjectDraft) => Promise<unknown>
}

const emptyProject: ProjectDraft = {
  name: '',
  description: '',
  color: '#1f56ff',
  dueDate: null,
}

export function ProjectCreateModal({ open, onClose, onCreate }: Props) {
  const [draft, setDraft] = useState<ProjectDraft>(emptyProject)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setDraft(emptyProject)
      setIsSubmitting(false)
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.name.trim()) return
    setIsSubmitting(true)
    try {
      await onCreate(draft)
      setDraft(emptyProject)
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-header">
          <h3>Nuevo proyecto</h3>
          <button className="ghost" type="button" onClick={onClose}>
            Cerrar
          </button>
        </div>
        <form className="stack" onSubmit={handleSubmit}>
          <div className="field">
            <label>Nombre</label>
            <input
              name="project-name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              required
              placeholder="Ej. App tesis"
            />
          </div>
          <div className="field">
            <label>Descripción</label>
            <input
              name="project-description"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="Breve nota opcional"
            />
          </div>
          <div className="grid-2">
            <div className="field">
              <label>Color</label>
              <input
                name="project-color"
                type="color"
                value={draft.color}
                onChange={(e) => setDraft({ ...draft, color: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Fecha objetivo</label>
              <input
                name="project-dueDate"
                type="date"
                value={draft.dueDate ?? ''}
                onChange={(e) => setDraft({ ...draft, dueDate: e.target.value || null })}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button className="ghost" type="button" onClick={onClose}>
              Cancelar
            </button>
            <button className="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creando...' : 'Crear proyecto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
