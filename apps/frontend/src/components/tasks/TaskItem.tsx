import { useMemo } from 'react'
import type { TaskStatus } from '../../lib/types'
import { formatDateShort } from '../../lib/time'
import { useUpdateTask, useDeleteTask } from '../../hooks/useTasks'
import type { Task } from '../../api/tasks'
import pomodoroIcon from '../../assets/BluePomodoro.png'

type Props = {
  task: Task
  projectName?: string
  subjectName?: string
  focusCount?: number
}

export function TaskItem({ task, projectName, subjectName, focusCount = 0 }: Props) {
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

  const isDone = useMemo(() => task.status === 'done', [task.status])

  const toggleStatus = () => {
    const next: TaskStatus = isDone ? 'todo' : 'done'
    updateTask.mutate({ id: task.id, status: next })
  }

  return (
    <article className="item">
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              className={`task-check ${isDone ? 'checked' : ''}`}
              onClick={toggleStatus}
              aria-label={isDone ? 'Marcar como pendiente' : 'Marcar como completada'}
            />
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
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {task.estimatedPomodoros > 0 ? (
            Array.from({ length: Math.min(task.estimatedPomodoros, 5) }).map((_, idx) => (
              <img key={idx} src={pomodoroIcon} alt="pomodoro" width={16} height={16} />
            ))
          ) : (
            <span className="muted small">Sin estimado</span>
          )}
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
        <span className="muted small">Hechos: {focusCount}</span>
        <button className="ghost danger" onClick={() => deleteTask.mutate(task.id)}>
          Eliminar
        </button>
      </div>
    </article>
  )
}
