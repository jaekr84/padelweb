"use client";

import { motion } from "framer-motion";

interface PaddleLoadingProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function PaddleLoading({ size = "md", className = "" }: PaddleLoadingProps) {
  // Dimensional metrics mapped for High Density alignments
  const sizeMap = {
    sm: {
      container: "w-24 h-24",
      logo: "w-10 h-10",
      outerRing: "w-16 h-16",
      techGlow: "w-18 h-18",
    },
    md: {
      container: "w-40 h-40",
      logo: "w-18 h-18",
      outerRing: "w-28 h-28",
      techGlow: "w-32 h-32",
    },
    lg: {
      container: "w-56 h-56",
      logo: "w-28 h-28",
      outerRing: "w-44 h-44",
      techGlow: "w-48 h-48",
    },
  };

  return (
    <div className={`relative flex flex-col items-center justify-center ${sizeMap[size].container} ${className}`}>
      
      {/* 1. PULSING CYBERNETIC BACKDROP GLOW */}
      <div className={`absolute ${sizeMap[size].techGlow} rounded-full bg-azul-primary/10 blur-[30px] animate-pulse pointer-events-none`} />

      {/* 2. DYNAMIC CORNER HUD BRACKETS */}
      {size !== "sm" && (
        <div className="absolute inset-0 pointer-events-none opacity-40">
          {/* Top Left Bracket */}
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-azul-primary/40 rounded-tl-[3px]" />
          {/* Top Right Bracket */}
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-azul-primary/40 rounded-tr-[3px]" />
          {/* Bottom Left Bracket */}
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-azul-primary/40 rounded-bl-[3px]" />
          {/* Bottom Right Bracket */}
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-azul-primary/40 rounded-br-[3px]" />
        </div>
      )}

      {/* 3. DENSE CONCENTRIC SPATIAL RINGS */}
      <div className="relative flex items-center justify-center w-full h-full">
        
        {/* Sweeping Diagnostic Scanner Ring (High-Tech Sweep) */}
        <motion.div
          className={`absolute ${sizeMap[size].outerRing} rounded-full border border-dashed border-azul-primary/20`}
          animate={{ rotate: 360 }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        />

        {/* Outer Tech Sweep Glow Ring */}
        <motion.div
          className={`absolute ${sizeMap[size].outerRing} rounded-full border border-t-2 border-r-2 border-b-transparent border-l-transparent border-celeste shadow-[0_0_15px_rgba(56,189,248,0.2)]`}
          animate={{ rotate: -360 }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
        />

        {/* Inner Tech Ring (Reverse Fast sweep) */}
        <motion.div
          className={`absolute ${sizeMap[size].logo} rounded-full border-2 border-t-transparent border-r-transparent border-b-2 border-l-transparent border-azul-primary opacity-60`}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        />

        {/* 4. THE CORE LOGO CONTAINER (CLIPPED & NEON RING) */}
        <div className={`relative ${sizeMap[size].logo} rounded-full overflow-hidden border border-white/10 bg-slate-950 p-[3px] shadow-[0_0_20px_rgba(var(--color-azul-primary),0.3)] z-10 group`}>
          <div className="w-full h-full rounded-full overflow-hidden relative bg-slate-900 border border-white/5 flex items-center justify-center">
            {/* The Logo Image */}
            <img
              src="/img/stickers 1.jpg"
              alt="A.C.A.P. Sticker Logo"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 rounded-full"
            />
            {/* Glossy overlay sheen */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/15 pointer-events-none" />
          </div>
        </div>

        {/* Dynamic telemetry diagnostic values positioned inside card */}
        {size === "lg" && (
          <div className="absolute bottom-1 text-[6.5px] font-black text-azul-primary/45 uppercase tracking-[0.2em] font-mono leading-none animate-pulse">
            DIAG.SYS // CONNECTING
          </div>
        )}
      </div>
    </div>
  );
}
