import type { Database } from 'sql.js'
import { loadDatabase, persistDatabase } from '../db/sqlite'

type DbCallback<T> = (db: Database) => T

/**
 * Runs a callback with the local sql.js database and persists any change.
 * Keeps the API layer free from network calls when no backend is available.
 */
export async function withDb<T>(callback: DbCallback<T>): Promise<T> {
  const db = await loadDatabase()
  try {
    return await Promise.resolve(callback(db))
  } finally {
    await persistDatabase(db)
    if (typeof (db as any).close === 'function') {
      ;(db as any).close()
    }
  }
}
