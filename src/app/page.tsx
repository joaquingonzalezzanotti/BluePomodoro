
"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { 
  LogIn, 
  Sparkles,
  CloudLightning
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSupabase, useUser } from "@/supabase"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

export default function RootLandingPage() {
  const [mounted, setMounted] = React.useState(false)
  const { user, isUserLoading } = useUser()
  const supabase = useSupabase()
  const { toast } = useToast()
  const router = useRouter()

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Si ya hay un usuario, lo enviamos directamente a la app
  React.useEffect(() => {
    if (user && !isUserLoading) {
      router.push("/app")
    }
  }, [user, isUserLoading, router])

  const handleGoogleSignIn = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/app`,
          scopes: "https://www.googleapis.com/auth/tasks.readonly https://www.googleapis.com/auth/calendar.readonly",
          queryParams: {
            access_type: "offline",
            prompt: "consent",
            include_granted_scopes: "true",
          },
        },
      })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error de Login", description: e.message })
    }
  }

  const handleGuestSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInAnonymously()
      if (error) throw error
      router.push("/app")
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo iniciar sesion como invitado." })
    }
  }

  if (!mounted || isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <CloudLightning className="h-12 w-12 text-primary animate-pulse" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden font-sans">
      <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-md border-b border-slate-100 h-20 flex items-center px-6 md:px-12 justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 relative">
             <Image src="/logo.png" alt="Logo BluePomodoro" width={40} height={40} className="rounded-xl object-contain" />
          </div>
          <span className="font-black text-xl tracking-tighter text-primary">BluePomodoro</span>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" className="hidden md:flex font-bold" onClick={handleGuestSignIn}>Demo Gratis</Button>
          <Button onClick={handleGoogleSignIn} className="rounded-full px-6 font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
            Empezar ahora
          </Button>
        </div>
      </nav>

      <main className="pt-40 pb-20 px-6 max-w-7xl mx-auto text-center">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 text-primary text-xs font-black uppercase tracking-widest mb-8 border border-primary/10">
            <Sparkles className="h-3.5 w-3.5" /> La Productividad del Futuro
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[0.95] mb-8 text-slate-900">
            Domina tu tiempo, <br />
            <span className="text-primary italic">con claridad mental.</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-500 font-medium mb-10 leading-relaxed">
            Diseñado específicamente para el cerebro moderno. Desglose de tareas con IA, 
            temporizadores visuales para TDAH y gamificación real.
          </p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <Button size="lg" onClick={handleGoogleSignIn} className="h-16 px-10 rounded-2xl text-lg font-bold gap-3 shadow-xl shadow-primary/25 w-full md:w-auto hover:bg-primary/90 transition-all">
              <LogIn className="h-5 w-5" /> Iniciar con Google
            </Button>
            <Button size="lg" variant="outline" onClick={handleGuestSignIn} className="h-16 px-10 rounded-2xl text-lg font-bold border-2 w-full md:w-auto hover:bg-slate-50">
               Acceso Invitado
            </Button>
          </div>
        </div>

        <section className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <div className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100">
            <h3 className="text-xl font-black mb-4">IA Task Breakdown</h3>
            <p className="text-slate-500 font-medium">Desglosa tareas complejas en pasos accionables de 25 minutos automáticamente.</p>
          </div>
          <div className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100">
            <h3 className="text-xl font-black mb-4">Focus Mode</h3>
            <p className="text-slate-500 font-medium">Bloqueo de distracciones y música ambiental sincronizada para un flujo profundo.</p>
          </div>
          <div className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100">
            <h3 className="text-xl font-black mb-4">Gamificación</h3>
            <p className="text-slate-500 font-medium">Gana puntos, sube de nivel y mantén tu racha de productividad diaria.</p>
          </div>
        </section>
      </main>

      <footer className="py-12 border-t border-slate-100 text-center space-y-3">
        <div className="flex items-center justify-center gap-5 text-sm font-semibold text-slate-500">
          <Link href="/privacy" className="underline-offset-4 hover:underline">
            Politica de Privacidad
          </Link>
          <Link href="/terms" className="underline-offset-4 hover:underline">
            Terminos de Servicio
          </Link>
        </div>
        <p className="text-sm text-slate-400 font-bold">© {new Date().getFullYear()} BluePomodoro. Potenciado por IA para mentes brillantes.</p>
      </footer>
    </div>
  )
}
