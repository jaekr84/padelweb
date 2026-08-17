// El acumulado histórico, al costado de la lista.
//
// Los primeros 20 y nada más: el resto está en /desafio/ranking. La tarjeta se
// estira al alto de la columna de desafíos (`h-full` sobre la celda del grid) y
// la lista scrollea adentro, así las dos columnas terminan parejas sin importar
// cuántos jugadores haya.

"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Trophy } from "lucide-react";
import PlayerProfileModal from "@/components/PlayerProfileModal";
import type { FilaRankingGeneralUI } from "./actions/ranking";

/** Cuántos entran en la tarjeta del costado. */
const DESTACADOS = 20;

export default function RankingGeneral({
    filas,
    userId,
}: {
    filas: FilaRankingGeneralUI[];
    userId: string | null;
}) {
    // Jugador cuyo perfil se está mirando. Los invitados no abren nada: no
    // tienen cuenta ni historial de torneos que mostrar.
    const [verPerfil, setVerPerfil] = useState<string | null>(null);

    const podio = filas.slice(0, DESTACADOS);
    // Si quedaste afuera del top, igual te mostramos dónde estás.
    const yo = userId ? filas.find((f) => f.userId === userId) : undefined;
    const yoAfuera = yo && yo.posicion > DESTACADOS ? yo : null;

    return (
        <aside className="lg:absolute lg:inset-0 flex flex-col rounded-2xl border border-hairline bg-card shadow-lg shadow-black/40 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-hairline bg-background/60">
                <Trophy className="w-3.5 h-3.5 text-gold-ink shrink-0" />
                <span className="label-tech text-[8px] text-gold-ink">Ranking general</span>
            </div>

            {filas.length === 0 ? (
                <div className="p-4">
                    <p className="text-[11px] text-subtle text-center py-4">
                        Todavía no hay puntos cargados.
                    </p>
                </div>
            ) : (
                <>
                    {/*
                      En desktop la lista se estira para llenar la tarjeta
                      (`flex-1` + `min-h-0`, que es lo que habilita el scroll
                      interno). Apilada no hay columna que igualar y la tarjeta no
                      tiene alto propio, así que ahí manda el contenido con un
                      tope: con `flex-1` y base 0 la lista colapsaría a nada.
                    */}
                    <ul className="max-h-[60vh] overflow-y-auto lg:max-h-none lg:flex-1 lg:min-h-0">
                        {podio.map((f) => (
                            <Fila key={f.userId} f={f} esVos={f.userId === userId} onVer={() => setVerPerfil(f.userId)} />
                        ))}
                    </ul>

                    {yoAfuera && (
                        <ul className="border-t border-dashed border-hairline shrink-0">
                            <Fila f={yoAfuera} esVos onVer={() => setVerPerfil(yoAfuera.userId)} />
                        </ul>
                    )}

                    <Link
                        href="/desafio/ranking"
                        className="flex items-center justify-center gap-1.5 px-4 py-2.5 border-t border-hairline label-tech text-[8px] text-muted-foreground hover:text-foreground hover:bg-muted transition-all shrink-0"
                    >
                        Ver ranking completo ({filas.length})
                        <ChevronRight className="w-3 h-3" />
                    </Link>
                </>
            )}

            {verPerfil && (
                <PlayerProfileModal userId={verPerfil} currentUserId={userId} onClose={() => setVerPerfil(null)} />
            )}
        </aside>
    );
}

function Fila({ f, esVos, onVer }: { f: FilaRankingGeneralUI; esVos: boolean; onVer: () => void }) {
    return (
        <li
            onClick={f.esInvitado ? undefined : onVer}
            className={`flex items-center gap-3 px-4 py-2 border-b border-hairline last:border-0 ${esVos ? "bg-volt/[0.06]" : ""} ${f.esInvitado ? "" : "cursor-pointer hover:bg-muted transition-colors"}`}
        >
            <span
                className={`inline-flex items-center justify-center w-6 h-6 rounded text-scoreboard text-[11px] shrink-0 ${f.posicion === 1
                    ? "bg-gold/20 text-gold-ink"
                    : f.posicion === 2
                        ? "bg-silver/20 text-silver-ink"
                        : f.posicion === 3
                            ? "bg-bronze/20 text-bronze-ink"
                            : "text-subtle"
                    }`}
            >
                {f.posicion}
            </span>

            <div className="min-w-0 flex-1">
                <div className="text-[12px] font-bold text-foreground truncate">
                    {f.nombre}
                    {esVos && <span className="ml-1.5 text-[8px] font-black uppercase text-volt-ink">Vos</span>}
                    {f.esInvitado && <span className="ml-1.5 text-[8px] font-black uppercase text-subtle">Inv</span>}
                </div>
                <div className="label-tech text-[7px] text-subtle mt-0.5">
                    {f.desafios} {f.desafios === 1 ? "desafío" : "desafíos"} · {f.ganados} PG
                </div>
            </div>

            <span className="text-scoreboard text-[15px] text-volt-ink shrink-0 tabular-nums">{f.puntos}</span>
        </li>
    );
}
