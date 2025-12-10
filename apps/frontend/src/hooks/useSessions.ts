import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreateSessionInput, Session } from '../api/sessions'
import { createSession, getSessions } from '../api/sessions'

const SESSIONS_KEY = ['sessions']

export function useSessions() {
  return useQuery<Session[]>({
    queryKey: SESSIONS_KEY,
    queryFn: getSessions,
  })
}

export function useCreateSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateSessionInput) => createSession(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SESSIONS_KEY })
    },
  })
}
