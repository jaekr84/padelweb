"use client";

// Panel de gestión en vivo de un desafío (§7 de docs/desafio-specs.md).
//
// Zonas: fila de canchas · bandeja de confirmación · cola · parejas ·
// disponibles por lado · ranking e historial.

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, Check, ChevronRight, Clock,
    ListOrdered, Lock, Play, Plus, Search, Swords, Trash2, Trophy, UserPlus,
    Users, X, XCircle,
} from "lucide-react";
import { ESTADO_DESAFIO, ETIQUETA_LADO, ETIQUETA_ESTADO_PARTIDO, type SetPartido } from "@/lib/desafio";
import type { DesafioResumen } from "../../desafio/actions/desafios";
import type { CanchaResumen } from "../../desafio/actions/canchas";
import type { CandidatoInscripcion, InscriptoResumen } from "../../desafio/actions/inscripciones";
import type { ParejaResumen, PoolDisponibles } from "../../desafio/actions/parejas";
import type { PartidoResumen } from "../../desafio/actions/partidos";
import type { EntradaCola } from "../../desafio/actions/cola";
import type { FilaRankingUI } from "../../desafio/actions/ranking";
import { agregarCancha, cambiarEstadoCancha, eliminarCancha } from "../../desafio/actions/canchas";
import { inscribirJugador, darDeBajaJugador } from "../../desafio/actions/inscripciones";
import { armarPareja, desarmarPareja } from "../../desafio/actions/parejas";
import { cancelarPartido, confirmarResultado, iniciarPartido, rechazarResultado } from "../../desafio/actions/partidos";
import { anotarEnCola, asignarSiguienteDeCola, reordenarCola, sacarDeCola } from "../../desafio/actions/cola";
import { cerrarDesafio } from "../../desafio/actions/desafios";
import { ChipCategoria, periodo } from "../GestionDesafiosClient";

type Props = {
    desafio: DesafioResumen;
    canchas: CanchaResumen[];
    inscriptos: InscriptoResumen[];
    parejas: ParejaResumen[];
    pool: PoolDisponibles;
    enCurso: PartidoResumen[];
    aConfirmar: PartidoResumen[];
    historial: PartidoResumen[];
    cola: EntradaCola[];
    ranking: FilaRankingUI[];
    candidatos: CandidatoInscripcion[];
};

type Pestana = "juego" | "confirmar" | "cola" | "ranking" | "historial";

export default function PanelClient(p: Props) {
    const router = useRouter();
    const [pestana, setPestana] = useState<Pestana>("juego");
    const [pendiente, iniciar] = useTransition();

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

    const abierto = p.desafio.estado === ESTADO_DESAFIO.ABIERTO;

    const pestanas: { id: Pestana; rotulo: string; badge?: number }[] = [
        { id: "juego", rotulo: "Juego" },
        { id: "confirmar", rotulo: "Confirmar", badge: p.aConfirmar.length },
        { id: "cola", rotulo: "Cola", badge: p.cola.length },
        { id: "ranking", rotulo: "Ranking" },
        { id: "historial", rotulo: "Historial" },
    ];

    return (
        <div className="min-h-screen bg-grid-carbon">
            <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
                {/* Cabecera */}
                <header className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <Link
                            href="/gestionDesafio"
                            className="inline-flex items-center gap-1.5 label-tech text-[8px] text-slate-400 hover:text-white transition-colors mb-2"
                        >
                            <ArrowLeft className="w-3 h-3" />
                            Desafíos
                        </Link>
                        <div className="flex items-center gap-3">
                            <ChipCategoria nombre={p.desafio.categoriaNombre} />
                            <div className="min-w-0">
                                <h1 className="heading-sport text-2xl text-white truncate">{p.desafio.nombre}</h1>
                                <p className="label-tech text-[7px] text-celeste mt-1">
                                    {periodo(p.desafio.fechaInicio, p.desafio.fechaFin)} · {p.desafio.inscriptos} inscriptos
                                </p>
                            </div>
                        </div>
                    </div>
                    {abierto && (
                        <button
                            type="button"
                            onClick={() => correr(() => cerrarDesafio(p.desafio.id), "Desafío cerrado.")}
                            disabled={pendiente}
                            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-carbon-700 border border-white/10 text-slate-400 label-tech text-[8px] hover:text-rojo hover:border-rojo/40 transition-all disabled:opacity-40 cursor-pointer"
                        >
                            <Lock className="w-3 h-3" />
                            Cerrar
                        </button>
                    )}
                </header>

                <FilaCanchas
                    desafioId={p.desafio.id}
                    canchas={p.canchas}
                    enCurso={p.enCurso}
                    parejas={p.parejas}
                    cola={p.cola}
                    pendiente={pendiente}
                    correr={correr}
                />

                {/* Pestañas */}
                <nav className="flex gap-1 overflow-x-auto no-scrollbar">
                    {pestanas.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => setPestana(t.id)}
                            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${pestana === t.id
                                ? "bg-celeste text-carbon-950"
                                : "bg-carbon-700 border border-white/10 text-slate-400 hover:text-white"
                                }`}
                        >
                            {t.rotulo}
                            {!!t.badge && (
                                <span
                                    className={`px-1.5 rounded text-[9px] text-scoreboard ${pestana === t.id ? "bg-carbon-950/20" : "bg-volt text-carbon-950"
                                        }`}
                                >
                                    {t.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>

                {pestana === "juego" && (
                    <ZonaJuego desafio={p.desafio} parejas={p.parejas} pool={p.pool} inscriptos={p.inscriptos} candidatos={p.candidatos} pendiente={pendiente} correr={correr} />
                )}
                {pestana === "confirmar" && <Bandeja partidos={p.aConfirmar} pendiente={pendiente} correr={correr} />}
                {pestana === "cola" && (
                    <ZonaCola desafioId={p.desafio.id} cola={p.cola} parejas={p.parejas} pendiente={pendiente} correr={correr} />
                )}
                {pestana === "ranking" && <TablaRanking filas={p.ranking} puntos={p.desafio.puntos} />}
                {pestana === "historial" && <Historial partidos={p.historial} />}
            </div>
        </div>
    );
}

type Correr = (fn: () => Promise<{ ok: boolean; error?: string }>, exito: string, despues?: () => void) => void;

// ── Fila de canchas ─────────────────────────────────────────────────────────

function transcurrido(desde: string) {
    const ms = Date.now() - new Date(desde).getTime();
    const min = Math.max(0, Math.floor(ms / 60000));
    if (min < 60) return `${min} min`;
    return `${Math.floor(min / 60)}h ${min % 60}m`;
}

function FilaCanchas({
    desafioId, canchas, enCurso, parejas, cola, pendiente, correr,
}: {
    desafioId: string;
    canchas: CanchaResumen[];
    enCurso: PartidoResumen[];
    parejas: ParejaResumen[];
    cola: EntradaCola[];
    pendiente: boolean;
    correr: Correr;
}) {
    const [, refrescar] = useState(0);
    const [asignando, setAsignando] = useState<string | null>(null);

    // El tiempo en cancha se actualiza solo, sin recargar la página.
    useEffect(() => {
        const t = setInterval(() => refrescar((n) => n + 1), 30000);
        return () => clearInterval(t);
    }, []);

    const partidoDe = (canchaId: string) => enCurso.find((m) => m.canchaId === canchaId);
    const libres = parejas.filter((x) => !x.jugando);

    return (
        <section>
            <div className="flex items-center justify-between gap-3 mb-2">
                <h2 className="heading-sport text-base text-white">Canchas</h2>
                <button
                    type="button"
                    onClick={() => correr(() => agregarCancha(desafioId), "Cancha agregada.")}
                    disabled={pendiente}
                    className="flex items-center gap-1.5 label-tech text-[8px] text-celeste hover:text-celeste-light transition-colors disabled:opacity-40 cursor-pointer"
                >
                    <Plus className="w-3 h-3" />
                    Agregar cancha
                </button>
            </div>

            {canchas.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-carbon-800 p-6 text-center">
                    <p className="text-[12px] text-slate-500">Agregá al menos una cancha para poder poner parejas a jugar.</p>
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {canchas.map((c) => {
                        const m = partidoDe(c.id);
                        const ocupada = !!m;
                        return (
                            <div
                                key={c.id}
                                // Fondo sólido: estas tarjetas van directo sobre la grilla de la
                                // página, así que un tinte translúcido dejaba ver las líneas.
                                // El estado se distingue por el borde y el rótulo de color.
                                className={`rounded-xl border p-3 bg-carbon-800 shadow-lg shadow-black/40 ${ocupada
                                    ? "border-live/40 ring-1 ring-inset ring-live/10"
                                    : c.estado === "inhabilitada"
                                        ? "border-white/10 opacity-60"
                                        : "border-emerald-500/40 ring-1 ring-inset ring-emerald-500/10"
                                    }`}
                            >
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <span className="heading-sport text-sm text-white">
                                        {c.nombre || `Cancha ${c.numero}`}
                                    </span>
                                    <span className={`label-tech text-[7px] ${ocupada ? "text-live" : c.estado === "inhabilitada" ? "text-slate-500" : "text-emerald-400"}`}>
                                        {ocupada ? "En juego" : c.estado === "inhabilitada" ? "Inhabilitada" : "Libre"}
                                    </span>
                                </div>

                                {ocupada ? (
                                    <>
                                        <div className="space-y-1 text-[11px]">
                                            <div className="text-white truncate">{m!.equipo1.map((j) => j.nombre).join(" / ")}</div>
                                            <div className="text-slate-500 text-[9px]">vs</div>
                                            <div className="text-white truncate">{m!.equipo2.map((j) => j.nombre).join(" / ")}</div>
                                        </div>
                                        <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-white/10">
                                            <span className="flex items-center gap-1 label-tech text-[7px] text-slate-400">
                                                <Clock className="w-3 h-3" />
                                                {transcurrido(m!.iniciadoEn)}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (!confirm("¿Cancelar el partido? La cancha queda libre y no se cargan puntos.")) return;
                                                    correr(() => cancelarPartido(m!.id), "Partido cancelado.");
                                                }}
                                                disabled={pendiente}
                                                className="label-tech text-[7px] text-slate-500 hover:text-rojo transition-colors disabled:opacity-40 cursor-pointer"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                        <button
                                            type="button"
                                            onClick={() => setAsignando(c.id)}
                                            disabled={pendiente || c.estado === "inhabilitada" || libres.length < 2}
                                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-volt text-carbon-950 label-tech text-[8px] hover:bg-volt-dark transition-all active:scale-95 disabled:opacity-30 cursor-pointer"
                                        >
                                            <Play className="w-3 h-3" />
                                            Asignar
                                        </button>
                                        {cola.length > 0 && c.estado !== "inhabilitada" && (
                                            <button
                                                type="button"
                                                onClick={() => correr(() => asignarSiguienteDeCola(desafioId, c.id), "Entró la primera de la cola.")}
                                                disabled={pendiente}
                                                className="px-2.5 py-1.5 rounded-lg bg-carbon-700 border border-celeste/30 text-celeste label-tech text-[8px] hover:bg-carbon-600 transition-all disabled:opacity-40 cursor-pointer"
                                            >
                                                Traer de la cola
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => correr(
                                                () => cambiarEstadoCancha(c.id, c.estado === "inhabilitada"),
                                                c.estado === "inhabilitada" ? "Cancha habilitada." : "Cancha inhabilitada."
                                            )}
                                            disabled={pendiente}
                                            className="px-2.5 py-1.5 rounded-lg bg-carbon-700 border border-white/10 text-slate-400 label-tech text-[8px] hover:text-white transition-all disabled:opacity-40 cursor-pointer"
                                        >
                                            {c.estado === "inhabilitada" ? "Habilitar" : "Inhabilitar"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => correr(() => eliminarCancha(c.id), "Cancha eliminada.")}
                                            disabled={pendiente}
                                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-rojo hover:bg-rojo/10 transition-all disabled:opacity-40 cursor-pointer"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {asignando && (
                <ModalAsignar
                    parejas={libres}
                    pendiente={pendiente}
                    onCerrar={() => setAsignando(null)}
                    onConfirmar={(p1, p2) =>
                        correr(
                            () => iniciarPartido({ desafioId, canchaId: asignando, pareja1Id: p1, pareja2Id: p2 }),
                            "¡A jugar!",
                            () => setAsignando(null)
                        )
                    }
                />
            )}
        </section>
    );
}

function ModalAsignar({
    parejas, pendiente, onCerrar, onConfirmar,
}: {
    parejas: ParejaResumen[];
    pendiente: boolean;
    onCerrar: () => void;
    onConfirmar: (p1: string, p2: string) => void;
}) {
    const [sel, setSel] = useState<string[]>([]);
    const alternar = (id: string) =>
        setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < 2 ? [...s, id] : [s[1], id]));

    return (
        <Modal titulo="Elegí las dos parejas" onCerrar={onCerrar}>
            <ul className="space-y-1.5">
                {parejas.map((p) => {
                    const elegida = sel.includes(p.id);
                    return (
                        <li key={p.id}>
                            <button
                                type="button"
                                onClick={() => alternar(p.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${elegida
                                    ? "bg-celeste/15 border-celeste/40"
                                    : "bg-carbon-700 border-white/10 hover:border-celeste/30"
                                    }`}
                            >
                                <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${elegida ? "bg-celeste text-carbon-950" : "bg-carbon-700"}`}>
                                    {elegida && <Check className="w-3 h-3" />}
                                </span>
                                <span className="text-[12px] font-bold text-white truncate flex-1">
                                    {p.a.nombre} / {p.b.nombre}
                                </span>
                                <span className="label-tech text-[7px] text-slate-500 shrink-0">
                                    {p.partidosJugados}PJ · {p.partidosGanados}PG
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>
            <button
                type="button"
                onClick={() => onConfirmar(sel[0], sel[1])}
                disabled={sel.length !== 2 || pendiente}
                className="w-full mt-4 py-3 clip-notch bg-volt text-carbon-950 text-[10px] font-black uppercase tracking-widest hover:bg-volt-dark transition-all active:scale-95 disabled:opacity-30 cursor-pointer"
            >
                Poner a jugar
            </button>
        </Modal>
    );
}

// ── Zona de juego: parejas + disponibles + inscripción ──────────────────────

function ZonaJuego({
    desafio, parejas, pool, inscriptos, candidatos, pendiente, correr,
}: {
    desafio: DesafioResumen;
    parejas: ParejaResumen[];
    pool: PoolDisponibles;
    inscriptos: InscriptoResumen[];
    candidatos: CandidatoInscripcion[];
    pendiente: boolean;
    correr: Correr;
}) {
    const [sel, setSel] = useState<string[]>([]);
    const [inscribiendo, setInscribiendo] = useState(false);

    const alternar = (userId: string) =>
        setSel((s) => (s.includes(userId) ? s.filter((x) => x !== userId) : s.length < 2 ? [...s, userId] : [s[1], userId]));

    const columnas = [
        { clave: "reves" as const, rotulo: "Revés", jugadores: pool.reves },
        { clave: "drive" as const, rotulo: "Drive", jugadores: pool.drive },
        { clave: "ambos" as const, rotulo: "Ambos", jugadores: pool.ambos },
    ];

    return (
        <div className="space-y-5">
            {/* Parejas armadas */}
            <section>
                <h2 className="heading-sport text-base text-white mb-2">
                    Parejas armadas <span className="text-slate-600">({parejas.length})</span>
                </h2>
                {parejas.length === 0 ? (
                    <div className="rounded-xl border border-white/10 bg-carbon-800 p-5 text-center">
                        <p className="text-[12px] text-slate-500">Todavía no hay parejas. Elegí dos jugadores del pool de abajo.</p>
                    </div>
                ) : (
                    <div className="grid sm:grid-cols-2 gap-2">
                        {parejas.map((p) => (
                            <div key={p.id} className="rounded-xl border border-white/10 bg-carbon-800 p-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className="text-[13px] font-bold text-white truncate">
                                            {p.a.nombre} <span className="text-slate-600">+</span> {p.b.nombre}
                                        </div>
                                        <div className="label-tech text-[7px] text-slate-500 mt-0.5">
                                            {ETIQUETA_LADO[p.a.lado]} · {ETIQUETA_LADO[p.b.lado]} — {p.partidosJugados} jugados, {p.partidosGanados} ganados
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => correr(() => desarmarPareja(p.id), "Pareja desarmada.")}
                                        disabled={pendiente || p.jugando}
                                        title={p.jugando ? "Está jugando: cargá el resultado primero" : "Desarmar"}
                                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-rojo hover:bg-rojo/10 transition-all shrink-0 disabled:opacity-25 disabled:hover:text-slate-600 disabled:hover:bg-transparent cursor-pointer"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    {p.jugando && <Etiqueta color="live">Jugando</Etiqueta>}
                                    {p.enCola && <Etiqueta color="celeste">En cola</Etiqueta>}
                                    {p.aviso.nivel === "aviso" && (
                                        <span className="flex items-center gap-1 text-[9px] text-volt">
                                            <AlertTriangle className="w-3 h-3" />
                                            {p.aviso.mensaje}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Disponibles en tres columnas */}
            <section>
                <div className="flex items-center justify-between gap-3 mb-2">
                    <h2 className="heading-sport text-base text-white">
                        Sin pareja <span className="text-slate-600">({pool.total})</span>
                    </h2>
                    <button
                        type="button"
                        onClick={() => setInscribiendo(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-carbon-700 border border-celeste/30 text-celeste label-tech text-[8px] hover:bg-carbon-600 transition-all cursor-pointer"
                    >
                        <UserPlus className="w-3 h-3" />
                        Inscribir jugador
                    </button>
                </div>

                {sel.length > 0 && (
                    <div className="flex items-center gap-3 mb-2 px-3 py-2 rounded-xl bg-carbon-700 border border-celeste/30">
                        <span className="text-[11px] text-white flex-1">
                            {sel.length === 1 ? "Elegí el compañero" : "Listos para armar la pareja"}
                        </span>
                        <button type="button" onClick={() => setSel([])} className="label-tech text-[8px] text-slate-400 hover:text-white cursor-pointer">
                            Limpiar
                        </button>
                        <button
                            type="button"
                            disabled={sel.length !== 2 || pendiente}
                            onClick={() => correr(() => armarPareja(desafio.id, sel[0], sel[1]), "Pareja armada.", () => setSel([]))}
                            className="px-3 py-1.5 rounded-lg bg-volt text-carbon-950 label-tech text-[8px] hover:bg-volt-dark transition-all disabled:opacity-30 cursor-pointer"
                        >
                            Armar pareja
                        </button>
                    </div>
                )}

                <div className="grid md:grid-cols-3 gap-3">
                    {columnas.map((col) => (
                        <div key={col.clave} className="rounded-xl border border-white/10 bg-carbon-800 p-3">
                            <div className="label-tech text-[8px] text-slate-500 mb-2">
                                {col.rotulo} · {col.jugadores.length}
                            </div>
                            <ul className="space-y-1">
                                {col.jugadores.map((j) => {
                                    const elegido = sel.includes(j.userId);
                                    return (
                                        <li key={j.userId}>
                                            <button
                                                type="button"
                                                onClick={() => alternar(j.userId)}
                                                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg border text-left transition-all cursor-pointer ${elegido
                                                    ? "bg-celeste/15 border-celeste/40"
                                                    : "bg-transparent border-transparent hover:bg-carbon-600"
                                                    }`}
                                            >
                                                <span className="text-[12px] text-white truncate flex-1">{j.nombre}</span>
                                                {j.categoria && <span className="text-[9px] font-black uppercase text-celeste-light shrink-0">{j.categoria}</span>}
                                            </button>
                                        </li>
                                    );
                                })}
                                {col.jugadores.length === 0 && <li className="text-[11px] text-slate-600 px-2">—</li>}
                            </ul>
                        </div>
                    ))}
                </div>
                {pool.total % 2 === 1 && (
                    <p className="flex items-center gap-1.5 text-[10px] text-volt mt-2">
                        <AlertTriangle className="w-3 h-3" />
                        Queda un número impar de jugadores sin pareja: alguno se va a quedar afuera.
                    </p>
                )}
            </section>

            {inscribiendo && (
                <ModalInscribir
                    desafioId={desafio.id}
                    candidatos={candidatos}
                    inscriptos={inscriptos}
                    pendiente={pendiente}
                    correr={correr}
                    onCerrar={() => setInscribiendo(false)}
                />
            )}
        </div>
    );
}

function ModalInscribir({
    desafioId, candidatos, inscriptos, pendiente, correr, onCerrar,
}: {
    desafioId: string;
    candidatos: CandidatoInscripcion[];
    inscriptos: InscriptoResumen[];
    pendiente: boolean;
    correr: Correr;
    onCerrar: () => void;
}) {
    const [q, setQ] = useState("");
    const filtrados = useMemo(
        () => candidatos.filter((c) => c.nombre.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 10),
        [candidatos, q]
    );

    return (
        <Modal titulo="Inscribir jugador" onCerrar={onCerrar}>
            <div className="relative mb-3">
                <input
                    autoFocus
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Buscar jugador..."
                    className="w-full bg-carbon-700 border border-white/10 rounded-xl h-10 pl-9 pr-3 text-[12px] font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-celeste/40"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            </div>

            <ul className="space-y-1 max-h-72 overflow-y-auto">
                {filtrados.map((c) => (
                    <li key={c.userId} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-carbon-600">
                        <div className="min-w-0 flex-1">
                            <div className="text-[12px] font-bold text-white truncate">{c.nombre}</div>
                            <div className="text-[9px] text-slate-500">
                                Cat {c.categoria || "—"} · {ETIQUETA_LADO[c.lado]}
                                {!c.elegible && <span className="text-volt"> · {c.motivo}</span>}
                            </div>
                        </div>
                        {c.elegible ? (
                            <button
                                type="button"
                                onClick={() => correr(() => inscribirJugador(desafioId, c.userId), `${c.nombre} inscripto.`)}
                                disabled={pendiente}
                                className="px-2.5 py-1.5 rounded-lg bg-volt text-carbon-950 label-tech text-[8px] hover:bg-volt-dark transition-all disabled:opacity-40 cursor-pointer shrink-0"
                            >
                                Inscribir
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => correr(() => inscribirJugador(desafioId, c.userId, { excepcion: true }), `${c.nombre} inscripto como excepción.`)}
                                disabled={pendiente}
                                className="px-2.5 py-1.5 rounded-lg bg-carbon-700 border border-volt/30 text-volt label-tech text-[8px] hover:bg-volt/10 transition-all disabled:opacity-40 cursor-pointer shrink-0"
                            >
                                Excepción
                            </button>
                        )}
                    </li>
                ))}
                {filtrados.length === 0 && <li className="text-[11px] text-slate-600 px-2 py-3">Ningún jugador coincide.</li>}
            </ul>

            {inscriptos.length > 0 && (
                <details className="mt-4">
                    <summary className="label-tech text-[8px] text-slate-500 cursor-pointer">
                        Ver los {inscriptos.length} inscriptos
                    </summary>
                    <ul className="mt-2 space-y-1">
                        {inscriptos.map((i) => (
                            <li key={i.id} className="flex items-center gap-2 px-2 py-1.5 text-[11px]">
                                <span className="text-white truncate flex-1">{i.nombre}</span>
                                {i.esExcepcion && <Etiqueta color="volt">Excepción</Etiqueta>}
                                {i.juegaParaArriba && <Etiqueta color="celeste">Para arriba</Etiqueta>}
                                <span className="text-slate-600 text-[9px]">{i.estado}</span>
                                <button
                                    type="button"
                                    onClick={() => correr(() => darDeBajaJugador(desafioId, i.userId), `${i.nombre} dado de baja.`)}
                                    disabled={pendiente}
                                    className="text-slate-600 hover:text-rojo transition-colors disabled:opacity-40 cursor-pointer"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </li>
                        ))}
                    </ul>
                </details>
            )}
        </Modal>
    );
}

// ── Bandeja de confirmación ─────────────────────────────────────────────────

function Bandeja({ partidos, pendiente, correr }: { partidos: PartidoResumen[]; pendiente: boolean; correr: Correr }) {
    const [rechazando, setRechazando] = useState<string | null>(null);
    const [motivo, setMotivo] = useState("");

    if (partidos.length === 0) {
        return (
            <div className="rounded-xl border border-white/10 bg-carbon-800 p-8 text-center">
                <Check className="w-8 h-8 text-emerald-400/40 mx-auto mb-2" />
                <p className="text-[12px] text-slate-500">No hay resultados esperando confirmación.</p>
            </div>
        );
    }

    return (
        <ul className="space-y-2">
            {partidos.map((m) => (
                <li key={m.id} className="rounded-xl border border-volt/40 ring-1 ring-inset ring-volt/10 bg-carbon-800 shadow-lg shadow-black/40 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <div className={`text-[13px] truncate ${m.ganador === 1 ? "text-emerald-400 font-bold" : "text-slate-300"}`}>
                                {m.equipo1.map((j) => j.nombre).join(" / ")}
                            </div>
                            <div className={`text-[13px] truncate ${m.ganador === 2 ? "text-emerald-400 font-bold" : "text-slate-300"}`}>
                                {m.equipo2.map((j) => j.nombre).join(" / ")}
                            </div>
                        </div>
                        <div className="text-right shrink-0">
                            <div className="text-scoreboard text-[15px] text-celeste">{m.resultado}</div>
                            <div className="label-tech text-[7px] text-slate-500 mt-0.5">
                                cargó {m.cargadoPor ?? "—"}
                            </div>
                        </div>
                    </div>

                    {rechazando === m.id ? (
                        <div className="mt-3 space-y-2">
                            <input
                                autoFocus
                                value={motivo}
                                onChange={(e) => setMotivo(e.target.value)}
                                placeholder="¿Qué está mal? (obligatorio)"
                                className="w-full bg-carbon-700 border border-white/10 rounded-lg h-9 px-3 text-[12px] text-white placeholder:text-slate-600 focus:outline-none focus:border-rojo/40"
                            />
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => { setRechazando(null); setMotivo(""); }}
                                    className="px-3 py-2 rounded-lg bg-carbon-700 border border-white/10 text-slate-400 label-tech text-[8px] cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    disabled={!motivo.trim() || pendiente}
                                    onClick={() => correr(() => rechazarResultado(m.id, motivo), "Resultado rechazado.", () => { setRechazando(null); setMotivo(""); })}
                                    className="flex-1 py-2 rounded-lg bg-rojo text-white label-tech text-[8px] hover:bg-rojo-dark transition-all disabled:opacity-30 cursor-pointer"
                                >
                                    Rechazar
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex gap-2 mt-3">
                            <button
                                type="button"
                                onClick={() => correr(() => confirmarResultado(m.id), "Resultado confirmado: puntos acreditados.")}
                                disabled={pendiente}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-500 text-carbon-950 label-tech text-[8px] hover:bg-emerald-400 transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                            >
                                <Check className="w-3.5 h-3.5" />
                                Confirmar y dar puntos
                            </button>
                            <button
                                type="button"
                                onClick={() => setRechazando(m.id)}
                                disabled={pendiente}
                                className="px-4 py-2.5 rounded-lg bg-carbon-700 border border-white/10 text-slate-400 label-tech text-[8px] hover:text-rojo hover:border-rojo/40 transition-all disabled:opacity-40 cursor-pointer"
                            >
                                Rechazar
                            </button>
                        </div>
                    )}
                </li>
            ))}
        </ul>
    );
}

// ── Cola ────────────────────────────────────────────────────────────────────

function ZonaCola({
    desafioId, cola, parejas, pendiente, correr,
}: {
    desafioId: string;
    cola: EntradaCola[];
    parejas: ParejaResumen[];
    pendiente: boolean;
    correr: Correr;
}) {
    const disponibles = parejas.filter((p) => !p.jugando && !p.enCola);

    const mover = (i: number, delta: number) => {
        const ids = cola.map((e) => e.id);
        const j = i + delta;
        if (j < 0 || j >= ids.length) return;
        [ids[i], ids[j]] = [ids[j], ids[i]];
        correr(() => reordenarCola(desafioId, ids), "Cola reordenada.");
    };

    return (
        <div className="space-y-4">
            <section>
                <div className="flex items-center justify-between gap-3 mb-2">
                    <h2 className="heading-sport text-base text-white">
                        Esperando cancha <span className="text-slate-600">({cola.length})</span>
                    </h2>
                    {cola.length > 0 && (
                        <button
                            type="button"
                            onClick={() => correr(() => asignarSiguienteDeCola(desafioId), "Entró la primera de la cola.")}
                            disabled={pendiente}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-volt text-carbon-950 label-tech text-[8px] hover:bg-volt-dark transition-all disabled:opacity-40 cursor-pointer"
                        >
                            <Play className="w-3 h-3" />
                            Asignar siguiente
                        </button>
                    )}
                </div>

                {cola.length === 0 ? (
                    <div className="rounded-xl border border-white/10 bg-carbon-800 p-6 text-center">
                        <ListOrdered className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <p className="text-[12px] text-slate-500">Nadie esperando cancha.</p>
                    </div>
                ) : (
                    <ul className="rounded-xl border border-white/10 bg-carbon-800 divide-y divide-white/5">
                        {cola.map((e, i) => (
                            <li key={e.id} className="flex items-center gap-3 px-3 py-2.5">
                                <span className="text-scoreboard text-[13px] text-celeste w-5 text-center shrink-0">{e.posicion}</span>
                                <div className="min-w-0 flex-1">
                                    <div className="text-[12px] font-bold text-white truncate">{e.pareja}</div>
                                    <div className="label-tech text-[7px] text-slate-500 mt-0.5">
                                        {e.rival ? `vs ${e.rival}` : "sin rival definido"}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button type="button" onClick={() => mover(i, -1)} disabled={pendiente || i === 0} className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:text-white disabled:opacity-20 cursor-pointer">
                                        <ArrowUp className="w-3 h-3" />
                                    </button>
                                    <button type="button" onClick={() => mover(i, 1)} disabled={pendiente || i === cola.length - 1} className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:text-white disabled:opacity-20 cursor-pointer">
                                        <ArrowDown className="w-3 h-3" />
                                    </button>
                                    <button type="button" onClick={() => correr(() => sacarDeCola(e.id), "Sacada de la cola.")} disabled={pendiente} className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:text-rojo disabled:opacity-40 cursor-pointer">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {disponibles.length > 0 && (
                <section>
                    <h3 className="label-tech text-[8px] text-slate-500 mb-2">Anotar una pareja a la cola</h3>
                    <div className="flex flex-wrap gap-1.5">
                        {disponibles.map((p) => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => correr(() => anotarEnCola(desafioId, p.id), "Anotada en la cola.")}
                                disabled={pendiente}
                                className="px-3 py-2 rounded-lg bg-carbon-700 border border-white/10 text-[11px] text-white hover:border-celeste/40 transition-all disabled:opacity-40 cursor-pointer"
                            >
                                {p.a.nombre} / {p.b.nombre}
                            </button>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

// ── Ranking e historial ─────────────────────────────────────────────────────

function TablaRanking({ filas, puntos }: { filas: FilaRankingUI[]; puntos: DesafioResumen["puntos"] }) {
    if (filas.length === 0) {
        return (
            <div className="rounded-xl border border-white/10 bg-carbon-800 p-8 text-center">
                <Trophy className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-[12px] text-slate-500">Todavía no hay puntos cargados.</p>
            </div>
        );
    }
    return (
        <div>
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-carbon-800">
                <table className="w-full">
                    <thead>
                        <tr className="text-[9px] font-black uppercase tracking-widest text-slate-500 border-b border-white/10 bg-carbon-700">
                            <th className="py-2.5 pl-4 pr-1 w-12 text-center">#</th>
                            <th className="py-2.5 px-2 text-left">Jugador</th>
                            <th className="py-2.5 px-2 text-center hidden sm:table-cell">Cat</th>
                            <th className="py-2.5 px-2 text-center">PJ</th>
                            <th className="py-2.5 px-2 text-center">PG</th>
                            <th className="py-2.5 px-2 text-center hidden md:table-cell">Games</th>
                            <th className="py-2.5 px-2 text-center">Dif</th>
                            <th className="py-2.5 pr-4 pl-2 text-right">Puntos</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filas.map((f) => (
                            <tr key={f.userId} className="border-b border-white/5 last:border-0">
                                <td className="py-2 pl-4 pr-1 text-center">
                                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-scoreboard text-[11px] ${f.posicion === 1 ? "bg-gold/20 text-gold" : f.posicion === 2 ? "bg-silver/20 text-silver" : f.posicion === 3 ? "bg-bronze/20 text-bronze" : "text-slate-500"}`}>
                                        {f.posicion}
                                    </span>
                                </td>
                                <td className="py-2 px-2 text-[12px] font-bold text-white truncate">{f.nombre}</td>
                                <td className="py-2 px-2 text-center hidden sm:table-cell text-[10px] font-black uppercase text-celeste-light">{f.categoria || "—"}</td>
                                <td className="py-2 px-2 text-center text-[12px] text-slate-400 tabular-nums">{f.jugados}</td>
                                <td className="py-2 px-2 text-center text-[12px] text-emerald-400 tabular-nums">{f.ganados}</td>
                                <td className="py-2 px-2 text-center hidden md:table-cell text-[11px] text-slate-500 tabular-nums">{f.gamesFavor}-{f.gamesContra}</td>
                                <td className={`py-2 px-2 text-center text-[12px] tabular-nums ${f.difGames >= 0 ? "text-emerald-400" : "text-rojo"}`}>
                                    {f.difGames > 0 ? "+" : ""}{f.difGames}
                                </td>
                                <td className="py-2 pr-4 pl-2 text-right text-scoreboard text-[15px] text-volt">{f.puntos}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">
                {puntos.participacion} por participar · {puntos.victoria} por victoria · {puntos.derrota} por derrota.
                Desempata: partidos ganados, después diferencia de games.
            </p>
        </div>
    );
}

function Historial({ partidos }: { partidos: PartidoResumen[] }) {
    if (partidos.length === 0) {
        return (
            <div className="rounded-xl border border-white/10 bg-carbon-800 p-8 text-center">
                <Swords className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-[12px] text-slate-500">Todavía no se jugó ningún partido.</p>
            </div>
        );
    }
    return (
        <ul className="rounded-xl border border-white/10 bg-carbon-800 divide-y divide-white/5">
            {partidos.map((m) => (
                <li key={m.id} className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1 text-[12px]">
                            <span className={m.ganador === 1 ? "text-emerald-400 font-bold" : "text-slate-400"}>
                                {m.equipo1.map((j) => j.nombre).join(" / ")}
                            </span>
                            <span className="text-slate-600"> vs </span>
                            <span className={m.ganador === 2 ? "text-emerald-400 font-bold" : "text-slate-400"}>
                                {m.equipo2.map((j) => j.nombre).join(" / ")}
                            </span>
                        </div>
                        <span className="text-scoreboard text-[12px] text-celeste shrink-0">{m.resultado ?? "—"}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="label-tech text-[7px] text-slate-600">{ETIQUETA_ESTADO_PARTIDO[m.estado]}</span>
                        {m.canchaNumero != null && <span className="label-tech text-[7px] text-slate-600">· Cancha {m.canchaNumero}</span>}
                        {m.motivoRechazo && <span className="text-[9px] text-rojo">· {m.motivoRechazo}</span>}
                    </div>
                </li>
            ))}
        </ul>
    );
}

// ── Piezas comunes ──────────────────────────────────────────────────────────

function Etiqueta({ children, color }: { children: React.ReactNode; color: "live" | "celeste" | "volt" }) {
    const clases = {
        live: "bg-live/10 border-live/30 text-live",
        celeste: "bg-celeste/10 border-celeste/30 text-celeste",
        volt: "bg-volt/10 border-volt/30 text-volt",
    }[color];
    return <span className={`px-1.5 py-0.5 rounded border text-[8px] font-black uppercase tracking-wider ${clases}`}>{children}</span>;
}

function Modal({ titulo, children, onCerrar }: { titulo: string; children: React.ReactNode; onCerrar: () => void }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
            <div className="absolute inset-0 bg-carbon-950/70 backdrop-blur-xl" onClick={onCerrar} />
            <div className="relative w-full sm:max-w-md max-h-[85vh] bg-carbon-900 border border-white/10 rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col shadow-2xl shadow-black/50">
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10 shrink-0">
                    <h3 className="heading-sport text-base text-white">{titulo}</h3>
                    <button
                        type="button"
                        onClick={onCerrar}
                        className="w-9 h-9 rounded-full bg-carbon-700 border border-white/10 flex items-center justify-center hover:bg-carbon-600 active:scale-90 transition-all cursor-pointer"
                    >
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">{children}</div>
            </div>
        </div>
    );
}
