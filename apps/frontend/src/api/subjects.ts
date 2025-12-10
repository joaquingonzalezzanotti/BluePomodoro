import type { Subject as DomainSubject } from '../lib/types'
import {
  deleteSubject as deleteSubjectRepo,
  insertSubject,
  listSubjects,
  updateSubject as updateSubjectRepo,
} from '../db/repository'
import { withDb } from './localDb'

export type Subject = DomainSubject

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
  return withDb((db) => {
    const subjects = listSubjects(db)
    return projectId ? subjects.filter((s) => s.projectId === projectId) : subjects
  })
}

export async function createSubject(input: CreateSubjectInput) {
  return withDb((db) =>
    insertSubject(db, {
      name: input.name,
      description: input.description ?? '',
      projectId: input.projectId ?? null,
    })
  )
}

export async function updateSubject(input: UpdateSubjectInput) {
  return withDb((db) => {
    updateSubjectRepo(db, input.id, {
      name: input.name,
      description: input.description,
      projectId: input.projectId,
    })
    const subjects = listSubjects(db)
    return subjects.find((s) => s.id === input.id)!
  })
}

export async function deleteSubject(id: string) {
  return withDb((db) => {
    deleteSubjectRepo(db, id)
    return id
  })
}
