import { ProjectsPanel } from './ProjectsPanel'
import { SubjectsPanel } from './SubjectsPanel'

export function ProjectsSubjectsPage() {
  return (
    <div className="stacked">
      <ProjectsPanel />
      <SubjectsPanel />
    </div>
  )
}
