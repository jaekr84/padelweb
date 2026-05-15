"use client";

import { Search, Users2, CreditCard, UserCheck, Trash2, RotateCcw, ChevronRight, Plus } from "lucide-react";
import { Player } from "./types";

interface TournamentAttendanceProps {
    readOnly: boolean;
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    allPlayers: Player[];
    present: Set<string>;
    togglePresent: (id: string) => void;
    paid: Set<string>;
    togglePaid: (id: string) => void;
    setPlayerToDelete: (p: Player | null) => void;
    setReplacingPlayer: (p: Player | null) => void;
    onContinue: () => void;
    bulkUpdateStatus?: (type: 'present' | 'paid', ids: string[]) => void;
    onAddPlayer?: () => void;
}

export function TournamentAttendance({
    readOnly,
    searchQuery,
    setSearchQuery,
    allPlayers,
    present,
    togglePresent,
    paid,
    togglePaid,
    setPlayerToDelete,
    setReplacingPlayer,
    onContinue,
    bulkUpdateStatus,
    onAddPlayer
}: TournamentAttendanceProps) {
    const filteredPlayers = allPlayers.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));


    return (
        <div className="w-full space-y-4">
            <div className="text-center space-y-0.5">
                <h2 className="text-base md:text-lg font-black text-foreground tracking-tighter uppercase italic">Lista de Asistencia</h2>
                <p className="text-celeste text-[7px] font-black uppercase tracking-[0.3em]">Verificación y Presentismo</p>
            </div>

            {/* Control Bar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-2 p-2 bg-card/40 backdrop-blur-xl border border-border/50 rounded-xl shadow-lg">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/20" />
                    <input
                        type="text"
                        placeholder="Buscar participante..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-muted/50 border border-border/50 rounded-lg py-2 pl-10 pr-3 text-[10px] font-bold outline-none focus:border-azul-primary transition-all placeholder:text-foreground/20"
                    />
                </div>
                {!readOnly && (
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        {onAddPlayer && (
                            <button
                                onClick={onAddPlayer}
                                className="flex-1 md:flex-none px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-xl font-black uppercase text-[8px] tracking-widest border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all shadow-lg shadow-emerald-500/5 flex items-center justify-center gap-2"
                            >
                                <Plus className="w-3 h-3" />
                                Agregar Jugador
                            </button>
                        )}
                        <button
                            onClick={() => {
                                const allIds = allPlayers.map(p => p.id);
                                if (bulkUpdateStatus) {
                                    bulkUpdateStatus('paid', paid.size === allIds.length ? [] : allIds);
                                }
                            }}
                            className="flex-1 md:flex-none px-4 py-2 bg-azul-primary/10 text-azul-primary rounded-xl font-black uppercase text-[8px] tracking-widest border border-azul-primary/20 hover:bg-azul-primary hover:text-white transition-all shadow-lg shadow-azul-primary/5"
                        >
                            Todo Pago
                        </button>
                        <button
                            onClick={() => {
                                const allIds = allPlayers.map(p => p.id);
                                if (bulkUpdateStatus) {
                                    bulkUpdateStatus('present', present.size === allIds.length ? [] : allIds);
                                }
                            }}
                            className="flex-1 md:flex-none px-4 py-2 bg-celeste/10 text-celeste rounded-xl font-black uppercase text-[8px] tracking-widest border border-celeste/20 hover:bg-celeste hover:text-white transition-all shadow-lg shadow-celeste/5"
                        >
                            Todo Ok
                        </button>
                    </div>
                )}
            </div>

            {/* Players Table */}
            <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left">
                    <thead className="bg-muted text-[8px] font-black uppercase tracking-[0.2em] text-foreground/40 border-b border-border/50">
                        <tr>
                            <th className="px-3 py-1.5">Jugador</th>
                            <th className="px-3 py-1.5">Cat</th>
                            <th className="px-3 py-1.5 text-center">Pago</th>
                            <th className="px-3 py-1.5 text-center">Asistencia</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {filteredPlayers.map((p) => {
                            const isPresent = present.has(p.id);
                            const isPaid = paid.has(p.id);
                            return (
                                <tr
                                    key={p.id}
                                    className={`group transition-all hover:bg-muted/30 ${isPresent ? "bg-celeste/[0.02]" : ""}`}
                                >
                                    <td className="px-3 py-1">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all ${isPresent ? "bg-celeste text-white" : "bg-muted text-foreground/20"}`}>
                                                <Users2 className="w-3 h-3" />
                                            </div>
                                            <span className={`font-black uppercase text-[10px] tracking-tight transition-colors ${isPresent ? "text-foreground" : "text-foreground/70"}`}>{p.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-1">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-foreground/40">{p.category || "D"}</span>
                                    </td>
                                    <td className="px-3 py-1 text-center">
                                        <button
                                            onClick={() => togglePaid(p.id)}
                                            disabled={readOnly}
                                            className={`w-7 h-7 rounded-lg inline-flex items-center justify-center border transition-all transform active:scale-90 ${isPaid
                                                ? "bg-azul-primary border-azul-primary text-white shadow-lg shadow-azul-primary/20"
                                                : "bg-muted/30 border-border/40 text-foreground/20 hover:border-azul-primary/30 hover:text-azul-primary"
                                                } ${readOnly ? "cursor-default opacity-80" : ""}`}
                                        >
                                            <CreditCard className="w-3 h-3" />
                                        </button>
                                    </td>
                                    <td className="px-3 py-1 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            {!readOnly && (
                                                <>
                                                    <button
                                                        onClick={() => setPlayerToDelete(p)}
                                                        className="w-7 h-7 rounded-lg inline-flex items-center justify-center border border-border/40 bg-muted/30 text-foreground/20 hover:border-rojo/30 hover:text-rojo transition-all transform active:scale-90"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={() => setReplacingPlayer(p)}
                                                        className="w-7 h-7 rounded-lg inline-flex items-center justify-center border border-border/40 bg-muted/30 text-foreground/20 hover:border-azul-primary/30 hover:text-azul-primary transition-all transform active:scale-90"
                                                        title="Reemplazar"
                                                    >
                                                        <RotateCcw className="w-3 h-3" />
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                onClick={() => togglePresent(p.id)}
                                                disabled={readOnly}
                                                className={`w-7 h-7 rounded-lg inline-flex items-center justify-center border transition-all transform active:scale-90 ${isPresent
                                                    ? "bg-celeste border-celeste text-white shadow-lg shadow-celeste/20"
                                                    : "bg-muted/30 border-border/40 text-foreground/20 hover:border-celeste/30 hover:text-celeste"
                                                    } ${readOnly ? "cursor-default opacity-80" : ""}`}
                                            >
                                                <UserCheck className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {!readOnly && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] w-full max-w-xs px-6">
                    <button
                        onClick={onContinue}
                        disabled={present.size < 2}
                        className="w-full py-3.5 bg-celeste text-white rounded-2xl font-black uppercase italic tracking-widest shadow-xl shadow-celeste/30 hover:bg-celeste/90 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale text-sm"
                    >
                        Iniciar Torneo ({present.size})
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
    );
}
