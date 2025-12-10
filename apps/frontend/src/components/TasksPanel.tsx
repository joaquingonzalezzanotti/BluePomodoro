import { TaskQuickAdd } from './tasks/TaskQuickAdd'
import { KanbanBoard } from './tasks/KanbanBoard'

export function TasksPanel() {
  return (
    <div className="stacked" style={{ gap: '12px' }}>
      <TaskQuickAdd />
      <KanbanBoard />
    </div>
  )
}
