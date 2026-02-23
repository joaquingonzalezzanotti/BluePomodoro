
"use client"

import * as React from "react"
import { Trophy, Medal, Flame, Star, TrendingUp, Award } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

const BADGES = [
  { id: 1, name: "Madrugador", icon: <Star className="h-4 w-4" />, color: "bg-blue-100 text-blue-600" },
  { id: 2, name: "Enfoque Profundo", icon: <Flame className="h-4 w-4" />, color: "bg-orange-100 text-orange-600" },
  { id: 3, name: "Consistencia", icon: <Award className="h-4 w-4" />, color: "bg-purple-100 text-purple-600" },
]

export function GamifiedProgress() {
  const points = 1250
  const nextLevel = 2000
  const progress = (points / nextLevel) * 100

  return (
    <Card className="w-full bg-card shadow-lg border-none h-full">
      <CardHeader>
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-accent" />
          Mi Progreso
        </CardTitle>
        <CardDescription>Nivel 4: Maestro del Enfoque</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm font-medium">
            <span>Puntos de Experiencia (XP)</span>
            <span>{points} / {nextLevel}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-primary/5 rounded-xl flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Productividad</p>
              <p className="text-lg font-bold">+15%</p>
            </div>
          </div>
          <div className="p-3 bg-accent/5 rounded-xl flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Flame className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Racha Diaria</p>
              <p className="text-lg font-bold">7 Días</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-bold flex items-center gap-2">
            <Medal className="h-4 w-4 text-primary" />
            Insignias Recientes
          </h4>
          <div className="flex gap-2">
            {BADGES.map(badge => (
              <div key={badge.id} className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold ${badge.color}`}>
                {badge.icon}
                {badge.name}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
