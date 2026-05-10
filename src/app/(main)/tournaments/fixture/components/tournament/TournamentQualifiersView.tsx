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
    finalQualifiers: Qualifier[];
}

export function TournamentQualifiersView({ finalQualifiers }: TournamentQualifiersViewProps) {
    const firsts = finalQualifiers.filter(q => q.groupRank === 1);
    const seconds = finalQualifiers.filter(q => q.groupRank === 2);

    if (finalQualifiers.length === 0) return null;

    return (
        <section className="space-y-4 pt-6 border-t border-border/40">
            <div className="text-center">
                <h3 className="text-sm md:text-base font-black text-foreground tracking-tighter uppercase italic">Proyección de Clasificados</h3>
                <p className="text-azul-primary text-[7px] font-black uppercase tracking-[0.25em]">Posiciones actuales para Playoffs</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1º Puestos */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
                            <Trophy className="w-3 h-3 text-emerald-600" />
                        </div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground/80">1º Puestos</h4>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5">
                        {firsts.map((q, idx) => (
                            <QualifierCard key={q.playerId} q={q} idx={idx} color="emerald" />
                        ))}
                    </div>
                </div>

                {/* 2º Puestos */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                        <div className="w-5 h-5 rounded-full bg-azul-primary/10 flex items-center justify-center">
                            <UserCheck className="w-3 h-3 text-azul-primary" />
                        </div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground/80">2º Puestos</h4>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5">
                        {seconds.map((q, idx) => (
                            <QualifierCard key={q.playerId} q={q} idx={idx} color="azul" />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

function QualifierCard({ q, idx, color }: { q: Qualifier; idx: number; color: 'emerald' | 'azul' }) {
    const isEmerald = color === 'emerald';
    
    return (
        <div className={`flex items-center justify-between p-2 rounded-xl bg-card/40 border border-border/40 hover:border-${isEmerald ? 'emerald' : 'azul'}-500/30 transition-all shadow-sm group`}>
            <div className="flex items-center gap-3 min-w-0">
                <span className={`text-[8px] font-black ${isEmerald ? 'text-emerald-600/40' : 'text-azul-primary/40'} w-4 italic`}>#{idx + 1}</span>
                <div className="flex flex-col min-w-0">
                    <span className={`text-[10px] font-black uppercase tracking-tight truncate ${q.isPlaceholder ? "text-foreground/40 italic" : "text-foreground"}`}>
                        {q.name}
                    </span>
                    <span className="text-[7px] font-bold text-azul-primary/40 uppercase tracking-widest">
                        {q.isPlaceholder ? "Pendiente" : q.groupName}
                    </span>
                </div>
            </div>
            
            <div className="flex items-center gap-2 pr-1">
                <StatItem label="PJ" value={q.matchesPlayed} />
                <StatItem label="PG" value={q.won} color={isEmerald ? 'emerald' : 'azul'} />
                <StatItem label="PP" value={q.lost} color="rose" />
                <div className="flex flex-col items-center min-w-[20px] ml-1 px-1.5 py-0.5 rounded-md bg-azul-primary/5 border border-azul-primary/10">
                    <span className="text-[6px] font-bold text-azul-primary/40 uppercase">PTS</span>
                    <span className="text-[9px] font-black text-azul-primary">{q.points || 0}</span>
                </div>
                {q.isPlaceholder && (
                    <Zap className="w-2.5 h-2.5 text-amber-500/40 animate-pulse ml-1" />
                )}
            </div>
        </div>
    );
}

function StatItem({ label, value, color }: { label: string; value?: number; color?: 'emerald' | 'azul' | 'rose' }) {
    let textColor = "text-foreground/60";
    if (color === 'emerald') textColor = "text-emerald-500/60";
    if (color === 'azul') textColor = "text-azul-primary/60";
    if (color === 'rose') textColor = "text-rose-500/60";

    return (
        <div className="flex flex-col items-center min-w-[18px]">
            <span className="text-[6px] font-bold text-foreground/30 uppercase">{label}</span>
            <span className={`text-[9px] font-black ${textColor}`}>{value || 0}</span>
        </div>
    );
}
