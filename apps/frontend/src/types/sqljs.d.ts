declare module 'sql.js' {
  const initSqlJs: any
  export default initSqlJs
  export type Database = any
}

declare module 'sql.js/dist/sql-wasm.wasm?url' {
  const url: string
  export default url
}
