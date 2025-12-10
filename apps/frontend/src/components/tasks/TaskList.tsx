import { useMemo } from 'react'
import { useTasks } from '../../hooks/useTasks'
import { useProjects } from '../../hooks/useProjects'
import { useSubjects } from '../../hooks/useSubjects'
import { TaskItem } from './TaskItem'
import type { TaskStatus } from '../../lib/types'
import { useSessions } from '../../hooks/useSessions'

type Props = {
  statusFilter?: TaskStatus[]
  search?: string
  stateFilter?: TaskStatus | 'all'
  excludeStatuses?: TaskStatus[]
}

export function TaskList({ statusFilter, search, stateFilter = 'all', excludeStatuses = [] }: Props) {
  const { data: tasks = [], isLoading, isError } = useTasks()
  const { data: projects = [] } = useProjects()
  const { data: subjects = [] } = useSubjects()
  const { data: sessions = [] } = useSessions()

  const focusByTask = useMemo(() => {
    const map = new Map<string, number>()
    sessions
      .filter((s) => s.type === 'focus' && s.taskId)
      .forEach((s) => {
        const prev = map.get(s.taskId!) ?? 0
        map.set(s.taskId!, prev + 1)
      })
    return map
  }, [sessions])

  const filtered = useMemo(() => {
    let base = tasks.filter((t) => !excludeStatuses.includes(t.status as TaskStatus))
    if (stateFilter !== 'all') {
      base = base.filter((t) => t.status === stateFilter)
    } else if (statusFilter) {
      base = base.filter((t) => statusFilter.includes(t.status as TaskStatus))
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase()
      base = base.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          projects.find((p) => p.id === t.projectId)?.name.toLowerCase().includes(q) ||
          subjects.find((s) => s.id === t.subjectId)?.name.toLowerCase().includes(q)
      )
    }
    base = [...base].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 10)
    return base
  }, [stateFilter, statusFilter, tasks, search, projects, subjects])

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
          focusCount={focusByTask.get(task.id) ?? 0}
        />
      ))}
    </div>
  )
}
