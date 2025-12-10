import { apiClient } from './client'

export interface Subject {
  id: string
  projectId?: string | null
  name: string
  description: string
  createdAt: string
  updatedAt: string
}

export interface CreateSubjectInput {
  name: string
  description?: string
  projectId?: string | null
}

export interface UpdateSubjectInput {
  id: string
  name?: string
  description?: string
  projectId?: string | null
}

export async function getSubjects(projectId?: string) {
  const { data } = await apiClient.get<Subject[]>('/subjects', {
    params: projectId ? { projectId } : undefined,
  })
  return data
}

export async function createSubject(input: CreateSubjectInput) {
  const { data } = await apiClient.post<Subject>('/subjects', input)
  return data
}

export async function updateSubject(input: UpdateSubjectInput) {
  const { id, ...payload } = input
  const { data } = await apiClient.patch<Subject>(`/subjects/${id}`, payload)
  return data
}

export async function deleteSubject(id: string) {
  await apiClient.delete(`/subjects/${id}`)
  return id
}
