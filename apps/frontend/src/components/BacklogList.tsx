import { TasksPanel } from './TasksPanel'

export function BacklogList() {
  // reuse TasksPanel in embedded/listOnly mode
  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Backlog</p>
          <h2>Resumen rápido</h2>
          <p className="muted small">Vista compacta, sin edición.</p>
        </div>
      </div>
      <TasksPanel compact embedded={false} listOnly statusFilter={['todo', 'doing']} />
    </div>
  )
}
