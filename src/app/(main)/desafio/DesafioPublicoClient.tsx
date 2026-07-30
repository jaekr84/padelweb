"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    AlertTriangle, CalendarDays, Check, ChevronRight, Clock, MapPin, Plus, Settings2,
    Swords, Ticket, Trophy, Users, X,
} from "lucide-react";
import {
    ESTADO_DESAFIO, ETIQUETA_ESTADO_DESAFIO, ETIQUETA_LADO, LADO,
    type SetPartido,
} from "@/lib/desafio";
import { ChipCategoria, periodo } from "../gestionDesafio/GestionDesafiosClient";
import type { DatosPublicos, TarjetaPublica } from "./actions/publico";
import { darmeDeBaja, inscribirme } from "./actions/inscripciones";
import { cargarResultado } from "./actions/partidos";

export default function DesafioPublicoClient({ datos }: { datos: DatosPublicos }) {
    if (datos.tarjetas.length === 0) {
        return (
            <div className="rounded-2xl border border-white/12 bg-carbon-800 shadow-lg shadow-black/40 p-8 text-center">
                <Swords className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <h2 className="heading-sport text-lg text-slate-300">Sin desafíos activos</h2>
                <p className="text-[12px] text-slate-500 mt-1.5 max-w-sm mx-auto">
                    Todavía no hay ningún desafío abierto. Cuando se publique uno, vas a poder inscribirte desde acá.
                </p>
                {datos.esAdmin && (
                    <Link
                        href="/gestionDesafio"
                        className="inline-flex items-center gap-2 mt-4 px-4 py-2.5 clip-notch bg-celeste text-carbon-950 text-[10px] font-black uppercase tracking-widest"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Crear un desafío
                    </Link>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {datos.esAdmin && (
                <Link
                    href="/gestionDesafio"
                    className="group flex items-center gap-4 rounded-2xl border border-celeste/30 bg-carbon-800 shadow-lg shadow-black/40 p-4 hover:border-celeste/50 hover:bg-celeste/10 transition-all active:scale-[0.99]"
                >
                    <div className="w-11 h-11 rounded-xl bg-celeste/15 border border-celeste/25 flex items-center justify-center shrink-0">
                        <Settings2 className="w-5 h-5 text-celeste" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="label-tech text-[7px] text-celeste/70 mb-0.5">Solo administradores</div>
                        <h3 className="heading-sport text-base text-white leading-none">Gestión de Desafíos</h3>
                        <p className="text-[11px] text-slate-400 mt-1">Canchas, parejas, resultados y cierre.</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-celeste shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </Link>
            )}

            {datos.tarjetas.map((t) => (
                <Tarjeta key={t.desafio.id} t={t} userId={datos.userId} necesitaLado={datos.necesitaLado} />
            ))}
        </div>
    );
}

function Tarjeta({
    t, userId, necesitaLado,
}: {
    t: TarjetaPublica;
    userId: string | null;
    necesitaLado: boolean;
}) {
    const router = useRouter();
    const [pendiente, iniciar] = useTransition();
    const [verInscriptos, setVerInscriptos] = useState(false);
    const [eligiendoLado, setEligiendoLado] = useState(false);
    const [cargando, setCargando] = useState(false);

    const d = t.desafio;
    const abierto = d.estado === ESTADO_DESAFIO.ABIERTO;
    const cerrado = d.estado === ESTADO_DESAFIO.CERRADO;

    const correr = (fn: () => Promise<{ ok: boolean; error?: string }>, exito: string, despues?: () => void) => {
        iniciar(async () => {
            const r = await fn();
            if (r.ok) {
                toast.success(exito);
                despues?.();
                router.refresh();
            } else {
                toast.error(r.error || "No se pudo completar la acción");
            }
        });
    };

    const anotarse = (lado?: string) =>
        correr(() => inscribirme(d.id, lado), "¡Estás inscripto!", () => setEligiendoLado(false));

    return (
        <>
            <article className="relative overflow-hidden rounded-2xl border border-white/12 bg-carbon-800 shadow-lg shadow-black/40">
                <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-white/10 bg-carbon-900/60">
                    <div className="flex items-center gap-2 min-w-0">
                        {abierto ? <span className="live-dot" /> : cerrado ? <Trophy className="w-3.5 h-3.5 text-gold" /> : <Swords className="w-3.5 h-3.5 text-celeste" />}
                        <span className={`label-tech text-[8px] ${abierto ? "text-volt" : cerrado ? "text-gold" : "text-slate-400"}`}>
                            {ETIQUETA_ESTADO_DESAFIO[d.estado]}
                        </span>
                    </div>
                    <span className="label-tech text-[8px] text-slate-500 shrink-0">Individual</span>
                </div>

                <div className="p-5">
                    <div className="flex items-center gap-3.5">
                        <ChipCategoria nombre={d.categoriaNombre} size="lg" />
                        <div className="min-w-0">
                            <h2 className="heading-sport text-2xl text-white truncate">{d.nombre}</h2>
                            <p className="label-tech text-[7px] text-celeste mt-1.5">
                                {d.categoriaNombre ? `Categoría ${d.categoriaNombre} y superiores` : "Sin categoría"}
                            </p>
                        </div>
                    </div>

                    {d.descripcion && <p className="text-[12px] text-slate-400 mt-3 leading-relaxed">{d.descripcion}</p>}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                        <Dato icono={CalendarDays} rotulo="Período" valor={periodo(d.fechaInicio, d.fechaFin)} />
                        <Dato icono={Clock} rotulo="Hora" valor={d.hora || "A confirmar"} />
                        <Dato icono={MapPin} rotulo="Lugar" valor={d.lugar || "A confirmar"} />
                        <Dato icono={Ticket} rotulo="Inscripción" valor={d.inscripcion ? `$${d.inscripcion.toLocaleString("es-AR")}` : "Gratis"} />
                    </div>

                    <div className="flex items-center justify-between gap-3 mt-4 px-3 py-2.5 rounded-xl bg-carbon-700 border border-white/10">
                        <div className="flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-celeste" />
                            <span className="label-tech text-[8px] text-slate-400">Inscriptos</span>
                        </div>
                        <span className="text-scoreboard text-[15px] text-white">
                            {d.inscriptos}{d.cupo > 0 ? `/${d.cupo}` : ""}
                        </span>
                    </div>

                    {/* Mi situación */}
                    {t.inscripto && (
                        <div className="mt-4 rounded-xl border border-volt/25 bg-volt/[0.05] p-3">
                            <div className="flex items-center gap-2 mb-1.5">
                                <Check className="w-3.5 h-3.5 text-volt" />
                                <span className="label-tech text-[8px] text-volt">Estás inscripto</span>
                                {t.miLado && <span className="label-tech text-[7px] text-slate-400">· jugás de {ETIQUETA_LADO[t.miLado]}</span>}
                            </div>
                            <p className="text-[12px] text-slate-300">
                                {t.miCompañero
                                    ? <>Tu pareja: <span className="text-white font-bold">{t.miCompañero}</span></>
                                    : "Todavía no tenés pareja — el admin la arma desde el panel."}
                            </p>

                            {t.miPartido && (
                                <div className="mt-3 pt-3 border-t border-volt/20">
                                    <div className="label-tech text-[7px] text-live mb-1">
                                        {t.miPartido.estado === "rechazado" ? "Resultado rechazado" : "Estás jugando"}
                                        {t.miPartido.canchaNumero != null && ` · Cancha ${t.miPartido.canchaNumero}`}
                                    </div>
                                    <p className="text-[12px] text-white">
                                        Con {t.miPartido.compañero} vs {t.miPartido.rivales.join(" / ")}
                                    </p>
                                    {t.miPartido.motivoRechazo && (
                                        <p className="flex items-start gap-1.5 text-[11px] text-rojo mt-1.5">
                                            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                                            {t.miPartido.motivoRechazo}
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
                        </div>
                    )}

                    {/* Acciones */}
                    <div className="flex flex-col sm:flex-row gap-2 mt-4">
                        {cerrado ? (
                            <div className="flex-1 flex items-center justify-center gap-2 py-3 clip-notch bg-carbon-700 border border-white/10 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                <Trophy className="w-3.5 h-3.5 text-gold" />
                                Desafío finalizado
                            </div>
                        ) : t.inscripto ? (
                            abierto && t.miEstado === "disponible" && (
                                <button
                                    type="button"
                                    onClick={() => correr(() => darmeDeBaja(d.id), "Te diste de baja.")}
                                    disabled={pendiente}
                                    className="sm:w-auto px-4 py-3 clip-notch bg-carbon-700 border border-white/10 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-rojo hover:border-rojo/40 transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                                >
                                    Darme de baja
                                </button>
                            )
                        ) : (
                            <button
                                type="button"
                                onClick={() => (necesitaLado ? setEligiendoLado(true) : anotarse())}
                                disabled={!t.puedeInscribirse || pendiente}
                                title={t.motivo ?? undefined}
                                className="flex-1 flex items-center justify-center gap-2 py-3 clip-notch bg-volt text-carbon-950 text-[10px] font-black uppercase tracking-widest hover:bg-volt-dark transition-all active:scale-95 shadow-lg shadow-volt/20 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                            >
                                {pendiente ? "Inscribiendo..." : "Inscribirme"}
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => setVerInscriptos(true)}
                            className="sm:w-auto px-4 py-3 clip-notch bg-carbon-700 border border-white/10 text-slate-300 text-[10px] font-black uppercase tracking-widest hover:border-celeste/40 hover:text-white transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                        >
                            <Users className="w-3.5 h-3.5" />
                            Ver inscriptos
                        </button>
                    </div>

                    {!t.inscripto && t.motivo && <p className="text-[10px] text-slate-500 mt-2.5 text-center">{t.motivo}</p>}

                    {/* Quién está sin pareja */}
                    {abierto && t.pool.total > 0 && (
                        <div className="mt-5 pt-4 border-t border-white/10">
                            <h3 className="label-tech text-[8px] text-slate-500 mb-2">
                                Sin pareja ({t.pool.total}) — buscá con quién jugar
                            </h3>
                            <div className="grid grid-cols-3 gap-2">
                                {([["reves", "Revés"], ["drive", "Drive"], ["ambos", "Ambos"]] as const).map(([k, rotulo]) => (
                                    <div key={k} className="rounded-lg bg-carbon-900/60 border border-white/10 p-2">
                                        <div className="label-tech text-[7px] text-slate-500 mb-1.5">{rotulo} · {t.pool[k].length}</div>
                                        <ul className="space-y-0.5">
                                            {t.pool[k].map((j) => (
                                                <li key={j.userId} className={`text-[11px] truncate ${j.userId === userId ? "text-volt font-bold" : "text-slate-300"}`}>
                                                    {j.nombre}
                                                </li>
                                            ))}
                                            {t.pool[k].length === 0 && <li className="text-[11px] text-slate-600">—</li>}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tabla de posiciones */}
                    <div className="mt-5 pt-4 border-t border-white/10">
                        <div className="flex items-end justify-between gap-3 mb-2.5">
                            <h3 className="heading-sport text-base text-white">Tabla de posiciones</h3>
                            <span className="label-tech text-[8px] text-slate-500 shrink-0">
                                {d.puntos.participacion} + {d.puntos.victoria} por victoria
                            </span>
                        </div>
                        {t.ranking.length === 0 ? (
                            <div className="rounded-xl border border-white/10 bg-carbon-800 py-8 text-center">
                                <p className="text-[11px] text-slate-500">Los puntos aparecen a medida que se confirman los partidos.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-white/10 bg-carbon-800">
                                <table className="w-full">
                                    <thead>
                                        <tr className="text-[9px] font-black uppercase tracking-widest text-slate-500 border-b border-white/10 bg-carbon-700">
                                            <th className="py-2 pl-4 pr-1 w-12 text-center">#</th>
                                            <th className="py-2 px-2 text-left">Jugador</th>
                                            <th className="py-2 px-2 text-center">PJ</th>
                                            <th className="py-2 px-2 text-center">PG</th>
                                            <th className="py-2 px-2 text-center hidden sm:table-cell">Dif</th>
                                            <th className="py-2 pr-4 pl-2 text-right">Puntos</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {t.ranking.map((f) => (
                                            <tr key={f.userId} className={`border-b border-white/5 last:border-0 ${f.userId === userId ? "bg-volt/[0.06]" : ""}`}>
                                                <td className="py-1.5 pl-4 pr-1 text-center">
                                                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-scoreboard text-[11px] ${f.posicion === 1 ? "bg-gold/20 text-gold" : f.posicion === 2 ? "bg-silver/20 text-silver" : f.posicion === 3 ? "bg-bronze/20 text-bronze" : "text-slate-500"}`}>
                                                        {f.posicion}
                                                    </span>
                                                </td>
                                                <td className="py-1.5 px-2 text-[12px] font-bold text-white truncate">
                                                    {f.nombre}
                                                    {f.userId === userId && <span className="ml-1.5 text-[8px] font-black uppercase text-volt">Vos</span>}
                                                </td>
                                                <td className="py-1.5 px-2 text-center text-[12px] text-slate-400 tabular-nums">{f.jugados}</td>
                                                <td className="py-1.5 px-2 text-center text-[12px] text-emerald-400 tabular-nums">{f.ganados}</td>
                                                <td className={`py-1.5 px-2 text-center hidden sm:table-cell text-[11px] tabular-nums ${f.difGames >= 0 ? "text-emerald-400" : "text-rojo"}`}>
                                                    {f.difGames > 0 ? "+" : ""}{f.difGames}
                                                </td>
                                                <td className="py-1.5 pr-4 pl-2 text-right text-scoreboard text-[15px] text-volt">{f.puntos}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </article>

            {verInscriptos && (
                <Modal titulo={`Inscriptos · ${d.nombre}`} onCerrar={() => setVerInscriptos(false)}>
                    {t.inscriptos.length === 0 ? (
                        <p className="text-[12px] text-slate-500 py-6 text-center">Todavía no hay inscriptos.</p>
                    ) : (
                        <ul className="space-y-1">
                            {t.inscriptos.map((i, idx) => (
                                <li key={i.id} className="flex items-center gap-3 px-2 py-2 border-b border-white/5 last:border-0">
                                    <span className="text-scoreboard text-[11px] text-slate-600 w-5 text-right shrink-0">{idx + 1}</span>
                                    <span className={`text-[13px] font-bold truncate flex-1 ${i.userId === userId ? "text-volt" : "text-white"}`}>
                                        {i.nombre}
                                    </span>
                                    <span className="label-tech text-[7px] text-slate-500 shrink-0">{ETIQUETA_LADO[i.lado]}</span>
                                    <span className="text-[10px] font-black uppercase text-celeste-light shrink-0">{i.categoria || "—"}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Modal>
            )}

            {eligiendoLado && (
                <Modal titulo="¿De qué lado jugás?" onCerrar={() => setEligiendoLado(false)}>
                    <p className="text-[12px] text-slate-400 mb-3">
                        Lo necesitamos para armar las parejas. Queda guardado en tu perfil.
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                        {([LADO.DRIVE, LADO.REVES, LADO.AMBOS] as const).map((l) => (
                            <button
                                key={l}
                                type="button"
                                onClick={() => anotarse(l)}
                                disabled={pendiente}
                                className="py-3 rounded-xl bg-carbon-700 border border-white/10 text-[11px] font-black uppercase tracking-widest text-white hover:border-celeste/50 hover:bg-celeste/10 transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                            >
                                {ETIQUETA_LADO[l]}
                            </button>
                        ))}
                    </div>
                </Modal>
            )}

            {cargando && t.miPartido && (
                <ModalResultado
                    partidoId={t.miPartido.id}
                    compañero={t.miPartido.compañero}
                    rivales={t.miPartido.rivales}
                    pendiente={pendiente}
                    onCerrar={() => setCargando(false)}
                    onGuardar={(sets) =>
                        correr(() => cargarResultado(t.miPartido!.id, sets), "Resultado enviado: el admin lo va a confirmar.", () => setCargando(false))
                    }
                />
            )}
        </>
    );
}

// ── Carga de resultado ──────────────────────────────────────────────────────

function ModalResultado({
    compañero, rivales, pendiente, onCerrar, onGuardar,
}: {
    partidoId: string;
    compañero: string;
    rivales: string[];
    pendiente: boolean;
    onCerrar: () => void;
    onGuardar: (sets: SetPartido[]) => void;
}) {
    const [sets, setSets] = useState<{ t1: string; t2: string }[]>([{ t1: "", t2: "" }, { t1: "", t2: "" }]);

    const set = (i: number, lado: "t1" | "t2", v: string) =>
        setSets((s) => s.map((x, j) => (j === i ? { ...x, [lado]: v.replace(/\D/g, "").slice(0, 2) } : x)));

    const limpios = sets
        .filter((s) => s.t1 !== "" && s.t2 !== "")
        .map((s) => ({ t1: Number(s.t1), t2: Number(s.t2) }));

    return (
        <Modal titulo="Cargar resultado" onCerrar={onCerrar}>
            <div className="space-y-3">
                <div className="text-[12px]">
                    <div className="text-white font-bold">Vos y {compañero}</div>
                    <div className="text-slate-500 text-[10px] my-0.5">vs</div>
                    <div className="text-white font-bold">{rivales.join(" / ")}</div>
                </div>

                {sets.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <span className="label-tech text-[7px] text-slate-500 w-10">Set {i + 1}</span>
                        <input
                            inputMode="numeric"
                            value={s.t1}
                            onChange={(e) => set(i, "t1", e.target.value)}
                            className="w-14 bg-carbon-700 border border-white/10 rounded-lg h-10 text-center text-[14px] text-scoreboard text-white focus:outline-none focus:border-celeste/40"
                        />
                        <span className="text-slate-600">—</span>
                        <input
                            inputMode="numeric"
                            value={s.t2}
                            onChange={(e) => set(i, "t2", e.target.value)}
                            className="w-14 bg-carbon-700 border border-white/10 rounded-lg h-10 text-center text-[14px] text-scoreboard text-white focus:outline-none focus:border-celeste/40"
                        />
                        {i === sets.length - 1 && sets.length < 5 && (
                            <button
                                type="button"
                                onClick={() => setSets((x) => [...x, { t1: "", t2: "" }])}
                                className="ml-auto flex items-center gap-1 label-tech text-[8px] text-celeste hover:text-celeste-light cursor-pointer"
                            >
                                <Plus className="w-3 h-3" />
                                Set
                            </button>
                        )}
                    </div>
                ))}

                <p className="text-[10px] text-slate-500">
                    Los games van del lado de cada equipo. El admin confirma el resultado antes de que sumen los puntos.
                </p>

                <button
                    type="button"
                    onClick={() => onGuardar(limpios)}
                    disabled={limpios.length === 0 || pendiente}
                    className="w-full py-3 clip-notch bg-volt text-carbon-950 text-[10px] font-black uppercase tracking-widest hover:bg-volt-dark transition-all active:scale-95 disabled:opacity-30 cursor-pointer"
                >
                    Enviar resultado
                </button>
            </div>
        </Modal>
    );
}

// ── Piezas ──────────────────────────────────────────────────────────────────

function Dato({ icono: Icono, rotulo, valor }: { icono: any; rotulo: string; valor: string }) {
    return (
        <div className="px-3 py-2 rounded-xl bg-carbon-700 border border-white/10 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
                <Icono className="w-3 h-3 text-slate-500 shrink-0" />
                <span className="label-tech text-[7px] text-slate-500">{rotulo}</span>
            </div>
            <div className="text-[11px] font-bold text-white truncate">{valor}</div>
        </div>
    );
}

function Modal({ titulo, children, onCerrar }: { titulo: string; children: React.ReactNode; onCerrar: () => void }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
            <div className="absolute inset-0 bg-carbon-950/70 backdrop-blur-xl" onClick={onCerrar} />
            <div className="relative w-full sm:max-w-md max-h-[85vh] bg-carbon-900 border border-white/10 rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col shadow-2xl shadow-black/50">
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10 shrink-0">
                    <h3 className="heading-sport text-base text-white truncate">{titulo}</h3>
                    <button
                        type="button"
                        onClick={onCerrar}
                        className="w-9 h-9 rounded-full bg-carbon-700 border border-white/10 flex items-center justify-center hover:bg-carbon-600 active:scale-90 transition-all cursor-pointer shrink-0"
                    >
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">{children}</div>
            </div>
        </div>
    );
}
