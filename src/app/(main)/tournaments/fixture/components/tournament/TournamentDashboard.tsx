"use client";

import { Dice5 } from "lucide-react";

interface TournamentDashboardProps {
    readOnly: boolean;
    progressPercent: number;
    confirmedGroupMatches: number;
    totalGroupMatches: number;
    handleSimulateResults: () => void;
}

export function TournamentDashboard({
    readOnly,
    progressPercent,
    confirmedGroupMatches,
    totalGroupMatches,
    handleSimulateResults
}: TournamentDashboardProps) {
    return (
        <section className="space-y-4">

            {/* Progress Bar */}
            <div className="space-y-2 max-w-4xl mx-auto">
                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-400">
                    <span>Estado de la Fase</span>
                    <div className="flex items-center gap-3">
                        {!readOnly && progressPercent < 100 && (
                            <button
                                onClick={handleSimulateResults}
                                className="flex items-center gap-1.5 px-2 py-0.5 bg-celeste/10 hover:bg-celeste/20 text-celeste border border-celeste/40 rounded-md text-[8px] font-black tracking-widest transition-all group"
                            >
                                <Dice5 className="w-2.5 h-2.5 group-hover:rotate-12 transition-transform" />
                                Simular Restante
                            </button>
                        )}
                        <span>{confirmedGroupMatches} / {totalGroupMatches} Partidos</span>
                    </div>
                </div>
                <div className="h-3 bg-black/40 rounded-full border border-white/12 overflow-hidden p-0.5">
                    <div
                        className="h-full bg-gradient-to-r from-celeste to-volt rounded-full transition-all duration-1000 relative shadow-[0_0_15px_rgba(212,255,63,0.35)]"
                        style={{ width: `${progressPercent}%` }}
                    >
                        {progressPercent > 5 && (
                            <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[move-bg_1s_linear_infinite]" />
                        )}
                    </div>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-volt italic tracking-tight">{progressPercent}% COMPLETADO</span>
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                        {progressPercent === 100 ? "Fase Finalizada" : "En Desarrollo"}
                    </span>
                </div>
            </div>
        </section>
    );
}
