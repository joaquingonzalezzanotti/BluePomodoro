import { apiClient } from './client'

export type SessionType = 'focus' | 'break'

export interface Session {
  id: string
  taskId?: string | null
  startedAt: string
  endedAt: string
  durationSeconds: number
  type: SessionType
  completed: boolean
  note: string
}

export interface CreateSessionInput {
  taskId?: string | null
  startedAt: string
  endedAt: string
  durationSeconds: number
  type: SessionType
  completed?: boolean
  note?: string
}

export async function createSession(input: CreateSessionInput) {
  const { data } = await apiClient.post<Session>('/sessions', {
    ...input,
    completed: input.completed ?? true,
  })
  return data
}

export async function getSessions() {
  const { data } = await apiClient.get<Session[]>('/sessions')
  return data
}
