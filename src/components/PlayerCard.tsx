import React from 'react';
import Image from 'next/image';
import { Trophy, User } from 'lucide-react';
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
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="flex justify-center py-8"
        >
            <div className="relative w-[320px] h-[540px] bg-[#0F0F0F] rounded-[2.5rem] p-1 border-[6px] border-[#22C55E] overflow-hidden shadow-[0_0_50px_rgba(34,197,94,0.2)] font-sans text-white group">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10 bg-[linear-gradient(45deg,#22C55E_25%,transparent_25%,transparent_50%,#22C55E_50%,#22C55E_75%,transparent_75%,transparent)] bg-[length:4px_4px]" />
                <div className="absolute inset-0 bg-gradient-to-b from-green-500/5 via-transparent to-transparent" />

                {/* Header: Logo & Rating */}
                <div className="relative z-10 p-6 flex justify-between items-start">
                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1 mb-1">
                            <span className="text-[#22C55E] font-black italic text-lg leading-tight">ACAP.AR</span>
                        </div>
                    </div>

                    <div className="flex flex-col items-end leading-none">
                        <span
                            className="text-4xl font-black italic tracking-tighter text-white uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                            style={{ WebkitTextStroke: '1px rgba(0,0,0,0.5)' }}
                        >
                            {player.category || '4ta'}
                        </span>
                        <span
                            className="text-[10px] font-black uppercase tracking-widest text-[#22C55E] mt-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                            style={{ WebkitTextStroke: '0.5px rgba(0,0,0,0.3)' }}
                        >
                            {sideLabel}
                        </span>
                    </div>
                </div>

                {/* Player Photo */}
                <div className="absolute top-0 left-0 w-full h-[360px] z-0 pointer-events-none">
                    <div className="relative w-full h-full">
                        {player.imageUrl ? (
                            <Image
                                src={player.imageUrl}
                                alt={player.firstName}
                                fill
                                className="object-cover object-top"
                                style={{
                                    maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
                                    WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)'
                                }}
                                unoptimized
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-zinc-900/50 opacity-20">
                                <User size={160} />
                            </div>
                        )}
                    </div>
                </div>

                {/* White Info Block */}
                <div className="absolute bottom-[180px] left-0 right-0 bg-white text-black py-3 px-6 flex flex-col items-center justify-center transform -skew-x-2 w-[110%] -ml-[5%] shadow-xl z-10">
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter leading-none transform skew-x-2">
                        {player.firstName} {player.lastName}
                    </h2>
                </div>

                {/* Stats Grid */}
                <div className="absolute bottom-0 left-0 right-0 p-6 pt-4 h-[180px] bg-black/40 backdrop-blur-sm border-t border-white/10">
                    <div className="grid grid-cols-2 gap-y-3 gap-x-8">
                        <div className="flex justify-between items-baseline border-r border-white/10 pr-4">
                            <span className="text-[10px] font-black uppercase tracking-widest italic opacity-60">PJ</span>
                            <span className="text-lg font-black italic tracking-tighter text-[#22C55E]">{stats.pj}</span>
                        </div>
                        <div className="flex justify-between items-baseline pl-4">
                            <span className="text-[10px] font-black uppercase tracking-widest italic opacity-60">PP</span>
                            <span className="text-lg font-black italic tracking-tighter text-[#22C55E]">{stats.pp}</span>
                        </div>
                        <div className="flex justify-between items-baseline border-r border-white/10 pr-4">
                            <span className="text-[10px] font-black uppercase tracking-widest italic opacity-60">PG</span>
                            <span className="text-lg font-black italic tracking-tighter text-[#22C55E]">{stats.pg}</span>
                        </div>
                        <div className="flex justify-between items-baseline pl-4">
                            <span className="text-[10px] font-black uppercase tracking-widest italic opacity-60">WR</span>
                            <span className="text-lg font-black italic tracking-tighter text-[#22C55E]">{stats.wr}%</span>
                        </div>
                        <div className="flex justify-between items-baseline border-r border-white/10 pr-4">
                            <span className="text-[10px] font-black uppercase tracking-widest italic opacity-60">PE</span>
                            <span className="text-lg font-black italic tracking-tighter text-[#22C55E]">{stats.pe || '-'}</span>
                        </div>
                        <div className="flex justify-between items-baseline pl-4">
                            <span className="text-[10px] font-black uppercase tracking-widest italic opacity-60"></span>
                            <span className="text-lg font-black italic tracking-tighter text-[#22C55E]"></span>
                        </div>
                    </div>

                    {/* Club Name - Full Width Below Stats */}
                    <div className="mt-2 text-center">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#22C55E] drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]">
                            {player.clubName || 'Socio Independiente'}
                        </span>
                    </div>

                    {/* Trophy Icons Row */}
                    <div className="flex items-center justify-center gap-1.5 mt-2 min-h-[14px]">
                        {Array.from({ length: Math.min(6, stats.trofeos) }).map((_, i) => (
                            <Trophy key={i} size={12} className="text-[#22C55E] drop-shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
                        ))}
                        {stats.trofeos > 6 && (
                            <span className="text-[9px] font-black text-[#22C55E]">+{stats.trofeos - 6}</span>
                        )}
                    </div>

                    <div className="text-center mt-2">
                        <span className="text-[7px] font-black uppercase tracking-[0.3em] text-white/30 italic">ACAP.AR SERIES</span>
                    </div>
                </div>

            </div>
        </motion.div>
    );
};

export default PlayerCard;
