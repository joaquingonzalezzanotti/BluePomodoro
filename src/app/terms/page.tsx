"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background p-8 max-w-2xl mx-auto space-y-6">
      <Link href="/">
        <Button variant="ghost" className="gap-2 mb-4">
          <ArrowLeft className="h-4 w-4" /> Volver al Inicio
        </Button>
      </Link>

      <h1 className="text-3xl font-bold tracking-tighter">Terminos de Servicio - BluePomodoro</h1>

      <section className="space-y-4 text-muted-foreground leading-relaxed">
        <p>
          Al usar BluePomodoro, aceptas estos terminos. La aplicacion ofrece herramientas de productividad, integracion
          con Google y almacenamiento de datos para mejorar tu flujo de trabajo.
        </p>

        <h2 className="text-xl font-semibold text-foreground">1. Uso aceptable</h2>
        <p>
          Debes usar la app de forma legal y responsable. No esta permitido intentar vulnerar la seguridad, interferir
          con el servicio o usar la plataforma para actividades ilicitas.
        </p>

        <h2 className="text-xl font-semibold text-foreground">2. Cuenta e integraciones</h2>
        <p>
          Puedes iniciar sesion con Google o como invitado. Si conectas Google Calendar o Google Tasks, autorizas la
          lectura de esos datos segun los permisos solicitados.
        </p>

        <h2 className="text-xl font-semibold text-foreground">3. Disponibilidad del servicio</h2>
        <p>
          Hacemos esfuerzos razonables para mantener la app disponible, pero no garantizamos disponibilidad continua ni
          ausencia total de errores.
        </p>

        <h2 className="text-xl font-semibold text-foreground">4. Limitacion de responsabilidad</h2>
        <p>
          BluePomodoro se provee "tal cual". En la medida permitida por la ley, no somos responsables por perdidas
          indirectas, lucro cesante o danos derivados del uso del servicio.
        </p>

        <h2 className="text-xl font-semibold text-foreground">5. Cambios</h2>
        <p>
          Podemos actualizar estos terminos para reflejar cambios funcionales o legales. Si continas usando la app
          despues de una actualizacion, se considera aceptacion de los nuevos terminos.
        </p>

        <h2 className="text-xl font-semibold text-foreground">6. Contacto</h2>
        <p>
          Para consultas sobre estos terminos, usa los canales de contacto publicados en BluePomodoro.
        </p>
      </section>

      <footer className="pt-10 border-t text-[10px] text-muted-foreground text-center">
        © {new Date().getFullYear()} BluePomodoro. Todos los derechos reservados.
      </footer>
    </div>
  )
}

