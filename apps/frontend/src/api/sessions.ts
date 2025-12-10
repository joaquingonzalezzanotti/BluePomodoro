import type { Session as DomainSession, SessionType } from '../lib/types'
import { insertSession, listSessions } from '../db/repository'
import { withDb } from './localDb'

export type Session = DomainSession

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
  return withDb((db) =>
    insertSession(db, {
      taskId: input.taskId ?? null,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      durationSeconds: input.durationSeconds,
      type: input.type,
      completed: input.completed ?? true,
      note: input.note ?? '',
    })
  )
}

export async function getSessions() {
  return withDb((db) => listSessions(db))
}
