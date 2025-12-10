import { useMemo, useState, type FormEvent } from 'react'
import { useAppStore } from '../state/useAppStore'
import { type Task, type TaskStatus } from '../lib/types'
import { formatDateShort } from '../lib/time'

type TasksPanelProps = {
  compact?: boolean
  listOnly?: boolean
  embedded?: boolean
  showList?: boolean
  showForm?: boolean
  statusFilter?: TaskStatus[]
}

const statusOrder: Record<TaskStatus, number> = {
  todo: 1,
  doing: 2,
  done: 3,
}
const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'Pendiente' },
  { value: 'doing', label: 'En foco' },
  { value: 'done', label: 'Listo' },
]

export function TasksPanel({
  compact = false,
  listOnly = false,
  embedded = true,
  showList = true,
  showForm = true,
  statusFilter,
}: TasksPanelProps) {
  const {
    tasks,
    projects,
    subjects,
    subtasks,
    addTask,
    setTaskStatus,
    sessions,
    editTask,
    removeTask,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
  } = useAppStore()
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<Task['priority']>('medium')
  const [description, setDescription] = useState('')
  const [estimatedPomodoros, setEstimatedPomodoros] = useState(1)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [subjectId, setSubjectId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Partial<Task>>({})
  const [subtaskInput, setSubtaskInput] = useState<Record<string, string>>({})

  const filteredTasks = useMemo(() => {
    const base = statusFilter ? tasks.filter((t) => statusFilter.includes(t.status)) : tasks
    return [...base].sort((a, b) => statusOrder[a.status] - statusOrder[b.status])
  }, [statusFilter, tasks])

  const focusPerTask = useMemo(() => {
    const map = new Map<string, number>()
    sessions
      .filter((s) => s.type === 'focus' && s.taskId)
      .forEach((s) => {
        const prev = map.get(s.taskId!) ?? 0
        map.set(s.taskId!, prev + 1)
      })
    return map
  }, [sessions])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim()) return
    await addTask({
      title: title.trim(),
      description,
      priority,
      dueDate: null,
      estimatedPomodoros,
      projectId,
      subjectId,
    })
    setTitle('')
    setDescription('')
    setPriority('medium')
    setEstimatedPomodoros(1)
    setProjectId(null)
    setSubjectId(null)
  }

  const statusLabel = (status: TaskStatus) => {
    if (status === 'todo') return 'Pendiente'
    if (status === 'doing') return 'En foco'
    return 'Listo'
  }

  const startEdit = (task: Task) => {
    setEditingId(task.id)
    setEditDraft(task)
  }

  const saveEdit = async () => {
    if (!editingId) return
    await editTask(editingId, {
      title: editDraft.title,
      description: editDraft.description,
      priority: editDraft.priority,
      estimatedPomodoros: editDraft.estimatedPomodoros,
      projectId: editDraft.projectId,
      subjectId: editDraft.subjectId,
    })
    setEditingId(null)
    setEditDraft({})
  }

  const filteredSubjects = useMemo(
    () => subjects.filter((s) => !projectId || s.projectId === projectId),
    [subjects, projectId]
  )

  const formBlock = !showForm || compact || listOnly ? null : (
    <form className="stack" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="title">Título</label>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej. Estudiar capítulo 3"
          required
        />
      </div>

      <div className="field">
        <label htmlFor="description">Descripción</label>
        <textarea
          id="description"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Notas rápidas"
        />
      </div>

      <div className="grid-4">
        <div className="field">
          <label htmlFor="estimate">Pomodoros estimados</label>
          <input
            id="estimate"
            type="number"
            min={1}
            max={20}
            value={estimatedPomodoros}
            onChange={(e) => setEstimatedPomodoros(Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label htmlFor="project">Proyecto</label>
          <select
            id="project"
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
          <label htmlFor="subject">Materia</label>
          <select
            id="subject"
            value={subjectId ?? ''}
            onChange={(e) => setSubjectId(e.target.value || null)}
          >
            <option value="">Sin materia</option>
            {filteredSubjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="priority">Prioridad</label>
          <select
            id="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Task['priority'])}
          >
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
          </select>
        </div>
        <div className="field">
          <label>&nbsp;</label>
          <button type="submit" className="primary">
            Guardar tarea
          </button>
        </div>
      </div>
    </form>
  )

  const content = (
    <>
      {!compact && !listOnly && formBlock}

      {showList && (
        <div className={`list ${compact || listOnly ? 'compact-list' : ''}`}>
          {filteredTasks.length === 0 && <p className="muted">Aún no hay tareas.</p>}
          {filteredTasks.map((task) => (
          <article key={task.id} className="item">
            <header>
              <div>
                <p className="eyebrow">{statusLabel(task.status)}</p>
                <h3>{task.title}</h3>
                {task.description && <p className="muted small">{task.description}</p>}
                {!compact && (
                  <>
                    <p className="muted small">Creada: {formatDateShort(task.createdAt)}</p>
                    <p className="muted small">
                      Pomodoros: {focusPerTask.get(task.id) ?? 0} / {task.estimatedPomodoros}
                    </p>
                    {(task.projectId || task.subjectId) && (
                      <p className="muted small">
                        {task.projectId && (
                          <span>Proyecto: {projects.find((p) => p.id === task.projectId)?.name ?? '—'}</span>
                        )}
                        {task.projectId && task.subjectId ? ' · ' : ''}
                        {task.subjectId && (
                          <span>Materia: {subjects.find((s) => s.id === task.subjectId)?.name ?? '—'}</span>
                        )}
                      </p>
                    )}
                  </>
                )}
              </div>
              <div className={`chip ${task.priority}`}>{task.priority}</div>
            </header>
            {!compact && (
              <div className="subtasks">
                <p className="eyebrow">Subtareas</p>
                <ul className="muted small" style={{ paddingLeft: '16px', margin: '6px 0' }}>
                  {subtasks.filter((s) => s.taskId === task.id).length === 0 && <li>Sin subtareas</li>}
                  {subtasks
                    .filter((s) => s.taskId === task.id)
                    .map((s) => (
                      <li key={s.id}>
                        <label className="checkbox">
                          <input
                            type="checkbox"
                            checked={s.done}
                            onChange={(e) => toggleSubtask(s.id, e.target.checked)}
                          />
                          {s.title}
                        </label>
                        <button className="ghost danger" onClick={() => deleteSubtask(s.id)}>
                          x
                        </button>
                      </li>
                    ))}
                </ul>
                <div className="inline">
                  <input
                    placeholder="Nueva subtarea"
                    value={subtaskInput[task.id] ?? ''}
                    onChange={(e) => setSubtaskInput({ ...subtaskInput, [task.id]: e.target.value })}
                  />
                  <button
                    className="primary"
                    type="button"
                    onClick={async () => {
                      const title = (subtaskInput[task.id] ?? '').trim()
                      if (!title) return
                      await addSubtask(task.id, title)
                      setSubtaskInput({ ...subtaskInput, [task.id]: '' })
                    }}
                  >
                    Añadir
                  </button>
                  <button
                    className="ghost"
                    type="button"
                    onClick={async () => {
                      const template = ['Leer', 'Resumir', 'Preguntas']
                      for (const t of template) {
                        await addSubtask(task.id, t)
                      }
                    }}
                  >
                    Plantilla estudiar
                  </button>
                </div>
              </div>
            )}
            {editingId === task.id ? (
              <div className="edit-block">
                <div className="grid-3">
                  <div className="field">
                    <label>Título</label>
                    <input
                      value={editDraft.title ?? ''}
                      onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label>Prioridad</label>
                    <select
                      value={editDraft.priority ?? task.priority}
                      onChange={(e) =>
                        setEditDraft({ ...editDraft, priority: e.target.value as Task['priority'] })
                      }
                    >
                      <option value="low">Baja</option>
                      <option value="medium">Media</option>
                      <option value="high">Alta</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Pomodoros estimados</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={editDraft.estimatedPomodoros ?? task.estimatedPomodoros}
                      onChange={(e) =>
                        setEditDraft({ ...editDraft, estimatedPomodoros: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Proyecto</label>
                    <select
                      value={editDraft.projectId ?? task.projectId ?? ''}
                      onChange={(e) =>
                        setEditDraft({ ...editDraft, projectId: e.target.value || null, subjectId: null })
                      }
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
                    <select
                      value={editDraft.subjectId ?? task.subjectId ?? ''}
                      onChange={(e) => setEditDraft({ ...editDraft, subjectId: e.target.value || null })}
                    >
                      <option value="">Sin materia</option>
                      {subjects
                        .filter((s) => !editDraft.projectId || s.projectId === editDraft.projectId)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label>Descripción</label>
                  <textarea
                    rows={2}
                    value={editDraft.description ?? task.description}
                    onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })}
                  />
                </div>
                <div className="item-actions">
                  <button className="primary" onClick={saveEdit}>
                    Guardar
                  </button>
                  <button
                    className="ghost"
                    onClick={() => {
                      setEditingId(null)
                      setEditDraft({})
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="item-actions">
                <select
                  value={task.status}
                  onChange={(e) => setTaskStatus(task.id, e.target.value as TaskStatus)}
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {!compact && (
                  <button className="ghost" onClick={() => startEdit(task)}>
                    Editar
                  </button>
                )}
                <button className="ghost danger" onClick={() => removeTask(task.id)}>
                  Eliminar
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
      )}
    </>
  )

  if (!embedded) {
    return content
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Tareas</p>
          <h2>{compact ? 'Pendientes' : 'Backlog personal'}</h2>
          {!compact && <p className="muted">Crea tareas y márcalas según avances.</p>}
        </div>
      </div>
      {content}
    </div>
  )
}
