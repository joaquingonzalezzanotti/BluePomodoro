import { useMemo, useState } from 'react'
import { useAppStore } from '../state/useAppStore'
import { formatDateShort } from '../lib/time'

export function SubjectsPanel() {
  const { subjects, projects, tasks, addSubject, editSubject, removeSubject, addProject } = useAppStore()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [projectId, setProjectId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<{ name: string; description: string; projectId: string | null }>({
    name: '',
    description: '',
    projectId: null,
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    // Si no hay proyecto seleccionado y no hay proyectos, crear uno mínimo
    let projId = projectId
    if (!projId && projects.length === 0) {
      const newProjectName = name.trim()
      await addProject({ name: newProjectName, description: '', color: '#1f56ff', dueDate: null })
      const updatedProjects = useAppStore.getState().projects
      projId = updatedProjects[0]?.id ?? null
    }

    await addSubject({ name: name.trim(), description, projectId: projId })
    setName('')
    setDescription('')
    setProjectId(null)
  }

  const startEdit = (id: string, current: { name: string; description: string; projectId: string | null }) => {
    setEditingId(id)
    setDraft(current)
  }

  const saveEdit = async () => {
    if (!editingId) return
    await editSubject(editingId, draft)
    setEditingId(null)
    setDraft({ name: '', description: '', projectId: null })
  }

  const sortedSubjects = useMemo(
    () => [...subjects].sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1)),
    [subjects]
  )

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Materias</p>
          <h2>ABMC de materias</h2>
          <p className="muted">Relaciona materias con proyectos y asigna tareas luego.</p>
        </div>
      </div>

      <form className="grid-4" onSubmit={handleCreate}>
        <div className="field">
          <label>Nombre</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field">
          <label>Proyecto</label>
          <select value={projectId ?? ''} onChange={(e) => setProjectId(e.target.value || null)}>
            <option value="">Sin proyecto</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Descripción</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="field">
          <label>&nbsp;</label>
          <button className="primary" type="submit">
            Crear materia
          </button>
        </div>
      </form>

      <div className="list">
        {sortedSubjects.length === 0 && <p className="muted">Sin materias aún.</p>}
        {sortedSubjects.map((s) => (
          <article key={s.id} className="item split-card">
            {editingId === s.id ? (
              <>
                <div className="grid-4">
                  <div className="field">
                    <label>Nombre</label>
                    <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                  </div>
                  <div className="field">
                    <label>Proyecto</label>
                    <select
                      value={draft.projectId ?? ''}
                      onChange={(e) => setDraft({ ...draft, projectId: e.target.value || null })}
                    >
                      <option value="">Sin proyecto</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Descripción</label>
                    <input
                      value={draft.description}
                      onChange={(e) => setDraft({ ...draft, description: e.target.value })}
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
                  <button className="ghost danger" onClick={() => removeSubject(s.id)}>
                    Eliminar
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <header>
                    <div>
                      <p className="eyebrow">Materia</p>
                      <h3>{s.name}</h3>
                      {s.description && <p className="muted small">{s.description}</p>}
                      <p className="muted small">
                        Proyecto: {s.projectId ? projects.find((p) => p.id === s.projectId)?.name ?? '—' : '—'}
                      </p>
                      <p className="muted small">Creada: {formatDateShort(s.createdAt)}</p>
                    </div>
                  </header>
                  <div className="item-actions">
                    <button
                      className="ghost"
                      onClick={() =>
                        startEdit(s.id, { name: s.name, description: s.description, projectId: s.projectId ?? null })
                      }
                    >
                      Editar
                    </button>
                    <button className="ghost danger" onClick={() => removeSubject(s.id)}>
                      Eliminar
                    </button>
                  </div>
                </div>
                <div>
                  <p className="eyebrow">Tareas</p>
                  {tasks.filter((t) => t.subjectId === s.id).length === 0 && <p className="muted small">Sin tareas.</p>}
                  <ul className="muted small" style={{ paddingLeft: '16px', margin: 0 }}>
                    {tasks
                      .filter((t) => t.subjectId === s.id)
                      .map((t) => (
                        <li key={t.id}>
                          {t.title} ({t.status})
                        </li>
                      ))}
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
