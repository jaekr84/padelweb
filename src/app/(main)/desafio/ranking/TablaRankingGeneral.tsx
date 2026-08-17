"use client";

// La tabla del acumulado. Es cliente sólo por el modal de perfil: tocar una fila
// abre el detalle del jugador sin salir del ranking.

import { useState } from "react";
import PlayerProfileModal from "@/components/PlayerProfileModal";
import type { FilaRankingGeneralUI } from "../actions/ranking";

export default function TablaRankingGeneral({
    filas,
    userId,
}: {
    filas: FilaRankingGeneralUI[];
    userId: string | null;
}) {
    // Los invitados no abren nada: no tienen cuenta ni historial que mostrar.
    const [verPerfil, setVerPerfil] = useState<string | null>(null);

    return (
        <>
        {filas.length === 0 ? (
            <div className="rounded-2xl border border-hairline bg-card shadow-lg shadow-black/40 p-8 text-center">
                <p className="text-[12px] text-subtle">Todavía no hay puntos cargados.</p>
            </div>
        ) : (
            <div className="overflow-x-auto rounded-2xl border border-hairline bg-card shadow-lg shadow-black/40">
                <table className="w-full">
                    <thead>
                        <tr className="text-[9px] font-black uppercase tracking-widest text-subtle border-b border-hairline bg-muted">
                            <th className="py-2.5 pl-4 pr-1 w-12 text-center">#</th>
                            <th className="py-2.5 px-2 text-left">Jugador</th>
                            <th className="py-2.5 px-2 text-center hidden sm:table-cell">Desafíos</th>
                            <th className="py-2.5 px-2 text-center">PJ</th>
                            <th className="py-2.5 px-2 text-center">PG</th>
                            <th className="py-2.5 px-2 text-center hidden sm:table-cell">Dif</th>
                            <th className="py-2.5 pr-4 pl-2 text-right">Puntos</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filas.map((f) => (
                            <tr
                                key={f.userId}
                                onClick={f.esInvitado ? undefined : () => setVerPerfil(f.userId)}
                                className={`border-b border-hairline last:border-0 ${f.userId === userId ? "bg-volt/[0.06]" : ""} ${f.esInvitado ? "" : "cursor-pointer hover:bg-muted transition-colors"}`}
                            >
                                <td className="py-2 pl-4 pr-1 text-center">
                                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-scoreboard text-[11px] ${f.posicion === 1 ? "bg-gold/20 text-gold-ink" : f.posicion === 2 ? "bg-silver/20 text-silver-ink" : f.posicion === 3 ? "bg-bronze/20 text-bronze-ink" : "text-subtle"}`}>
                                        {f.posicion}
                                    </span>
                                </td>
                                <td className="py-2 px-2 text-[12px] font-bold text-foreground truncate">
                                    {f.nombre}
                                    {f.userId === userId && <span className="ml-1.5 text-[8px] font-black uppercase text-volt-ink">Vos</span>}
                                    {f.categoria && <span className="ml-1.5 text-[9px] font-black uppercase text-celeste-light">{f.categoria}</span>}
                                    {f.esInvitado && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-muted border border-hairline text-[8px] font-black uppercase text-subtle">Invitado</span>}
                                </td>
                                <td className="py-2 px-2 text-center hidden sm:table-cell text-[12px] text-muted-foreground tabular-nums">{f.desafios}</td>
                                <td className="py-2 px-2 text-center text-[12px] text-muted-foreground tabular-nums">{f.jugados}</td>
                                <td className="py-2 px-2 text-center text-[12px] text-emerald-400 tabular-nums">{f.ganados}</td>
                                <td className={`py-2 px-2 text-center hidden sm:table-cell text-[11px] tabular-nums ${f.difGames >= 0 ? "text-emerald-400" : "text-rojo"}`}>
                                    {f.difGames > 0 ? "+" : ""}{f.difGames}
                                </td>
                                <td className="py-2 pr-4 pl-2 text-right text-scoreboard text-[15px] text-volt-ink">{f.puntos}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

            {verPerfil && (
                <PlayerProfileModal userId={verPerfil} currentUserId={userId} onClose={() => setVerPerfil(null)} />
            )}
        </>
    );
}
