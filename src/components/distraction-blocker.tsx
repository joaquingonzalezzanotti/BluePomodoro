
"use client"

import * as React from "react"
import { Shield, Lock, Unlock, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useFirestore, useUser, useDoc, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase"
import { doc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

export function DistractionBlocker() {
  const { user } = useUser()
  const db = useFirestore()
  const { toast } = useToast()

  const userRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "usuarios", user.uid)
  }, [db, user])

  const { data: userData } = useDoc(userRef)
  const isBlocking = userData?.modoEstrictoActivo || false

  const handleToggleBlocking = (checked: boolean) => {
    if (!userRef) return
    
    updateDocumentNonBlocking(userRef, {
      modoEstrictoActivo: checked
    })

    toast({
      title: checked ? "Escudo Zen Activado" : "Escudo Zen Desactivado",
      description: checked 
        ? "Las distracciones han sido bloqueadas. ¡A trabajar!" 
        : "Has vuelto al modo normal.",
    })
  }

  return (
    <Card className="w-full bg-card shadow-lg border-none">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Escudo Zen
          </CardTitle>
          <Badge variant={isBlocking ? "default" : "secondary"}>
            {isBlocking ? "ACTIVO" : "INACTIVO"}
          </Badge>
        </div>
        <CardDescription>
          Bloquea sitios distractores para mantener el enfoque profundo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-3">
            {isBlocking ? <Lock className="h-4 w-4 text-primary" /> : <Unlock className="h-4 w-4 text-muted-foreground" />}
            <div className="flex flex-col">
              <Label className="text-sm font-semibold">Modo Enfoque Estricto</Label>
              <span className="text-[10px] text-muted-foreground">Bloquea Facebook, YouTube, X, Reddit</span>
            </div>
          </div>
          <Switch checked={isBlocking} onCheckedChange={handleToggleBlocking} />
        </div>

        <div className="text-xs space-y-2">
          <div className="flex justify-between text-muted-foreground">
            <span>Sitios en lista negra</span>
            <span>4 sitios</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {["facebook.com", "youtube.com", "twitter.com", "reddit.com"].map(site => (
              <Badge key={site} variant="outline" className="text-[10px] py-0">{site}</Badge>
            ))}
          </div>
        </div>

        <Button variant="outline" size="sm" className="w-full text-xs h-8" disabled>
          <Settings className="h-3 w-3 mr-2" /> Próximamente: Lista Personalizada
        </Button>
      </CardContent>
    </Card>
  )
}
