import Fastify from 'fastify'
import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import { PrismaClient } from '@prisma/client'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const prisma = new PrismaClient()
const server = Fastify({ logger: true })

const API_KEY = process.env.API_KEY
const PORT = Number(process.env.PORT || 4000)
const HOST = process.env.HOST || '0.0.0.0'
const STATIC_DIR = process.env.STATIC_DIR || join(__dirname, '..', 'public')

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
