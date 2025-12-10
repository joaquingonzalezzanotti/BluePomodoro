import { useMemo } from 'react'
import { useAppStore } from '../state/useAppStore'

type Props = {
  open: boolean
  onToggle: (open: boolean) => void
}

export function HierarchySidebar({ open, onToggle }: Props) {
  const { projects, subjects, tasks } = useAppStore()

  const tree = useMemo(
    () =>
      projects.map((p) => ({
        ...p,
        subjects: subjects.filter((s) => s.projectId === p.id).map((s) => ({
          ...s,
          tasks: tasks.filter((t) => t.subjectId === s.id),
        })),
        tasks: tasks.filter((t) => t.projectId === p.id && !t.subjectId),
      })),
    [projects, subjects, tasks]
  )

  return (
    <>
      <aside className={`hierarchy-sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h3>Jerarquía</h3>
          <button className="ghost" onClick={() => onToggle(false)}>
            X
          </button>
        </div>
        <div className="tree">
          {tree.length === 0 && <p className="muted small">Sin proyectos</p>}
          {tree.map((p) => (
            <div key={p.id} className="tree-node">
              <div className="tree-project" style={{ borderLeftColor: p.color ?? '#1f56ff' }}>
                <strong>{p.name}</strong>
                {p.dueDate && <span className="muted small"> · {new Date(p.dueDate).toLocaleDateString()}</span>}
              </div>
              {p.subjects.map((s) => (
                <div key={s.id} className="tree-subject">
                  <span>{s.name}</span>
                  <ul>
                    {s.tasks.map((t) => (
                      <li key={t.id}>{t.title}</li>
                    ))}
                  </ul>
                </div>
              ))}
              {p.tasks.length > 0 && (
                <div className="tree-subject">
                  <span>Sin materia</span>
                  <ul>
                    {p.tasks.map((t) => (
                      <li key={t.id}>{t.title}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>
    </>
  )
}
