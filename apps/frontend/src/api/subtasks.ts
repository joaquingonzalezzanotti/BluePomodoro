import { apiClient } from './client'

export interface Subtask {
  id: string
  taskId: string
  title: string
  done: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateSubtaskInput {
  taskId: string
  title: string
}

export interface UpdateSubtaskInput {
  id: string
  title?: string
  done?: boolean
}

export async function getSubtasks(taskId?: string) {
  const { data } = await apiClient.get<Subtask[]>('/subtasks', { params: taskId ? { taskId } : undefined })
  return data
}

export async function createSubtask(input: CreateSubtaskInput) {
  const { data } = await apiClient.post<Subtask>('/subtasks', input)
  return data
}

export async function updateSubtask(input: UpdateSubtaskInput) {
  const { id, ...payload } = input
  const { data } = await apiClient.patch<Subtask>(`/subtasks/${id}`, payload)
  return data
}

export async function deleteSubtask(id: string) {
  await apiClient.delete(`/subtasks/${id}`)
  return id
}
