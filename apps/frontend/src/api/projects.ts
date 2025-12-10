import { apiClient } from './client'

export interface Project {
  id: string
  name: string
  description: string
  color: string
  dueDate?: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateProjectInput {
  name: string
  description?: string
  color?: string
  dueDate?: string | null
}

export interface UpdateProjectInput {
  id: string
  name?: string
  description?: string
  color?: string
  dueDate?: string | null
}

export async function getProjects() {
  const { data } = await apiClient.get<Project[]>('/projects')
  return data
}

export async function createProject(input: CreateProjectInput) {
  const { data } = await apiClient.post<Project>('/projects', input)
  return data
}

export async function updateProject(input: UpdateProjectInput) {
  const { id, ...payload } = input
  const { data } = await apiClient.patch<Project>(`/projects/${id}`, payload)
  return data
}

export async function deleteProject(id: string) {
  await apiClient.delete(`/projects/${id}`)
  return id
}
