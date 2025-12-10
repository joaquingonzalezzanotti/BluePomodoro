import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createSubtask,
  deleteSubtask,
  getSubtasks,
  updateSubtask,
  type CreateSubtaskInput,
  type UpdateSubtaskInput,
  type Subtask,
} from '../api/subtasks'

const SUBTASKS_KEY = ['subtasks']

export function useSubtasks(taskId?: string) {
  return useQuery<Subtask[]>({
    queryKey: taskId ? [...SUBTASKS_KEY, taskId] : SUBTASKS_KEY,
    queryFn: () => getSubtasks(taskId),
  })
}

export function useCreateSubtask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateSubtaskInput) => createSubtask(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: SUBTASKS_KEY })
      queryClient.invalidateQueries({ queryKey: [...SUBTASKS_KEY, variables.taskId] })
    },
  })
}

export function useUpdateSubtask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateSubtaskInput) => updateSubtask(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: SUBTASKS_KEY })
      if ((variables as any).taskId) {
        queryClient.invalidateQueries({ queryKey: [...SUBTASKS_KEY, (variables as any).taskId] })
      }
    },
  })
}

export function useDeleteSubtask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteSubtask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUBTASKS_KEY })
    },
  })
}
