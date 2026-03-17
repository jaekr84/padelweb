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
    };
    stats: {
        pj: number;
        pg: number;
        pp: number;
        pe: number;
        wr: number;
        trofeos: number;
    };
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player, stats }) => {
    const sideLabel = player.side === 'reves' ? 'REVÉS' : player.side === 'drive' ? 'DRIVE' : 'AMBOS';

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex justify-center py-12"
        >
            <div className="relative group">
                {/* BORDE CON DEGRADADO DINÁMICO */}
                <div className="relative w-[340px] h-[520px] bg-gradient-to-br from-green-400 via-emerald-500 to-green-900 p-[3px] shadow-[0_0_40px_rgba(34,197,94,0.3)] transition-all duration-500"
                    style={{ clipPath: 'polygon(12% 0, 100% 0, 100% 88%, 88% 100%, 0 100%, 0 12%)' }}>

                    <div className="relative w-full h-full bg-[#050505] overflow-hidden"
                        style={{ clipPath: 'polygon(12% 0, 100% 0, 100% 88%, 88% 100%, 0 100%, 0 12%)' }}>

                        {/* 1. BRANDING ACAP - Superior Izquierda */}
                        <div className="absolute top-5 left-7 z-40">
                            <div className="flex flex-col justify-center">
                                <span className="text-sm font-black italic text-white leading-none tracking-tighter">
                                    ACAP<span className="text-green-500">.AR</span>
                                </span>
                                <span className="text-[8px] font-black text-white/40 tracking-[0.2em] uppercase">Series 2026</span>
                            </div>
                        </div>

                        {/* 2. SECTOR SUPERIOR DERECHA: CATEGORÍA */}
                        <div className="absolute top-0 right-0 p-6 z-40">
                            {/* Badge de Categoría Moderno */}
                            <div className="flex flex-col items-end">
                                <div className="relative">
                                    {/* Fondo de contraste para la letra */}
                                    <div className="absolute -inset-2 bg-black/40 blur-md rounded-full -z-10" />
                                    <span className="text-6xl font-black italic leading-[0.8] text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-400 drop-shadow-lg">
                                        {player.category || '4TA'}
                                    </span>
                                </div>

                                {/* Label de Lado con estilo de cinta militar/deportiva */}
                                <div className="mt-2 bg-green-500 px-2 py-0.5 rounded-sm transform skew-x-[-15deg] shadow-[0_0_15px_rgba(34,197,94,0.5)]">
                                    <span className="text-[10px] font-black text-black uppercase tracking-widest inline-block transform skew-x-[15deg]">
                                        {sideLabel}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Fondo y efectos */}
                        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

                        {/* Overlay Gradiente superior para asegurar legibilidad */}
                        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-black/80 to-transparent z-20" />

                        {/* Imagen del Jugador */}
                        <div className="absolute top-0 right-0 w-full h-[380px] z-10 transition-transform duration-700">
                            {player.imageUrl ? (
                                <Image
                                    src={player.imageUrl}
                                    alt={player.firstName}
                                    fill
                                    className="object-cover object-top"
                                    style={{
                                        maskImage: 'linear-gradient(to bottom, black 65%, transparent 98%)',
                                        WebkitMaskImage: 'linear-gradient(to bottom, black 65%, transparent 98%)'
                                    }}
                                    unoptimized
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-zinc-900/50">
                                    <User size={180} className="text-green-500/20" />
                                </div>
                            )}
                        </div>

                        {/* REDISEÑO: Badge de Logros (Trofeos) - Estilo Pro Ribbon */}
                        <div className="absolute bottom-[206px] left-6 z-35">
                            <div className="flex items-center gap-2 bg-gradient-to-r from-green-600/90 via-green-600/40 to-transparent backdrop-blur-md pl-2 pr-8 py-1 transform -skew-x-12 border-l-4 border-white shadow-[10px_10px_20px_rgba(0,0,0,0.3)]">
                                {/* Etiqueta Lateral */}
                                <div className="flex flex-col transform skew-x-12 mr-1 leading-none">
                                    <span className="text-[8px] font-black text-white uppercase italic">Títulos</span>
                                </div>

                                <div className="flex gap-1 transform skew-x-12 items-center">
                                    {Array.from({ length: Math.min(5, stats.trofeos) }).map((_, i) => (
                                        <Trophy
                                            key={i}
                                            size={16}
                                            className="text-white drop-shadow-[0_0_8px_rgba(34,197,94,0.6)] fill-white/10"
                                        />
                                    ))}
                                    {stats.trofeos > 5 && (
                                        <span className="text-[10px] font-black text-white ml-1">+{stats.trofeos - 5}</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Nombre del Jugador */}
                        <div className="absolute bottom-[165px] left-0 w-full z-30 px-4">
                            <div className="relative">
                                <div className="absolute inset-0 bg-green-500 transform -skew-x-12 translate-x-2 translate-y-1 blur-[2px] opacity-30" />
                                <div className="bg-white py-2 transform -skew-x-12 relative border-r-4 border-green-500 shadow-2xl">
                                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-black text-center transform skew-x-12">
                                        {player.firstName} <span className="text-green-600">{player.lastName}</span>
                                    </h2>
                                </div>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="absolute bottom-0 left-0 right-0 p-6 h-[175px] bg-gradient-to-t from-black via-[#0a0a0a] to-transparent z-20">
                            <div className="grid grid-cols-3 gap-2 mt-4">
                                {[
                                    { label: 'PJ', val: stats.pj },
                                    { label: 'PG', val: stats.pg },
                                    { label: 'WR', val: `${stats.wr}%` },
                                    { label: 'PP', val: stats.pp },
                                    { label: 'PE', val: stats.pe || '-' },
                                    { label: 'PTS', val: player.points || 0 }
                                ].map((stat, i) => (
                                    <div key={i} className="flex flex-col items-center bg-gradient-to-b from-white/10 to-transparent rounded-t-md py-1 border-t border-white/5">
                                        <span className="text-[7px] font-bold text-green-400 uppercase tracking-widest">{stat.label}</span>
                                        <span className="text-lg font-black italic text-white leading-none">{stat.val}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Club */}
                            <div className="mt-4 flex flex-col items-center border-t border-white/10 pt-2 pb-2">
                                <span className="text-[9px] font-bold text-zinc-400 tracking-[0.2em] mb-1 uppercase">
                                    Club: {player.clubName || 'Socio Independiente'}
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