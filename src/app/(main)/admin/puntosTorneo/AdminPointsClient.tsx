"use client";

import { useState } from "react";
import { updateTournamentPointsConfig, updateClubTournamentLimits } from "@/lib/settings-actions";
import { Trophy, Save, Shield, Settings2, Target, Users, Zap, Star, Activity, Info, Infinity } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function AdminPointsClient({ 
    initialPoints, 
    initialLimits 
}: { 
    initialPoints: any, 
    initialLimits: { openLimit: number, closedLimit: number } 
}) {
    const [points, setPoints] = useState(initialPoints);
    const [limits, setLimits] = useState(initialLimits);
    const [isSaving, setIsSaving] = useState(false);

    const handleSavePoints = async () => {
        setIsSaving(true);
        try {
            const res = await updateTournamentPointsConfig(points);
            if (res.ok) toast.success("Configuración de puntos actualizada");
            else throw new Error(res.error);
        } catch (err: any) {
            toast.error(err.message || "Error al guardar");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveLimits = async () => {
        setIsSaving(true);
        try {
            const res = await updateClubTournamentLimits(limits);
            if (res.ok) toast.success("Límites de torneos actualizados");
            else throw new Error(res.error);
        } catch (err: any) {
            toast.error(err.message || "Error al guardar");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-4 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* Header */}
            <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-azul-primary/10 border border-azul-primary/20 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-azul-primary" />
                    </div>
                    <div>
                        <span className="text-[9px] font-black uppercase tracking-[0.4em] text-azul-primary/60 italic leading-none block mb-1">Admin Tactical Console</span>
                        <h1 className="text-xl md:text-2xl heading-sport text-white leading-none">
                            Control Global de Torneos
                        </h1>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Points Configuration Card */}
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-carbon-800/40 border border-white/10 rounded-xl p-5 backdrop-blur-sm shadow-sm space-y-5"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                                <Trophy className="w-4 h-4 text-amber-500" />
                            </div>
                            <h2 className="text-sm font-black uppercase italic tracking-tight">Sistema de Puntos</h2>
                        </div>
                        <button
                            onClick={handleSavePoints}
                            disabled={isSaving}
                            className="bg-azul-primary hover:bg-azul-primary/90 text-white px-4 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                        >
                            {isSaving ? <Activity className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                            GUARDAR
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                            { id: "winner", label: "Campeón", icon: Trophy, color: "text-amber-500" },
                            { id: "finalist", label: "Finalista", icon: Star, color: "text-slate-400" },
                            { id: "semi", label: "Semifinal", icon: Target, color: "text-celeste" },
                            { id: "quarter", label: "Cuartos", icon: LayoutGrid, color: "text-celeste" },
                            { id: "octavos", label: "Octavos", icon: Zap, color: "text-celeste" },
                            { id: "groupMatchWin", label: "Victoria en Zona", icon: Activity, color: "text-celeste" },
                            { id: "participation", label: "Asistencia", icon: Users, color: "text-celeste" },
                        ].map((item: any) => (
                            <div key={item.id} className="space-y-1.5">
                                <div className="flex items-center gap-2 ml-0.5">
                                    <item.icon className={`w-2.5 h-2.5 ${item.color}`} />
                                    <label className="text-[8px] font-black uppercase tracking-widest text-slate-400/80">
                                        {item.label}
                                    </label>
                                </div>
                                <input
                                    type="number"
                                    value={points[item.id]}
                                    onChange={(e) => setPoints({ ...points, [item.id]: Number(e.target.value) })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white font-black text-sm italic outline-none focus:ring-1 focus:ring-azul-primary transition-all"
                                />
                            </div>
                        ))}
                    </div>

                    <div className="bg-azul-primary/[0.03] border border-azul-primary/10 rounded-xl p-3 flex gap-2.5 italic">
                        <Info className="w-4 h-4 text-azul-primary shrink-0 mt-0.5" />
                        <p className="text-[8px] text-azul-primary/70 leading-relaxed font-black uppercase tracking-tight">
                            INFRAESTRUCTURA DE PUNTOS: ESTOS VALORES SE APLICAN A TODOS LOS TORNEOS NUEVOS PARA GARANTIZAR LA INTEGRIDAD DEL RANKING CENTRALIZADO.
                        </p>
                    </div>
                </motion.div>

                {/* Limits Configuration Card */}
                <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-carbon-800/40 border border-white/10 rounded-xl p-5 backdrop-blur-sm shadow-sm space-y-5 h-fit"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-azul-primary/10 border border-azul-primary/20 flex items-center justify-center">
                                <Settings2 className="w-4 h-4 text-azul-primary" />
                            </div>
                            <h2 className="text-sm font-black uppercase italic tracking-tight">Límites de Clubes</h2>
                        </div>
                        <button
                            onClick={handleSaveLimits}
                            disabled={isSaving}
                            className="bg-azul-primary hover:bg-azul-primary/90 text-white px-4 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                        >
                            {isSaving ? <Activity className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                            GUARDAR
                        </button>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-0.5">
                                    Torneos Abiertos / Club
                                </label>
                                <span className="text-[7px] font-black text-azul-primary bg-azul-primary/10 px-1.5 py-0.5 rounded border border-azul-primary/20">
                                    PÚBLICOS
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1 group">
                                    <input
                                        type="number"
                                        value={limits.openLimit === -1 ? "" : limits.openLimit}
                                        disabled={limits.openLimit === -1}
                                        onChange={(e) => setLimits({ ...limits, openLimit: Number(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-4 text-white font-black text-xl italic outline-none focus:ring-1 focus:ring-azul-primary transition-all disabled:opacity-50"
                                        placeholder={limits.openLimit === -1 ? "∞" : "0"}
                                    />
                                    {limits.openLimit === -1 && (
                                        <div className="absolute inset-0 flex items-center px-4 pointer-events-none">
                                            <span className="text-2xl font-black text-azul-primary italic">∞</span>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => setLimits({ ...limits, openLimit: limits.openLimit === -1 ? 3 : -1 })}
                                    className={`px-4 py-2.5 rounded-lg font-black text-[8px] uppercase tracking-widest transition-all active:scale-95 border ${
                                        limits.openLimit === -1 
                                            ? "bg-azul-primary text-white border-azul-primary shadow-sm" 
                                            : "bg-white/5 text-slate-400 border-white/10 hover:border-azul-primary/40"
                                    }`}
                                >
                                    {limits.openLimit === -1 ? "Ilimitado" : "Sin Límite"}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2 pt-4 border-t border-white/10">
                            <div className="flex items-center justify-between">
                                <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-0.5">
                                    Torneos Cerrados / Club
                                </label>
                                <span className="text-[7px] font-black text-purple-500 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                                    EXCLUSIVOS
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1 group">
                                    <input
                                        type="number"
                                        value={limits.closedLimit === -1 ? "" : limits.closedLimit}
                                        disabled={limits.closedLimit === -1}
                                        onChange={(e) => setLimits({ ...limits, closedLimit: Number(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-4 text-white font-black text-xl italic outline-none focus:ring-1 focus:ring-azul-primary transition-all disabled:opacity-50"
                                        placeholder={limits.closedLimit === -1 ? "∞" : "0"}
                                    />
                                    {limits.closedLimit === -1 && (
                                        <div className="absolute inset-0 flex items-center px-4 pointer-events-none">
                                            <span className="text-2xl font-black text-purple-500 italic">∞</span>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => setLimits({ ...limits, closedLimit: limits.closedLimit === -1 ? 3 : -1 })}
                                    className={`px-4 py-2.5 rounded-lg font-black text-[8px] uppercase tracking-widest transition-all active:scale-95 border ${
                                        limits.closedLimit === -1 
                                            ? "bg-purple-500 text-white border-purple-500 shadow-sm" 
                                            : "bg-white/5 text-slate-400 border-white/10 hover:border-purple-500/40"
                                    }`}
                                >
                                    {limits.closedLimit === -1 ? "Ilimitado" : "Sin Límite"}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 rounded-xl bg-azul-primary text-white shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                            <Shield className="w-12 h-12" />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-[9px] font-black uppercase tracking-widest mb-0.5 opacity-80">Estado del Sistema</h3>
                            <p className="text-sm font-black italic uppercase tracking-tight leading-tight">
                                Restricciones activas.
                            </p>
                        </div>
                    </div>
                </motion.div>

            </div>

        </div>
    );
}

function LayoutGrid(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect width="7" height="7" x="3" y="3" rx="1" />
            <rect width="7" height="7" x="14" y="3" rx="1" />
            <rect width="7" height="7" x="14" y="14" rx="1" />
            <rect width="7" height="7" x="3" y="14" rx="1" />
        </svg>
    )
}
