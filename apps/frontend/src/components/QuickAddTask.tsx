import { useMemo, useState } from 'react'
import { useProjects } from '../hooks/useProjects'
import { useSubjects } from '../hooks/useSubjects'
import { useCreateTask } from '../hooks/useTasks'

export function QuickAddTask() {
  const { data: projects = [] } = useProjects()
  const [projectId, setProjectId] = useState<string | null>(null)
  const { data: subjects = [] } = useSubjects(projectId ?? undefined)
  const createTask = useCreateTask()

  const [title, setTitle] = useState('')
  const [subjectId, setSubjectId] = useState<string | null>(null)

  const filteredSubjects = useMemo(() => {
    if (projectId) return subjects.filter((s) => s.projectId === projectId)
    // sin proyecto: mostrar materias sin proyecto
    return subjects.filter((s) => !s.projectId)
  }, [subjects, projectId])

  const handleSubjectChange = (value: string) => {
    const subj = subjects.find((s) => s.id === value)
    setSubjectId(value || null)
    if (subj?.projectId) {
      setProjectId(subj.projectId)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    await createTask.mutateAsync({
      title: title.trim(),
      description: '',
      priority: 'medium',
      dueDate: null,
      estimatedPomodoros: 1,
      projectId,
      subjectId,
    })
    setTitle('')
    setProjectId(null)
    setSubjectId(null)
  }

  return (
    <form className="panel" onSubmit={handleSubmit}>
      <div className="panel-header">
        <div>
          <p className="eyebrow">Quick add</p>
          <h2>Agregar tarea rápida</h2>
          <p className="muted small">Título + proyecto/materia opcional.</p>
        </div>
      </div>
      <div className="grid-4">
        <div className="field">
          <label>Título</label>
          <input
            name="quick-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Tarea breve"
            required
          />
        </div>
        <div className="field">
          <label>Proyecto</label>
          <select
            value={projectId ?? ''}
            onChange={(e) => {
              const val = e.target.value || null
              setProjectId(val)
              if (val === null) setSubjectId(null)
            }}
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
          <label>Materia</label>
          <select value={subjectId ?? ''} onChange={(e) => handleSubjectChange(e.target.value || '')}>
            <option value="">Sin materia</option>
            {filteredSubjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>&nbsp;</label>
          <button className="primary" type="submit" disabled={createTask.isPending}>
            {createTask.isPending ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </form>
  )
}
