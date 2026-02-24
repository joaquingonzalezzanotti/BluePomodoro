
"use client"

import * as React from "react"
import { FolderPlus, Book, Briefcase, GraduationCap, Trash2, Plus, LayoutGrid, Folder, ChevronRight, Hash } from "lucide-react"
import { useFirestore, useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { collection, query, orderBy, serverTimestamp, doc, where } from "firebase/firestore"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export function ProjectManager() {
  const { user } = useUser()
  const db = useFirestore()
  const { toast } = useToast()
  
  const [newProjectName, setNewProjectName] = React.useState("")
  const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(null)
  const [newMateriaName, setNewMateriaName] = React.useState("")

  const projectsQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "usuarios", user.uid, "proyectos"), orderBy("fechaCreacion", "desc"))
  }, [db, user])

  const { data: projects } = useCollection(projectsQuery)

  const materiasQuery = useMemoFirebase(() => {
    if (!db || !user || !selectedProjectId) return null
    return query(collection(db, "usuarios", user.uid, "materias"), where("proyectoId", "==", selectedProjectId))
  }, [db, user, selectedProjectId])

  const { data: materias } = useCollection(materiasQuery)

  const addProject = () => {
    if (!newProjectName.trim() || !user || !db) return
    const projectsRef = collection(db, "usuarios", user.uid, "proyectos")
    addDocumentNonBlocking(projectsRef, {
      nombre: newProjectName,
      fechaCreacion: serverTimestamp(),
    })
    setNewProjectName("")
    toast({ title: "Proyecto creado" })
  }

  const addMateria = () => {
    if (!newMateriaName.trim() || !selectedProjectId || !user || !db) return
    const materiasRef = collection(db, "usuarios", user.uid, "materias")
    addDocumentNonBlocking(materiasRef, {
      nombre: newMateriaName,
      proyectoId: selectedProjectId,
    })
    setNewMateriaName("")
    toast({ title: "Materia añadida" })
  }

  const deleteProject = (id: string) => {
    if (!user || !db) return
    deleteDocumentNonBlocking(doc(db, "usuarios", user.uid, "proyectos", id))
    if (selectedProjectId === id) setSelectedProjectId(null)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 bg-primary rounded-2xl flex items-center justify-center">
          <FolderKanban className="text-white h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-black">Mis Proyectos</h2>
          <p className="text-sm text-muted-foreground">Estructura tus estudios: Proyectos → Materias → Tareas.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Columna Proyectos */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden">
            <CardHeader className="bg-primary/5 pb-4">
               <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                 <Plus className="h-4 w-4" /> Nuevo Proyecto
               </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex gap-2">
                <Input 
                  placeholder="Ej: Universidad" 
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="rounded-xl border-none bg-muted/30 font-bold"
                />
                <Button onClick={addProject} size="icon" className="rounded-xl shrink-0"><Plus /></Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {projects?.map(p => (
              <div 
                key={p.id} 
                onClick={() => setSelectedProjectId(p.id)}
                className={cn(
                  "p-4 rounded-2xl flex items-center justify-between cursor-pointer transition-all border-2",
                  selectedProjectId === p.id ? "bg-primary text-white border-primary shadow-lg scale-[1.02]" : "bg-white border-transparent hover:border-primary/20 text-slate-600"
                )}
              >
                <div className="flex items-center gap-3">
                  <Folder className={cn("h-5 w-5", selectedProjectId === p.id ? "text-white" : "text-primary")} />
                  <span className="font-black text-sm">{p.nombre}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }}
                  className={cn("h-8 w-8", selectedProjectId === p.id ? "text-white/60 hover:text-white" : "text-slate-200 hover:text-destructive")}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Columna Materias */}
        <div className="lg:col-span-8">
          {selectedProjectId ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black">Materias de {projects?.find(p => p.id === selectedProjectId)?.nombre}</h3>
                <Badge className="bg-primary/10 text-primary border-none">{materias?.length || 0} materias</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <Card className="border-2 border-dashed border-slate-200 bg-transparent rounded-[2rem] flex items-center justify-center p-8 hover:border-primary/40 transition-colors">
                    <div className="flex flex-col gap-4 w-full text-center">
                       <p className="text-xs font-black uppercase text-slate-400">Añadir Materia</p>
                       <div className="flex gap-2">
                          <Input 
                            placeholder="Nombre de la materia..." 
                            value={newMateriaName}
                            onChange={(e) => setNewMateriaName(e.target.value)}
                            className="rounded-xl border-none bg-white shadow-sm font-bold"
                          />
                          <Button onClick={addMateria} className="rounded-xl px-6">OK</Button>
                       </div>
                    </div>
                 </Card>

                 {materias?.map(m => (
                   <Card key={m.id} className="border-none shadow-lg rounded-[2.5rem] bg-white p-6 group">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
                               <Hash className="h-6 w-6" />
                            </div>
                            <div>
                               <h4 className="font-black text-lg">{m.nombre}</h4>
                               <p className="text-[10px] text-muted-foreground uppercase font-black">ID: {m.id.slice(0,6)}</p>
                            </div>
                         </div>
                         <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 text-slate-200 hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                         </Button>
                      </div>
                   </Card>
                 ))}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-20 bg-slate-100/50 rounded-[3rem] border-2 border-dashed border-slate-200">
               <div className="h-20 w-20 bg-slate-200 rounded-full flex items-center justify-center mb-6">
                  <ChevronRight className="h-10 w-10 text-slate-400" />
               </div>
               <h3 className="text-2xl font-black text-slate-400">Selecciona un Proyecto</h3>
               <p className="text-slate-400 font-medium max-w-xs">Para gestionar tus materias y tareas vinculadas, primero elige un proyecto de la izquierda.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
