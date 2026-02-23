
"use client"

import * as React from "react"
import { FolderPlus, Book, Briefcase, GraduationCap, Trash2, Plus, LayoutGrid, Folder } from "lucide-react"
import { useFirestore, useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { collection, query, orderBy, serverTimestamp, doc } from "firebase/firestore"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface ProjectManagerProps {
  compact?: boolean
}

export function ProjectManager({ compact = false }: ProjectManagerProps) {
  const { user } = useUser()
  const db = useFirestore()
  const { toast } = useToast()
  const [newProjectName, setNewProjectName] = React.useState("")
  const [projectType, setProjectType] = React.useState("Materia")

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
      tipo: projectType,
      fechaCreacion: serverTimestamp(),
    })
    setNewProjectName("")
    toast({ title: "Proyecto creado" })
  }

  const deleteProject = (id: string) => {
    if (!user || !db) return
    const projectRef = doc(db, "usuarios", user.uid, "proyectos", id)
    deleteDocumentNonBlocking(projectRef)
    toast({ title: "Proyecto eliminado" })
  }

  if (compact) {
    return (
      <Card className="border-none shadow-sm bg-white rounded-[2rem] overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-50">
          <CardTitle className="text-xs font-black uppercase flex items-center gap-2">
            <Folder className="h-3.5 w-3.5 text-primary" /> Proyectos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-2">
          {projects?.slice(0, 3).map(p => (
            <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-primary/5 transition-colors cursor-pointer group">
              <span className="text-xs font-bold truncate">{p.nombre}</span>
              <Badge variant="outline" className="text-[9px] h-4">{p.tipo}</Badge>
            </div>
          ))}
          {(!projects || projects.length === 0) && (
            <p className="text-[10px] text-muted-foreground italic text-center py-2">Sin proyectos activos</p>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-primary rounded-2xl flex items-center justify-center">
            <LayoutGrid className="text-white h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black">Mis Proyectos y Materias</h2>
            <p className="text-sm text-muted-foreground">Organiza tus tareas por categorías académicas o profesionales.</p>
          </div>
        </div>
      </div>

      <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
        <CardHeader className="bg-primary/5">
          <CardTitle className="text-sm font-black flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" /> NUEVO REGISTRO
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <Input 
              placeholder="Nombre del proyecto o materia..." 
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="rounded-xl bg-muted/30 border-none h-12 flex-1 font-bold"
            />
            <Select value={projectType} onValueChange={setProjectType}>
              <SelectTrigger className="w-[180px] h-12 rounded-xl bg-muted/30 border-none font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Materia">Materia</SelectItem>
                <SelectItem value="Proyecto">Proyecto</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={addProject} className="h-12 px-8 rounded-xl font-bold shadow-lg shadow-primary/20">
              Crear
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {projects?.map(project => (
          <Card key={project.id} className="border-none shadow-lg hover:shadow-xl transition-all rounded-[2rem] bg-white group overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className={cn(
                  "h-12 w-12 rounded-2xl flex items-center justify-center",
                  project.tipo === "Materia" ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
                )}>
                  {project.tipo === "Materia" ? <GraduationCap className="h-6 w-6" /> : <Briefcase className="h-6 w-6" />}
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteProject(project.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div>
                <Badge variant="secondary" className="mb-2 text-[10px] font-black uppercase tracking-tighter">
                  {project.tipo}
                </Badge>
                <h4 className="font-black text-xl leading-tight">{project.nombre}</h4>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
