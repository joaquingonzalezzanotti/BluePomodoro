"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background p-8 max-w-2xl mx-auto space-y-6">
      <Link href="/">
        <Button variant="ghost" className="gap-2 mb-4">
          <ArrowLeft className="h-4 w-4" /> Volver al Inicio
        </Button>
      </Link>

      <h1 className="text-3xl font-bold tracking-tighter">Politica de Privacidad - BluePomodoro</h1>

      <section className="space-y-4 text-muted-foreground leading-relaxed">
        <p>
          En BluePomodoro, valoramos tu privacidad. Esta aplicacion utiliza servicios de Google (OAuth) para permitir
          inicio de sesion y sincronizacion de tareas/calendario.
        </p>

        <h2 className="text-xl font-semibold text-foreground">1. Datos que recolectamos</h2>
        <p>
          Accedemos a nombre, correo y foto de perfil para crear tu cuenta. Si activas sincronizacion, leemos eventos
          de Google Calendar y tareas de Google Tasks con permisos de solo lectura.
        </p>

        <h2 className="text-xl font-semibold text-foreground">2. Uso de los datos</h2>
        <p>
          Tus datos se almacenan en Supabase (PostgreSQL) y no se comparten con terceros con fines comerciales. Los
          datos de Google se consultan mediante nuestro backend como puente de integracion.
        </p>

        <h2 className="text-xl font-semibold text-foreground">3. Control del usuario</h2>
        <p>
          Puedes revocar el acceso de BluePomodoro desde la configuracion de seguridad de tu cuenta de Google en
          cualquier momento.
        </p>
      </section>

      <footer className="pt-10 border-t text-[10px] text-muted-foreground text-center space-y-2">
        <div className="text-xs">
          <Link href="/terms" className="underline-offset-4 hover:underline">
            Ver Terminos de Servicio
          </Link>
        </div>
        © {new Date().getFullYear()} BluePomodoro. Todos los derechos reservados.
      </footer>
    </div>
  )
}

