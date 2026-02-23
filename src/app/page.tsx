"use client"

import * as React from "react"
import { 
  LayoutDashboard, 
  Calendar as CalendarIcon, 
  Settings, 
  User, 
  LogOut,
  Zap,
  CheckSquare,
  BarChart3,
  CloudLightning,
  RefreshCw
} from "lucide-react"
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroup, SidebarGroupLabel } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/toaster"
import { PomodoroTimer } from "@/components/pomodoro-timer"
import { TaskManager } from "@/components/task-manager"
import { FocusMusic } from "@/components/focus-music"
import { GamifiedProgress } from "@/components/gamified-progress"
import { DistractionBlocker } from "@/components/distraction-blocker"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function FocusFlowDashboard() {
  const [activeTab, setActiveTab] = React.useState("dashboard")

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background font-body">
        <Sidebar className="border-r border-primary/10">
          <SidebarHeader className="p-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                <CloudLightning className="text-white h-5 w-5" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-primary">FocusFlow</h1>
            </div>
          </SidebarHeader>
          
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Workspace</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")}>
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={activeTab === "tasks"} onClick={() => setActiveTab("tasks")}>
                    <CheckSquare className="h-4 w-4" />
                    <span>Focus Tasks</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={activeTab === "calendar"} onClick={() => setActiveTab("calendar")}>
                    <CalendarIcon className="h-4 w-4" />
                    <span>Google Sync</span>
                    <Badge variant="outline" className="ml-auto text-[10px] h-4">Connected</Badge>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={activeTab === "stats"} onClick={() => setActiveTab("stats")}>
                    <BarChart3 className="h-4 w-4" />
                    <span>Insights</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Settings</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    <Settings className="h-4 w-4" />
                    <span>Configuration</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-4 border-t border-primary/10">
            <div className="flex items-center gap-3 px-2 py-3 bg-primary/5 rounded-xl">
              <div className="h-10 w-10 bg-accent rounded-full flex items-center justify-center text-accent-foreground font-bold">
                JD
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">John Doe</p>
                <p className="text-xs text-muted-foreground truncate">Free Tier</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 overflow-auto">
          <header className="h-16 border-b border-primary/10 bg-white/50 backdrop-blur-md sticky top-0 z-10 px-8 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                Good morning, John <span className="animate-wave">👋</span>
              </h2>
              <p className="text-xs text-muted-foreground">Ready for a productive session?</p>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" className="gap-2 border-primary/20 hover:bg-primary/5">
                <RefreshCw className="h-4 w-4" /> Sync Calendar
              </Button>
              <Button size="sm" className="bg-primary hover:bg-primary/80 gap-2">
                <Zap className="h-4 w-4 fill-current" /> GO DEEP FOCUS
              </Button>
            </div>
          </header>

          <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Tasks */}
              <div className="lg:col-span-2 space-y-8">
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">Today&apos;s Focus Flow</h3>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="text-xs h-7">Sort By Deadline</Button>
                      <Button variant="ghost" size="sm" className="text-xs h-7">AI Prioritize</Button>
                    </div>
                  </div>
                  <TaskManager />
                </section>
              </div>

              {/* Right Column: Tools & Stats */}
              <div className="space-y-8">
                <section>
                  <PomodoroTimer />
                </section>
                
                <section>
                  <GamifiedProgress />
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-8">
                  <section>
                    <FocusMusic />
                  </section>
                  
                  <section>
                    <DistractionBlocker />
                  </section>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Toaster />
      </div>
    </SidebarProvider>
  )
}
