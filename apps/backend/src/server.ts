import Fastify from 'fastify'
import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import { PrismaClient } from '@prisma/client'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const prisma = new PrismaClient()
const server = Fastify({ logger: true })

const API_KEY = process.env.API_KEY
const PORT = Number(process.env.PORT || 4000)
const HOST = process.env.HOST || '0.0.0.0'
// Default to ../public (built frontend). If STATIC_DIR is set, resolve from cwd so it works in dev.
const STATIC_DIR = process.env.STATIC_DIR
  ? resolve(process.cwd(), process.env.STATIC_DIR)
  : join(__dirname, '..', 'public')

server.register(cors, { origin: process.env.CORS_ORIGIN?.split(',') ?? true })

server.addHook('onRequest', async (req, reply) => {
  if (!API_KEY) return
  if (req.url.startsWith('/health') || req.url.startsWith('/static')) return
  const key = req.headers['x-api-key']
  if (key !== API_KEY) {
    reply.code(401).send({ error: 'unauthorized' })
  }
})

server.get('/health', async () => ({ ok: true }))

server.get('/projects', async () => prisma.project.findMany({ include: { subjects: true, tasks: true } }))
server.post('/projects', async (req, reply) => {
  const body = req.body as { name: string; description?: string; color?: string; dueDate?: string | null }
  const project = await prisma.project.create({
    data: {
      name: body.name,
      description: body.description ?? '',
      color: body.color ?? '#1f56ff',
      dueDate: body.dueDate ?? null,
    },
  })
  reply.code(201).send(project)
})

server.patch('/projects/:id', async (req, reply) => {
  const { id } = req.params as { id: string }
  const body = req.body as { name?: string; description?: string; color?: string; dueDate?: string | null }
  try {
    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.color !== undefined ? { color: body.color } : {}),
        ...(body.dueDate !== undefined ? { dueDate: body.dueDate } : {}),
      },
    })
    reply.send(project)
  } catch (error: any) {
    if (error?.code === 'P2025') {
      reply.code(404).send({ error: 'Project not found' })
      return
    }
    throw error
  }
})

server.delete('/projects/:id', async (req, reply) => {
  const { id } = req.params as { id: string }
  try {
    const tasks = await prisma.task.findMany({ where: { projectId: id }, select: { id: true } })
    const taskIds = tasks.map((t) => t.id)
    await prisma.$transaction([
      prisma.subtask.deleteMany({ where: { taskId: { in: taskIds } } }),
      prisma.session.deleteMany({ where: { taskId: { in: taskIds } } }),
      prisma.task.deleteMany({ where: { projectId: id } }),
      prisma.subject.deleteMany({ where: { projectId: id } }),
      prisma.project.delete({ where: { id } }),
    ])
    reply.code(204).send()
  } catch (error: any) {
    if (error?.code === 'P2025') {
      reply.code(404).send({ error: 'Project not found' })
      return
    }
    throw error
  }
})

server.get('/subjects', async (req) => {
  const projectId = (req.query as { projectId?: string }).projectId
  return prisma.subject.findMany({
    where: projectId ? { projectId } : undefined,
    include: { tasks: true },
  })
})

server.post('/subjects', async (req, reply) => {
  const body = req.body as { name: string; description?: string; projectId?: string | null }
  const subject = await prisma.subject.create({
    data: {
      name: body.name,
      description: body.description ?? '',
      projectId: body.projectId ?? null,
    },
  })
  reply.code(201).send(subject)
})

server.patch('/subjects/:id', async (req, reply) => {
  const { id } = req.params as { id: string }
  const body = req.body as { name?: string; description?: string; projectId?: string | null }
  try {
    const subject = await prisma.subject.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.projectId !== undefined ? { projectId: body.projectId } : {}),
      },
    })
    reply.send(subject)
  } catch (error: any) {
    if (error?.code === 'P2025') {
      reply.code(404).send({ error: 'Subject not found' })
      return
    }
    throw error
  }
})

server.delete('/subjects/:id', async (req, reply) => {
  const { id } = req.params as { id: string }
  try {
    const tasks = await prisma.task.findMany({ where: { subjectId: id }, select: { id: true } })
    const taskIds = tasks.map((t) => t.id)
    await prisma.$transaction([
      prisma.subtask.deleteMany({ where: { taskId: { in: taskIds } } }),
      prisma.session.deleteMany({ where: { taskId: { in: taskIds } } }),
      prisma.task.deleteMany({ where: { subjectId: id } }),
      prisma.subject.delete({ where: { id } }),
    ])
    reply.code(204).send()
  } catch (error: any) {
    if (error?.code === 'P2025') {
      reply.code(404).send({ error: 'Subject not found' })
      return
    }
    throw error
  }
})

server.get('/tasks', async () =>
  prisma.task.findMany({ include: { project: true, subject: true, subtasks: true } })
)
server.post('/tasks', async (req, reply) => {
  const body = req.body as {
    title: string
    description?: string
    priority?: 'low' | 'medium' | 'high'
    estimatedPomodoros?: number
    status?: 'todo' | 'doing' | 'done'
    projectId?: string | null
    subjectId?: string | null
  }
  const task = await prisma.task.create({
    data: {
      title: body.title,
      description: body.description ?? '',
      priority: body.priority ?? 'medium',
      estimatedPomodoros: body.estimatedPomodoros ?? 1,
      status: body.status ?? 'todo',
      projectId: body.projectId ?? null,
      subjectId: body.subjectId ?? null,
    },
  })
  reply.code(201).send(task)
})

server.patch('/tasks/:id', async (req, reply) => {
  const { id } = req.params as { id: string }
  const body = req.body as {
    title?: string
    description?: string
    priority?: 'low' | 'medium' | 'high'
    estimatedPomodoros?: number
    status?: 'todo' | 'doing' | 'done'
    projectId?: string | null
    subjectId?: string | null
  }
  try {
    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.priority !== undefined ? { priority: body.priority } : {}),
        ...(body.estimatedPomodoros !== undefined ? { estimatedPomodoros: body.estimatedPomodoros } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.projectId !== undefined ? { projectId: body.projectId } : {}),
        ...(body.subjectId !== undefined ? { subjectId: body.subjectId } : {}),
      },
    })
    reply.send(task)
  } catch (error: any) {
    if (error?.code === 'P2025') {
      reply.code(404).send({ error: 'Task not found' })
      return
    }
    throw error
  }
})

server.delete('/tasks/:id', async (req, reply) => {
  const { id } = req.params as { id: string }
  try {
    await prisma.task.delete({ where: { id } })
    reply.code(204).send()
  } catch (error: any) {
    if (error?.code === 'P2025') {
      reply.code(404).send({ error: 'Task not found' })
      return
    }
    throw error
  }
})

server.get('/sessions', async () => prisma.session.findMany({ orderBy: { startedAt: 'desc' } }))
server.post('/sessions', async (req, reply) => {
  const body = req.body as {
    taskId?: string | null
    startedAt: string
    endedAt: string
    durationSeconds: number
    type: 'focus' | 'break'
    completed: boolean
    note?: string
  }
  const session = await prisma.session.create({
    data: {
      taskId: body.taskId ?? null,
      startedAt: new Date(body.startedAt),
      endedAt: new Date(body.endedAt),
      durationSeconds: body.durationSeconds,
      type: body.type,
      completed: body.completed,
      note: body.note ?? '',
    },
  })
  reply.code(201).send(session)
})

server.get('/subtasks', async (req) => {
  const taskId = (req.query as { taskId?: string }).taskId
  return prisma.subtask.findMany({ where: taskId ? { taskId } : undefined, orderBy: { createdAt: 'asc' } })
})

server.post('/subtasks', async (req, reply) => {
  const body = req.body as { taskId: string; title: string }
  const count = await prisma.subtask.count({ where: { taskId: body.taskId } })
  if (count >= 3) {
    reply.code(400).send({ error: 'Máximo 3 subtareas por tarea' })
    return
  }
  const subtask = await prisma.subtask.create({
    data: {
      taskId: body.taskId,
      title: body.title,
    },
  })
  reply.code(201).send(subtask)
})

server.patch('/subtasks/:id', async (req, reply) => {
  const { id } = req.params as { id: string }
  const body = req.body as { title?: string; done?: boolean }
  try {
    const subtask = await prisma.subtask.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.done !== undefined ? { done: body.done } : {}),
      },
    })
    reply.send(subtask)
  } catch (error: any) {
    if (error?.code === 'P2025') {
      reply.code(404).send({ error: 'Subtask not found' })
      return
    }
    throw error
  }
})

server.delete('/subtasks/:id', async (req, reply) => {
  const { id } = req.params as { id: string }
  try {
    await prisma.subtask.delete({ where: { id } })
    reply.code(204).send()
  } catch (error: any) {
    if (error?.code === 'P2025') {
      reply.code(404).send({ error: 'Subtask not found' })
      return
    }
    throw error
  }
})

server.register(fastifyStatic, {
  root: STATIC_DIR,
  prefix: '/',
  decorateReply: false,
  index: 'index.html',
})

server.setNotFoundHandler((_req, reply) => {
  reply.sendFile('index.html')
})

server
  .listen({ port: PORT, host: HOST })
  .then(() => server.log.info(`Server running on ${HOST}:${PORT}`))
  .catch((err) => {
    server.log.error(err)
    process.exit(1)
  })
