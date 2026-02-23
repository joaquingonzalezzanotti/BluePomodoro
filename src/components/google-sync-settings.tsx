
"use client"

import * as React from "react"
import { Calendar as CalendarIcon, CheckSquare, RefreshCw, ExternalLink, Cloud } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useFirestore, useUser, useMemoFirebase, setDocumentNonBlocking } from "@/firebase"
import { doc } from "firebase/firestore"

export function GoogleSyncSettings() {
  const { user } = useUser()
  const db = useFirestore()

  const syncRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "usuarios", user.uid, "configuracionesSincronizacionGoogle", "default")
  }, [db, user])

  const handleToggle = (key: string, value: boolean) => {
    if (!syncRef) return
    setDocumentNonBlocking(syncRef, { [key]: value }, { merge: true })
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-6 w-6 text-primary" />
            Integración con Google
          </CardTitle>
          <CardDescription>
            Sincroniza tus tareas y eventos para mantener todo bajo control.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-primary/5">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                <CalendarIcon className="h-6 w-6" />
              </div>
              <div>
                <Label className="font-bold text-base">Google Calendar</Label>
                <p className="text-xs text-muted-foreground">Importa eventos como bloques de enfoque en tu calendario.</p>
              </div>
            </div>
            <Switch onCheckedChange={(v) => handleToggle("calendarSync", v)} />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-primary/5">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                <CheckSquare className="h-6 w-6" />
              </div>
              <div>
                <Label className="font-bold text-base">Google Tasks</Label>
                <p className="text-xs text-muted-foreground">Sincroniza bidireccionalmente tus listas de tareas.</p>
              </div>
            </div>
            <Switch onCheckedChange={(v) => handleToggle("tasksSync", v)} />
          </div>

          <div className="pt-4 border-t border-primary/10">
            <Button variant="outline" className="w-full gap-2 border-primary/20 text-primary">
              <ExternalLink className="h-4 w-4" /> Configurar Permisos en Google Cloud
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="p-6 bg-primary/10 rounded-2xl border border-primary/20">
        <h4 className="font-bold mb-2 flex items-center gap-2 text-primary">
          <RefreshCw className="h-4 w-4" /> ¿Cómo funciona?
        </h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Una vez activado, BluePomodoro buscará automáticamente las tareas pendientes en tu cuenta de Google y las organizará usando nuestra IA para que encajen perfectamente en tus bloques de enfoque.
        </p>
      </div>
    </div>
  )
}
