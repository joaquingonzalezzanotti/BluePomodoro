import { useMemo, useState } from 'react'
import { useTasks, useUpdateTask, useDeleteTask } from '../../hooks/useTasks'
import { useProjects } from '../../hooks/useProjects'
import { useSubjects } from '../../hooks/useSubjects'
import { useSubtasks, useCreateSubtask, useUpdateSubtask, useDeleteSubtask } from '../../hooks/useSubtasks'
import type { TaskStatus } from '../../lib/types'
import { formatDateShort } from '../../lib/time'
import pomodoroIcon from '../../assets/BluePomodoro.png'

const STATUS_COLUMNS: { key: TaskStatus; title: string; hint: string; tint: string }[] = [
  { key: 'todo', title: 'Pendiente', hint: 'Por hacer', tint: 'rgba(37,99,235,0.08)' },
  { key: 'doing', title: 'En foco', hint: 'En curso', tint: 'rgba(16,185,129,0.10)' },
  { key: 'done', title: 'Listo', hint: 'Terminado', tint: 'rgba(99,102,241,0.10)' },
]

export function KanbanBoard() {
  const { data: tasks = [], isLoading, isError } = useTasks()
  const { data: projects = [] } = useProjects()
  const { data: subjects = [] } = useSubjects()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const { data: subtasks = [] } = useSubtasks()
  const createSubtask = useCreateSubtask()
  const updateSubtask = useUpdateSubtask()
  const deleteSubtask = useDeleteSubtask()

  const grouped = useMemo(() => {
    const map: Record<TaskStatus, typeof tasks> = { todo: [], doing: [], done: [] }
    tasks.forEach((t) => {
      map[t.status as TaskStatus]?.push(t)
    })
    return map
  }, [tasks])

  if (isLoading) {
    return <p className="muted">Cargando tareas...</p>
  }

  if (isError) {
    return <p className="muted danger">No pudimos cargar tus tareas, intenta de nuevo.</p>
  }

  return (
    <div className="kanban-grid">
      {STATUS_COLUMNS.map((col) => (
        <div key={col.key} className="kanban-column" style={{ background: col.tint }}>
          <div className="kanban-column-header">
            <div>
              <p className="eyebrow">{col.title}</p>
              <h3>{col.hint}</h3>
            </div>
            <span className="muted small">{grouped[col.key]?.length ?? 0}</span>
          </div>
          <div className="kanban-list">
            {grouped[col.key]?.length === 0 && <p className="muted small">Sin tareas aquí.</p>}
            {grouped[col.key]?.map((task) => {
              const taskSubtasks = subtasks.filter((s) => s.taskId === task.id)
              return (
                <article key={task.id} className="kanban-card">
                  <header>
                    <div>
                      <p className="eyebrow">{projects.find((p) => p.id === task.projectId)?.name ?? 'Sin proyecto'}</p>
                      <h4>{task.title}</h4>
                      {task.description && <p className="muted small">{task.description}</p>}
                    </div>
                    <div>
                      {task.estimatedPomodoros > 0 ? (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {Array.from({ length: Math.min(task.estimatedPomodoros, 5) }).map((_, idx) => (
                            <img key={idx} src={pomodoroIcon} alt="pomodoro" width={18} height={18} />
                          ))}
                        </div>
                      ) : (
                        <p className="muted small" style={{ margin: 0 }}>
                          Sin estimado
                        </p>
                      )}
                    </div>
                  </header>
                  <p className="muted small">Creada: {formatDateShort(task.createdAt)}</p>
                  {task.subjectId && (
                    <p className="muted small">
                      Materia: {subjects.find((s) => s.id === task.subjectId)?.name ?? 'N/D'}
                    </p>
                  )}

                  <div className="subtasks-block">
                    <p className="muted small">Subtareas ({taskSubtasks.length}/3)</p>
                    <ul className="subtask-list">
                      {taskSubtasks.map((s) => (
                        <li key={s.id} className="subtask-item">
                          <label className="checkbox">
                            <input
                              type="checkbox"
                              checked={s.done}
                              onChange={(e) => updateSubtask.mutate({ id: s.id, done: e.target.checked })}
                            />
                            <span>{s.title}</span>
                          </label>
                          <button className="ghost danger" onClick={() => deleteSubtask.mutate(s.id)}>
                            x
                          </button>
                        </li>
                      ))}
                      {taskSubtasks.length === 0 && <li className="muted small">Sin subtareas.</li>}
                    </ul>
                    <SubtaskAdder
                      disabled={taskSubtasks.length >= 3}
                      onAdd={async (title) => {
                        if (!title.trim()) return
                        await createSubtask.mutateAsync({ taskId: task.id, title: title.trim() })
                      }}
                    />
                  </div>

                  <div className="kanban-actions">
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
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function SubtaskAdder({ disabled, onAdd }: { disabled: boolean; onAdd: (title: string) => Promise<void> }) {
  const [title, setTitle] = useState('')
  return (
    <div className="subtask-adder">
      <input
        type="text"
        placeholder={disabled ? 'Máx. 3 subtareas' : 'Añadir subtarea'}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={disabled}
      />
      <button
        className="ghost"
        type="button"
        disabled={disabled}
        onClick={async () => {
          if (!title.trim()) return
          await onAdd(title)
          setTitle('')
        }}
      >
        Añadir
      </button>
    </div>
  )
}

