import { type Database } from 'sql.js'
import {
  type Project,
  type Session,
  type SessionType,
  type Subject,
  type Task,
  type TaskPriority,
  type TaskStatus,
  type Subtask,
} from '../lib/types'

const nowIso = () => new Date().toISOString()

export function listTasks(db: Database): Task[] {
  const result: Task[] = []
  const stmt = db.prepare(`
    SELECT id, title, description, status, priority, estimated_pomodoros, project_id, subject_id, due_date, created_at, updated_at
    FROM tasks
    ORDER BY created_at DESC
  `)
  while (stmt.step()) {
    const [
      id,
      title,
      description,
      status,
      priority,
      estimatedPomodoros,
      projectId,
      subjectId,
      dueDate,
      createdAt,
      updatedAt,
    ] = stmt.get()

    result.push({
      id: String(id),
      title: String(title),
      description: String(description ?? ''),
      estimatedPomodoros: Number(estimatedPomodoros ?? 1),
      projectId: projectId ? String(projectId) : null,
      subjectId: subjectId ? String(subjectId) : null,
      status: status as TaskStatus,
      priority: priority as TaskPriority,
      dueDate: dueDate ? String(dueDate) : null,
      createdAt: String(createdAt),
      updatedAt: String(updatedAt),
    })
  }
  stmt.free()
  return result
}

export function listSessions(db: Database): Session[] {
  const items: Session[] = []
  const stmt = db.prepare(`
    SELECT id, task_id, started_at, ended_at, duration_seconds, type, completed, note
    FROM sessions
    ORDER BY started_at DESC
  `)

  while (stmt.step()) {
    const [
      id,
      taskId,
      startedAt,
      endedAt,
      durationSeconds,
      type,
      completed,
      note,
    ] = stmt.get()

    items.push({
      id: String(id),
      taskId: taskId ? String(taskId) : null,
      startedAt: String(startedAt),
      endedAt: String(endedAt),
      durationSeconds: Number(durationSeconds),
      type: type as SessionType,
      completed: Boolean(completed),
      note: note ? String(note) : '',
    })
  }
  stmt.free()
  return items
}

export function listSubtasks(db: Database): Subtask[] {
  const items: Subtask[] = []
  const stmt = db.prepare(`
    SELECT id, task_id, title, done, created_at, updated_at
    FROM subtasks
    ORDER BY created_at DESC
  `)
  while (stmt.step()) {
    const [id, taskId, title, done, createdAt, updatedAt] = stmt.get()
    items.push({
      id: String(id),
      taskId: String(taskId),
      title: String(title),
      done: Boolean(done),
      createdAt: String(createdAt),
      updatedAt: String(updatedAt),
    })
  }
  stmt.free()
  return items
}

export function insertTask(
  db: Database,
  payload: Pick<Task, 'title' | 'description' | 'priority' | 'dueDate' | 'estimatedPomodoros' | 'projectId' | 'subjectId'> & {
    status?: TaskStatus
  }
): Task {
  const id = crypto.randomUUID()
  const createdAt = nowIso()
  const updatedAt = createdAt
  const status = payload.status ?? 'todo'

  db.run(
    `
    INSERT INTO tasks (id, title, description, status, priority, estimated_pomodoros, project_id, subject_id, due_date, created_at, updated_at)
    VALUES (:id, :title, :description, :status, :priority, :estimated_pomodoros, :project_id, :subject_id, :due_date, :created_at, :updated_at);
  `,
    {
      ':id': id,
      ':title': payload.title,
      ':description': payload.description ?? '',
      ':status': status,
      ':priority': payload.priority,
      ':estimated_pomodoros': payload.estimatedPomodoros ?? 1,
      ':project_id': payload.projectId ?? null,
      ':subject_id': payload.subjectId ?? null,
      ':due_date': payload.dueDate ?? null,
      ':created_at': createdAt,
      ':updated_at': updatedAt,
    }
  )

  return {
    id,
    title: payload.title,
    description: payload.description ?? '',
    estimatedPomodoros: payload.estimatedPomodoros ?? 1,
    projectId: payload.projectId ?? null,
    subjectId: payload.subjectId ?? null,
    status,
    priority: payload.priority,
    dueDate: payload.dueDate ?? null,
    createdAt,
    updatedAt,
  }
}

export function updateTaskStatus(db: Database, taskId: string, status: TaskStatus) {
  db.run(
    `
    UPDATE tasks
    SET status = :status, updated_at = :updated_at
    WHERE id = :id
  `,
    {
      ':id': taskId,
      ':status': status,
      ':updated_at': nowIso(),
    }
  )
}

export function updateTask(
  db: Database,
  taskId: string,
  payload: Partial<
    Pick<Task, 'title' | 'description' | 'priority' | 'estimatedPomodoros' | 'status' | 'dueDate' | 'projectId' | 'subjectId'>
  >
) {
  const fields: string[] = []
  const params: Record<string, unknown> = {
    ':id': taskId,
    ':updated_at': nowIso(),
  }

  if (payload.title !== undefined) {
    fields.push('title = :title')
    params[':title'] = payload.title
  }
  if (payload.description !== undefined) {
    fields.push('description = :description')
    params[':description'] = payload.description
  }
  if (payload.priority !== undefined) {
    fields.push('priority = :priority')
    params[':priority'] = payload.priority
  }
  if (payload.estimatedPomodoros !== undefined) {
    fields.push('estimated_pomodoros = :estimated_pomodoros')
    params[':estimated_pomodoros'] = payload.estimatedPomodoros
  }
  if (payload.projectId !== undefined) {
    fields.push('project_id = :project_id')
    params[':project_id'] = payload.projectId
  }
  if (payload.subjectId !== undefined) {
    fields.push('subject_id = :subject_id')
    params[':subject_id'] = payload.subjectId
  }
  if (payload.status !== undefined) {
    fields.push('status = :status')
    params[':status'] = payload.status
  }
  if (payload.dueDate !== undefined) {
    fields.push('due_date = :due_date')
    params[':due_date'] = payload.dueDate
  }

  if (fields.length === 0) return

  db.run(
    `
    UPDATE tasks
    SET ${fields.join(', ')}, updated_at = :updated_at
    WHERE id = :id
  `,
    params as any
  )
}

export function deleteTask(db: Database, taskId: string) {
  db.run(`DELETE FROM sessions WHERE task_id = :id`, { ':id': taskId })
  db.run(`DELETE FROM tasks WHERE id = :id`, { ':id': taskId })
}

// Projects
export function listProjects(db: Database): Project[] {
  const result: Project[] = []
  const stmt = db.prepare(
    `SELECT id, name, description, color, due_date, created_at, updated_at FROM projects ORDER BY created_at DESC`
  )
  while (stmt.step()) {
    const [id, name, description, color, dueDate, createdAt, updatedAt] = stmt.get()
    result.push({
      id: String(id),
      name: String(name),
      description: String(description ?? ''),
      color: color ? String(color) : undefined,
      dueDate: dueDate ? String(dueDate) : null,
      createdAt: String(createdAt),
      updatedAt: String(updatedAt),
    })
  }
  stmt.free()
  return result
}

export function insertProject(db: Database, payload: Pick<Project, 'name' | 'description' | 'color' | 'dueDate'>): Project {
  const id = crypto.randomUUID()
  const createdAt = nowIso()
  db.run(
    `
    INSERT INTO projects (id, name, description, color, due_date, created_at, updated_at)
    VALUES (:id, :name, :description, :color, :due_date, :created_at, :created_at)
  `,
    {
      ':id': id,
      ':name': payload.name,
      ':description': payload.description ?? '',
      ':color': payload.color ?? '#1f56ff',
      ':due_date': payload.dueDate ?? null,
      ':created_at': createdAt,
    }
  )
  return {
    id,
    name: payload.name,
    description: payload.description ?? '',
    color: payload.color ?? '#1f56ff',
    dueDate: payload.dueDate ?? null,
    createdAt,
    updatedAt: createdAt,
  }
}

export function updateProject(
  db: Database,
  projectId: string,
  payload: Partial<Pick<Project, 'name' | 'description' | 'color' | 'dueDate'>>
) {
  const fields: string[] = []
  const params: Record<string, unknown> = { ':id': projectId, ':updated_at': nowIso() }
  if (payload.name !== undefined) {
    fields.push('name = :name')
    params[':name'] = payload.name
  }
  if (payload.description !== undefined) {
    fields.push('description = :description')
    params[':description'] = payload.description
  }
  if (payload.color !== undefined) {
    fields.push('color = :color')
    params[':color'] = payload.color
  }
  if (payload.dueDate !== undefined) {
    fields.push('due_date = :due_date')
    params[':due_date'] = payload.dueDate
  }
  if (!fields.length) return
  db.run(
    `
    UPDATE projects SET ${fields.join(', ')}, updated_at = :updated_at WHERE id = :id
  `,
    params as any
  )
}

export function deleteProject(db: Database, projectId: string) {
  db.run(`UPDATE subjects SET project_id = NULL WHERE project_id = :id`, { ':id': projectId })
  db.run(`UPDATE tasks SET project_id = NULL WHERE project_id = :id`, { ':id': projectId })
  db.run(`DELETE FROM projects WHERE id = :id`, { ':id': projectId })
}

// Subjects
export function listSubjects(db: Database): Subject[] {
  const items: Subject[] = []
  const stmt = db.prepare(
    `SELECT id, project_id, name, description, created_at, updated_at FROM subjects ORDER BY created_at DESC`
  )
  while (stmt.step()) {
    const [id, projectId, name, description, createdAt, updatedAt] = stmt.get()
    items.push({
      id: String(id),
      projectId: projectId ? String(projectId) : null,
      name: String(name),
      description: String(description ?? ''),
      createdAt: String(createdAt),
      updatedAt: String(updatedAt),
    })
  }
  stmt.free()
  return items
}

export function insertSubject(
  db: Database,
  payload: Pick<Subject, 'name' | 'description' | 'projectId'>
): Subject {
  const id = crypto.randomUUID()
  const createdAt = nowIso()
  db.run(
    `
    INSERT INTO subjects (id, project_id, name, description, created_at, updated_at)
    VALUES (:id, :project_id, :name, :description, :created_at, :created_at)
  `,
    {
      ':id': id,
      ':project_id': payload.projectId ?? null,
      ':name': payload.name,
      ':description': payload.description ?? '',
      ':created_at': createdAt,
    }
  )
  return {
    id,
    projectId: payload.projectId ?? null,
    name: payload.name,
    description: payload.description ?? '',
    createdAt,
    updatedAt: createdAt,
  }
}

export function updateSubject(
  db: Database,
  subjectId: string,
  payload: Partial<Pick<Subject, 'name' | 'description' | 'projectId'>>
) {
  const fields: string[] = []
  const params: Record<string, unknown> = { ':id': subjectId, ':updated_at': nowIso() }
  if (payload.name !== undefined) {
    fields.push('name = :name')
    params[':name'] = payload.name
  }
  if (payload.description !== undefined) {
    fields.push('description = :description')
    params[':description'] = payload.description
  }
  if (payload.projectId !== undefined) {
    fields.push('project_id = :project_id')
    params[':project_id'] = payload.projectId
  }
  if (!fields.length) return
  db.run(
    `
    UPDATE subjects SET ${fields.join(', ')}, updated_at = :updated_at WHERE id = :id
  `,
    params as any
  )
}

export function deleteSubject(db: Database, subjectId: string) {
  db.run(`UPDATE tasks SET subject_id = NULL WHERE subject_id = :id`, { ':id': subjectId })
  db.run(`DELETE FROM subjects WHERE id = :id`, { ':id': subjectId })
}

export function insertSession(
  db: Database,
  payload: Pick<Session, 'taskId' | 'durationSeconds' | 'type' | 'completed' | 'note'> & {
    startedAt: string
    endedAt: string
  }
): Session {
  const id = crypto.randomUUID()
  db.run(
    `
    INSERT INTO sessions (id, task_id, started_at, ended_at, duration_seconds, type, completed, note)
    VALUES (:id, :task_id, :started_at, :ended_at, :duration_seconds, :type, :completed, :note);
  `,
    {
      ':id': id,
      ':task_id': payload.taskId ?? null,
      ':started_at': payload.startedAt,
      ':ended_at': payload.endedAt,
      ':duration_seconds': payload.durationSeconds,
      ':type': payload.type,
      ':completed': payload.completed ? 1 : 0,
      ':note': payload.note ?? '',
    }
  )

  return {
    id,
    taskId: payload.taskId,
    startedAt: payload.startedAt,
    endedAt: payload.endedAt,
    durationSeconds: payload.durationSeconds,
    type: payload.type,
    completed: payload.completed,
    note: payload.note ?? '',
  }
}

export function insertSubtask(db: Database, payload: { taskId: string; title: string }): Subtask {
  const id = crypto.randomUUID()
  const createdAt = nowIso()
  db.run(
    `
    INSERT INTO subtasks (id, task_id, title, done, created_at, updated_at)
    VALUES (:id, :task_id, :title, :done, :created_at, :created_at)
  `,
    {
      ':id': id,
      ':task_id': payload.taskId,
      ':title': payload.title,
      ':done': 0,
      ':created_at': createdAt,
    }
  )
  return {
    id,
    taskId: payload.taskId,
    title: payload.title,
    done: false,
    createdAt,
    updatedAt: createdAt,
  }
}

export function updateSubtask(db: Database, subtaskId: string, payload: Partial<Pick<Subtask, 'title' | 'done'>>) {
  const fields: string[] = []
  const params: Record<string, unknown> = { ':id': subtaskId, ':updated_at': nowIso() }
  if (payload.title !== undefined) {
    fields.push('title = :title')
    params[':title'] = payload.title
  }
  if (payload.done !== undefined) {
    fields.push('done = :done')
    params[':done'] = payload.done ? 1 : 0
  }
  if (!fields.length) return
  db.run(
    `
    UPDATE subtasks SET ${fields.join(', ')}, updated_at = :updated_at WHERE id = :id
  `,
    params as any
  )
}

export function deleteSubtask(db: Database, subtaskId: string) {
  db.run(`DELETE FROM subtasks WHERE id = :id`, { ':id': subtaskId })
}
