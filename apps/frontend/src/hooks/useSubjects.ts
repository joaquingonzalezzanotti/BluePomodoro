import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createSubject,
  deleteSubject,
  getSubjects,
  type Subject,
  type CreateSubjectInput,
  type UpdateSubjectInput,
} from '../api/subjects'

const SUBJECTS_KEY = ['subjects']

export function useSubjects(projectId?: string) {
  return useQuery<Subject[]>({
    queryKey: projectId ? [...SUBJECTS_KEY, projectId] : SUBJECTS_KEY,
    queryFn: () => getSubjects(projectId),
  })
}

export function useCreateSubject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateSubjectInput) => createSubject(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: SUBJECTS_KEY })
      if (variables.projectId) {
        queryClient.invalidateQueries({ queryKey: [...SUBJECTS_KEY, variables.projectId] })
      }
    },
  })
}

export function useUpdateSubject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateSubjectInput) => updateSubject(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: SUBJECTS_KEY })
      if (variables.projectId) {
        queryClient.invalidateQueries({ queryKey: [...SUBJECTS_KEY, variables.projectId] })
      }
    },
  })
}

export function useDeleteSubject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteSubject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUBJECTS_KEY })
    },
  })
}
