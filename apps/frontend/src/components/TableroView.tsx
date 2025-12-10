import { useState } from 'react'
import { TasksPanel } from './TasksPanel'
import { StatsPanel } from './StatsPanel'
import { HierarchySidebar } from './HierarchySidebar'
import { ActiveTimer } from './ActiveTimer'

export function TableroView() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className={`layout-shell ${sidebarOpen ? 'sidebar-open' : ''}`}>
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
      <HierarchySidebar open={sidebarOpen} onToggle={setSidebarOpen} />
      <main className="dashboard-grid">
        <section className="stacked main-col">
          <TasksPanel statusFilter={['todo']} />
        </section>
        <section className="stacked side-col">
          <ActiveTimer />
          <StatsPanel compact />
        </section>
      </main>
    </div>
  )
}
