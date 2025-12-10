import { useState } from 'react'
import { QuickAddTask } from './QuickAddTask'
import { TasksPanel } from './TasksPanel'
import { StatsPanel } from './StatsPanel'
import { TimerCard } from './TimerCard'
import { BacklogList } from './BacklogList'
import { HierarchySidebar } from './HierarchySidebar'

export function TableroView() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className={`layout-shell ${sidebarOpen ? 'sidebar-open' : ''}`}>
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
      <HierarchySidebar open={sidebarOpen} onToggle={setSidebarOpen} />
      <main className="main-grid">
        <section className="stacked">
          <QuickAddTask />
          <TasksPanel compact showForm={false} statusFilter={['todo']} />
        </section>
        <section className="stacked">
          <BacklogList />
        </section>
        <section className="timer-column stacked">
          <div className="timer-panel">
            <TimerCard />
          </div>
          <StatsPanel compact />
        </section>
      </main>
    </div>
  )
}
