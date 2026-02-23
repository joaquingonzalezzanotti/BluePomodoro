"use client"

import * as React from "react"
import { Shield, ShieldAlert, Lock, Unlock, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

export function DistractionBlocker() {
  const [isBlocking, setIsBlocking] = React.useState(false)

  return (
    <Card className="w-full bg-card shadow-lg border-none">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Zen Shield
          </CardTitle>
          <Badge variant={isBlocking ? "default" : "secondary"}>
            {isBlocking ? "ACTIVE" : "INACTIVE"}
          </Badge>
        </div>
        <CardDescription>
          Temporarily block distracting sites to maintain deep focus.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-3">
            {isBlocking ? <Lock className="h-4 w-4 text-primary" /> : <Unlock className="h-4 w-4 text-muted-foreground" />}
            <div className="flex flex-col">
              <Label className="text-sm font-semibold">Strict Focus Mode</Label>
              <span className="text-[10px] text-muted-foreground">Blocks Facebook, YouTube, X, Reddit</span>
            </div>
          </div>
          <Switch checked={isBlocking} onCheckedChange={setIsBlocking} />
        </div>

        <div className="text-xs space-y-2">
          <div className="flex justify-between text-muted-foreground">
            <span>Blocked sites</span>
            <span>4 sites</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {["facebook.com", "youtube.com", "twitter.com", "reddit.com"].map(site => (
              <Badge key={site} variant="outline" className="text-[10px] py-0">{site}</Badge>
            ))}
          </div>
        </div>

        <Button variant="outline" size="sm" className="w-full text-xs h-8">
          <Settings className="h-3 w-3 mr-2" /> Manage Blacklist
        </Button>
      </CardContent>
    </Card>
  )
}
