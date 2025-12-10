import type { Subtask as DomainSubtask } from '../lib/types'
import {
  deleteSubtask as deleteSubtaskRepo,
  insertSubtask,
  listSubtasks,
  updateSubtask as updateSubtaskRepo,
} from '../db/repository'
import { withDb } from './localDb'

export type Subtask = DomainSubtask

export interface CreateSubtaskInput {
  taskId: string
  title: string
}

export interface UpdateSubtaskInput {
  id: string
  title?: string
  done?: boolean
}

export async function getSubtasks(taskId?: string) {
  return withDb((db) => {
    const subtasks = listSubtasks(db)
    return taskId ? subtasks.filter((s) => s.taskId === taskId) : subtasks
  })
}

export async function createSubtask(input: CreateSubtaskInput) {
  return withDb((db) => insertSubtask(db, { taskId: input.taskId, title: input.title }))
}

export async function updateSubtask(input: UpdateSubtaskInput) {
  return withDb((db) => {
    updateSubtaskRepo(db, input.id, { title: input.title, done: input.done })
    const subtasks = listSubtasks(db)
    return subtasks.find((s) => s.id === input.id)!
  })
}

export async function deleteSubtask(id: string) {
  return withDb((db) => {
    deleteSubtaskRepo(db, id)
    return id
  })
}
