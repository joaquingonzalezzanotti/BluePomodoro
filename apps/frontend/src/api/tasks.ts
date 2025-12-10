import { apiClient } from './client'

export type TaskStatus = 'todo' | 'doing' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface Task {
  id: string
  title: string
  description: string
  estimatedPomodoros: number
  status: TaskStatus
  priority: TaskPriority
  dueDate?: string | null
  projectId?: string | null
  subjectId?: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateTaskInput {
  title: string
  description?: string
  estimatedPomodoros?: number
  status?: TaskStatus
  priority?: TaskPriority
  dueDate?: string | null
  projectId?: string | null
  subjectId?: string | null
}

export interface UpdateTaskInput {
  id: string
  title?: string
  description?: string
  estimatedPomodoros?: number
  status?: TaskStatus
  priority?: TaskPriority
  dueDate?: string | null
  projectId?: string | null
  subjectId?: string | null
}

export async function getTasks() {
  const { data } = await apiClient.get<Task[]>('/tasks')
  return data
}

export async function createTask(input: CreateTaskInput) {
  const { data } = await apiClient.post<Task>('/tasks', input)
  return data
}

export async function updateTask(input: UpdateTaskInput) {
  const { id, ...payload } = input
  const { data } = await apiClient.patch<Task>(`/tasks/${id}`, payload)
  return data
}

export async function deleteTask(id: string) {
  await apiClient.delete(`/tasks/${id}`)
  return id
}
