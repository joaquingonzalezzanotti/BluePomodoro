
"use client"

import * as React from "react"
import { Database, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { seedInitialUsers } from "@/lib/seed-utils"
import { useToast } from "@/hooks/use-toast"

export function DevAuthSeeder() {
  const [isLoading, setIsLoading] = React.useState(false)
  const [done, setDone] = React.useState(false)
  const { toast } = useToast()

  const handleSeed = async () => {
    setIsLoading(true)
    try {
      const msg = await seedInitialUsers()
      setDone(true)
      toast({ title: "Seed Exitoso", description: msg })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error en Seed", description: e.message })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mt-8 p-6 bg-amber-50 rounded-3xl border border-amber-100 max-w-sm mx-auto">
      <div className="flex items-center gap-3 mb-4 text-amber-700">
        <Database className="h-5 w-5" />
        <h4 className="font-bold text-sm uppercase tracking-wider">Modo Desarrollador</h4>
      </div>
      <p className="text-[10px] text-amber-600 mb-4 leading-relaxed font-medium">
        Crea instantáneamente 3 usuarios de prueba con datos de ejemplo en tu BDD (Firestore). 
        <strong> Pass: password123</strong>
      </p>
      <Button 
        onClick={handleSeed} 
        disabled={isLoading || done}
        variant="outline" 
        className="w-full bg-white border-amber-200 text-amber-700 hover:bg-amber-100 gap-2 font-bold text-xs h-10 rounded-xl"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : done ? <CheckCircle2 className="h-4 w-4" /> : <Database className="h-4 w-4" />}
        {isLoading ? "PROCESANDO..." : done ? "USUARIOS CREADOS" : "SEMBRAR DATOS DE PRUEBA"}
      </Button>
    </div>
  )
}
