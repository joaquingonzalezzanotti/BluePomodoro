import type { Task as DomainTask, TaskPriority, TaskStatus } from '../lib/types'
import {
  deleteTask as deleteTaskRepo,
  insertTask,
  listTasks,
  updateTask as updateTaskRepo,
} from '../db/repository'
import { withDb } from './localDb'

export type Task = DomainTask

export interface CreateTaskInput {
  title: string
  description?: string
  estimatedPomodoros?: number
  status?: TaskStatus
  priority?: TaskPriority
  dueDate?: string | null
  projectId?: string | null
  subjectId?: string | null
}

export interface UpdateTaskInput {
  id: string
  title?: string
  description?: string
  estimatedPomodoros?: number
  status?: TaskStatus
  priority?: TaskPriority
  dueDate?: string | null
  projectId?: string | null
  subjectId?: string | null
}

export async function getTasks() {
  return withDb((db) => listTasks(db))
}

export async function createTask(input: CreateTaskInput) {
  return withDb((db) =>
    insertTask(db, {
      title: input.title,
      description: input.description ?? '',
      estimatedPomodoros: input.estimatedPomodoros ?? 1,
      status: input.status ?? 'todo',
      priority: input.priority ?? 'medium',
      dueDate: input.dueDate ?? null,
      projectId: input.projectId ?? null,
      subjectId: input.subjectId ?? null,
    })
  )
}

export async function updateTask(input: UpdateTaskInput) {
  return withDb((db) => {
    updateTaskRepo(db, input.id, {
      title: input.title,
      description: input.description,
      estimatedPomodoros: input.estimatedPomodoros,
      status: input.status,
      priority: input.priority,
      dueDate: input.dueDate,
      projectId: input.projectId,
      subjectId: input.subjectId,
    })
    const tasks = listTasks(db)
    return tasks.find((t) => t.id === input.id)!
  })
}

export async function deleteTask(id: string) {
  return withDb((db) => {
    deleteTaskRepo(db, id)
    return id
  })
}
