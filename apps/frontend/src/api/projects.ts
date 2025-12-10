import type { Project as DomainProject } from '../lib/types'
import { insertProject, listProjects, updateProject as updateProjectRepo, deleteProject as deleteProjectRepo } from '../db/repository'
import { withDb } from './localDb'

export type Project = DomainProject

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
  return withDb((db) => listProjects(db))
}

export async function createProject(input: CreateProjectInput) {
  return withDb((db) =>
    insertProject(db, {
      name: input.name,
      description: input.description ?? '',
      color: input.color ?? '#1f56ff',
      dueDate: input.dueDate ?? null,
    })
  )
}

export async function updateProject(input: UpdateProjectInput) {
  return withDb((db) => {
    updateProjectRepo(db, input.id, {
      name: input.name,
      description: input.description,
      color: input.color,
      dueDate: input.dueDate,
    })
    const projects = listProjects(db)
    return projects.find((p) => p.id === input.id)!
  })
}

export async function deleteProject(id: string) {
  return withDb((db) => {
    deleteProjectRepo(db, id)
    return id
  })
}
