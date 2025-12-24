import type { IncomingMessage, ServerResponse } from 'node:http'
import { buildServer } from '../src/app'

let serverPromise: Promise<ReturnType<typeof buildServer>> | null = null

async function getServer() {
  if (!serverPromise) {
    const server = buildServer()
    serverPromise = server.ready().then(() => server)
  }
  return serverPromise
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const url = req.url ?? ''
  if (url.startsWith('/api')) {
    const stripped = url.slice(4)
    req.url = stripped.startsWith('?') ? `/${stripped}` : stripped || '/'
  }

  const server = await getServer()
  server.server.emit('request', req, res)
}
