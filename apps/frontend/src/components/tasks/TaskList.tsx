import { useMemo } from 'react'
import { useTasks } from '../../hooks/useTasks'
import { useProjects } from '../../hooks/useProjects'
import { useSubjects } from '../../hooks/useSubjects'
import { TaskItem } from './TaskItem'
import type { TaskStatus } from '../../lib/types'

type Props = {
  statusFilter?: TaskStatus[]
}

export function TaskList({ statusFilter }: Props) {
  const { data: tasks = [], isLoading, isError } = useTasks()
  const { data: projects = [] } = useProjects()
  const { data: subjects = [] } = useSubjects()

  const filtered = useMemo(() => {
    const base = statusFilter ? tasks.filter((t) => statusFilter.includes(t.status as TaskStatus)) : tasks
    return base
  }, [statusFilter, tasks])

  if (isLoading) {
    return (
      <div className="list">
        {[1, 2, 3].map((i) => (
          <div key={i} className="item" style={{ padding: '12px' }}>
            <div className="skeleton skeleton-bar" style={{ width: '50%', marginBottom: '8px' }} />
            <div className="skeleton skeleton-bar" style={{ width: '70%', marginBottom: '6px' }} />
            <div className="skeleton skeleton-chip" style={{ width: '90px' }} />
          </div>
        ))}
      </div>
    )
  }

  if (isError) {
    return <p className="muted danger">No pudimos cargar tus tareas, la red es lenta. Presiona para reintentar.</p>
  }

  if (filtered.length === 0) {
    return <p className="muted">Aún no hay tareas.</p>
  }

  return (
    <div className="list">
      {filtered.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          projectName={projects.find((p) => p.id === task.projectId)?.name}
          subjectName={subjects.find((s) => s.id === task.subjectId)?.name}
        />
      ))}
    </div>
  )
}
