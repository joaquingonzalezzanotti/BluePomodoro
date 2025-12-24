import { buildServer } from './app'

const PORT = Number(process.env.PORT || 4000)
const HOST = process.env.HOST || '0.0.0.0'

const server = buildServer()

server
  .listen({ port: PORT, host: HOST })
  .then(() => server.log.info(`Server running on ${HOST}:${PORT}`))
  .catch((err) => {
    server.log.error(err)
    process.exit(1)
  })
