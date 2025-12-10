import { useMemo, useState, type FormEvent } from 'react'
import { type TaskStatus } from '../lib/types'
import { formatDateShort } from '../lib/time'
import { useProjects } from '../api/projects'
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '../hooks/useTasks'
import { useSessions } from '../hooks/useSessions'

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
  const { data: tasks = [], isLoading, isError } = useTasks()
  const { data: projects = [] } = useProjects()
  const { data: sessions = [] } = useSessions()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [description, setDescription] = useState('')
  const [estimatedPomodoros, setEstimatedPomodoros] = useState(1)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [subjectId, setSubjectId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<{
    title?: string
    description?: string
    priority?: 'low' | 'medium' | 'high'
    estimatedPomodoros?: number
    projectId?: string | null
    subjectId?: string | null
  }>({})

  const filteredTasks = useMemo(() => {
    const base = statusFilter ? tasks.filter((t) => statusFilter.includes(t.status as TaskStatus)) : tasks
    return [...base].sort((a, b) => statusOrder[a.status as TaskStatus] - statusOrder[b.status as TaskStatus])
  }, [statusFilter, tasks])

  const sections = useMemo(() => {
    const todo = filteredTasks.filter((t) => t.status === 'todo')
    const doing = filteredTasks.filter((t) => t.status === 'doing')
    const done = filteredTasks.filter((t) => t.status === 'done')
    return { todo, doing, done }
  }, [filteredTasks])

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
    await createTask.mutateAsync({
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

  const startEdit = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return
    setEditingId(task.id)
    setEditDraft({
      title: task.title,
      description: task.description,
      priority: task.priority as 'low' | 'medium' | 'high',
      estimatedPomodoros: task.estimatedPomodoros,
      projectId: task.projectId ?? null,
      subjectId: task.subjectId ?? null,
    })
  }

  const saveEdit = async () => {
    if (!editingId) return
    await updateTask.mutateAsync({
      id: editingId,
      ...editDraft,
    })
    setEditingId(null)
    setEditDraft({})
  }

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
          <select id="subject" value={subjectId ?? ''} disabled>
            <option value="">Sin materia</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="priority">Prioridad</label>
          <select
            id="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
          >
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
          </select>
        </div>
        <div className="field">
          <label>&nbsp;</label>
          <button type="submit" className="primary" disabled={createTask.isPending}>
            {createTask.isPending ? 'Guardando...' : 'Guardar tarea'}
          </button>
        </div>
      </div>
    </form>
  )

  const content = (
    <>
      {!compact && !listOnly && formBlock}

      {isLoading && <p className="muted">Cargando tareas...</p>}
      {isError && <p className="muted danger">No se pudieron cargar las tareas.</p>}

      {showList && (
        <div className={`list ${compact || listOnly ? 'compact-list' : ''}`}>
          {filteredTasks.length === 0 && <p className="muted">Aún no hay tareas.</p>}

          {(['todo', 'doing', 'done'] as TaskStatus[]).map((state) => {
            const list = sections[state]
            if (list.length === 0) return null
            return (
              <section key={state} style={{ marginBottom: '16px' }}>
                <div className="list-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <p className="eyebrow">{statusLabel(state)}</p>
                    <h4 style={{ margin: '4px 0 0' }}>
                      {list.length} {list.length === 1 ? 'tarea' : 'tareas'}
                    </h4>
                  </div>
                </div>
                {list.map((task) => (
                  <article key={task.id} className="item">
              <header>
                <div>
                  <p className="eyebrow">{statusLabel(task.status as TaskStatus)}</p>
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
                            <span>Proyecto: {projects.find((p) => p.id === task.projectId)?.name ?? 'N/D'}</span>
                          )}
                          {task.projectId && task.subjectId ? ' · ' : ''}
                          {task.subjectId && <span>Materia: N/D</span>}
                        </p>
                      )}
                    </>
                  )}
                </div>
                <div className={`chip ${task.priority}`}>{task.priority}</div>
              </header>

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
                        value={editDraft.priority ?? (task.priority as 'low' | 'medium' | 'high')}
                        onChange={(e) =>
                          setEditDraft({ ...editDraft, priority: e.target.value as 'low' | 'medium' | 'high' })
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
                        disabled
                      >
                        <option value="">Sin materia</option>
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
                    <button className="primary" onClick={saveEdit} disabled={updateTask.isPending}>
                      {updateTask.isPending ? 'Guardando...' : 'Guardar'}
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
                    onChange={(e) =>
                      updateTask.mutate({ id: task.id, status: e.target.value as TaskStatus })
                    }
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {!compact && (
                    <button className="ghost" onClick={() => startEdit(task.id)}>
                      Editar
                    </button>
                  )}
                  {task.status !== 'done' ? (
                    <button
                      className="ghost"
                      onClick={() =>
                        updateTask.mutate({ id: task.id, status: task.status === 'todo' ? 'doing' : 'done' })
                      }
                    >
                      {task.status === 'todo' ? 'Mover a en foco' : 'Completar'}
                    </button>
                  ) : (
                    <button className="ghost" onClick={() => updateTask.mutate({ id: task.id, status: 'todo' })}>
                      Reabrir
                    </button>
                  )}
                  <button
                    className="ghost danger"
                    onClick={() => deleteTask.mutate(task.id)}
                    disabled={deleteTask.isPending}
                  >
                    {deleteTask.isPending ? 'Eliminando...' : 'Eliminar'}
                  </button>
                </div>
              )}
            </article>
                ))}
              </section>
            )
          })}
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
