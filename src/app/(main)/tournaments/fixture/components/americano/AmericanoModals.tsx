"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
    Users2, Trophy, UserCheck, Search, Plus, 
    ChevronRight, RotateCcw 
} from "lucide-react";
import { 
    Dialog, DialogContent, DialogHeader, 
    DialogTitle, DialogDescription 
} from "@/components/ui/Dialog";
import { Player, Group, Match } from "./types";

interface AmericanoModalsProps {
    // No players modal
    noPlayersData: { finished: number; playing: number; waiting: number; reserved?: number } | null;
    setNoPlayersData: (data: null) => void;
    
    // Success modal
    showSuccessModal: boolean;
    setShowSuccessModal: (show: boolean) => void;
    
    // Replace player modal
    replacingPlayer: Player | null;
    setReplacingPlayer: (p: Player | null) => void;
    isIndividual: boolean;
    replaceSlot: 1 | 2;
    setReplaceSlot: (s: 1 | 2) => void;
    guestName: string;
    setGuestName: (n: string) => void;
    guestName2: string;
    setGuestName2: (n: string) => void;
    handleReplaceWithGuest: (id: string) => void;
    playerSearchQuery: string;
    setPlayerSearchQuery: (q: string) => void;
    isFetchLoading: boolean;
    allPotentialPlayers: Player[];
    registeredPlayerIds: Set<string>;
    registeredPlayerNames: string[];
    handleReplacePlayer: (oldId: string, newP: Player) => void;
    handleReplaceOneInPair: (oldP: Player, newName: string, slot: 1 | 2) => void;
    
    // Delete player modal
    playerToDelete: Player | null;
    setPlayerToDelete: (p: Player | null) => void;
    handleDeletePlayer: (id: string) => void;

    // Withdraw player modal
    playerToWithdraw: Player | null;
    setPlayerToWithdraw: (p: Player | null) => void;
    handleWithdrawPlayer: (id: string) => void;
    
    // Edit match player modal
    editingMatchPlayer: { matchId: string; playerIndex: 1 | 2 } | null;
    setEditingMatchPlayer: (data: null) => void;
    groups: Group[];
    matches: Match[];
    handleUpdateMatchPlayer: (matchId: string, idx: 1 | 2, p: Player) => void;
    presentIds?: Set<string>;
}

export function AmericanoModals({
    noPlayersData,
    setNoPlayersData,
    showSuccessModal,
    setShowSuccessModal,
    replacingPlayer,
    setReplacingPlayer,
    isIndividual,
    replaceSlot,
    setReplaceSlot,
    guestName,
    setGuestName,
    guestName2,
    setGuestName2,
    handleReplaceWithGuest,
    playerSearchQuery,
    setPlayerSearchQuery,
    isFetchLoading,
    allPotentialPlayers,
    registeredPlayerIds,
    registeredPlayerNames,
    handleReplacePlayer,
    handleReplaceOneInPair,
    playerToDelete,
    setPlayerToDelete,
    handleDeletePlayer,
    playerToWithdraw,
    setPlayerToWithdraw,
    handleWithdrawPlayer,
    editingMatchPlayer,
    setEditingMatchPlayer,
    groups,
    matches,
    handleUpdateMatchPlayer,
    presentIds
}: AmericanoModalsProps) {
    return (
        <>
            {/* No Players Modal */}
            <AnimatePresence>
                {noPlayersData && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setNoPlayersData(null)} className="absolute inset-0 bg-background/80 backdrop-blur-xl" />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-md bg-card border-2 border-border/50 rounded-[3rem] p-10 shadow-2xl overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500/0 via-orange-500 to-orange-500/0" />

                            <div className="flex flex-col items-center text-center space-y-8">
                                <div className="w-24 h-24 rounded-full bg-azul-primary/10 flex items-center justify-center relative">
                                    <div className="absolute inset-0 rounded-full bg-azul-primary/5 animate-ping" />
                                    <Users2 className="w-10 h-10 text-azul-primary" />
                                </div>

                                <div className="space-y-3">
                                    <h3 className="text-3xl font-black uppercase italic tracking-tighter">Sin Jugadores Disponibles</h3>
                                    <p className="text-foreground/70 text-xs font-bold uppercase tracking-widest leading-relaxed"> No hay suficientes jugadores libres en este momento para iniciar un nuevo encuentro.</p>
                                </div>

                                <div className="w-full grid grid-cols-3 gap-4 p-6 bg-muted/30 rounded-[2rem] border border-border/50">
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="text-xl font-black italic text-azul-primary">{noPlayersData.playing}</span>
                                        <span className="text-[7px] font-black uppercase tracking-widest text-foreground/60">Jugando</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-1 border-x border-border/50">
                                        <span className="text-xl font-black italic text-azul-primary">{noPlayersData.finished}</span>
                                        <span className="text-[7px] font-black uppercase tracking-widest text-foreground/60">Completos</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="text-xl font-black italic text-celeste">{noPlayersData.waiting}</span>
                                        <span className="text-[7px] font-black uppercase tracking-widest text-foreground/60">Esperando</span>
                                    </div>
                                </div>

                                {(noPlayersData.reserved ?? 0) > 0 && (
                                    <div className="w-full p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-amber-500 leading-relaxed">
                                            {noPlayersData.reserved === 1
                                                ? "Hay 1 jugador ausente con partidos pendientes."
                                                : `Hay ${noPlayersData.reserved} jugadores ausentes con partidos pendientes.`}
                                        </p>
                                        <p className="text-[8px] font-bold uppercase tracking-wider text-foreground/50 mt-1.5 leading-relaxed">
                                            Sus cupos quedan reservados para cuando lleguen. Si no van a venir, eliminalos de la lista para liberar los partidos.
                                        </p>
                                    </div>
                                )}

                                <button
                                    onClick={() => setNoPlayersData(null)}
                                    className="w-full py-5 bg-foreground text-background rounded-2xl font-black uppercase italic tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
                                >
                                    Entendido
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Success Modal */}
            <AnimatePresence>
                {showSuccessModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 sm:p-24">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-background/90 backdrop-blur-xl" />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-lg bg-card border border-border/50 shadow-2xl rounded-[3rem] p-12 text-center"
                        >
                            <div className="mb-8 w-24 h-24 bg-azul-primary text-white rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-azul-primary/40">
                                <Trophy className="w-12 h-12" />
                            </div>
                            <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-4">¡Torneo Finalizado!</h2>
                            <p className="text-foreground/60 text-sm mb-12">Se han completado todos los partidos y ya hay un campeón oficial.</p>
                            <button
                                onClick={() => setShowSuccessModal(false)}
                                className="w-full py-5 bg-foreground text-background rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                                Genial, cerrar
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL REEMPLAZO DE JUGADOR */}
            <Dialog open={!!replacingPlayer} onOpenChange={(open) => !open && setReplacingPlayer(null)}>
                <DialogContent className="max-w-xl">
                    <DialogHeader className="p-5 pb-3 border-b border-border/10">
                        <DialogTitle className="text-lg font-black uppercase italic tracking-tight">Cambiar Participante</DialogTitle>
                        <DialogDescription className="text-[9px] font-bold uppercase tracking-widest text-foreground/40">
                            {isIndividual
                                ? <>Reemplazar a <span className="text-foreground">{replacingPlayer?.name}</span> por otro jugador.</>
                                : <>Modificar la pareja <span className="text-foreground">{replacingPlayer?.name}</span>.</>
                            }
                        </DialogDescription>
                    </DialogHeader>

                    {!isIndividual && (
                        <div className="flex p-1 bg-muted rounded-xl border border-border/50">
                            <button
                                onClick={() => setReplaceSlot(1)}
                                className={`flex-1 py-2 px-3 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${replaceSlot === 1 ? "bg-background text-foreground shadow-lg" : "text-foreground/70 hover:text-foreground/60"}`}
                            >
                                Reemplazar Jugador 1
                            </button>
                            <button
                                onClick={() => setReplaceSlot(2)}
                                className={`flex-1 py-2 px-3 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${replaceSlot === 2 ? "bg-background text-foreground shadow-lg" : "text-foreground/70 hover:text-foreground/60"}`}
                            >
                                Reemplazar Jugador 2
                            </button>
                        </div>
                    )}

                    <div className="space-y-6 py-4">
                        {/* Invitado */}
                        <div className="p-4 bg-muted/30 rounded-2xl border border-border/50 space-y-4">
                            <div className="space-y-0.5">
                                <span className="text-[9px] font-black uppercase tracking-widest text-foreground/70 block">
                                    {isIndividual ? "Opción 1: Persona Externa / Invitado" : `Opción 1: Reemplazar por Persona Externa`}
                                </span>
                                <p className="text-[8px] font-medium text-foreground/60 uppercase tracking-tighter">
                                    Usá esta opción si el jugador no está registrado.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex-1 relative mt-1.5">
                                    <span className="absolute -top-2 left-3 px-1.5 bg-background text-[7px] font-black text-azul-primary uppercase tracking-widest z-10 rounded-full border border-border/10">
                                        {isIndividual ? "Nombre Completo" : `Nombre del Jugador ${replaceSlot}`}
                                    </span>
                                    <input
                                        type="text"
                                        placeholder={isIndividual ? "Escribí el nombre..." : (replacingPlayer?.name.split(/[\/\+]/)[replaceSlot - 1]?.trim() || `Nombre ${replaceSlot}...`)}
                                        value={replaceSlot === 1 ? guestName : guestName2}
                                        onChange={(e) => replaceSlot === 1 ? setGuestName(e.target.value) : setGuestName2(e.target.value)}
                                        className="w-full bg-background border border-border/50 rounded-lg px-3 py-3 text-xs font-bold outline-none focus:border-azul-primary shadow-sm"
                                    />
                                </div>

                                <button
                                    onClick={() => replacingPlayer && handleReplaceWithGuest(replacingPlayer.id)}
                                    className="w-full py-3 bg-foreground text-background rounded-lg text-[9px] font-black uppercase tracking-widest hover:scale-[1.01] active:scale-95 transition-all shadow-xl shadow-black/10 flex items-center justify-center gap-1.5"
                                >
                                    <UserCheck className="w-3.5 h-3.5" />
                                    {isIndividual ? "Confirmar como Invitado" : `Confirmar Invitado (S${replaceSlot})`}
                                </button>
                            </div>
                        </div>

                        {/* Registrados */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black uppercase tracking-widest text-foreground/70">Opción 2: Jugador Registrado</span>
                            </div>

                            <div className="relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/20" />
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre..."
                                    value={playerSearchQuery}
                                    onChange={(e) => setPlayerSearchQuery(e.target.value)}
                                    className="w-full bg-muted/30 border border-border/50 rounded-xl py-3 pl-10 pr-3 text-xs font-bold outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="max-h-[250px] overflow-y-auto pr-1.5 space-y-1.5 custom-scrollbar">
                                {isFetchLoading ? (
                                    <div className="py-6 text-center animate-pulse text-[10px] font-black uppercase tracking-widest text-foreground/70">
                                        Cargando jugadores...
                                    </div>
                                ) : allPotentialPlayers
                                    .filter(p => {
                                        const query = isIndividual
                                            ? (guestName || playerSearchQuery)
                                            : (replaceSlot === 1 ? guestName : guestName2) || playerSearchQuery;

                                        if (!query || query.length < 2) return false;
                                        return p.name.toLowerCase().includes(query.toLowerCase());
                                    })
                                    .filter(p => !registeredPlayerIds.has(p.id) && !registeredPlayerNames.includes(p.name.toLowerCase()))
                                    .slice(0, 10).map((p) => (
                                        <button
                                            key={p.id}
                                            onClick={() => {
                                                if (replacingPlayer) {
                                                    if (isIndividual) {
                                                        handleReplacePlayer(replacingPlayer.id, p);
                                                    } else {
                                                        handleReplaceOneInPair(replacingPlayer, p.name, replaceSlot);
                                                    }
                                                }
                                            }}
                                            className="w-full flex items-center justify-between p-2.5 bg-muted/20 hover:bg-azul-primary hover:text-white rounded-xl border border-border/50 transition-all group/p shadow-sm"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg bg-background flex items-center justify-center group-hover/p:bg-white/20">
                                                    <Users2 className="w-3.5 h-3.5" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-xs font-black uppercase italic">{p.name}</p>
                                                    <p className="text-[8px] font-bold opacity-40 uppercase tracking-widest">Cat: {p.category || "D"}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[6px] font-black uppercase tracking-tighter opacity-0 group-hover/p:opacity-100 bg-white/10 px-1.5 py-0.5 rounded">
                                                    Elegir para Jugador {replaceSlot}
                                                </span>
                                                <Plus className="w-3.5 h-3.5 opacity-0 group-hover/p:opacity-100 transition-opacity" />
                                            </div>
                                        </button>
                                    ))}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* MODAL CONFIRMACION ELIMINAR */}
            <Dialog open={!!playerToDelete} onOpenChange={(open) => !open && setPlayerToDelete(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-rojo">¿Eliminar Participante?</DialogTitle>
                        <DialogDescription>
                            Estás por quitar a <span className="text-foreground font-black">{playerToDelete?.name}</span> de la lista del torneo. Esta acción no se puede deshacer.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex gap-4 mt-4">
                        <button
                            onClick={() => setPlayerToDelete(null)}
                            className="flex-1 px-4 py-3 bg-muted hover:bg-muted/80 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => playerToDelete && handleDeletePlayer(playerToDelete.id)}
                            className="flex-1 px-4 py-3 bg-rojo hover:bg-rojo/90 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-rojo/20"
                        >
                            Sí, Eliminar
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* MODAL CONFIRMACION RETIRAR */}
            <Dialog open={!!playerToWithdraw} onOpenChange={(open) => !open && setPlayerToWithdraw(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-amber-500">¿Retirar Participante?</DialogTitle>
                        <DialogDescription>
                            <span className="text-foreground font-black">{playerToWithdraw?.name}</span> se retira del torneo.
                            Sus partidos jugados se conservan en la tabla, no se le generarán más partidos y sus cupos pendientes
                            quedan liberados para el resto. Podés reincorporarlo cuando quieras.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex gap-4 mt-4">
                        <button
                            onClick={() => setPlayerToWithdraw(null)}
                            className="flex-1 px-4 py-3 bg-muted hover:bg-muted/80 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => playerToWithdraw && handleWithdrawPlayer(playerToWithdraw.id)}
                            className="flex-1 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-amber-500/20"
                        >
                            Sí, Retirar
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* MODAL CAMBIAR JUGADOR EN PARTIDO ESPECIFICO */}
            <Dialog open={!!editingMatchPlayer} onOpenChange={(open) => !open && setEditingMatchPlayer(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Seleccionar Jugador</DialogTitle>
                        <DialogDescription>
                            Elegí un jugador para reemplazar en este partido.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="relative my-4">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20" />
                        <input
                            type="text"
                            placeholder="Buscar jugador del torneo..."
                            value={playerSearchQuery}
                            onChange={(e) => setPlayerSearchQuery(e.target.value)}
                            className="w-full bg-muted/30 border border-border/50 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold outline-none focus:border-azul-primary transition-all"
                        />
                    </div>

                    <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {groups[0]?.players
                            .filter(p => p.name.toLowerCase().includes(playerSearchQuery.toLowerCase()))
                            .map((p) => {
                                const isAlreadyInMatch = matches.find(m => m.id === editingMatchPlayer?.matchId && (m.team1.id === p.id || m.team2.id === p.id));
                                const isAbsent = !!presentIds && !presentIds.has(p.id);
                                const isDisabled = !!isAlreadyInMatch || isAbsent;
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => editingMatchPlayer && handleUpdateMatchPlayer(editingMatchPlayer.matchId, editingMatchPlayer.playerIndex, p)}
                                        disabled={isDisabled}
                                        className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${isDisabled
                                            ? "bg-muted/50 border-transparent opacity-50 cursor-not-allowed"
                                            : "bg-card border-border/50 hover:border-azul-primary hover:bg-azul-primary/[0.02]"}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                                                <Users2 className="w-4 h-4 text-foreground/40" />
                                            </div>
                                            <span className="text-sm font-black uppercase italic">{p.name}</span>
                                        </div>
                                        {isAlreadyInMatch ? (
                                            <span className="text-[8px] font-black uppercase text-foreground/30">Ya en el partido</span>
                                        ) : isAbsent ? (
                                            <span className="text-[8px] font-black uppercase text-amber-500">Ausente</span>
                                        ) : (
                                            <ChevronRight className="w-4 h-4 text-azul-primary" />
                                        )}
                                    </button>
                                );
                            })
                        }
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
