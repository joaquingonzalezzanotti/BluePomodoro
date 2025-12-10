import { useEffect, useMemo, useState } from 'react'
import { formatDateShort } from '../lib/time'
import {
  useProjects,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
} from '../hooks/useProjects'
import {
  useSubjects,
  useCreateSubject,
  useUpdateSubject,
  useDeleteSubject,
} from '../hooks/useSubjects'
import { useTasks } from '../hooks/useTasks'
import { ProjectCreateModal } from './ProjectCreateModal'

type SubjectDraft = {
  name: string
  description: string
}

const emptySubject: SubjectDraft = {
  name: '',
  description: '',
}

export function ProjectsPanel() {
  const { data: projects = [], isLoading: loadingProjects, isError: errorProjects } = useProjects()
  const { data: tasks = [] } = useTasks()

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [projectDraft, setProjectDraft] = useState({
    name: '',
    description: '',
    color: '#1f56ff',
    dueDate: null as string | null,
  })

  const createProject = useCreateProject()
  const updateProject = useUpdateProject()
  const deleteProject = useDeleteProject()

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id)
    }
  }, [projects, selectedProjectId])

  const {
    data: subjects = [],
    isLoading: loadingSubjects,
    isError: errorSubjects,
  } = useSubjects(selectedProjectId ?? undefined)
  const createSubject = useCreateSubject()
  const updateSubject = useUpdateSubject()
  const deleteSubject = useDeleteSubject()

  const [subjectForm, setSubjectForm] = useState<SubjectDraft>(emptySubject)
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null)
  const [subjectDraft, setSubjectDraft] = useState<SubjectDraft>(emptySubject)

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  )

  const startEditProject = (id: string) => {
    const current = projects.find((p) => p.id === id)
    if (!current) return
    setEditingProjectId(id)
    setProjectDraft({
      name: current.name,
      description: current.description ?? '',
      color: current.color ?? '#1f56ff',
      dueDate: (current as any).dueDate ?? null,
    })
  }

  const handleSaveProject = async () => {
    if (!editingProjectId) return
    await updateProject.mutateAsync({
      id: editingProjectId,
      ...projectDraft,
    })
    setEditingProjectId(null)
  }

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProjectId || !subjectForm.name.trim()) return
    await createSubject.mutateAsync({ ...subjectForm, projectId: selectedProjectId })
    setSubjectForm(emptySubject)
  }

  const handleSaveSubject = async () => {
    if (!editingSubjectId) return
    await updateSubject.mutateAsync({
      id: editingSubjectId,
      name: subjectDraft.name,
      description: subjectDraft.description,
      projectId: selectedProjectId,
    })
    setEditingSubjectId(null)
    setSubjectDraft(emptySubject)
  }

  return (
    <>
      <div className="panel project-grid">
        <aside className="project-sidebar">
          <div className="sidebar-header">
            <div>
              <p className="eyebrow">Proyectos</p>
              <h3>Mis proyectos</h3>
            </div>
            <button className="primary" type="button" onClick={() => setShowCreateModal(true)}>
              + Nuevo proyecto
            </button>
          </div>

          {loadingProjects && <p className="muted">Cargando proyectos...</p>}
          {errorProjects && <p className="muted danger">No se pudieron cargar los proyectos.</p>}

          <div className="project-list">
            {projects.length === 0 && <p className="muted">Sin proyectos aún.</p>}
            {projects.map((p) => {
              const isActive = selectedProjectId === p.id
              return (
                <button
                  key={p.id}
                  className={`project-list-item ${isActive ? 'active' : ''}`}
                  onClick={() => setSelectedProjectId(p.id)}
                  type="button"
                >
                  <span className="color-dot" style={{ background: p.color ?? '#1f56ff' }} />
                  <div className="project-list-text">
                    <span className="name">{p.name}</span>
                    {p.description && <span className="muted small">{p.description}</span>}
                  </div>
                </button>
              )
            })}
          </div>
        </aside>

        <section className="project-main">
          {selectedProject ? (
            <>
              <header className="project-main-header">
                {editingProjectId === selectedProject.id ? (
                  <div className="stack" style={{ width: '100%', gap: '8px' }}>
                    <div className="grid-2">
                      <div className="field">
                        <label>Nombre</label>
                        <input
                          value={projectDraft.name}
                          onChange={(e) => setProjectDraft({ ...projectDraft, name: e.target.value })}
                        />
                      </div>
                      <div className="field">
                        <label>Color</label>
                        <input
                          type="color"
                          value={projectDraft.color}
                          onChange={(e) => setProjectDraft({ ...projectDraft, color: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid-2">
                      <div className="field">
                        <label>Descripción</label>
                        <input
                          value={projectDraft.description}
                          onChange={(e) => setProjectDraft({ ...projectDraft, description: e.target.value })}
                        />
                      </div>
                      <div className="field">
                        <label>Fecha objetivo</label>
                        <input
                          type="date"
                          value={projectDraft.dueDate ?? ''}
                          onChange={(e) => setProjectDraft({ ...projectDraft, dueDate: e.target.value || null })}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="primary" type="button" onClick={handleSaveProject} disabled={updateProject.isPending}>
                        {updateProject.isPending ? 'Guardando...' : 'Guardar'}
                      </button>
                      <button className="ghost" type="button" onClick={() => setEditingProjectId(null)}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="eyebrow">Proyecto activo</p>
                      <h2>{selectedProject.name}</h2>
                      {selectedProject.description && <p className="muted">{selectedProject.description}</p>}
                      <p className="muted small">Creado: {formatDateShort(selectedProject.createdAt)}</p>
                      {selectedProject.dueDate && <p className="muted small">Objetivo: {formatDateShort(selectedProject.dueDate)}</p>}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="ghost" type="button" onClick={() => startEditProject(selectedProject.id)}>
                        Editar
                      </button>
                      <button
                        className="ghost danger"
                        type="button"
                        onClick={() => deleteProject.mutate(selectedProject.id)}
                        disabled={deleteProject.isPending}
                      >
                        Eliminar
                      </button>
                    </div>
                  </>
                )}
              </header>

              <div className="panel" style={{ boxShadow: 'none', padding: '12px', marginTop: '8px' }}>
                <div className="panel-header" style={{ marginBottom: '8px' }}>
                  <div>
                    <p className="eyebrow">Materias asociadas</p>
                    <h3>Lista de materias</h3>
                  </div>
                  <form className="grid-2" onSubmit={handleCreateSubject} style={{ maxWidth: '520px', alignItems: 'end' }}>
                    <div className="field">
                      <label>Nombre</label>
                      <input
                        value={subjectForm.name}
                        onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                        required
                        placeholder="Ej. Álgebra"
                      />
                    </div>
                    <div className="field">
                      <label>Descripción</label>
                      <input
                        value={subjectForm.description}
                        onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                        placeholder="Opcional"
                      />
                    </div>
                    <div className="field" style={{ gridColumn: '1 / span 2' }}>
                      <button className="primary" type="submit" disabled={createSubject.isPending}>
                        {createSubject.isPending ? 'Creando...' : 'Crear materia'}
                      </button>
                    </div>
                  </form>
                </div>

                {loadingSubjects && <p className="muted">Cargando materias...</p>}
                {errorSubjects && <p className="muted danger">No se pudieron cargar las materias.</p>}
                <div className="list">
                  {subjects.length === 0 && <p className="muted">Sin materias en este proyecto.</p>}
                  {subjects.map((s) => {
                    const countTasks = tasks.filter((t) => t.subjectId === s.id).length
                    const isEditing = editingSubjectId === s.id
                    return (
                      <article key={s.id} className="item">
                        {isEditing ? (
                          <>
                            <div className="grid-2">
                              <div className="field">
                                <label>Nombre</label>
                                <input
                                  value={subjectDraft.name}
                                  onChange={(e) => setSubjectDraft({ ...subjectDraft, name: e.target.value })}
                                />
                              </div>
                              <div className="field">
                                <label>Descripción</label>
                                <input
                                  value={subjectDraft.description}
                                  onChange={(e) => setSubjectDraft({ ...subjectDraft, description: e.target.value })}
                                />
                              </div>
                            </div>
                            <div className="item-actions">
                              <button className="primary" type="button" onClick={handleSaveSubject} disabled={updateSubject.isPending}>
                                {updateSubject.isPending ? 'Guardando...' : 'Guardar'}
                              </button>
                              <button
                                className="ghost"
                                type="button"
                                onClick={() => {
                                  setEditingSubjectId(null)
                                  setSubjectDraft(emptySubject)
                                }}
                              >
                                Cancelar
                              </button>
                              <button
                                className="ghost danger"
                                type="button"
                                onClick={() => deleteSubject.mutate(s.id)}
                                disabled={deleteSubject.isPending}
                              >
                                Eliminar
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <header>
                              <div>
                                <p className="eyebrow">Materia</p>
                                <h4>{s.name}</h4>
                                {s.description && <p className="muted small">{s.description}</p>}
                                <p className="muted small">Creada: {formatDateShort(s.createdAt)}</p>
                                <p className="muted small">Tareas: {countTasks}</p>
                              </div>
                            </header>
                            <div className="item-actions">
                              <button
                                className="ghost"
                                type="button"
                                onClick={() => {
                                  setEditingSubjectId(s.id)
                                  setSubjectDraft({
                                    name: s.name,
                                    description: s.description ?? '',
                                  })
                                }}
                              >
                                Editar
                              </button>
                              <button
                                className="ghost danger"
                                type="button"
                                onClick={() => deleteSubject.mutate(s.id)}
                                disabled={deleteSubject.isPending}
                              >
                                Eliminar
                              </button>
                            </div>
                          </>
                        )}
                      </article>
                    )
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="muted">Selecciona un proyecto para ver sus detalles.</div>
          )}
        </section>
      </div>

      <ProjectCreateModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={(draft) => createProject.mutateAsync(draft)}
      />
    </>
  )
}
