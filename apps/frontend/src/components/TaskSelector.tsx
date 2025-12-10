import { useMemo } from 'react'
import { useTasks } from '../hooks/useTasks'
import { useProjects } from '../hooks/useProjects'
import type { TaskStatus } from '../lib/types'

type Props = {
  value: string | null
  onChange: (taskId: string | null) => void
}

export function TaskSelector({ value, onChange }: Props) {
  const { data: tasks = [], isLoading } = useTasks()
  const { data: projects = [] } = useProjects()

  const selectable = useMemo(
    () =>
      tasks
        .filter((t) => t.status === ('todo' as TaskStatus) || t.status === ('doing' as TaskStatus))
        .sort((a, b) => (a.status === 'doing' ? -1 : b.status === 'doing' ? 1 : 0)),
    [tasks]
  )

  const getProjectBadge = (projectId?: string | null) => {
    if (!projectId) return 'Sin proyecto'
    return projects.find((p) => p.id === projectId)?.name ?? 'Sin proyecto'
  }

  return (
    <div className="field">
      <label htmlFor="task-select">Tarea activa</label>
      <select
        id="task-select"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={isLoading || selectable.length === 0}
      >
        <option value="">Sin tarea</option>
        {selectable.map((task) => (
          <option key={task.id} value={task.id}>
            {task.title} · {getProjectBadge(task.projectId)}
          </option>
        ))}
      </select>
      {isLoading && <p className="muted small">Cargando tareas...</p>}
      {!isLoading && selectable.length === 0 && <p className="muted small">No hay pendientes/en foco.</p>}
    </div>
  )
}
