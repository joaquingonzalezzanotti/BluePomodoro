import { useState } from 'react'
import { useAppStore } from '../state/useAppStore'
import { formatDateShort } from '../lib/time'

export function ProjectsPanel() {
  const { projects, subjects, tasks, addProject, editProject, removeProject } = useAppStore()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#1f56ff')
  const [dueDate, setDueDate] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<{ name: string; description: string; color: string; dueDate: string | null }>({
    name: '',
    description: '',
    color: '#1f56ff',
    dueDate: null,
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    await addProject({ name: name.trim(), description, color, dueDate })
    setName('')
    setDescription('')
    setColor('#1f56ff')
    setDueDate(null)
  }

  const startEdit = (id: string, current: { name: string; description: string; color?: string; dueDate?: string | null }) => {
    setEditingId(id)
    setDraft({
      name: current.name,
      description: current.description,
      color: current.color ?? '#1f56ff',
      dueDate: current.dueDate ?? null,
    })
  }

  const saveEdit = async () => {
    if (!editingId) return
    await editProject(editingId, draft)
    setEditingId(null)
    setDraft({ name: '', description: '', color: '#1f56ff', dueDate: null })
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Proyectos</p>
          <h2>ABMC de proyectos</h2>
          <p className="muted">Define proyectos con color y fecha objetivo.</p>
        </div>
      </div>

      <form className="grid-4" onSubmit={handleCreate}>
        <div className="field">
          <label>Nombre</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field">
          <label>Descripción</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="field">
          <label>Color</label>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </div>
        <div className="field">
          <label>Fecha objetivo</label>
          <input type="date" value={dueDate ?? ''} onChange={(e) => setDueDate(e.target.value || null)} />
        </div>
        <div className="field">
          <label>&nbsp;</label>
          <button className="primary" type="submit">
            Crear proyecto
          </button>
        </div>
      </form>

      <div className="list">
        {projects.length === 0 && <p className="muted">Sin proyectos aún.</p>}
        {projects.map((p) => (
          <article key={p.id} className="item split-card">
            {editingId === p.id ? (
              <>
                <div>
                  <div className="grid-4">
                    <div className="field">
                      <label>Nombre</label>
                      <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                    </div>
                    <div className="field">
                      <label>Descripción</label>
                      <input
                        value={draft.description}
                        onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>Color</label>
                      <input
                        type="color"
                        value={draft.color}
                        onChange={(e) => setDraft({ ...draft, color: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>Fecha objetivo</label>
                      <input
                        type="date"
                        value={draft.dueDate ?? ''}
                        onChange={(e) => setDraft({ ...draft, dueDate: e.target.value || null })}
                      />
                    </div>
                  </div>
                  <div className="item-actions">
                    <button className="primary" onClick={saveEdit}>
                      Guardar
                    </button>
                    <button className="ghost" onClick={() => setEditingId(null)}>
                      Cancelar
                    </button>
                    <button className="ghost danger" onClick={() => removeProject(p.id)}>
                      Eliminar
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <header>
                    <div>
                      <p className="eyebrow">Proyecto</p>
                      <h3>{p.name}</h3>
                      {p.description && <p className="muted small">{p.description}</p>}
                      <p className="muted small">Creado: {formatDateShort(p.createdAt)}</p>
                      {p.dueDate && <p className="muted small">Objetivo: {formatDateShort(p.dueDate)}</p>}
                    </div>
                    <div className="chip" style={{ background: '#f5f5f5', color: p.color ?? '#1f56ff' }}>
                      Color
                    </div>
                  </header>
                  <div className="item-actions">
                    <button className="ghost" onClick={() => startEdit(p.id, p)}>
                      Editar
                    </button>
                    <button className="ghost danger" onClick={() => removeProject(p.id)}>
                      Eliminar
                    </button>
                  </div>
                </div>
                <div>
                  <p className="eyebrow">Materias</p>
                  {subjects.filter((s) => s.projectId === p.id).length === 0 && <p className="muted small">Sin materias.</p>}
                  <ul className="muted small" style={{ paddingLeft: '16px', margin: 0 }}>
                    {subjects
                      .filter((s) => s.projectId === p.id)
                      .map((s) => {
                        const count = tasks.filter((t) => t.subjectId === s.id).length
                        return (
                          <li key={s.id}>
                            {s.name} ({count} tareas)
                          </li>
                        )
                      })}
                  </ul>
                </div>
              </>
            )}
          </article>
        ))}
      </div>
    </div>
  )
}
