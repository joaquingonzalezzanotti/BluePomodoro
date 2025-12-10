import initSqlJs, { type Database } from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import { get, set } from 'idb-keyval'
import { schema } from './schema'

const DB_KEY = 'focustodo.sqlite'

export async function loadDatabase(): Promise<Database> {
  const SQL = await initSqlJs({
    locateFile: () => wasmUrl,
  })

  const existing = await get<Uint8Array | null>(DB_KEY)
  const db = existing ? new SQL.Database(existing) : new SQL.Database()
  db.exec(schema)
  ensureMigrations(db)
  return db
}

export async function persistDatabase(db: Database) {
  const data = db.export()
  await set(DB_KEY, data)
}

export async function importDatabase(buffer: ArrayBuffer): Promise<Database> {
  const SQL = await initSqlJs({
    locateFile: () => wasmUrl,
  })
  const db = new SQL.Database(new Uint8Array(buffer))
  db.exec(schema)
  ensureMigrations(db)
  await persistDatabase(db)
  return db
}

export async function exportDatabaseBlob(): Promise<Blob> {
  const existing = await get<Uint8Array | null>(DB_KEY)
  const data = existing ?? new Uint8Array()
  const arrayBuffer = data instanceof Uint8Array ? data.slice().buffer : new ArrayBuffer(0)
  return new Blob([arrayBuffer], { type: 'application/octet-stream' })
}

export async function resetDatabase(): Promise<Database> {
  const SQL = await initSqlJs({
    locateFile: () => wasmUrl,
  })
  const db = new SQL.Database()
  db.exec(schema)
  ensureMigrations(db)
  await persistDatabase(db)
  return db
}

function ensureMigrations(db: Database) {
  const info = db.exec(`PRAGMA table_info(tasks);`)
  const columns = info?.[0]?.values?.map((v) => String(v[1])) ?? []
  if (!columns.includes('estimated_pomodoros')) {
    db.exec('ALTER TABLE tasks ADD COLUMN estimated_pomodoros INTEGER NOT NULL DEFAULT 1;')
  }
  if (!columns.includes('project_id')) {
    db.exec('ALTER TABLE tasks ADD COLUMN project_id TEXT;')
  }
  if (!columns.includes('subject_id')) {
    db.exec('ALTER TABLE tasks ADD COLUMN subject_id TEXT;')
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      color TEXT DEFAULT '#1f56ff',
      due_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `)
  const projInfo = db.exec(`PRAGMA table_info(projects);`)
  const projCols = projInfo?.[0]?.values?.map((v) => String(v[1])) ?? []
  if (!projCols.includes('color')) {
    db.exec(`ALTER TABLE projects ADD COLUMN color TEXT DEFAULT '#1f56ff';`)
  }
  if (!projCols.includes('due_date')) {
    db.exec(`ALTER TABLE projects ADD COLUMN due_date TEXT;`)
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id)
    );
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS subtasks (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      title TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(task_id) REFERENCES tasks(id)
    );
  `)
}
