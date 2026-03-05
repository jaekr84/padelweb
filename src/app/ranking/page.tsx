"use client";

import { useState } from "react";
import FeedLayout from "@/app/feed/layout";
import { Trophy, Medal, Crown } from "lucide-react";

const CATEGORIES = ["1ra", "2da", "3ra", "4ta", "5ta", "6ta", "7ma", "8va", "9na"];

// Datos simulados (Luego vendrán de Supabase)
const DUMMY_PLAYERS = {
    "1ra": [
        { id: 1, name: "Agustín Tapia", user: "agus_tapia", points: 15400, tournaments: 14, avatar: "🇦🇷" },
        { id: 2, name: "Arturo Coello", user: "arturocoello", points: 15400, tournaments: 14, avatar: "🇪🇸" },
        { id: 3, name: "Alejandro Galán", user: "alegalan", points: 12100, tournaments: 13, avatar: "🇪🇸" },
        { id: 4, name: "Fede Chingotto", user: "chingotto", points: 12100, tournaments: 13, avatar: "🇦🇷" },
        { id: 5, name: "Franco Stupaczuk", user: "stupa", points: 9800, tournaments: 15, avatar: "🇦🇷" },
    ],
    "5ta": [
        { id: 6, name: "Juan Perez", user: "juanperez", points: 4500, tournaments: 8, avatar: "👤" },
        { id: 7, name: "Marcos García", user: "marcospadel", points: 4120, tournaments: 9, avatar: "👤" },
        { id: 8, name: "Lucas Gonzalez", user: "lucasg", points: 3800, tournaments: 6, avatar: "👤" },
        { id: 9, name: "Matias Sanchez", user: "matisanch", points: 3100, tournaments: 10, avatar: "👤" },
    ]
};

export default function RankingPage() {
    const [activeCategory, setActiveCategory] = useState("5ta");

    const players = DUMMY_PLAYERS[activeCategory as keyof typeof DUMMY_PLAYERS] || [];

    return (
        <FeedLayout>
            {/* Fondo general con gradiente sutil */}
            <div className="min-h-screen bg-slate-50 dark:bg-[#090A0F] text-slate-900 dark:text-slate-100 pb-24 font-sans selection:bg-blue-500/30">

                {/* Decoración de fondo */}
                <div className="absolute top-0 left-0 right-0 h-[30vh] bg-gradient-to-b from-blue-500/10 via-blue-500/5 to-transparent pointer-events-none -z-0" />
                <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] pointer-events-none -z-0" />

                <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col pt-6 md:pt-12 md:px-6">

                    {/* Header Mobile First */}
                    <div className="px-5 mb-8">
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                            <Trophy className="w-8 h-8 text-blue-500" />
                            Ranking Oficial
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-medium">Clasificación por categorías y puntajes</p>
                    </div>

                    {/* Controles: Categorías Scrollables (iOS style) */}
                    <div className="px-5 mb-6 sticky top-0 z-20 py-2 bg-slate-50/90 dark:bg-[#090A0F]/90 border-b border-transparent dark:border-white/5 backdrop-blur-xl -mx-5 px-5 md:mx-0 md:px-0 md:bg-transparent md:border-none">
                        <div className="flex gap-2.5 overflow-x-auto hide-scrollbar pb-1">
                            {CATEGORIES.map((cat) => {
                                const isActive = activeCategory === cat;
                                return (
                                    <button
                                        key={cat}
                                        onClick={() => setActiveCategory(cat)}
                                        className={`px-5 py-2 rounded-full text-[13px] font-bold transition-all duration-300 whitespace-nowrap outline-none ${isActive
                                            ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md"
                                            : "bg-white dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800"
                                            }`}
                                    >
                                        {cat} Categoría
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Tabla de Ranking */}
                    <div className="px-5 md:px-0">
                        <div className="bg-white dark:bg-[#13161F] rounded-[24px] overflow-hidden border border-slate-200/50 dark:border-slate-800/60 shadow-sm">

                            {/* Header de la Tabla */}
                            <div className="grid grid-cols-[3rem_1fr_auto_4rem] sm:grid-cols-[4rem_1fr_6rem_6rem] items-center px-4 sm:px-6 py-4 border-b border-slate-200/50 dark:border-slate-800/60 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-900/50">
                                <div className="text-center">#</div>
                                <div>Jugador</div>
                                <div className="hidden sm:block text-center">Torneos</div>
                                <div className="text-right">Puntos</div>
                            </div>

                            {/* Lista de Jugadores */}
                            <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                {players.length > 0 ? (
                                    players.map((player, index) => {
                                        const isTop = index < 3;
                                        return (
                                            <div key={player.id} className={`grid grid-cols-[3rem_1fr_auto_4rem] sm:grid-cols-[4rem_1fr_6rem_6rem] items-center px-4 sm:px-6 py-4 sm:py-5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${isTop ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>

                                                {/* Posición y Medallas */}
                                                <div className="flex items-center justify-center font-bold text-lg">
                                                    {index === 0 ? <Crown className="w-6 h-6 text-yellow-500 drop-shadow-sm" /> :
                                                        index === 1 ? <Medal className="w-5 h-5 text-slate-400 drop-shadow-sm" /> :
                                                            index === 2 ? <Medal className="w-5 h-5 text-amber-600 drop-shadow-sm" /> :
                                                                <span className="text-slate-400 dark:text-slate-500 text-base">{index + 1}</span>}
                                                </div>

                                                {/* Info del Jugador */}
                                                <div className="flex items-center gap-3 overflow-hidden pr-2">
                                                    <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-lg sm:text-xl shadow-inner">
                                                        {player.avatar}
                                                    </div>
                                                    <div className="truncate">
                                                        <div className={`font-bold text-sm sm:text-base truncate ${isTop ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                                                            {player.name}
                                                        </div>
                                                        <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate font-medium">
                                                            @{player.user}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Torneos (Oculto en móvil muy pequeño) */}
                                                <div className="hidden sm:flex items-center justify-center font-semibold text-slate-500 dark:text-slate-400 text-sm">
                                                    {player.tournaments}
                                                </div>

                                                {/* Puntos */}
                                                <div className={`text-right font-black ${isTop ? 'text-blue-600 dark:text-blue-400 text-base sm:text-lg' : 'text-slate-700 dark:text-slate-300 text-sm sm:text-base'}`}>
                                                    {player.points.toLocaleString()}
                                                </div>

                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="py-16 px-6 text-center flex flex-col items-center justify-center">
                                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                            <Trophy className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">Sin jugadores</h3>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">No hay jugadores clasificados en esta categoría aún.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Utilidad para esconder scrollbar */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}} />
        </FeedLayout>
    );
}

