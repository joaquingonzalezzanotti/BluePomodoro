import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const project = await prisma.project.create({
    data: {
      name: 'Proyecto demo',
      description: 'Seed inicial',
      color: '#1f56ff',
    },
  })

  const task = await prisma.task.create({
    data: {
      title: 'Tarea demo',
      description: 'Crear seed y probar API',
      projectId: project.id,
      estimatedPomodoros: 1,
      status: 'todo',
      priority: 'medium',
    },
  })

  await prisma.session.create({
    data: {
      taskId: task.id,
      startedAt: new Date(),
      endedAt: new Date(),
      durationSeconds: 1500,
      type: 'focus',
      completed: true,
      note: 'Seed session',
    },
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
