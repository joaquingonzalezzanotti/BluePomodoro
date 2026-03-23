
"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background p-8 max-w-2xl mx-auto space-y-6">
      <Link href="/">
        <Button variant="ghost" className="gap-2 mb-4">
          <ArrowLeft className="h-4 w-4" /> Volver al Inicio
        </Button>
      </Link>
      
      <h1 className="text-3xl font-bold tracking-tighter">Política de Privacidad - BluePomodoro</h1>
      
      <section className="space-y-4 text-muted-foreground leading-relaxed">
        <p>
          En BluePomodoro, valoramos tu privacidad. Esta aplicación utiliza los servicios de Google (OAuth) para permitirte iniciar sesión y sincronizar tus tareas y calendario de forma segura.
        </p>
        
        <h2 className="text-xl font-semibold text-foreground">1. Datos que recolectamos</h2>
        <p>
          Solo accedemos a tu nombre, correo electrónico y foto de perfil a través de Google para crear tu cuenta. Si habilitas la sincronización, accederemos a tus eventos de Google Calendar y tareas de Google Tasks únicamente para mostrarlos dentro de la aplicación.
        </p>
        
        <h2 className="text-xl font-semibold text-foreground">2. Uso de los datos</h2>
        <p>
          Tus datos se almacenan de forma segura en Supabase (PostgreSQL) y no se comparten con terceros con fines comerciales. Los datos de Google Calendar y Google Tasks se consultan desde nuestro backend como puente de integracion para sincronizar tu cuenta de forma segura.
        </p>
        
        <h2 className="text-xl font-semibold text-foreground">3. Control del usuario</h2>
        <p>
          Puedes revocar el acceso de BluePomodoro a tu cuenta de Google en cualquier momento desde la configuración de seguridad de tu cuenta de Google.
        </p>
      </section>

      <footer className="pt-10 border-t text-[10px] text-muted-foreground text-center">
        © 2025 BluePomodoro. Todos los derechos reservados.
      </footer>
    </div>
  )
}
