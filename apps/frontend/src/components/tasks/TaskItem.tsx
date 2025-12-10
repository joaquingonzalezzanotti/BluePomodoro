import { useMemo } from 'react'
import type { TaskStatus } from '../../lib/types'
import { formatDateShort } from '../../lib/time'
import { useUpdateTask, useDeleteTask } from '../../hooks/useTasks'
import type { Task } from '../../api/tasks'

type Props = {
  task: Task
  projectName?: string
  subjectName?: string
}

export function TaskItem({ task, projectName, subjectName }: Props) {
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

  const isDone = useMemo(() => task.status === 'done', [task.status])

  const toggleStatus = () => {
    const next: TaskStatus = isDone ? 'todo' : 'done'
    updateTask.mutate({ id: task.id, status: next })
  }

  return (
    <article className="item">
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" checked={isDone} onChange={toggleStatus} />
            <span style={{ fontWeight: 700, color: '#1f2a3d' }}>{task.title}</span>
          </div>
          {task.description && <p className="muted small" style={{ margin: '4px 0' }}>{task.description}</p>}
          <p className="muted small" style={{ margin: '2px 0' }}>
            Creada: {formatDateShort(task.createdAt)}
          </p>
          {(projectName || subjectName) && (
            <p className="muted small" style={{ margin: '2px 0' }}>
              {projectName && <span>Proyecto: {projectName}</span>}
              {projectName && subjectName ? ' · ' : ''}
              {subjectName && <span>Materia: {subjectName}</span>}
            </p>
          )}
        </div>
        <div className={`chip ${task.priority}`} style={{ alignSelf: 'flex-start' }}>
          {task.priority}
        </div>
      </header>
      <div className="item-actions" style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <select
          value={task.status}
          onChange={(e) => updateTask.mutate({ id: task.id, status: e.target.value as TaskStatus })}
        >
          <option value="todo">Pendiente</option>
          <option value="doing">En foco</option>
          <option value="done">Listo</option>
        </select>
        <button className="ghost danger" onClick={() => deleteTask.mutate(task.id)}>
          Eliminar
        </button>
      </div>
    </article>
  )
}
