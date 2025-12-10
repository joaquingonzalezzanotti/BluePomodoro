import type { TaskStatus } from '../lib/types'
import { TaskQuickAdd } from './tasks/TaskQuickAdd'
import { KanbanBoard } from './tasks/KanbanBoard'

type TasksPanelProps = {
  statusFilter?: TaskStatus[]
}

export function TasksPanel({ statusFilter }: TasksPanelProps) {
  return (
    <div className="stacked" style={{ gap: '12px' }}>
      <TaskQuickAdd />
      <KanbanBoard />
    </div>
  )
}
