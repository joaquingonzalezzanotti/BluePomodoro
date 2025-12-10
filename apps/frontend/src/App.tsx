import { useEffect, useState } from 'react'
import './App.css'
import { NavLink, Route, Routes } from 'react-router-dom'
import { TasksPanel } from './components/TasksPanel'
import { StatsPanel } from './components/StatsPanel'
import { SettingsPanel } from './components/SettingsPanel'
import { DataPanel } from './components/DataPanel'
import { FocusView } from './components/FocusView'
import { ProjectsSubjectsPage } from './components/ProjectsSubjectsPage'
import { TableroView } from './components/TableroView'
import { useAppStore } from './state/useAppStore'
import logo from './assets/BluePomodoro.png'

function App() {
  const { init, resetAndInit, dbReady, dbError } = useAppStore()
  const [navCollapsed, setNavCollapsed] = useState(false)

  useEffect(() => {
    void init()
  }, [init])

  return (
    <div className={`page ${navCollapsed ? 'collapsed' : ''}`}>
      <aside className={`sidebar-shell ${navCollapsed ? 'collapsed' : ''}`}>
        <button className="collapse-btn" aria-label="Toggle sidebar" onClick={() => setNavCollapsed((v) => !v)}>
          <span className="hamburger" />
        </button>
        {!navCollapsed && (
          <>
            <nav className="sidebar-nav">
              <NavLink to="/" className="sidebar-link">
                Tablero
              </NavLink>
              <NavLink to="/tareas" className="sidebar-link">
                Tareas
              </NavLink>
              <NavLink to="/proyectos" className="sidebar-link">
                Proyectos
              </NavLink>
              <NavLink to="/estadisticas" className="sidebar-link">
                Estadísticas
              </NavLink>
              <NavLink to="/foco" className="sidebar-link">
                Modo foco
              </NavLink>
              <NavLink to="/configuracion" className="sidebar-link">
                Config
              </NavLink>
            </nav>
          </>
        )}
      </aside>
      <div className="main-area">
        <header className="topbar" id="hoy">
          <div className="brand">
            <img src={logo} alt="Focus To-Do logo" className="brand-logo" />
            <div>
              <p className="eyebrow">Plan del día</p>
              <h1>Pomodoro + tareas</h1>
              <p className="muted">Organiza sesiones, tareas, materias y proyectos.</p>
            </div>
          </div>
          <nav className="top-nav">
            <NavLink to="/" className="pill nav-link">
              Tablero
            </NavLink>
            <NavLink to="/tareas" className="pill nav-link">
              Tareas
            </NavLink>
            <NavLink to="/proyectos" className="pill nav-link">
              Proyectos
            </NavLink>
            <NavLink to="/estadisticas" className="pill nav-link">
              Estadísticas
            </NavLink>
            <NavLink to="/foco" className="pill nav-link">
              Modo foco
            </NavLink>
            <NavLink to="/configuracion" className="pill nav-link">
              Config
            </NavLink>
          </nav>
        </header>

        {!dbReady && <div className="notice">Cargando base...</div>}
        {dbError && (
          <div className="notice error">
            {dbError}{' '}
            <button className="ghost" onClick={() => void resetAndInit()}>
              Reintentar
            </button>
          </div>
        )}

        {dbReady && (
          <Routes>
            <Route path="/" element={<TableroView />} />
            <Route
              path="/tareas"
              element={
                <div className="two-col">
                  <TasksPanel showList={false} />
                  <TasksPanel listOnly />
                </div>
              }
            />
            <Route
              path="/proyectos"
              element={
                <div className="single-column">
                  <ProjectsSubjectsPage />
                </div>
              }
            />
            <Route
              path="/estadisticas"
              element={
                <div className="single-column">
                  <StatsPanel />
                </div>
              }
            />
            <Route path="/foco" element={<FocusView />} />
            <Route
              path="/configuracion"
              element={
                <div className="single-column">
                  <SettingsPanel />
                  <DataPanel />
                </div>
              }
            />
          </Routes>
        )}
      </div>
    </div>
  )
}

export default App
