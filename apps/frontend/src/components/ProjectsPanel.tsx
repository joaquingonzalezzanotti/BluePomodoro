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

type ProjectDraft = {
  name: string
  description: string
  color: string
  dueDate: string | null
}

type SubjectDraft = {
  name: string
  description: string
}

const emptyProject: ProjectDraft = {
  name: '',
  description: '',
  color: '#1f56ff',
  dueDate: null,
}

const emptySubject: SubjectDraft = {
  name: '',
  description: '',
}

export function ProjectsPanel() {
  const { data: projects = [], isLoading: loadingProjects, isError: errorProjects } = useProjects()
  const { data: tasks = [] } = useTasks()

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [projectForm, setProjectForm] = useState<ProjectDraft>(emptyProject)
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [projectDraft, setProjectDraft] = useState<ProjectDraft>(emptyProject)

  const createProject = useCreateProject()
  const updateProject = useUpdateProject()
  const deleteProject = useDeleteProject()

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id)
    }
  }, [projects, selectedProjectId])

  const { data: subjects = [], isLoading: loadingSubjects, isError: errorSubjects } = useSubjects(selectedProjectId ?? undefined)
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

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectForm.name.trim()) return
    await createProject.mutateAsync(projectForm)
    setProjectForm(emptyProject)
  }

  const handleSaveProject = async () => {
    if (!editingProjectId) return
    await updateProject.mutateAsync({
      id: editingProjectId,
      ...projectDraft,
    })
    setEditingProjectId(null)
    setProjectDraft(emptyProject)
  }

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProjectId || !subjectForm.name.trim()) return
    await createSubject.mutateAsync({ ...subjectForm, projectId: selectedProjectId })
    setSubjectForm(emptySubject)
  }

  const handleSaveSubject = async () => {
    if (!editingSubjectId || !selectedProjectId) return
    await updateSubject.mutateAsync({
      id: editingSubjectId,
      ...subjectDraft,
      projectId: selectedProjectId,
    })
    setEditingSubjectId(null)
    setSubjectDraft(emptySubject)
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Proyectos</p>
          <h2>Selecciona un proyecto y gestiona sus materias</h2>
          <p className="muted">Crea proyectos en backend y solo muestra materias del proyecto activo.</p>
        </div>
      </div>

      {loadingProjects && <p className="muted">Cargando proyectos...</p>}
      {errorProjects && <p className="muted danger">No se pudieron cargar los proyectos.</p>}

      <div className="grid-2" style={{ gap: '16px' }}>
        <div className="field">
          <label>Proyecto activo</label>
          <select
            name="project-active"
            value={selectedProjectId ?? ''}
            onChange={(e) => setSelectedProjectId(e.target.value || null)}
          >
            <option value="">Selecciona un proyecto</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>&nbsp;</label>
          <button
            className="primary"
            type="button"
            onClick={() => setSelectedProjectId(projects[0]?.id ?? null)}
            disabled={projects.length === 0}
          >
            Ir al primero
          </button>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start', gap: '16px' }}>
        <form className="stack" onSubmit={handleCreateProject}>
          <p className="eyebrow">Nuevo proyecto</p>
          <div className="field">
            <label>Nombre</label>
            <input
              name="project-name"
              value={projectForm.name}
              onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label>Descripción</label>
            <input
              name="project-description"
              value={projectForm.description}
              onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
            />
          </div>
          <div className="grid-2">
            <div className="field">
              <label>Color</label>
              <input
                name="project-color"
                type="color"
                value={projectForm.color}
                onChange={(e) => setProjectForm({ ...projectForm, color: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Fecha objetivo</label>
              <input
                name="project-dueDate"
                type="date"
                value={projectForm.dueDate ?? ''}
                onChange={(e) => setProjectForm({ ...projectForm, dueDate: e.target.value || null })}
              />
            </div>
          </div>
          <button className="primary" type="submit" disabled={createProject.isPending}>
            {createProject.isPending ? 'Creando...' : 'Crear proyecto'}
          </button>
        </form>

        <div className="list" style={{ maxHeight: '420px', overflow: 'auto' }}>
          {projects.length === 0 && <p className="muted">Sin proyectos aún.</p>}
          {projects.map((p) => {
            const tasksCount = tasks.filter((t) => t.projectId === p.id).length
            return (
              <article
                key={p.id}
                className={`item ${selectedProjectId === p.id ? 'active' : ''}`}
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedProjectId(p.id)}
              >
                {editingProjectId === p.id ? (
                  <>
                    <div className="grid-2">
                      <div className="field">
                        <label>Nombre</label>
                        <input
                          name="project-edit-name"
                          value={projectDraft.name}
                          onChange={(e) => setProjectDraft({ ...projectDraft, name: e.target.value })}
                        />
                      </div>
                      <div className="field">
                        <label>Color</label>
                        <input
                          name="project-edit-color"
                          type="color"
                          value={projectDraft.color}
                          onChange={(e) => setProjectDraft({ ...projectDraft, color: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="field">
                      <label>Descripción</label>
                      <input
                        name="project-edit-description"
                        value={projectDraft.description}
                        onChange={(e) => setProjectDraft({ ...projectDraft, description: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>Fecha objetivo</label>
                      <input
                        name="project-edit-dueDate"
                        type="date"
                        value={projectDraft.dueDate ?? ''}
                        onChange={(e) => setProjectDraft({ ...projectDraft, dueDate: e.target.value || null })}
                      />
                    </div>
                    <div className="item-actions">
                      <button className="primary" type="button" onClick={handleSaveProject} disabled={updateProject.isPending}>
                        {updateProject.isPending ? 'Guardando...' : 'Guardar'}
                      </button>
                      <button
                        className="ghost"
                        type="button"
                        onClick={() => {
                          setEditingProjectId(null)
                          setProjectDraft(emptyProject)
                        }}
                      >
                        Cancelar
                      </button>
                      <button
                        className="ghost danger"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteProject.mutate(p.id)
                        }}
                        disabled={deleteProject.isPending}
                      >
                        Eliminar
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <header>
                      <div>
                        <p className="eyebrow">Proyecto</p>
                        <h3>{p.name}</h3>
                        {p.description && <p className="muted small">{p.description}</p>}
                        <p className="muted small">Creado: {formatDateShort(p.createdAt)}</p>
                        {p.dueDate && <p className="muted small">Objetivo: {formatDateShort(p.dueDate)}</p>}
                      </div>
                      <div className="chip" style={{ background: '#f5f5f5', color: p.color ?? '#1f56ff' }}>
                        {p.color}
                      </div>
                    </header>
                    <div className="muted small">
                      Materias: {/* placeholder until subjects are fetched in list */} — Tareas: {tasksCount}
                    </div>
                    <div className="item-actions">
                      <button
                        className="ghost"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedProjectId(p.id)
                          setEditingProjectId(p.id)
                          setProjectDraft({
                            name: p.name,
                            description: p.description ?? '',
                            color: p.color ?? '#1f56ff',
                            dueDate: (p as any).dueDate ?? null,
                          })
                        }}
                      >
                        Editar
                      </button>
                      <button
                        className="ghost danger"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteProject.mutate(p.id)
                        }}
                        disabled={deleteProject.isPending}
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

      {selectedProject && (
        <div className="panel" style={{ marginTop: '16px' }}>
          <div className="panel-header">
            <div>
              <p className="eyebrow">Materias del proyecto</p>
              <h3>{selectedProject.name}</h3>
              <p className="muted small">Solo se muestran materias asociadas al proyecto activo.</p>
            </div>
          </div>

          {loadingSubjects && <p className="muted">Cargando materias...</p>}
          {errorSubjects && <p className="muted danger">No se pudieron cargar las materias.</p>}

          <form className="grid-3" onSubmit={handleCreateSubject} style={{ marginBottom: '12px' }}>
            <div className="field">
              <label>Nombre</label>
              <input
                name="subject-name"
                value={subjectForm.name}
                onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>Descripción</label>
              <input
                name="subject-description"
                value={subjectForm.description}
                onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
              />
            </div>
            <div className="field">
              <label>&nbsp;</label>
              <button className="primary" type="submit" disabled={createSubject.isPending}>
                {createSubject.isPending ? 'Creando...' : 'Crear materia'}
              </button>
            </div>
          </form>

          <div className="list">
            {subjects.length === 0 && <p className="muted">Sin materias en este proyecto.</p>}
            {subjects.map((s) => {
              const countTasks = tasks.filter((t) => t.subjectId === s.id).length
              return (
                <article key={s.id} className="item">
                  {editingSubjectId === s.id ? (
                    <>
                      <div className="grid-2">
                        <div className="field">
                          <label>Nombre</label>
                          <input
                            name="subject-edit-name"
                            value={subjectDraft.name}
                            onChange={(e) => setSubjectDraft({ ...subjectDraft, name: e.target.value })}
                          />
                        </div>
                        <div className="field">
                          <label>Descripción</label>
                          <input
                            name="subject-edit-description"
                            value={subjectDraft.description}
                            onChange={(e) => setSubjectDraft({ ...subjectDraft, description: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="item-actions">
                        <button
                          className="primary"
                          type="button"
                          onClick={handleSaveSubject}
                          disabled={updateSubject.isPending}
                        >
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
                            setSubjectDraft({ name: s.name, description: s.description ?? '' })
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
      )}
    </div>
  )
}
