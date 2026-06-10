"use client";

import {
    Search, Users2, CreditCard, Trash2, RotateCcw,
    UserCheck, ChevronRight
} from "lucide-react";
import { Player, Group } from "./types";
import { pairNames, memberKey, isMemberChecked, isTeamChecked, checkKeysFor } from "./attendance-utils";

interface AmericanoAttendanceProps {
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    readOnly?: boolean;
    groups: Group[];
    present: Set<string>;
    togglePresent: (id: string) => void;
    paid: Set<string>;
    togglePaid: (id: string) => void;
    setPlayerToDelete: (p: Player) => void;
    setReplacingPlayer: (p: Player) => void;
    setStep: (step: "active") => void;
    bulkUpdateStatus: (type: 'present' | 'paid', ids: string[]) => void;
}

export function AmericanoAttendance({
    searchQuery,
    setSearchQuery,
    readOnly,
    groups,
    present,
    togglePresent,
    paid,
    togglePaid,
    setPlayerToDelete,
    setReplacingPlayer,
    setStep,
    bulkUpdateStatus
}: AmericanoAttendanceProps) {
    const players = groups[0]?.players || [];
    // Teams ready to play (pairs need both members present)
    const presentTeamsCount = players.filter(p => isTeamChecked(present, p)).length;

    return (
        <div className="w-full space-y-3 pb-32">
            <div className="text-center space-y-0.5">
                <h2 className="text-sm font-black text-foreground tracking-tighter uppercase italic leading-none">Lista de Asistencia</h2>
                <p className="text-azul-primary text-[6px] font-black uppercase tracking-[0.4em]">Verificación Técnica de Participantes</p>
            </div>

            {/* Control Bar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-1.5 p-1.5 bg-card/40 backdrop-blur-xl border border-border/50 rounded-lg shadow-sm">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-foreground/20" />
                    <input
                        type="text"
                        placeholder="Buscar participante..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-muted/30 border border-border/40 rounded-md py-1.5 pl-8 pr-3 text-[9px] font-bold outline-none focus:ring-1 focus:ring-azul-primary transition-all placeholder:text-foreground/20"
                    />
                </div>
                {!readOnly && (
                    <div className="flex items-center gap-1.5 w-full md:w-auto">
                        <button
                            onClick={() => {
                                const allIds = players.flatMap(checkKeysFor);
                                bulkUpdateStatus('paid', allIds);
                            }}
                            className="flex-1 md:flex-none px-3 py-1.5 bg-azul-primary/5 text-azul-primary rounded-md font-black uppercase text-[7px] tracking-widest border border-azul-primary/20 hover:bg-azul-primary hover:text-white transition-all"
                        >
                            Todo Pago
                        </button>
                        <button
                            onClick={() => {
                                const allIds = players.flatMap(checkKeysFor);
                                bulkUpdateStatus('present', allIds);
                            }}
                            className="flex-1 md:flex-none px-3 py-1.5 bg-azul-primary/5 text-azul-primary rounded-md font-black uppercase text-[7px] tracking-widest border border-azul-primary/20 hover:bg-azul-primary hover:text-white transition-all"
                        >
                            Todo Ok
                        </button>
                    </div>
                )}
            </div>

            {/* Players Table */}
            <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-lg overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-muted text-[7px] font-black uppercase tracking-[0.2em] text-foreground/40 border-b border-border/40">
                        <tr>
                            <th className="px-2.5 py-1">Jugador</th>
                            <th className="px-2.5 py-1">Cat</th>
                            <th className="px-2.5 py-1 text-center">Pago</th>
                            <th className="px-2.5 py-1 text-center">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                        {players.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map((p) => {
                            const memberNames = pairNames(p);
                            const isPair = memberNames.length > 1;
                            const isPresent = isTeamChecked(present, p);
                            const paidBtnClass = (checked: boolean) => `w-6 h-6 rounded inline-flex items-center justify-center border transition-all transform active:scale-95 ${checked
                                ? "bg-azul-primary border-azul-primary text-white shadow-sm"
                                : "bg-muted/30 border-border/40 text-foreground/20 hover:border-azul-primary/30 hover:text-azul-primary"
                                } ${readOnly ? "cursor-default opacity-80" : ""}`;
                            return (
                                <tr
                                    key={p.id}
                                    className={`group transition-all hover:bg-muted/30 ${isPresent ? "bg-azul-primary/[0.02]" : ""}`}
                                >
                                    <td className="px-2.5 py-1">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition-all ${isPresent ? "bg-azul-primary text-white" : "bg-muted text-foreground/20"}`}>
                                                <Users2 className="w-2.5 h-2.5" />
                                            </div>
                                            {isPair ? (
                                                <div className="flex flex-col gap-1">
                                                    {memberNames.map((n, i) => (
                                                        <span key={i} className={`font-black uppercase text-[9px] tracking-tight transition-colors h-6 flex items-center ${isMemberChecked(present, p.id, (i + 1) as 1 | 2) ? "text-foreground" : "text-foreground/70"}`}>{n}</span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className={`font-black uppercase text-[9px] tracking-tight transition-colors ${isPresent ? "text-foreground" : "text-foreground/70"}`}>{p.name}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-2.5 py-1">
                                        <span className="text-[7px] font-black uppercase tracking-widest text-foreground/30">{p.category || "D"}</span>
                                    </td>
                                    <td className="px-2.5 py-1 text-center">
                                        {isPair ? (
                                            <div className="flex flex-col items-center gap-1">
                                                {([1, 2] as const).map(slot => (
                                                    <button
                                                        key={slot}
                                                        onClick={() => !readOnly && togglePaid(memberKey(p.id, slot))}
                                                        disabled={readOnly}
                                                        title={`Pago: ${memberNames[slot - 1]}`}
                                                        className={paidBtnClass(isMemberChecked(paid, p.id, slot))}
                                                    >
                                                        <CreditCard className="w-2.5 h-2.5" />
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => !readOnly && togglePaid(p.id)}
                                                disabled={readOnly}
                                                className={paidBtnClass(paid.has(p.id))}
                                            >
                                                <CreditCard className="w-2.5 h-2.5" />
                                            </button>
                                        )}
                                    </td>
                                    <td className="px-2.5 py-1 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            {!readOnly && (
                                                <>
                                                    <button
                                                        onClick={() => setPlayerToDelete(p)}
                                                        className="w-6 h-6 rounded inline-flex items-center justify-center border border-border/40 bg-muted/30 text-foreground/20 hover:border-rojo/30 hover:text-rojo transition-all transform active:scale-95"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="w-2.5 h-2.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => setReplacingPlayer(p)}
                                                        className="w-6 h-6 rounded inline-flex items-center justify-center border border-border/40 bg-muted/30 text-foreground/20 hover:border-azul-primary/30 hover:text-azul-primary transition-all transform active:scale-95"
                                                        title="Reemplazar"
                                                    >
                                                        <RotateCcw className="w-2.5 h-2.5" />
                                                    </button>
                                                </>
                                            )}
                                            {isPair ? (
                                                <div className="flex flex-col items-center gap-1">
                                                    {([1, 2] as const).map(slot => (
                                                        <button
                                                            key={slot}
                                                            onClick={() => !readOnly && togglePresent(memberKey(p.id, slot))}
                                                            disabled={readOnly}
                                                            title={`Presente: ${memberNames[slot - 1]}`}
                                                            className={paidBtnClass(isMemberChecked(present, p.id, slot))}
                                                        >
                                                            <UserCheck className="w-2.5 h-2.5" />
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => !readOnly && togglePresent(p.id)}
                                                    disabled={readOnly}
                                                    className={paidBtnClass(isPresent)}
                                                >
                                                    <UserCheck className="w-2.5 h-2.5" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {!readOnly && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-full max-w-xs px-4">
                    <button
                        onClick={() => setStep("active")}
                        disabled={presentTeamsCount < 2}
                        className="w-full py-2.5 bg-azul-primary text-white rounded-xl font-black uppercase italic tracking-widest shadow-lg shadow-azul-primary/20 hover:bg-azul-dark hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale text-[11px]"
                    >
                        Iniciar Torneo ({presentTeamsCount})
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
}
