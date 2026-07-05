"use client";

import { CreditCard, UserCheck, Search, Plus } from "lucide-react";

// Shared attendance list used by both Americano and Robin (group) setups so the
// "Asistencia" phase looks and behaves identically across tournament systems.
// For pair teams each member is checked in individually via a per-member id
// ("teamId_0" / "teamId_1"); individual tournaments use the plain player id.

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
}: SplitAttendanceListProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <div>
                    <h2 className="text-sm font-black uppercase italic tracking-tight text-foreground">Asistencia</h2>
                    <p className="text-foreground/40 text-[6px] font-black tracking-[0.4em] uppercase">Panel de Control Técnico</p>
                </div>
                {onInscribir && (
                    <div className="flex gap-2">
                        <button
                            onClick={onInscribir}
                            className="px-2.5 py-1.5 bg-azul-primary text-white rounded-lg font-black uppercase italic text-[7px] tracking-widest hover:bg-azul-dark shadow-sm transition-all flex items-center gap-1.5"
                        >
                            <Plus className="w-3 h-3" />
                            Inscribir
                        </button>
                    </div>
                )}
            </div>

            <div className="bg-card/40 backdrop-blur-xl border border-border/40 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-2 border-b border-border/40 flex flex-col md:flex-row gap-3 bg-muted/10">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/20" />
                        <input
                            type="text"
                            placeholder="Filtrar por nombre..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-muted/20 border border-border/40 rounded-lg py-1.5 pl-9 pr-3 text-[9px] font-bold outline-none focus:ring-1 focus:ring-azul-primary transition-all placeholder:text-foreground/20"
                        />
                    </div>
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="bg-muted/20 border border-border/40 rounded-lg px-3 py-1.5 text-[8px] font-black uppercase outline-none focus:ring-1 focus:ring-azul-primary cursor-pointer"
                    >
                        <option value="all">Categoría (Todas)</option>
                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>
                <div className="px-4 py-1.5 flex items-center justify-between bg-muted/5 border-b border-border/30">
                    <span className="text-[6px] font-black uppercase tracking-[0.4em] text-foreground/20">Lista de Jugadores</span>
                    <div className="flex gap-3">
                        <button onClick={() => onCheckAll('paid')} className="text-[7px] font-black uppercase tracking-widest text-azul-primary/60 hover:text-azul-primary transition-colors">Todo Pago</button>
                        <button onClick={() => onCheckAll('present')} className="text-[7px] font-black uppercase tracking-widest text-azul-primary/60 hover:text-azul-primary transition-colors">Todo Ok</button>
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
                                <div key={p.checkinId} className={`flex items-center justify-between px-4 py-1 border-b border-border/30 last:border-0 transition-all duration-300 ${isPresent ? "bg-azul-primary/[0.03]" : "bg-card"}`}>
                                    <div className="flex flex-col">
                                        <p className={`text-[9px] font-black uppercase transition-colors ${isPresent ? "text-foreground" : "text-foreground/50"}`}>
                                            {p.displayName}
                                        </p>
                                        {!isIndividual && (
                                            <p className="text-[6px] text-foreground/20 font-black uppercase tracking-[0.2em] leading-none">
                                                Equipo • {p.pairName}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex gap-1.5">
                                        <button
                                            onClick={() => togglePaid(p.checkinId)}
                                            className={`w-6 h-6 rounded flex items-center justify-center border transition-all ${isPaid ? "bg-azul-primary border-azul-primary text-white shadow-sm" : "border-border/40 text-foreground/10 hover:text-azul-primary/40"}`}
                                            title="Pago"
                                        >
                                            <CreditCard className="w-2.5 h-2.5" />
                                        </button>
                                        <button
                                            onClick={() => togglePresent(p.checkinId)}
                                            className={`w-6 h-6 rounded flex items-center justify-center border transition-all ${isPresent ? "bg-azul-primary border-azul-primary text-white shadow-sm" : "border-border/40 text-foreground/10 hover:text-azul-primary/40"}`}
                                            title="Presente"
                                        >
                                            <UserCheck className="w-2.5 h-2.5" />
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
