"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
    AlertTriangle, X, Search, RefreshCw, CreditCard, UserCheck,
    RotateCcw, Trash2, Zap, CheckCircle2, Trophy, ArrowRight
} from "lucide-react";
import { Player } from "./types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/Dialog";

interface TournamentModalsProps {
    // Confirm Modal
    confirmModal: {
        open: boolean;
        title: string;
        description: string;
        onConfirm: () => void;
        variant?: 'danger' | 'primary';
    };
    setConfirmModal: (modal: any) => void;

    // Players Modal
    isPlayersModalOpen: boolean;
    setIsPlayersModalOpen: (open: boolean) => void;
    playerSearchQuery: string;
    setPlayerSearchQuery: (q: string) => void;
    filteredPlayers: Player[];
    isMemberPresent: (pairId: string, slot: 0 | 1) => boolean;
    isMemberPaid: (pairId: string, slot: 0 | 1) => boolean;
    toggleMemberPresent: (pairId: string, slot: 0 | 1) => void;
    toggleMemberPaid: (pairId: string, slot: 0 | 1) => void;
    bulkUpdateStatus: (type: 'present' | 'paid', ids: string[]) => void;
    allPlayers: Player[];

    // Success Modal
    showSuccessModal: boolean;
    setShowSuccessModal: (show: boolean) => void;
    tournamentName: string;

    // Replacement Modal
    replacingPlayer: Player | null;
    setReplacingPlayer: (p: Player | null) => void;
    guestName: string;
    setGuestName: (n: string) => void;
    guestName2: string;
    setGuestName2: (n: string) => void;
    replaceSlot: 1 | 2;
    setReplaceSlot: (s: 1 | 2) => void;
    handleReplaceWithGuest: (id: string) => void;
    handleReplaceOneInPair: (old: Player, name: string, slot: 1 | 2) => void;
    allPotentialPlayers: Player[];
    isFetchLoading: boolean;
    handleReplacePlayer: (oldId: string, newP: Player) => void;

    // Deletion Modal
    playerToDelete: Player | null;
    setPlayerToDelete: (p: Player | null) => void;
    handleDeletePlayer: (id: string) => void;

    // Config
    isIndividual: boolean;
}

export function TournamentModals({
    confirmModal,
    setConfirmModal,
    isPlayersModalOpen,
    setIsPlayersModalOpen,
    playerSearchQuery,
    setPlayerSearchQuery,
    filteredPlayers,
    isMemberPresent,
    isMemberPaid,
    toggleMemberPresent,
    toggleMemberPaid,
    bulkUpdateStatus,
    allPlayers,
    showSuccessModal,
    setShowSuccessModal,
    tournamentName,
    replacingPlayer,
    setReplacingPlayer,
    guestName,
    setGuestName,
    guestName2,
    setGuestName2,
    replaceSlot,
    setReplaceSlot,
    handleReplaceWithGuest,
    handleReplaceOneInPair,
    allPotentialPlayers,
    isFetchLoading,
    handleReplacePlayer,
    playerToDelete,
    setPlayerToDelete,
    handleDeletePlayer,
    isIndividual
}: TournamentModalsProps) {
    // Check-in y pago por jugador: cada integrante de la pareja tiene su clave.
    const memberNamesOf = (p: Player) => p.name.split(/[\/\+]/).map(n => n.trim()).filter(Boolean);
    const checkinIdsOf = (p: Player) =>
        memberNamesOf(p).length > 1 ? [`${p.id}_0`, `${p.id}_1`] : [p.id];

    return (
        <>
            {/* Modal de Confirmación Estético */}
            <AnimatePresence>
                {confirmModal.open && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setConfirmModal((prev: any) => ({ ...prev, open: false }))}
                            className="absolute inset-0 bg-background/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-sm bg-card border border-border/50 rounded-3xl shadow-2xl overflow-hidden p-6"
                        >
                            <div className={`w-12 h-12 rounded-2xl mb-4 flex items-center justify-center ${confirmModal.variant === 'danger' ? "bg-rojo/10 text-rojo" : "bg-azul-primary/10 text-azul-primary"}`}>
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-black uppercase italic tracking-tight mb-2">
                                {confirmModal.title}
                            </h3>
                            <p className="text-sm text-foreground/60 leading-relaxed mb-8">
                                {confirmModal.description}
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setConfirmModal((prev: any) => ({ ...prev, open: false }))}
                                    className="py-3 rounded-xl bg-muted/50 hover:bg-muted text-foreground/60 text-xs font-black uppercase tracking-widest transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmModal.onConfirm}
                                    className={`py-3 rounded-xl text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg ${confirmModal.variant === 'danger'
                                        ? "bg-rojo hover:bg-rojo/90 shadow-rojo/20"
                                        : "bg-azul-primary hover:bg-azul-primary/90 shadow-azul-primary/20"}`}
                                >
                                    Confirmar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal de Lista de Jugadores */}
            <AnimatePresence>
                {isPlayersModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsPlayersModalOpen(false)}
                            className="absolute inset-0 bg-background/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-2xl h-[80vh] bg-card border border-border/50 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden"
                        >
                            {/* Header del Modal */}
                            <div className="p-5 pb-3 flex items-center justify-between border-b border-border/10">
                                <div>
                                    <h2 className="text-lg font-black uppercase italic tracking-tighter">Gestión de Jugadores</h2>
                                    <p className="text-[9px] text-foreground/40 font-bold uppercase tracking-widest">Asistencia y Pagos en tiempo real</p>
                                </div>
                                <button
                                    onClick={() => setIsPlayersModalOpen(false)}
                                    className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-rojo/10 hover:text-rojo transition-all"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            {/* Buscador */}
                            <div className="px-5 py-3 pb-1">
                                <div className="relative">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/30" />
                                    <input
                                        type="text"
                                        placeholder="BUSCAR JUGADOR POR NOMBRE..."
                                        value={playerSearchQuery}
                                        onChange={(e) => setPlayerSearchQuery(e.target.value)}
                                        className="w-full bg-muted/30 border border-border/50 rounded-xl py-2.5 pl-10 pr-3 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-azul-primary/20 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="px-5 py-1.5 flex items-center gap-2">
                                <button
                                    onClick={() => bulkUpdateStatus('paid', allPlayers.flatMap(checkinIdsOf))}
                                    className="flex-1 py-2.5 bg-azul-primary/5 hover:bg-azul-primary/10 text-azul-primary border border-azul-primary/20 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                >
                                    <CreditCard className="w-3 h-3" />
                                    Todos Pagos
                                </button>
                                <button
                                    onClick={() => bulkUpdateStatus('present', allPlayers.flatMap(checkinIdsOf))}
                                    className="flex-1 py-2.5 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                >
                                    <UserCheck className="w-3 h-3" />
                                    Todos Presentes
                                </button>
                            </div>

                            {/* Lista de Jugadores */}
                            <div className="flex-1 overflow-y-auto px-5 pb-5 custom-scrollbar">
                                <div className="grid gap-1.5">
                                    {filteredPlayers.flatMap((p) => {
                                        const memberNames = memberNamesOf(p);
                                        const slots: (0 | 1)[] = memberNames.length > 1 ? [0, 1] : [0];
                                        return slots.map(slot => {
                                            const displayName = memberNames[slot] || p.name;
                                            const isPresent = isMemberPresent(p.id, slot);
                                            const isPaid = isMemberPaid(p.id, slot);
                                            return (
                                                <div
                                                    key={`${p.id}_${slot}`}
                                                    className="group flex items-center justify-between p-2.5 rounded-xl bg-muted/20 border border-border/30 hover:border-azul-primary/30 hover:bg-muted/30 transition-all"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] ${isPresent ? 'bg-emerald-500/10 text-emerald-500' : 'bg-foreground/5 text-foreground/20'}`}>
                                                            {displayName.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="text-xs font-black uppercase italic leading-none mb-0.5">{displayName}</div>
                                                            <div className="text-[9px] text-foreground/40 font-bold uppercase tracking-wider">
                                                                {memberNames.length > 1 ? p.name : (p.category || 'Sin Cat.')}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => toggleMemberPaid(p.id, slot)}
                                                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all ${isPaid
                                                                ? 'bg-azul-primary/10 border-azul-primary/30 text-azul-primary'
                                                                : 'bg-transparent border-border/50 text-foreground/30 hover:border-azul-primary/30 hover:text-azul-primary'}`}
                                                        >
                                                            <CreditCard className={`w-3 h-3 ${isPaid ? 'animate-pulse' : ''}`} />
                                                            <span className="text-[8px] font-black uppercase tracking-tighter">{isPaid ? 'PAGADO' : 'PAGAR'}</span>
                                                        </button>

                                                        <button
                                                            onClick={() => toggleMemberPresent(p.id, slot)}
                                                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all ${isPresent
                                                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                                                                : 'bg-transparent border-border/50 text-foreground/30 hover:border-emerald-500/30 hover:text-emerald-500'}`}
                                                        >
                                                            <UserCheck className={`w-3 h-3 ${isPresent ? 'animate-bounce' : ''}`} />
                                                            <span className="text-[8px] font-black uppercase tracking-tighter">{isPresent ? 'PRESENTE' : 'AUSENTE'}</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Success Modal */}
            <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
                <DialogContent className="max-w-md bg-card border border-border/50 rounded-[2.5rem] p-0 overflow-hidden">
                    <DialogTitle className="sr-only">Torneo Finalizado</DialogTitle>
                    <div className="relative p-8 text-center space-y-6">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-azul-primary to-transparent" />
                        <div className="w-24 h-24 bg-azul-primary/10 rounded-3xl flex items-center justify-center mx-auto relative group">
                            <div className="absolute inset-0 bg-azul-primary/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all" />
                            <Trophy className="w-12 h-12 text-azul-primary relative z-10" />
                            <Zap className="absolute -top-2 -right-2 w-8 h-8 text-celeste animate-pulse" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">¡Torneo Finalizado!</h2>
                            <p className="text-sm text-foreground/60 font-medium leading-relaxed">
                                El torneo <span className="text-azul-primary font-bold">{tournamentName}</span> ha concluido exitosamente. Los resultados han sido registrados.
                            </p>
                        </div>
                        <div className="grid gap-3 pt-4">
                            <button
                                onClick={() => setShowSuccessModal(false)}
                                className="w-full py-4 bg-azul-primary text-white rounded-2xl font-black uppercase italic tracking-widest shadow-xl shadow-azul-primary/20 hover:bg-azul-primary/90 transition-all flex items-center justify-center gap-3 group"
                            >
                                <CheckCircle2 className="w-5 h-5" />
                                Entendido
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Replacement Modal */}
            <Dialog open={!!replacingPlayer} onOpenChange={() => setReplacingPlayer(null)}>
                <DialogContent className="max-w-2xl bg-card border-border/50 rounded-[2rem] p-0 overflow-hidden">
                    <DialogHeader className="p-5 pb-3 border-b border-border/10">
                        <DialogTitle className="text-lg font-black uppercase italic tracking-tight flex items-center gap-2">
                            <RotateCcw className="w-5 h-5 text-azul-primary" />
                            Reemplazar Participante
                        </DialogTitle>
                        <DialogDescription className="text-[9px] font-bold uppercase tracking-widest text-foreground/40">
                            Cambiar a {replacingPlayer?.name} por otro jugador
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh]">
                        {/* Invitado Section */}
                        <div className="space-y-3">
                            <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-azul-primary">Opción 1: Crear Invitado</h3>
                            <div className="grid gap-3 p-4 bg-muted/30 rounded-2xl border border-border/50">
                                {isIndividual ? (
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-foreground/40 ml-1">Nombre Completo</label>
                                        <input
                                            type="text"
                                            value={guestName}
                                            onChange={e => setGuestName(e.target.value)}
                                            placeholder="Ej: JUAN PEREZ..."
                                            className="w-full bg-background/50 border border-border/50 rounded-xl p-3 text-[10px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-azul-primary/20 outline-none"
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-foreground/40 ml-1">Jugador 1</label>
                                                <div className="relative group">
                                                    <input
                                                        type="text"
                                                        value={guestName}
                                                        onChange={e => setGuestName(e.target.value)}
                                                        className="w-full bg-background/50 border border-border/50 rounded-xl p-3 pr-14 text-[10px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-azul-primary/20 outline-none"
                                                    />
                                                    <button
                                                        onClick={() => replacingPlayer && handleReplaceOneInPair(replacingPlayer, guestName, 1)}
                                                        className="absolute right-1.5 top-1.5 bottom-1.5 px-2 bg-azul-primary text-white rounded-lg text-[7px] font-black uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        SOLO P1
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-foreground/40 ml-1">Jugador 2</label>
                                                <div className="relative group">
                                                    <input
                                                        type="text"
                                                        value={guestName2}
                                                        onChange={e => setGuestName2(e.target.value)}
                                                        className="w-full bg-background/50 border border-border/50 rounded-xl p-3 pr-14 text-[10px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-azul-primary/20 outline-none"
                                                    />
                                                    <button
                                                        onClick={() => replacingPlayer && handleReplaceOneInPair(replacingPlayer, guestName2, 2)}
                                                        className="absolute right-1.5 top-1.5 bottom-1.5 px-2 bg-azul-primary text-white rounded-lg text-[7px] font-black uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        SOLO P2
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                                <button
                                    onClick={() => replacingPlayer && handleReplaceWithGuest(replacingPlayer.id)}
                                    className="w-full py-3 bg-azul-primary text-white rounded-xl font-black uppercase italic tracking-widest shadow-xl shadow-azul-primary/20 hover:bg-azul-primary/90 transition-all text-[10px]"
                                >
                                    Reemplazar {isIndividual ? 'Invitado' : 'Pareja Completa'}
                                </button>
                            </div>
                        </div>

                        {/* Database Search Section */}
                        <div className="space-y-3">
                            <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-azul-primary">Opción 2: Buscar en la Base</h3>
                            <div className="relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/20" />
                                <input
                                    type="text"
                                    placeholder="BUSCAR JUGADOR EXISTENTE..."
                                    value={playerSearchQuery}
                                    onChange={(e) => setPlayerSearchQuery(e.target.value)}
                                    className="w-full bg-muted/30 border border-border/50 rounded-xl py-2.5 pl-10 pr-3 text-[10px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-azul-primary/20 outline-none"
                                />
                            </div>

                            <div className="grid gap-1.5 overflow-y-auto max-h-[250px] pr-2 custom-scrollbar">
                                {isFetchLoading ? (
                                    <div className="p-8 flex flex-col items-center gap-3 text-foreground/40">
                                        <RefreshCw className="w-6 h-6 animate-spin" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Cargando base de datos...</span>
                                    </div>
                                ) : (
                                    allPotentialPlayers
                                        .filter(p => p.name.toLowerCase().includes(playerSearchQuery.toLowerCase()))
                                        .slice(0, 10)
                                        .map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => replacingPlayer && handleReplacePlayer(replacingPlayer.id, p)}
                                                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-muted/20 border border-border/30 hover:border-azul-primary/30 hover:bg-muted/30 transition-all group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-azul-primary/10 text-azul-primary flex items-center justify-center font-black text-[10px] uppercase">
                                                        {p.name.charAt(0)}
                                                    </div>
                                                    <div className="text-left">
                                                        <div className="text-xs font-black uppercase italic leading-none mb-0.5 group-hover:text-azul-primary transition-colors">{p.name}</div>
                                                        <div className="text-[9px] text-foreground/40 font-bold uppercase tracking-wider">{p.category || 'D'}</div>
                                                    </div>
                                                </div>
                                                <ArrowRight className="w-3.5 h-3.5 text-foreground/20 group-hover:text-azul-primary group-hover:translate-x-1 transition-all" />
                                            </button>
                                        ))
                                )}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Deletion Modal */}
            <Dialog open={!!playerToDelete} onOpenChange={() => setPlayerToDelete(null)}>
                <DialogContent className="max-w-md bg-card border-border/50 rounded-3xl p-8">
                    <DialogTitle className="sr-only">Eliminar Participante</DialogTitle>
                    <div className="space-y-6 text-center">
                        <div className="w-20 h-20 bg-rojo/10 rounded-3xl flex items-center justify-center mx-auto">
                            <Trash2 className="w-10 h-10 text-rojo" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-black uppercase italic tracking-tight">¿Eliminar Participante?</h2>
                            <p className="text-sm text-foreground/60 leading-relaxed">
                                Estás por eliminar a <span className="font-bold text-foreground">{playerToDelete?.name}</span> del torneo.
                                <br />Esta acción quitará sus partidos y afectará los grupos.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-4">
                            <button
                                onClick={() => setPlayerToDelete(null)}
                                className="py-4 bg-muted/50 text-foreground/60 rounded-2xl font-black uppercase tracking-widest hover:bg-muted transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => playerToDelete && handleDeletePlayer(playerToDelete.id)}
                                className="py-4 bg-rojo text-white rounded-2xl font-black uppercase italic tracking-widest shadow-xl shadow-rojo/20 hover:bg-rojo/90 transition-all"
                            >
                                Sí, Eliminar
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
