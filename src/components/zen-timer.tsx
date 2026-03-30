"use client"

import * as React from "react"
import { Play, Pause } from "lucide-react"
import { cn } from "@/lib/utils"

interface ZenTimerProps {
  timeLeft: number
  isActive: boolean
  mode: "work" | "break"
  toggleTimer: () => void
}

export function ZenTimer({
  timeLeft,
  isActive,
  toggleTimer,
  mode
}: ZenTimerProps) {
  
  const formatTime = (seconds: number) => {
    const isNegative = seconds < 0
    const abs = Math.abs(seconds)
    const mins = Math.floor(abs / 60)
    const secs = abs % 60
    return {
      minutes: mins.toString().padStart(2, "0"),
      seconds: secs.toString().padStart(2, "0"),
      isNegative
    }
  }

  const { minutes, seconds, isNegative } = formatTime(timeLeft)

  return (
    <div className="flex flex-col items-center justify-center w-full h-full -mt-24 text-slate-900 relative font-mono select-none overflow-hidden">
      
      {/* Container de los "Flip Blocks" en LIGHT mode */}
      <div className="flex items-center gap-4 md:gap-8 mb-16 relative z-10 w-full max-w-[90vw] md:max-w-4xl px-4 justify-center">
        
        {/* Bloque Minutos */}
        <div className="relative bg-white rounded-[2rem] md:rounded-[4rem] w-full aspect-square max-w-[35vw] flex items-center justify-center overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-100">
          <span className="text-[30vw] md:text-[20rem] font-black tracking-tighter text-slate-800 relative z-10 leading-none">
            {isNegative ? "-" : ""}{minutes}
          </span>
          {/* Línea divisoria central estilo Flip Clock */}
          <div className="absolute top-1/2 left-0 w-full h-[2px] md:h-[4px] bg-slate-50 -translate-y-1/2 z-20" />
        </div>

        {/* Bloque Segundos */}
        <div className="relative bg-white rounded-[2rem] md:rounded-[4rem] w-full aspect-square max-w-[35vw] flex items-center justify-center overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-100">
          <span className="text-[30vw] md:text-[20rem] font-black tracking-tighter text-slate-800 relative z-10 leading-none">
            {seconds}
          </span>
          {/* Línea divisoria central estilo Flip Clock */}
          <div className="absolute top-1/2 left-0 w-full h-[2px] md:h-[4px] bg-slate-50 -translate-y-1/2 z-20" />
        </div>
        
      </div>

      {/* Control Play/Pause minimalista */}
      <button 
        onClick={toggleTimer}
        className={cn(
          "w-14 h-14 md:w-20 md:h-20 rounded-full bg-slate-900 text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-10 shadow-xl",
          mode === "break" && "shadow-emerald-500/20 bg-emerald-500"
        )}
      >
        {isActive ? (
          <Pause className="w-6 h-6 md:w-8 md:h-8 fill-current" />
        ) : (
          <Play className="w-6 h-6 md:w-8 md:h-8 fill-current ml-1" />
        )}
      </button>

      {/* Detalle súper sutil del modo activo */}
      <div className="absolute bottom-8 opacity-40 text-[10px] tracking-[0.5em] font-black uppercase text-slate-500 font-sans">
        {mode === "work" ? "Enfoque" : "Descanso"}
      </div>

    </div>
  )
}
