export type TaskStatus = 'todo' | 'doing' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface Task {
  id: string
  title: string
  description: string
  estimatedPomodoros: number
  projectId?: string | null
  subjectId?: string | null
  status: TaskStatus
  priority: TaskPriority
  dueDate?: string | null
  createdAt: string
  updatedAt: string
}

export type SessionType = 'focus' | 'break'

export interface Session {
  id: string
  taskId?: string | null
  startedAt: string
  endedAt: string
  durationSeconds: number
  type: SessionType
  completed: boolean
  note?: string
}

export interface Project {
  id: string
  name: string
  description: string
  color?: string
  dueDate?: string | null
  createdAt: string
  updatedAt: string
}

export interface Subject {
  id: string
  projectId?: string | null
  name: string
  description: string
  createdAt: string
  updatedAt: string
}

export interface Subtask {
  id: string
  taskId: string
  title: string
  done: boolean
  createdAt: string
  updatedAt: string
}
