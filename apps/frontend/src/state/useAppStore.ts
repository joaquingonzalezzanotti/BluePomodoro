import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { type Project, type Session, type Subject, type Task, type TaskStatus, type Subtask } from '../lib/types'
import {
  deleteProject,
  deleteSubject,
  deleteTask,
  deleteSubtask,
  insertProject,
  insertSession,
  insertSubject,
  insertTask,
  insertSubtask,
  listProjects,
  listSessions,
  listSubjects,
  listTasks,
  listSubtasks,
  updateProject,
  updateSubject,
  updateTask,
  updateTaskStatus,
  updateSubtask,
} from '../db/repository'
import { exportDatabaseBlob, importDatabase, loadDatabase, persistDatabase, resetDatabase } from '../db/sqlite'

interface AppState {
  dbReady: boolean
  dbError: string | null
  tasks: Task[]
  sessions: Session[]
  subtasks: Subtask[]
  projects: Project[]
  subjects: Subject[]
  settings: {
    focusMinutes: number
    breakMinutes: number
    dailyTarget: number
    autoStartBreak: boolean
    autoStartPomodoro: boolean
    soundOnComplete: boolean
  }
  init: () => Promise<void>
  addTask: (
    input: Pick<Task, 'title' | 'description' | 'priority' | 'dueDate' | 'estimatedPomodoros' | 'projectId' | 'subjectId'>
  ) => Promise<void>
  setTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>
  editTask: (taskId: string, payload: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>
  removeTask: (taskId: string) => Promise<void>
  addProject: (input: Pick<Project, 'name' | 'description' | 'color' | 'dueDate'>) => Promise<void>
  editProject: (projectId: string, payload: Partial<Pick<Project, 'name' | 'description' | 'color' | 'dueDate'>>) => Promise<void>
  removeProject: (projectId: string) => Promise<void>
  addSubject: (input: Pick<Subject, 'name' | 'description' | 'projectId'>) => Promise<void>
  editSubject: (subjectId: string, payload: Partial<Pick<Subject, 'name' | 'description' | 'projectId'>>) => Promise<void>
  removeSubject: (subjectId: string) => Promise<void>
  addSubtask: (taskId: string, title: string) => Promise<void>
  toggleSubtask: (subtaskId: string, done: boolean) => Promise<void>
  deleteSubtask: (subtaskId: string) => Promise<void>
  recordSession: (input: {
    taskId?: string | null
    durationSeconds: number
    type: Session['type']
    startedAt: string
    endedAt: string
    completed: boolean
    note?: string
  }) => Promise<void>
  updateSettings: (input: Partial<AppState['settings']>) => void
  exportData: () => Promise<Blob>
  importData: (file: ArrayBuffer) => Promise<void>
  resetAndInit: () => Promise<void>
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      dbReady: false,
      dbError: null,
      tasks: [],
      sessions: [],
      subtasks: [],
      projects: [],
      subjects: [],
      settings: {
        focusMinutes: 25,
        breakMinutes: 5,
        dailyTarget: 8,
        autoStartBreak: false,
        autoStartPomodoro: false,
        soundOnComplete: false,
      },

      async init() {
        try {
          const db = await loadDatabase()
          const tasks = listTasks(db)
          const sessions = listSessions(db)
          const projects = listProjects(db)
          const subjects = listSubjects(db)
          const subtasks = listSubtasks(db)
          set({ dbReady: true, dbError: null, tasks, sessions, projects, subjects, subtasks })
          ;(get() as any).db = db
        } catch (error) {
          console.error('DB init error', error)
          set({ dbError: 'No se pudo cargar la base local', dbReady: false })
        }
      },
      async resetAndInit() {
        try {
          const db = await resetDatabase()
          const tasks = listTasks(db)
          const sessions = listSessions(db)
          const projects = listProjects(db)
          const subjects = listSubjects(db)
          const subtasks = listSubtasks(db)
          set({ dbReady: true, dbError: null, tasks, sessions, projects, subjects, subtasks })
          ;(get() as any).db = db
        } catch (error) {
          console.error('DB reset error', error)
          set({ dbError: 'No se pudo reiniciar la base', dbReady: false })
        }
      },

      async addTask(input) {
        const db = (get() as any).db
        if (!db) return
        insertTask(db, input)
        await persistDatabase(db)
        set({ tasks: listTasks(db) })
      },

      async setTaskStatus(taskId, status) {
        const db = (get() as any).db
        if (!db) return
        updateTaskStatus(db, taskId, status)
        await persistDatabase(db)
        set({ tasks: listTasks(db) })
      },

      async editTask(taskId, payload) {
        const db = (get() as any).db
        if (!db) return
        updateTask(db, taskId, payload)
        await persistDatabase(db)
        set({ tasks: listTasks(db) })
      },

      async removeTask(taskId) {
        const db = (get() as any).db
        if (!db) return
        deleteTask(db, taskId)
        await persistDatabase(db)
        set({ tasks: listTasks(db), sessions: listSessions(db), subtasks: listSubtasks(db) })
      },

      async addProject(input) {
        const db = (get() as any).db
        if (!db) return
        insertProject(db, input)
        await persistDatabase(db)
        set({ projects: listProjects(db) })
      },

      async editProject(projectId, payload) {
        const db = (get() as any).db
        if (!db) return
        updateProject(db, projectId, payload)
        await persistDatabase(db)
        set({ projects: listProjects(db), subjects: listSubjects(db), tasks: listTasks(db) })
      },

      async removeProject(projectId) {
        const db = (get() as any).db
        if (!db) return
        deleteProject(db, projectId)
        await persistDatabase(db)
        set({ projects: listProjects(db), subjects: listSubjects(db), tasks: listTasks(db) })
      },

      async addSubject(input) {
        const db = (get() as any).db
        if (!db) return
        insertSubject(db, input)
        await persistDatabase(db)
        set({ subjects: listSubjects(db) })
      },

      async editSubject(subjectId, payload) {
        const db = (get() as any).db
        if (!db) return
        updateSubject(db, subjectId, payload)
        await persistDatabase(db)
        set({ subjects: listSubjects(db), tasks: listTasks(db) })
      },

      async removeSubject(subjectId) {
        const db = (get() as any).db
        if (!db) return
        deleteSubject(db, subjectId)
        await persistDatabase(db)
        set({ subjects: listSubjects(db), tasks: listTasks(db), subtasks: listSubtasks(db) })
      },

      async addSubtask(taskId, title) {
        const db = (get() as any).db
        if (!db) return
        insertSubtask(db, { taskId, title })
        await persistDatabase(db)
        set({ subtasks: listSubtasks(db) })
      },

      async toggleSubtask(subtaskId, done) {
        const db = (get() as any).db
        if (!db) return
        updateSubtask(db, subtaskId, { done })
        await persistDatabase(db)
        set({ subtasks: listSubtasks(db) })
      },

      async deleteSubtask(subtaskId) {
        const db = (get() as any).db
        if (!db) return
        deleteSubtask(db, subtaskId)
        await persistDatabase(db)
        set({ subtasks: listSubtasks(db) })
      },

      async recordSession(input) {
        const db = (get() as any).db
        if (!db) return
        insertSession(db, input)
        await persistDatabase(db)
        set({ sessions: listSessions(db) })
      },

      updateSettings(input) {
        set((state) => ({
          settings: {
            ...state.settings,
            ...input,
          },
        }))
      },

      async exportData() {
        return exportDatabaseBlob()
      },

      async importData(file) {
        const db = await importDatabase(file)
        const tasks = listTasks(db)
        const sessions = listSessions(db)
        const projects = listProjects(db)
        const subjects = listSubjects(db)
        const subtasks = listSubtasks(db)
        set({ tasks, sessions, projects, subjects, subtasks, dbReady: true, dbError: null })
        ;(get() as any).db = db
      },
    }),
    {
      name: 'focustodo-settings',
      partialize: (state) => ({
        settings: state.settings,
      }),
    }
  )
)
