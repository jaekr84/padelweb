"use client";

import { CreditCard, UserCheck, Search, Plus, Power, PowerOff } from "lucide-react";

// Shared attendance list used by both Americano and Robin (group) setups so the
// "Asistencia" phase looks and behaves identically across tournament systems.
// For pair teams each member is checked in individually via a per-member id
// ("teamId_0" / "teamId_1"); individual tournaments use the plain player id.
//
// Dos variantes sobre la misma lista y el mismo set (`present`):
//  - "asistencia": check-in clásico (presente + pago). Lo usa Americano.
//  - "habilitacion": un solo toggle habilitar/deshabilitar, sin pago. Lo usa
//    Robin, donde arrancan todos habilitados y se deshabilita al que no juega.

export interface SplitAttendancePlayer {
    id: string;
    name: string;
    email?: string | null;
    category?: string | null;
    player1?: string | null;
    player2?: string | null;
}

interface SplitAttendanceListProps {
    players: SplitAttendancePlayer[];
    isIndividual?: boolean;
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    categoryFilter: string;
    setCategoryFilter: (c: string) => void;
    categories: string[];
    paid: Set<string>;
    togglePaid: (checkinId: string) => void;
    present: Set<string>;
    togglePresent: (checkinId: string) => void;
    onCheckAll: (type: 'paid' | 'present') => void;
    onInscribir?: () => void;
    variant?: "asistencia" | "habilitacion";
}

export function SplitAttendanceList({
    players,
    isIndividual = false,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    categories,
    paid,
    togglePaid,
    present,
    togglePresent,
    onCheckAll,
    onInscribir,
    variant = "asistencia",
}: SplitAttendanceListProps) {
    const isHabilitacion = variant === "habilitacion";
    const presentCount = present.size;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2.5">
                    <div className="w-[3px] h-8 bg-volt rounded-full" />
                    <div>
                        <h2 className="heading-sport text-base text-foreground">{isHabilitacion ? "Jugadores" : "Asistencia"}</h2>
                        <p className="label-tech text-[8px] text-muted-foreground mt-0.5">Panel de Control Técnico</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="label-tech text-[8px] text-muted-foreground bg-surface border border-hairline rounded-lg px-2.5 py-1.5">
                        <span className="text-volt-ink text-scoreboard">{presentCount}</span> {isHabilitacion ? "habilitados" : "presentes"}
                    </span>
                    {onInscribir && (
                        <button
                            onClick={onInscribir}
                            className="px-3 py-1.5 bg-celeste text-carbon-950 rounded-lg label-tech text-[8px] hover:bg-celeste-light shadow-lg shadow-celeste/20 transition-all flex items-center gap-1.5"
                        >
                            <Plus className="w-3 h-3" />
                            Inscribir
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-card border border-hairline rounded-xl overflow-hidden shadow-[0_24px_60px_-24px_rgba(0,0,0,0.8)]">
                <div className="px-4 py-2.5 border-b border-hairline flex flex-col md:flex-row gap-3 bg-surface">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Filtrar por nombre..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-surface border border-hairline rounded-lg py-2 pl-9 pr-3 text-[11px] font-bold text-foreground outline-none focus:border-celeste/60 focus:ring-1 focus:ring-celeste/40 transition-all placeholder:text-subtle"
                        />
                    </div>
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="bg-surface border border-hairline rounded-lg px-3 py-2 text-[9px] font-black uppercase tracking-wider text-muted-foreground outline-none focus:border-celeste/60 cursor-pointer"
                    >
                        <option value="all">Categoría (Todas)</option>
                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>
                <div className="px-4 py-2 flex items-center justify-between bg-surface border-b border-hairline">
                    <span className="label-tech text-[8px] text-muted-foreground">Lista de Jugadores</span>
                    <div className="flex gap-4">
                        {!isHabilitacion && (
                            <button onClick={() => onCheckAll('paid')} className="label-tech text-[8px] text-celeste hover:text-foreground transition-colors">Todo Pago</button>
                        )}
                        <button onClick={() => onCheckAll('present')} className="label-tech text-[8px] text-volt-ink hover:text-foreground transition-colors">
                            {isHabilitacion ? "Habilitar Todos" : "Todo Ok"}
                        </button>
                    </div>
                </div>
                <div className="">
                    {(() => {
                        const flatPlayers: any[] = [];
                        players.forEach(p => {
                            const matchesSearchFilter = !searchQuery ||
                                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                (p.email?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                                p.id.toLowerCase().includes(searchQuery.toLowerCase());

                            const matchesCategoryFilter = categoryFilter === "all" || p.category === categoryFilter;

                            if (matchesSearchFilter && matchesCategoryFilter) {
                                if (isIndividual) {
                                    flatPlayers.push({ ...p, checkinId: p.id, displayName: p.name });
                                } else {
                                    const names = p.name.split(" / ");
                                    flatPlayers.push({
                                        ...p,
                                        checkinId: `${p.id}_0`,
                                        displayName: p.player1 || names[0] || "Jugador 1",
                                        pairName: p.name
                                    });
                                    flatPlayers.push({
                                        ...p,
                                        checkinId: `${p.id}_1`,
                                        displayName: p.player2 || names[1] || "Jugador 2",
                                        pairName: p.name,
                                        isSecond: true
                                    });
                                }
                            }
                        });

                        return flatPlayers.map(p => {
                            const isPaid = paid.has(p.checkinId);
                            const isPresent = present.has(p.checkinId);

                            return (
                                <div
                                    key={p.checkinId}
                                    className={`group flex items-center justify-between gap-3 px-4 py-2 border-b border-white/[0.08] last:border-0 transition-colors ${isPresent
                                        ? "bg-volt/[0.1] hover:bg-volt/[0.14]"
                                        : isHabilitacion
                                            ? "opacity-45 hover:opacity-70 hover:bg-surface"
                                            : "hover:bg-surface"}`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        {/* Barra de estado: separa presentes/habilitados del resto de un vistazo */}
                                        <div className={`w-[3px] h-7 rounded-full shrink-0 ${isPresent ? "bg-volt" : "bg-surface-raised"}`} />
                                        <div className="flex flex-col min-w-0">
                                            <p className={`text-[11px] font-black uppercase italic tracking-tight truncate ${isPresent ? "text-foreground" : "text-muted-foreground"} ${isHabilitacion && !isPresent ? "line-through decoration-1" : ""}`}>
                                                {p.displayName}
                                            </p>
                                            {!isIndividual && (
                                                <p className="label-tech text-[7px] text-subtle leading-none mt-0.5 truncate">
                                                    {p.pairName}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {isHabilitacion && !isPresent && (
                                            <span className="label-tech text-[7px] text-muted-foreground">No juega</span>
                                        )}
                                        {!isHabilitacion && (
                                            <button
                                                onClick={() => togglePaid(p.checkinId)}
                                                className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all ${isPaid
                                                    ? "bg-celeste border-celeste text-carbon-950 shadow-lg shadow-celeste/30"
                                                    : "border-hairline-strong bg-surface text-muted-foreground hover:border-celeste hover:text-celeste"}`}
                                                title={isPaid ? "Pago registrado" : "Marcar como pago"}
                                            >
                                                <CreditCard className="w-3 h-3" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => togglePresent(p.checkinId)}
                                            className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all ${isPresent
                                                ? "bg-volt border-volt text-carbon-950 shadow-lg shadow-volt/30"
                                                : "border-hairline-strong bg-surface text-muted-foreground hover:border-volt hover:text-volt-ink"}`}
                                            title={isHabilitacion
                                                ? (isPresent ? "Deshabilitar jugador" : "Habilitar jugador")
                                                : (isPresent ? "Presente" : "Marcar presente")}
                                        >
                                            {isHabilitacion
                                                ? (isPresent ? <Power className="w-3 h-3" /> : <PowerOff className="w-3 h-3" />)
                                                : <UserCheck className="w-3 h-3" />}
                                        </button>
                                    </div>
                                </div>
                            );
                        });
                    })()}
                </div>
            </div>
        </div>
    );
}
