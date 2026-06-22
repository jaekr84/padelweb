"use client";

import { motion } from "framer-motion";
import { Trophy, UserCheck, Zap } from "lucide-react";

interface Qualifier {
    playerId: string;
    name: string;
    groupName: string;
    groupRank: number;
    isPlaceholder: boolean;
    matchesPlayed?: number;
    won?: number;
    lost?: number;
    points?: number;
}

interface TournamentQualifiersViewProps {
    finalQualifiers: any[];
    qualLimit: number;
}

export function TournamentQualifiersView({ finalQualifiers, qualLimit }: TournamentQualifiersViewProps) {
    if (finalQualifiers.length === 0) return null;

    const advancingIds = finalQualifiers.slice(0, qualLimit).map(x => x.playerId);

    // Group by rank
    const ranks = Array.from(new Set(finalQualifiers.map(q => q.groupRank))).sort((a, b) => a - b);

    return (
        <section
            className="relative rounded-2xl p-5 overflow-hidden border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_24px_60px_-24px_rgba(0,0,0,0.6)] space-y-4"
            style={{ background: "radial-gradient(130% 95% at 50% -10%, #1b2942 0%, #0d1526 45%, #060a13 100%)" }}
        >
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.05]"
                style={{
                    backgroundImage: "linear-gradient(rgba(148,163,184,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.6) 1px, transparent 1px)",
                    backgroundSize: "26px 26px",
                }}
            />

            <div className="relative text-center">
                <h3 className="text-sm md:text-base font-black text-white tracking-tighter uppercase italic">Posiciones por Grupo</h3>
                <p className="text-cyan-400 text-[7px] font-black uppercase tracking-[0.25em]">Clasificación general de todos los participantes</p>
            </div>

            <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ranks.map((rank) => {
                    const playersInRank = finalQualifiers.filter(q => q.groupRank === rank);
                    if (playersInRank.length === 0) return null;

                    const isAdvancingRank = rank === 1; // Simplify header for now, or we can make it more complex
                    const color = rank === 1 ? 'emerald' : 'slate';
                    const Icon = rank === 1 ? Trophy : UserCheck;

                    return (
                        <div key={rank} className="space-y-3">
                            <div className="flex items-center gap-2 px-1">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                                    isAdvancingRank ? 'bg-emerald-500/20' :
                                    'bg-white/5'
                                }`}>
                                    <Icon className={`w-3 h-3 ${
                                        isAdvancingRank ? 'text-emerald-400' :
                                        'text-slate-500'
                                    }`} />
                                </div>
                                <div className="flex flex-col">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-200 leading-tight">
                                        {rank}º Puestos
                                    </h4>
                                    {isAdvancingRank && (
                                        <span className="text-[6px] font-black text-emerald-500 uppercase tracking-tighter -mt-0.5">Clasifica a Playoffs</span>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-1.5">
                                {playersInRank.map((q, idx) => {
                                    const isAdvancing = advancingIds.includes(q.playerId);
                                    
                                    return (
                                        <QualifierCard 
                                            key={`${q.playerId}-${idx}`} 
                                            q={q} 
                                            idx={idx} 
                                            color={isAdvancing ? 'emerald' : 'slate'} 
                                            isAdvancing={isAdvancing} 
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

function QualifierCard({ q, idx, color, isAdvancing }: { q: Qualifier; idx: number; color: 'emerald' | 'azul' | 'slate'; isAdvancing: boolean }) {
    const isEmerald = color === 'emerald';

    return (
        <div
            className="flex items-center justify-between p-2 rounded-xl border transition-all shadow-lg group"
            style={{
                background: isAdvancing
                    ? "linear-gradient(155deg, rgba(16,185,129,0.12) 0%, #0f1420 100%)"
                    : "linear-gradient(155deg, #1b2536 0%, #0f1420 100%)",
                borderColor: isAdvancing ? "rgba(16,185,129,0.35)" : "rgba(255,255,255,0.10)",
            }}
        >
            <div className="flex items-center gap-3 min-w-0">
                <span className={`text-[8px] font-black ${isEmerald ? 'text-emerald-400/60' : 'text-cyan-400/50'} w-4 italic`}>#{idx + 1}</span>
                <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase tracking-tight truncate ${q.isPlaceholder ? "text-slate-500 italic" : "text-white"}`}>
                            {q.name}
                        </span>
                        {isAdvancing && !q.isPlaceholder && (
                            <span className="text-[6px] font-black px-1 py-0.5 rounded-sm bg-emerald-500 text-white uppercase tracking-tighter shadow-sm shadow-emerald-500/30">
                                CLASIFICA
                            </span>
                        )}
                    </div>
                    <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">
                        {q.isPlaceholder ? "Pendiente" : q.groupName}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-2 pr-1">
                <StatItem label="PJ" value={q.matchesPlayed} />
                <StatItem label="PG" value={q.won} color={isEmerald ? 'emerald' : 'cyan'} />
                <StatItem label="PP" value={q.lost} color="rose" />
                <div className="flex flex-col items-center min-w-[20px] ml-1 px-1.5 py-0.5 rounded-md bg-cyan-400/10 border border-cyan-400/20">
                    <span className="text-[6px] font-bold text-cyan-400/50 uppercase">PTS</span>
                    <span className="text-[9px] font-black text-cyan-300">{q.points || 0}</span>
                </div>
                {q.isPlaceholder && (
                    <Zap className="w-2.5 h-2.5 text-amber-400/50 animate-pulse ml-1" />
                )}
            </div>
        </div>
    );
}

function StatItem({ label, value, color }: { label: string; value?: number; color?: 'emerald' | 'cyan' | 'rose' }) {
    let textColor = "text-slate-300";
    if (color === 'emerald') textColor = "text-emerald-400";
    if (color === 'cyan') textColor = "text-cyan-400";
    if (color === 'rose') textColor = "text-rose-400";

    return (
        <div className="flex flex-col items-center min-w-[18px]">
            <span className="text-[6px] font-bold text-slate-500 uppercase">{label}</span>
            <span className={`text-[9px] font-black ${textColor}`}>{value || 0}</span>
        </div>
    );
}
