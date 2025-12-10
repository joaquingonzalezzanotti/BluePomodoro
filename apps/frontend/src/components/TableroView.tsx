import { useState } from 'react'
import { StatsPanel } from './StatsPanel'
import { HierarchySidebar } from './HierarchySidebar'
import { ActiveTimer } from './ActiveTimer'
import { TaskQuickAdd } from './tasks/TaskQuickAdd'
import { TaskList } from './tasks/TaskList'
import type { TaskStatus } from '../lib/types'

export function TableroView() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState<TaskStatus | 'all'>('all')

  return (
    <div className={`layout-shell ${sidebarOpen ? 'sidebar-open' : ''}`}>
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
      <HierarchySidebar open={sidebarOpen} onToggle={setSidebarOpen} />
      <main className="dashboard-grid">
        <section className="stacked main-col">
          <TaskQuickAdd />
          <div className="panel" style={{ padding: '10px 12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '70% 30%', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Buscar tareas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%' }}
              />
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter((e.target.value as TaskStatus | 'all') ?? 'all')}
                style={{ width: '100%' }}
              >
                <option value="all">Pendiente + En foco</option>
                <option value="todo">Solo pendientes</option>
                <option value="doing">Solo en foco</option>
              </select>
            </div>
          </div>
          <TaskList
            statusFilter={stateFilter === 'all' ? ['todo', 'doing'] : [stateFilter]}
            search={search}
            stateFilter={stateFilter}
            excludeStatuses={['done']}
          />
        </section>
        <section className="stacked side-col">
          <ActiveTimer />
          <StatsPanel compact />
        </section>
      </main>
    </div>
  )
}
