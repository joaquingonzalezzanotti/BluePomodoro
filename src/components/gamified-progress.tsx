"use client"

import * as React from "react"
import { Trophy, Medal, Flame, Star, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { RewardSummary } from "@/pomodoro/stats"

type GamifiedProgressProps = {
  rewards: RewardSummary
  comparisonDeltaPercent: number
  periodLabel: string
  comparisonLabel: string
}

export function GamifiedProgress({
  rewards,
  comparisonDeltaPercent,
  periodLabel,
  comparisonLabel,
}: GamifiedProgressProps) {
  const progress = rewards.levelProgressPct
  const deltaSign = comparisonDeltaPercent > 0 ? "+" : ""

  return (
    <Card className="w-full bg-card shadow-lg border-none h-full">
      <CardHeader>
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-accent" />
          Mi Progreso Mensual
        </CardTitle>
        <CardDescription>{periodLabel} · Nivel {rewards.level}: Maestro del Enfoque</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm font-medium">
            <span>Puntos de Experiencia (XP)</span>
            <span>{rewards.points} / {rewards.nextLevelPoints}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-primary/5 rounded-xl flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{comparisonLabel}</p>
              <p className="text-lg font-bold">{deltaSign}{comparisonDeltaPercent}%</p>
            </div>
          </div>
          <div className="p-3 bg-accent/5 rounded-xl flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Flame className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Racha del mes</p>
              <p className="text-lg font-bold">{rewards.streakDays} dias</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-bold flex items-center gap-2">
            <Medal className="h-4 w-4 text-primary" />
            Insignias del mes
          </h4>
          <div className="flex gap-2 flex-wrap">
            {rewards.badges.map(badge => (
              <div
                key={badge.id}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold ${badge.color} ${badge.unlocked ? "" : "opacity-40 grayscale"}`}
                title={badge.description}
              >
                <Star className="h-4 w-4" />
                {badge.name}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
