import { useQuery } from '@tanstack/react-query'
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

export function useProjects() {
  return useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await apiClient.get<Project[]>('/projects')
      return data
    },
  })
}
