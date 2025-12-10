import { useEffect, useMemo, useRef, useState } from 'react'
import { useCreateTask } from '../../hooks/useTasks'
import { useProjects } from '../../hooks/useProjects'
import { useSubjects } from '../../hooks/useSubjects'
import pomodoroIcon from '../../assets/BluePomodoro.png'

export function TaskQuickAdd() {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState<string | null>(null)
  const [subjectId, setSubjectId] = useState<string | null>(null)
  const [estimate, setEstimate] = useState<number | null>(null)
  const { data: projects = [] } = useProjects()
  const { data: subjects = [] } = useSubjects(projectId ?? undefined)
  const createTask = useCreateTask()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const filteredSubjects = useMemo(() => {
    if (projectId) return subjects.filter((s) => s.projectId === projectId)
    return subjects.filter((s) => !s.projectId)
  }, [subjects, projectId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = title.trim()
    if (!value) return
    setErrorMsg(null)
    try {
      await createTask.mutateAsync({
        title: value,
        projectId,
        subjectId,
        description: '',
        priority: 'medium',
        estimatedPomodoros: estimate ?? 0,
        dueDate: null,
      })
      setTitle('')
      setProjectId(null)
      setSubjectId(null)
      setEstimate(null)
      inputRef.current?.focus()
    } catch {
      setErrorMsg('No pudimos guardar, intenta de nuevo.')
    }
  }

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <form className="panel" onSubmit={handleSubmit}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="field">
          <span className="quick-add-label">Tareas</span>
          <input
            ref={inputRef}
            id="quick-title"
            name="quick-title"
            placeholder="Que hay que hacer?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <select
            name="quick-project"
            value={projectId ?? ''}
            onChange={(e) => {
              const val = e.target.value || null
              setProjectId(val)
              if (!val) setSubjectId(null)
            }}
            style={{ minWidth: '180px', flex: 1 }}
          >
            <option value="">Sin proyecto</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            name="quick-subject"
            value={subjectId ?? ''}
            onChange={(e) => setSubjectId(e.target.value || null)}
            style={{ minWidth: '180px', flex: 1 }}
          >
            <option value="">Sin materia</option>
            {filteredSubjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            name="quick-estimate"
            value={estimate ?? ''}
            onChange={(e) => setEstimate(e.target.value ? Number(e.target.value) : null)}
            style={{ minWidth: '160px' }}
          >
            <option value="">Pomodoros (opcional)</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} pomodoro{n > 1 ? 's' : ''}
              </option>
            ))}
          </select>
          <button className="primary" type="submit" disabled={createTask.isPending} style={{ whiteSpace: 'nowrap' }}>
            {createTask.isPending ? 'Guardando...' : 'Crear'}
          </button>
        </div>
        {estimate ? (
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {Array.from({ length: estimate }).map((_, idx) => (
              <img key={idx} src={pomodoroIcon} alt="pomodoro" width={18} height={18} />
            ))}
          </div>
        ) : null}
      </div>
      {errorMsg && (
        <p className="muted danger small" style={{ marginTop: '4px' }}>
          {errorMsg}
        </p>
      )}
    </form>
  )
}
