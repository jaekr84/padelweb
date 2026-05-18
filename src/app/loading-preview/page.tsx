"use client";

import { useState, useEffect } from "react";
import { PaddleLoading } from "@/components/ui/PaddleLoading";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Play, RotateCcw, Monitor, RefreshCw, Cpu, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function LoadingPreviewPage() {
  const [selectedTheme, setSelectedTheme] = useState<"azul-primary" | "rosa" | "emerald" | "crimson">("azul-primary");
  const [isSimulating, setIsSimulating] = useState(false);
  const [simProgress, setSimProgress] = useState(0);

  // Simulated progress loader increment
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSimulating) {
      interval = setInterval(() => {
        setSimProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              setIsSimulating(false);
              setSimProgress(0);
            }, 1000);
            return 100;
          }
          return prev + 4;
        });
      }, 80);
    }
    return () => clearInterval(interval);
  }, [isSimulating]);

  // CSS mappings for dynamic glow rings based on selection
  const colorMap = {
    "azul-primary": "text-azul-primary shadow-azul-primary/20 bg-azul-primary/10 border-azul-primary/30",
    rosa: "text-[#ff007f] shadow-[#ff007f]/20 bg-[#ff007f]/10 border-[#ff007f]/30",
    emerald: "text-emerald-400 shadow-emerald-500/20 bg-emerald-500/10 border-emerald-500/30",
    crimson: "text-rose-500 shadow-rose-500/20 bg-rose-500/10 border-rose-500/30",
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-azul-primary/30 relative overflow-hidden p-6 md:p-12">
      
      {/* Dynamic Ambient Background Glow based on selected theme */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
        <div className={`absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full blur-[140px] opacity-20 transition-all duration-700 ${
          selectedTheme === "azul-primary" ? "bg-azul-primary" : 
          selectedTheme === "rosa" ? "bg-[#ff007f]" : 
          selectedTheme === "emerald" ? "bg-emerald-500" : "bg-rose-500"
        }`} />
        <div className="absolute bottom-[-15%] right-[-10%] w-[450px] h-[450px] bg-celeste/10 rounded-full blur-[120px] pointer-events-none" />
      </div>

      <div className="w-full max-w-5xl mx-auto space-y-8">
        
        {/* Header HUD Navigation */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[9px] font-black uppercase tracking-[0.4em] text-azul-primary animate-pulse">SYS.PREVIEW // TELEMETRY CONSOLE</span>
              <div className="h-px w-6 bg-azul-primary/30" />
            </div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">
              Cargador <span className="text-celeste">HUD Radar</span>
            </h1>
          </div>
          <div className="flex items-center gap-3 mt-4 md:mt-0">
            <Link
              href="/tournaments"
              className="px-4 py-2 border border-white/10 hover:border-white/20 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all hover:bg-white/5"
            >
              Volver a Torneos
            </Link>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          
          {/* LEFT WIDGET: INTERACTIVE CONFIGURATION PANEL */}
          <div className="bg-slate-900/60 border border-white/5 backdrop-blur-xl rounded-2xl p-6 flex flex-col justify-between space-y-6 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-white/20" />
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-white/20" />

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-white/50 text-[10px] font-black uppercase tracking-wider">
                <Cpu className="w-4 h-4 text-celeste" />
                <span>Panel de Telemetría</span>
              </div>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                Personalizá y probá el cargador en tiempo real. Esta consola simula los comportamientos y flujos de renderizado de la base de datos de PadelWeb.
              </p>

              {/* Theme Toggles */}
              <div className="space-y-2.5">
                <label className="block text-[8px] font-black uppercase tracking-widest text-slate-500">Color del Pulso Neon</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "azul-primary", label: "Celeste / Azul", color: "bg-azul-primary" },
                    { id: "rosa", label: "Rosa / Fucsia", color: "bg-[#ff007f]" },
                    { id: "emerald", label: "Neon Emerald", color: "bg-emerald-500" },
                    { id: "crimson", label: "Neon Crimson", color: "bg-rose-500" },
                  ].map((themeOpt) => (
                    <button
                      key={themeOpt.id}
                      onClick={() => setSelectedTheme(themeOpt.id as any)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-[8.5px] font-black uppercase tracking-wider transition-all duration-300 ${
                        selectedTheme === themeOpt.id
                          ? "bg-white/5 border-white/20 text-white shadow-md shadow-white/5"
                          : "bg-transparent border-white/5 text-slate-500 hover:text-slate-300 hover:border-white/10"
                      }`}
                    >
                      <div className={`w-2.5 h-2.5 rounded-full ${themeOpt.color} shadow-sm`} />
                      {themeOpt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Simulated Action */}
            <div className="pt-4 border-t border-white/5">
              <button
                onClick={() => {
                  setIsSimulating(true);
                  setSimProgress(0);
                }}
                disabled={isSimulating}
                className="w-full py-3 bg-azul-primary hover:bg-azul-dark text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-azul-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Simular Carga de Servidor
              </button>
            </div>
          </div>

          {/* MIDDLE WIDGET: THE Loader Profiles DISPLAY GRID */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Loader Profile: SM */}
            <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 flex flex-col items-center justify-between min-h-[220px] text-center relative group">
              <span className="absolute top-3 left-3 text-[6.5px] font-mono text-white/20 tracking-wider">HUD.PROFILE // SM</span>
              
              <div className="my-auto">
                <PaddleLoading size="sm" className={selectedTheme !== "azul-primary" ? `[--color-azul-primary:var(--color-${selectedTheme})]` : ""} />
              </div>

              <div className="space-y-1 w-full">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-white">Perfil Micro</h4>
                <p className="text-[7.5px] font-bold text-slate-500 uppercase tracking-widest">Para elementos pequeños en tablas e inline</p>
              </div>
            </div>

            {/* Loader Profile: MD */}
            <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 flex flex-col items-center justify-between min-h-[220px] text-center relative group">
              <span className="absolute top-3 left-3 text-[6.5px] font-mono text-white/20 tracking-wider">HUD.PROFILE // MD</span>
              
              <div className="my-auto">
                <PaddleLoading size="md" className={selectedTheme !== "azul-primary" ? `[--color-azul-primary:var(--color-${selectedTheme})]` : ""} />
              </div>

              <div className="space-y-1 w-full">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-white">Perfil Estándar</h4>
                <p className="text-[7.5px] font-bold text-slate-500 uppercase tracking-widest">Para modales, subida de fotos y tarjetas</p>
              </div>
            </div>

            {/* Loader Profile: LG */}
            <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 flex flex-col items-center justify-between min-h-[220px] text-center relative group">
              <span className="absolute top-3 left-3 text-[6.5px] font-mono text-white/20 tracking-wider">HUD.PROFILE // LG</span>
              
              <div className="my-auto">
                <PaddleLoading size="lg" className={selectedTheme !== "azul-primary" ? `[--color-azul-primary:var(--color-${selectedTheme})]` : ""} />
              </div>

              <div className="space-y-1 w-full">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-white">Perfil Terminal</h4>
                <p className="text-[7.5px] font-bold text-slate-500 uppercase tracking-widest">Para booteos globales y transiciones completas</p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* FULL-PAGE OVERLAY SIMULATOR MODAL */}
      <AnimatePresence>
        {isSimulating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900/90 border border-white/10 p-12 rounded-[2.5rem] shadow-2xl flex flex-col items-center gap-8 w-full max-w-md relative overflow-hidden"
            >
              {/* Top Tech Glow */}
              <div className={`absolute -inset-10 opacity-10 blur-[80px] rounded-full pointer-events-none ${
                selectedTheme === "azul-primary" ? "bg-azul-primary" : 
                selectedTheme === "rosa" ? "bg-[#ff007f]" : 
                selectedTheme === "emerald" ? "bg-emerald-500" : "bg-rose-500"
              }`} />

              <div className="relative">
                <PaddleLoading size="lg" className={selectedTheme !== "azul-primary" ? `[--color-azul-primary:var(--color-${selectedTheme})]` : ""} />
              </div>

              <div className="flex flex-col items-center gap-3 relative z-10 w-full">
                <span className="text-[11px] font-black uppercase tracking-[0.25em] text-white">
                  {simProgress < 100 ? "Procesando Telemetría" : "Conexión Establecida"}
                </span>

                {/* Progress bar capsule */}
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    className={`h-full rounded-full ${
                      selectedTheme === "azul-primary" ? "bg-azul-primary" : 
                      selectedTheme === "rosa" ? "bg-[#ff007f]" : 
                      selectedTheme === "emerald" ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                    style={{ width: `${simProgress}%` }}
                    layoutId="progress"
                  />
                </div>

                <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-slate-500">
                  {simProgress < 100 ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin text-celeste" />
                      <span>Progreso: {simProgress}%</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3 h-3 text-emerald-400 animate-bounce" />
                      <span className="text-emerald-400">100% Sincronizado</span>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
