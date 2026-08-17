"use client";

// El detalle de un desafío: todo lo que antes vivía dentro de la tarjeta de la
// lista y la hacía impracticable — inscriptos, quién está sin pareja y la tabla
// de posiciones completa.

import { useState } from "react";
import Link from "next/link";
import {
    AlertTriangle, ArrowLeft, CalendarDays, Check, ChevronRight, Clock, MapPin,
    Radio, Ticket, Trophy, Users,
} from "lucide-react";
import {
    ESTADO_DESAFIO, ETIQUETA_ESTADO_DESAFIO, ETIQUETA_LADO, LADO,
} from "@/lib/desafio";
import { ChipCategoria, periodo } from "../../gestionDesafio/GestionDesafiosClient";
import type { DetalleDesafio } from "../actions/publico";
import { darmeDeBaja, inscribirme } from "../actions/inscripciones";
import { cargarResultado } from "../actions/partidos";
import PlayerProfileModal from "@/components/PlayerProfileModal";
import { Dato, Modal, ModalResultado, useAccion } from "../piezas";

export default function DesafioDetalleClient({ datos }: { datos: DetalleDesafio }) {
    const { pendiente, correr } = useAccion();
    const [verInscriptos, setVerInscriptos] = useState(false);
    const [eligiendoLado, setEligiendoLado] = useState(false);
    const [cargando, setCargando] = useState(false);
    // Jugador de la tabla cuyo perfil se está mirando.
    const [verPerfil, setVerPerfil] = useState<string | null>(null);

    const d = datos.desafio;
    const userId = datos.userId;
    const abierto = d.estado === ESTADO_DESAFIO.ABIERTO;
    const cerrado = d.estado === ESTADO_DESAFIO.CERRADO;

    const anotarse = (lado?: string) =>
        correr(() => inscribirme(d.id, lado), "¡Estás inscripto!", () => setEligiendoLado(false));

    return (
        <div className="space-y-5">
            <Link
                href="/desafio"
                className="inline-flex items-center gap-1.5 label-tech text-[8px] text-muted-foreground hover:text-foreground transition-colors"
            >
                <ArrowLeft className="w-3 h-3" />
                Todos los desafíos
            </Link>

            <article className="rounded-2xl border border-hairline bg-card shadow-lg shadow-black/40 overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-hairline bg-background/60">
                    <div className="flex items-center gap-2 min-w-0">
                        {abierto ? <span className="live-dot" /> : cerrado ? <Trophy className="w-3.5 h-3.5 text-gold-ink" /> : null}
                        <span className={`label-tech text-[8px] ${abierto ? "text-volt-ink" : cerrado ? "text-gold-ink" : "text-muted-foreground"}`}>
                            {ETIQUETA_ESTADO_DESAFIO[d.estado]}
                        </span>
                    </div>
                    <span className="label-tech text-[8px] text-subtle shrink-0">Individual</span>
                </div>

                <div className="p-5">
                    <div className="flex items-center gap-3.5">
                        <ChipCategoria nombres={d.categorias.map((c) => c.nombre)} size="lg" />
                        <div className="min-w-0">
                            <h1 className="heading-sport text-2xl text-foreground truncate">{d.nombre}</h1>
                            <p className="label-tech text-[7px] text-celeste mt-1.5">
                                {d.categorias.length === 0
                                    ? "Sin categoría"
                                    : `Categoría ${d.categorias.map((c) => c.nombre).join(", ")}`}
                            </p>
                        </div>
                    </div>

                    {d.descripcion && <p className="text-[12px] text-muted-foreground mt-3 leading-relaxed">{d.descripcion}</p>}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                        <Dato icono={CalendarDays} rotulo="Período" valor={periodo(d.fechaInicio, d.fechaFin)} />
                        <Dato icono={Clock} rotulo="Hora" valor={d.hora || "A confirmar"} />
                        <Dato icono={MapPin} rotulo="Lugar" valor={d.lugar || "A confirmar"} />
                        <Dato icono={Ticket} rotulo="Inscripción" valor={d.inscripcion ? `$${d.inscripcion.toLocaleString("es-AR")}` : "Gratis"} />
                    </div>

                    <div className="flex items-center justify-between gap-3 mt-3 px-3 py-2.5 rounded-xl bg-muted border border-hairline">
                        <div className="flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-celeste" />
                            <span className="label-tech text-[8px] text-muted-foreground">Inscriptos</span>
                        </div>
                        <span className="text-scoreboard text-[15px] text-foreground">
                            {d.inscriptos}{d.cupo > 0 ? `/${d.cupo}` : ""}
                        </span>
                    </div>

                    {datos.inscripto && (
                        <div className="mt-3 rounded-xl border border-volt/25 bg-volt/[0.05] p-3">
                            <div className="flex items-center gap-2 mb-1.5">
                                <Check className="w-3.5 h-3.5 text-volt-ink" />
                                <span className="label-tech text-[8px] text-volt-ink">Estás inscripto</span>
                                {datos.miLado && (
                                    <span className="label-tech text-[7px] text-muted-foreground">· jugás de {ETIQUETA_LADO[datos.miLado]}</span>
                                )}
                            </div>
                            <p className="text-[12px] text-muted-foreground">
                                {datos.miCompañero
                                    ? <>Tu pareja: <span className="text-foreground font-bold">{datos.miCompañero}</span></>
                                    : "Todavía no tenés pareja — el admin la arma desde el panel."}
                            </p>
                        </div>
                    )}

                    {datos.miPartido && (
                        <div className={`mt-3 rounded-xl border p-3 ${datos.miPartido.estado === "rechazado" ? "border-rojo/40 bg-rojo/[0.06]" : "border-live/40 bg-live/[0.06]"}`}>
                            <div className="flex items-center gap-2 mb-1.5">
                                <Radio className={`w-3.5 h-3.5 ${datos.miPartido.estado === "rechazado" ? "text-rojo" : "text-live"}`} />
                                <span className={`label-tech text-[8px] ${datos.miPartido.estado === "rechazado" ? "text-rojo" : "text-live"}`}>
                                    {datos.miPartido.estado === "rechazado" ? "Resultado rechazado" : "Estás jugando"}
                                    {datos.miPartido.canchaNumero != null && ` · Cancha ${datos.miPartido.canchaNumero}`}
                                </span>
                            </div>
                            <p className="text-[12px] text-foreground">
                                Con {datos.miPartido.compañero} vs {datos.miPartido.rivales.join(" / ")}
                            </p>
                            {datos.miPartido.motivoRechazo && (
                                <p className="flex items-start gap-1.5 text-[11px] text-rojo mt-1.5">
                                    <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                                    {datos.miPartido.motivoRechazo}
                                </p>
                            )}
                            <button
                                type="button"
                                onClick={() => setCargando(true)}
                                className="w-full mt-2.5 py-2.5 clip-notch bg-live text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all active:scale-95 cursor-pointer"
                            >
                                Cargar resultado
                            </button>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2 mt-4">
                        {cerrado ? (
                            <div className="flex-1 flex items-center justify-center gap-2 py-3 clip-notch bg-muted border border-hairline text-muted-foreground text-[10px] font-black uppercase tracking-widest">
                                <Trophy className="w-3.5 h-3.5 text-gold-ink" />
                                Desafío finalizado
                            </div>
                        ) : datos.inscripto ? (
                            abierto && datos.miEstado === "disponible" && (
                                <button
                                    type="button"
                                    onClick={() => correr(() => darmeDeBaja(d.id), "Te diste de baja.")}
                                    disabled={pendiente}
                                    className="sm:w-auto px-4 py-3 clip-notch bg-muted border border-hairline text-muted-foreground text-[10px] font-black uppercase tracking-widest hover:text-rojo hover:border-rojo/40 transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                                >
                                    Darme de baja
                                </button>
                            )
                        ) : (
                            <button
                                type="button"
                                onClick={() => (datos.necesitaLado ? setEligiendoLado(true) : anotarse())}
                                disabled={!datos.puedeInscribirse || pendiente}
                                title={datos.motivo ?? undefined}
                                className="flex-1 flex items-center justify-center gap-2 py-3 clip-notch bg-volt text-carbon-950 text-[10px] font-black uppercase tracking-widest hover:bg-volt-dark transition-all active:scale-95 shadow-lg shadow-volt/20 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                            >
                                {pendiente ? "Inscribiendo..." : "Inscribirme"}
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => setVerInscriptos(true)}
                            className="sm:w-auto px-4 py-3 clip-notch bg-muted border border-hairline text-muted-foreground text-[10px] font-black uppercase tracking-widest hover:border-celeste/40 hover:text-foreground transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                        >
                            <Users className="w-3.5 h-3.5" />
                            Ver inscriptos ({datos.inscriptos.length})
                        </button>
                    </div>

                    {!datos.inscripto && datos.motivo && (
                        <p className="text-[10px] text-subtle mt-2.5 text-center">{datos.motivo}</p>
                    )}
                </div>
            </article>

            {abierto && datos.pool.total > 0 && (
                <section className="rounded-2xl border border-hairline bg-card shadow-lg shadow-black/40 p-5">
                    <h2 className="heading-sport text-base text-foreground">Sin pareja ({datos.pool.total})</h2>
                    <p className="text-[11px] text-subtle mt-0.5 mb-3">Buscá con quién jugar y avisale al admin.</p>
                    <div className="grid grid-cols-3 gap-2">
                        {([["reves", "Revés"], ["drive", "Drive"], ["ambos", "Ambos"]] as const).map(([k, rotulo]) => (
                            <div key={k} className="rounded-lg bg-background/60 border border-hairline p-2">
                                <div className="label-tech text-[7px] text-subtle mb-1.5">{rotulo} · {datos.pool[k].length}</div>
                                <ul className="space-y-0.5">
                                    {datos.pool[k].map((j) => (
                                        <li key={j.userId} className={`text-[11px] truncate ${j.userId === userId ? "text-volt-ink font-bold" : "text-muted-foreground"}`}>
                                            {j.nombre}
                                        </li>
                                    ))}
                                    {datos.pool[k].length === 0 && <li className="text-[11px] text-subtle">—</li>}
                                </ul>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <section className="rounded-2xl border border-hairline bg-card shadow-lg shadow-black/40 overflow-hidden">
                <div className="flex items-end justify-between gap-3 px-5 pt-4 pb-3">
                    <h2 className="heading-sport text-base text-foreground">Tabla de posiciones</h2>
                    <span className="label-tech text-[8px] text-subtle shrink-0">
                        {d.puntos.participacion} + {d.puntos.victoria} por victoria
                    </span>
                </div>

                {datos.ranking.length === 0 ? (
                    <div className="px-5 pb-6 pt-2 text-center">
                        <p className="text-[11px] text-subtle">Los puntos aparecen a medida que se confirman los partidos.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto border-t border-hairline">
                        <table className="w-full">
                            <thead>
                                <tr className="text-[9px] font-black uppercase tracking-widest text-subtle border-b border-hairline bg-muted">
                                    <th className="py-2 pl-4 pr-1 w-12 text-center">#</th>
                                    <th className="py-2 px-2 text-left">Jugador</th>
                                    <th className="py-2 px-2 text-center">PJ</th>
                                    <th className="py-2 px-2 text-center">PG</th>
                                    <th className="py-2 px-2 text-center hidden sm:table-cell">Dif</th>
                                    <th className="py-2 pr-4 pl-2 text-right">Puntos</th>
                                </tr>
                            </thead>
                            <tbody>
                                {datos.ranking.map((f) => (
                                    <tr
                                        key={f.userId}
                                        onClick={f.esInvitado ? undefined : () => setVerPerfil(f.userId)}
                                        className={`border-b border-hairline last:border-0 ${f.userId === userId ? "bg-volt/[0.06]" : ""} ${f.esInvitado ? "" : "cursor-pointer hover:bg-muted transition-colors"}`}
                                    >
                                        <td className="py-1.5 pl-4 pr-1 text-center">
                                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-scoreboard text-[11px] ${f.posicion === 1 ? "bg-gold/20 text-gold-ink" : f.posicion === 2 ? "bg-silver/20 text-silver-ink" : f.posicion === 3 ? "bg-bronze/20 text-bronze-ink" : "text-subtle"}`}>
                                                {f.posicion}
                                            </span>
                                        </td>
                                        <td className="py-1.5 px-2 text-[12px] font-bold text-foreground truncate">
                                            {f.nombre}
                                            {f.userId === userId && <span className="ml-1.5 text-[8px] font-black uppercase text-volt-ink">Vos</span>}
                                            {f.esInvitado && <span className="ml-1.5 text-[8px] font-black uppercase text-subtle">Inv</span>}
                                        </td>
                                        <td className="py-1.5 px-2 text-center text-[12px] text-muted-foreground tabular-nums">{f.jugados}</td>
                                        <td className="py-1.5 px-2 text-center text-[12px] text-emerald-400 tabular-nums">{f.ganados}</td>
                                        <td className={`py-1.5 px-2 text-center hidden sm:table-cell text-[11px] tabular-nums ${f.difGames >= 0 ? "text-emerald-400" : "text-rojo"}`}>
                                            {f.difGames > 0 ? "+" : ""}{f.difGames}
                                        </td>
                                        <td className="py-1.5 pr-4 pl-2 text-right text-scoreboard text-[15px] text-volt-ink">{f.puntos}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {verInscriptos && (
                <Modal titulo={`Inscriptos · ${d.nombre}`} onCerrar={() => setVerInscriptos(false)}>
                    {datos.inscriptos.length === 0 ? (
                        <p className="text-[12px] text-subtle py-6 text-center">Todavía no hay inscriptos.</p>
                    ) : (
                        <ul className="space-y-1">
                            {datos.inscriptos.map((i, idx) => (
                                <li key={i.id} className="flex items-center gap-3 px-2 py-2 border-b border-hairline last:border-0">
                                    <span className="text-scoreboard text-[11px] text-subtle w-5 text-right shrink-0">{idx + 1}</span>
                                    <span className={`text-[13px] font-bold truncate flex-1 ${i.userId === userId ? "text-volt-ink" : "text-foreground"}`}>
                                        {i.nombre}
                                    </span>
                                    {i.esInvitado && <span className="label-tech text-[7px] text-subtle shrink-0">Invitado</span>}
                                    <span className="label-tech text-[7px] text-subtle shrink-0">{ETIQUETA_LADO[i.lado]}</span>
                                    <span className="text-[10px] font-black uppercase text-celeste-light shrink-0">{i.categoria || "—"}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Modal>
            )}

            {eligiendoLado && (
                <Modal titulo="¿De qué lado jugás?" onCerrar={() => setEligiendoLado(false)}>
                    <p className="text-[12px] text-muted-foreground mb-3">
                        Lo necesitamos para armar las parejas. Queda guardado en tu perfil.
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                        {([LADO.DRIVE, LADO.REVES, LADO.AMBOS] as const).map((l) => (
                            <button
                                key={l}
                                type="button"
                                onClick={() => anotarse(l)}
                                disabled={pendiente}
                                className="py-3 rounded-xl bg-muted border border-hairline text-[11px] font-black uppercase tracking-widest text-foreground hover:border-celeste/50 hover:bg-celeste/10 transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                            >
                                {ETIQUETA_LADO[l]}
                            </button>
                        ))}
                    </div>
                </Modal>
            )}

            {verPerfil && (
                <PlayerProfileModal userId={verPerfil} currentUserId={userId} onClose={() => setVerPerfil(null)} />
            )}

            {cargando && datos.miPartido && (
                <ModalResultado
                    compañero={datos.miPartido.compañero}
                    rivales={datos.miPartido.rivales}
                    pendiente={pendiente}
                    onCerrar={() => setCargando(false)}
                    onGuardar={(sets) =>
                        correr(
                            () => cargarResultado(datos.miPartido!.id, sets),
                            "Resultado enviado: el admin lo va a confirmar.",
                            () => setCargando(false)
                        )
                    }
                />
            )}
        </div>
    );
}
