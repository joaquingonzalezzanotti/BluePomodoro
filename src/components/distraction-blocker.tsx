"use client"

import * as React from "react"
import { Shield, Lock, Unlock, Plus, Trash2, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useSupabase, useUser } from "@/supabase"
import { useProfile } from "@/supabase/hooks"
import { useToast } from "@/hooks/use-toast"

export function DistractionBlocker() {
  const { user } = useUser()
  const supabase = useSupabase()
  const { toast } = useToast()
  const [newSite, setNewSite] = React.useState("")

  const { data: profile } = useProfile()
  const isBlocking = profile?.modo_estricto_activo || false
  const blockedSites = profile?.sitios_bloqueados || ["facebook.com", "youtube.com", "twitter.com", "reddit.com"]

  const handleToggleBlocking = async (checked: boolean) => {
    if (!user) return
    await supabase.from("profiles").update({ modo_estricto_activo: checked }).eq("id", user.id)
  }

  const handleAddSite = async () => {
    if (!newSite.trim() || !user) return
    const site = newSite.trim().toLowerCase()
    if (blockedSites.includes(site)) {
      toast({ variant: "destructive", title: "Sitio ya en lista", description: `${site} ya está bloqueado.` })
      return
    }
    const newList = [...blockedSites, site]
    await await supabase.from("profiles").update({ sitios_bloqueados: newList }).eq("id", user.id)
    setNewSite("")
    toast({ title: "Sitio añadido", description: `${site} se bloqueará en modo Focus.` })
  }

  const handleRemoveSite = async (site: string) => {
    if (!user) return
    const newList = blockedSites.filter((s: string) => s !== site)
    await await supabase.from("profiles").update({ sitios_bloqueados: newList }).eq("id", user.id)
    toast({ title: "Sitio removido", description: `${site} ya no está en la lista.` })
  }

  return (
    <Card className="w-full bg-card shadow-lg border-none">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Escudo Focus
          </CardTitle>
          <Badge variant={isBlocking ? "default" : "secondary"}>
            {isBlocking ? "ACTIVO" : "INACTIVO"}
          </Badge>
        </div>
        <CardDescription>
          Bloquea sitios distractores para mantener la concentración.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/10">
          <div className="flex items-center gap-3">
            {isBlocking ? <Lock className="h-5 w-5 text-primary" /> : <Unlock className="h-5 w-5 text-muted-foreground" />}
            <div className="flex flex-col">
              <Label className="text-sm font-bold">Modo Focus Profundo</Label>
              <span className="text-[10px] text-muted-foreground uppercase font-black">Bloqueo Activo de Dominios</span>
            </div>
          </div>
          <Switch checked={isBlocking} onCheckedChange={handleToggleBlocking} />
        </div>

        <div className="space-y-3">
          <Label className="text-xs font-black uppercase text-muted-foreground">Gestionar Lista Negra</Label>
          <div className="flex gap-2">
            <Input 
              placeholder="ej: netflix.com" 
              value={newSite}
              onChange={(e) => setNewSite(e.target.value)}
              className="rounded-xl h-10 bg-muted/30"
              onKeyDown={(e) => e.key === 'Enter' && handleAddSite()}
            />
            <Button onClick={handleAddSite} size="icon" className="shrink-0 rounded-xl">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-black uppercase text-muted-foreground/60">
            <span>Sitios Bloqueados</span>
            <span>{blockedSites.length} sitios</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {blockedSites.map((site: string) => (
              <Badge 
                key={site} 
                variant="outline" 
                className="text-[10px] py-1 pl-2 pr-1 gap-1 border-primary/10 bg-white shadow-sm flex items-center"
              >
                <Globe className="h-3 w-3 text-muted-foreground" />
                {site}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-4 w-4 p-0 hover:text-destructive" 
                  onClick={() => handleRemoveSite(site)}
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
