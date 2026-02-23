
"use client"

import * as React from "react"
import { FolderPlus, Book, Briefcase, GraduationCap, Trash2, Plus } from "lucide-react"
import { useFirestore, useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { collection, query, orderBy, serverTimestamp, doc } from "firebase/firestore"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

export function ProjectManager() {
  const { user } = useUser()
  const db = useFirestore()
  const [newProjectName, setNewProjectName] = React.useState("")

  const projectsQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "usuarios", user.uid, "proyectos"), orderBy("fechaCreacion", "desc"))
  }, [db, user])

  const { data: projects } = useCollection(projectsQuery)

  const addProject = () => {
    if (!newProjectName.trim() || !user || !db) return
    const projectsRef = collection(db, "usuarios", user.uid, "proyectos")
    addDocumentNonBlocking(projectsRef, {
      nombre: newProjectName,
      tipo: "Materia", // Por defecto
      fechaCreacion: serverTimestamp(),
    })
    setNewProjectName("")
  }

  const deleteProject = (id: string) => {
    if (!user || !db) return
    const projectRef = doc(db, "usuarios", user.uid, "proyectos", id)
    deleteDocumentNonBlocking(projectRef)
  }

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-primary" />
            Nuevos Proyectos o Materias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input 
              placeholder="Nombre del proyecto o materia..." 
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="bg-muted/30"
            />
            <Button onClick={addProject} className="gap-2">
              <Plus className="h-4 w-4" /> Crear
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects?.map(project => (
          <Card key={project.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  {project.tipo === "Materia" ? <GraduationCap className="h-5 w-5 text-primary" /> : <Briefcase className="h-5 w-5 text-primary" />}
                </div>
                <div>
                  <h4 className="font-bold text-sm">{project.nombre}</h4>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">{project.tipo}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => deleteProject(project.id)} className="h-8 w-8 text-destructive/50 hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
        {projects?.length === 0 && (
          <div className="col-span-full py-10 text-center text-muted-foreground italic text-sm">
            No has creado proyectos o materias aún.
          </div>
        )}
      </div>
    </div>
  )
}
