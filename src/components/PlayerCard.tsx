import React from 'react';
import Image from 'next/image';
import { Trophy, User, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

interface PlayerCardProps {
    player: {
        firstName: string;
        lastName: string;
        imageUrl?: string | null;
        category?: string;
        side?: string;
        points?: number;
        clubName?: string | null;
        gender?: string | null;
        rank?: number;
    };
    stats: {
        pj: number;
        pg: number;
        pp: number;
        pe?: number;
        wr: number;
        trofeos: number;
        subcampeonatos?: number;
    };
    isCurrentUser?: boolean;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player, stats, isCurrentUser }) => {
    const isFemale = player.gender === 'femenino';

    // Theme Colors
    const theme = {
        primary: isCurrentUser ? 'rojo' : isFemale ? 'rojo' : 'azul-primary',
        accent: isCurrentUser ? 'rojo' : isFemale ? 'rosa' : 'celeste',
        gradient: isCurrentUser ? 'from-rojo via-red-500 to-rojo' : isFemale ? 'from-rojo via-rosa to-rojo' : 'from-azul-primary via-celeste to-azul-primary',
        shadow: isCurrentUser ? 'shadow-[0_0_40px_rgba(239,68,68,0.45)] border-red-500' : isFemale ? 'shadow-[0_0_40px_rgba(239,68,68,0.3)]' : 'shadow-[0_0_40px_rgba(0,119,255,0.3)]',
        accentShadow: isCurrentUser ? 'shadow-[0_0_15px_rgba(239,68,68,0.5)]' : isFemale ? 'shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'shadow-[0_0_15px_rgba(30,64,175,0.5)]',
        glow: isCurrentUser ? 'bg-red-500/40' : isFemale ? 'bg-rojo/40' : 'bg-azul-primary/40',
        ribbonGradient: isCurrentUser
            ? 'from-red-500/90 via-red-500/40 to-transparent'
            : isFemale
                ? 'from-rojo/90 via-rojo/40 to-transparent'
                : 'from-azul-primary/90 via-azul-primary/40 to-transparent',
        ribbonBorder: isCurrentUser ? 'border-red-400' : isFemale ? 'border-rosa' : 'border-celeste',
        trophyShadow: isCurrentUser ? 'drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]' : isFemale ? 'drop-shadow-[0_0_8px_rgba(251,113,133,0.6)]' : 'drop-shadow-[0_0_8px_rgba(14,165,233,0.6)]',
        cardBg: isCurrentUser ? '#0a0102' : isFemale ? '#0d0102' : '#030712',
        statsBg: isCurrentUser ? 'from-[#2a0809] via-[#150405]' : isFemale ? 'from-[#2d0a0b] via-[#1a0506]' : 'from-slate-950 via-slate-900',
        statBoxBg: isCurrentUser ? 'bg-rojo border-rojo' : isFemale ? 'bg-rojo border-rojo' : 'bg-azul-primary border-azul-primary'
    };

    const sideLabel = player.side === 'reves' ? 'REVÉS' : player.side === 'drive' ? 'DRIVE' : 'AMBOS';

    const rankGradient = player.rank === 1
        ? 'from-yellow-300 via-yellow-400 to-amber-500'
        : player.rank === 2
            ? 'from-slate-200 via-slate-350 to-slate-450'
            : player.rank === 3
                ? 'from-amber-600 via-amber-700 to-amber-900'
                : isFemale
                    ? 'from-rosa to-rojo'
                    : 'from-white to-celeste';

    const rankGlow = player.rank === 1
        ? 'bg-yellow-500/40'
        : player.rank === 2
            ? 'bg-slate-400/30'
            : player.rank === 3
                ? 'bg-amber-700/30'
                : theme.glow;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex justify-center mb-8"
        >
            <div className="relative group">
                {/* BORDE CON DEGRADADO DINÁMICO */}
                <div className={`relative w-[340px] h-[520px] bg-gradient-to-br ${theme.gradient} p-[3px] ${theme.shadow} transition-all duration-500`}
                    style={{ clipPath: 'polygon(12% 0, 100% 0, 100% 88%, 88% 100%, 0 100%, 0 12%)' }}>

                    <div className="relative w-full h-full overflow-hidden"
                        style={{
                            backgroundColor: theme.cardBg,
                            clipPath: 'polygon(12% 0, 100% 0, 100% 88%, 88% 100%, 0 100%, 0 12%)'
                        }}>

                        {/* 1. BRANDING CORPORATIVO Y PUESTO */}
                        <div className="absolute top-[20px] left-[45px] z-40 flex flex-col items-start">
                            {player.rank ? (
                                <>
                                    <span className={`text-[60px] font-black italic leading-[0.9] py-1 text-transparent bg-clip-text bg-gradient-to-b ${rankGradient} drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]`}>
                                        #{player.rank}
                                    </span>
                                    <span className="text-[12px] font-black italic text-foreground/90 tracking-[0.22em] uppercase mt-1 block leading-none">
                                        A.C.A.P.
                                    </span>
                                </>
                            ) : (
                                <div className="flex flex-col justify-center mt-2">
                                    <span className="text-lg font-black italic text-foreground leading-none tracking-tighter">
                                        A.C.A.P.<span className={isFemale ? "text-rosa" : "text-celeste"}></span>
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* 2. SECTOR SUPERIOR DERECHA: CATEGORÍA */}
                        <div className="absolute top-0 right-0 p-6 z-40">
                            <div className="flex flex-col items-end">
                                <div className="relative">
                                    <div className={`absolute -inset-2 ${theme.glow} blur-md rounded-full -z-10`} />
                                    <span className={`text-6xl font-black italic leading-[0.8] text-transparent bg-clip-text bg-gradient-to-b ${isFemale ? 'from-rosa to-rojo' : 'from-white to-celeste'} drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]`}>
                                        {player.category || '4TA'}
                                    </span>
                                </div>

                                {/* Label de Lado Corporativo */}
                                <div className={`mt-2 bg-${theme.primary} px-2 py-0.5 rounded-sm transform skew-x-[-15deg] ${theme.accentShadow} border border-${theme.accent}/30`}>
                                    <span className="text-[10px] font-black text-foreground uppercase tracking-widest inline-block transform skew-x-[15deg]">
                                        {sideLabel}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Fondo y efectos */}
                        <div className="absolute inset-0 opacity-10 bg-[url('/grid.svg')] invert" />

                        {/* Overlay Gradiente superior */}
                        <div className={`absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-${theme.primary}/40 to-transparent z-20`} />

                        {/* Imagen del Jugador - Pantalla Completa */}
                        <div className="absolute inset-0 z-10 transition-transform duration-700">
                            {player.imageUrl ? (
                                <Image
                                    src={player.imageUrl}
                                    alt={player.firstName}
                                    fill
                                    className="object-cover object-top"
                                    unoptimized
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-background relative">
                                    <div className={`absolute -inset-10 ${theme.glow} opacity-[0.15] blur-2xl rounded-full`} />
                                    <div className="relative w-48 h-48 opacity-35 select-none pointer-events-none transition-all duration-500 group-hover:scale-105 group-hover:opacity-45 transform -translate-y-14">
                                        <img
                                            src="/img/acap logo svg blanco sombra.svg"
                                            alt="ACAP Logo"
                                            className="w-full h-full object-contain filter drop-shadow-[0_8px_24px_rgba(255,255,255,0.1)]"
                                        />
                                    </div>
                                </div>
                            )}
                            {/* Overlay sutil para mejorar legibilidad general */}
                            <div className="absolute inset-0 bg-black/20 z-10" />
                        </div>

                        {/* achievement badges - Estilo Pro Ribbon */}
                        <div className="absolute bottom-[206px] left-6 z-35">
                            <div className={`flex items-center gap-2 bg-gradient-to-r ${theme.ribbonGradient} backdrop-blur-md pl-2 pr-8 py-1 transform -skew-x-12 border-l-4 ${theme.ribbonBorder} shadow-[10px_10px_20px_rgba(0,0,0,0.3)]`}>
                                <div className="flex flex-col transform skew-x-12 mr-1 leading-none">
                                    <span className="text-[8px] font-black text-foreground uppercase italic">Logros</span>
                                </div>

                                <div className="flex gap-1 transform skew-x-12 items-center">
                                    {Array.from({ length: Math.min(5, stats.trofeos) }).map((_, i) => (
                                        <Trophy
                                            key={i}
                                            size={16}
                                            className={`text-${theme.accent} ${theme.trophyShadow} fill-${theme.accent}/20`}
                                        />
                                    ))}
                                    {stats.trofeos > 5 && (
                                        <span className="text-[10px] font-black text-foreground ml-1">+{stats.trofeos - 5}</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Nombre del Jugador */}
                        <div className="absolute bottom-[165px] left-0 w-full z-30 px-4">
                            <div className="relative">
                                <div className={`absolute inset-0 bg-${theme.accent}/30 transform -skew-x-12 translate-x-2 translate-y-1 blur-[2px] opacity-30`} />
                                <div className={`bg-white py-2 transform -skew-x-12 relative border-r-4 border-${theme.primary} shadow-2xl`}>
                                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-foreground text-center transform skew-x-12">
                                        {player.firstName} <span className={`text-${theme.primary}`}>{player.lastName}</span>
                                    </h2>
                                </div>
                            </div>
                        </div>

                        {/* Stats Grid Overlay */}
                        <div className={`absolute bottom-0 left-0 right-0 p-6 pt-12 bg-gradient-to-t ${theme.statsBg} z-20`}>
                            <div className="grid grid-cols-3 gap-2 mt-4">
                                {[
                                    { label: 'PJ', val: stats.pj },
                                    { label: 'PG', val: stats.pg },
                                    { label: 'WR', val: `${stats.wr}%` },
                                    { label: 'PP', val: stats.pp },
                                    { label: 'SC', val: stats.subcampeonatos || 0 },
                                    { label: 'PTS', val: player.points || 0 }
                                ].map((stat, i) => (
                                    <div key={i} className={`flex flex-col items-center ${theme.statBoxBg} rounded-lg py-1 border transition-colors hover:brightness-110 shadow-lg`}>
                                        <span className={`text-[7px] font-bold ${isFemale ? 'text-foreground/60' : 'text-celeste/60'} uppercase tracking-widest`}>{stat.label}</span>
                                        <span className="text-lg font-black italic text-foreground leading-none">{stat.val}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Club */}
                            <div className="mt-4 flex flex-col items-center border-t border-hairline pt-2 pb-2">
                                <span className={`text-[9px] font-bold ${isFemale ? 'text-rosa/60' : 'text-muted-foreground'} tracking-[0.2em] mb-1 uppercase italic`}>
                                    CLUB: <span className={`text-${theme.accent}`}>{player.clubName || 'Socio Independiente'}</span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default PlayerCard;