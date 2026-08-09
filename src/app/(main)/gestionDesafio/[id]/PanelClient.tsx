"use client";

// Panel de gestión en vivo de un desafío (§7 de docs/desafio-specs.md).
//
// Zonas: fila de canchas · bandeja de confirmación · cola · parejas ·
// disponibles por lado · ranking e historial.

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, Check, ChevronDown, ChevronLeft, ChevronRight, Clock,
    ListOrdered, Lock, Play, Plus, Search, Sparkles, Swords, Trash2, Trophy, UserPlus,
    Users, X, XCircle,
} from "lucide-react";
import { ESTADO_DESAFIO, ESTADO_PARTIDO, ETIQUETA_LADO, ETIQUETA_ESTADO_PARTIDO, LADO, generarCruces, claveCruce, type Lado, type SetPartido } from "@/lib/desafio";
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
import { cancelarPartido, confirmarResultado, corregirResultado, iniciarPartido, rechazarResultado } from "../../desafio/actions/partidos";
import { anotarEnCola, anotarPartidosEnCola, asignarSiguienteDeCola, reordenarCola, sacarDeCola } from "../../desafio/actions/cola";
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
    // El admin puede cargar o corregir el resultado de cualquier partido:
    // desde la cancha, desde la bandeja o desde el historial.
    const [editando, setEditando] = useState<PartidoResumen | null>(null);

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
            {/* A ancho completo: el panel se maneja en vivo y cuanto más entra
                sin scrollear, mejor. El padding crece con la pantalla. */}
            <div className="w-full px-4 lg:px-8 py-6 space-y-5">
                {/* Cabecera */}
                <header className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <Link
                            href="/gestionDesafio"
                            className="inline-flex items-center gap-1.5 label-tech text-[8px] text-muted-foreground hover:text-foreground transition-colors mb-2"
                        >
                            <ArrowLeft className="w-3 h-3" />
                            Desafíos
                        </Link>
                        <div className="flex items-center gap-3">
                            <ChipCategoria nombres={p.desafio.categorias.map((c) => c.nombre)} />
                            <div className="min-w-0">
                                <h1 className="heading-sport text-2xl text-foreground truncate">{p.desafio.nombre}</h1>
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
                            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted border border-hairline text-muted-foreground label-tech text-[8px] hover:text-rojo hover:border-rojo/40 transition-all disabled:opacity-40 cursor-pointer"
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
                                : "bg-muted border border-hairline text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            {t.rotulo}
                            {!!t.badge && (
                                <span
                                    className={`px-1.5 rounded text-[9px] text-scoreboard ${pestana === t.id ? "bg-background/20" : "bg-volt text-carbon-950"
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
                    <ZonaCola desafioId={p.desafio.id} categorias={p.desafio.categorias} cola={p.cola} parejas={p.parejas} historial={p.historial} pendiente={pendiente} correr={correr} />
                )}
                {pestana === "ranking" && <TablaRanking filas={p.ranking} puntos={p.desafio.puntos} />}
                {pestana === "historial" && <Historial partidos={p.historial} onEditar={setEditando} />}
            </div>

            {editando && (
                <ModalResultado
                    partido={editando}
                    pendiente={pendiente}
                    onCerrar={() => setEditando(null)}
                    onGuardar={(sets) =>
                        correr(
                            () => corregirResultado(editando.id, sets),
                            editando.estado === "confirmado"
                                ? "Resultado corregido y puntos recalculados."
                                : "Resultado cargado: falta confirmarlo.",
                            () => setEditando(null)
                        )
                    }
                />
            )}
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
    // Las dos parejas elegidas en cada cancha, hasta que arranca el partido.
    const [seleccion, setSeleccion] = useState<Record<string, { p1?: string; p2?: string }>>({});
    // Id del partido cuyo resultado se está cargando ahí mismo, en la tarjeta.
    const [cargando, setCargando] = useState<string | null>(null);

    // El tiempo en cancha se actualiza solo, sin recargar la página.
    useEffect(() => {
        const t = setInterval(() => refrescar((n) => n + 1), 30000);
        return () => clearInterval(t);
    }, []);

    const partidoDe = (canchaId: string) => enCurso.find((m) => m.canchaId === canchaId);
    const libres = parejas.filter((x) => !x.jugando);
    const parejaPorId = (id?: string) => parejas.find((p) => p.id === id) ?? null;

    const elegidas = (canchaId: string) => seleccion[canchaId] ?? {};
    const elegir = (canchaId: string, lado: "p1" | "p2", id: string | null) =>
        setSeleccion((s) => ({ ...s, [canchaId]: { ...s[canchaId], [lado]: id ?? undefined } }));
    const limpiarCancha = (canchaId: string) =>
        setSeleccion((s) => Object.fromEntries(Object.entries(s).filter(([k]) => k !== canchaId)));

    const listaParaJugar = (canchaId: string) => {
        const { p1, p2 } = elegidas(canchaId);
        return !!p1 && !!p2 && p1 !== p2;
    };

    /**
     * Parejas ofrecidas en un desplegable: las libres, menos la ya elegida del
     * otro lado y menos las que están apalabradas en otra cancha — si no, dos
     * canchas mandan la misma pareja a jugar y la segunda falla en el server.
     */
    const opcionesPara = (canchaId: string, lado: "p1" | "p2") => {
        const propia = elegidas(canchaId);
        const enOtras = new Set(
            Object.entries(seleccion)
                .filter(([k]) => k !== canchaId)
                .flatMap(([, v]) => [v.p1, v.p2])
                .filter(Boolean) as string[]
        );
        const opuesta = lado === "p1" ? propia.p2 : propia.p1;
        return libres.filter((p) => p.id !== opuesta && !enOtras.has(p.id));
    };

    return (
        <section>
            <div className="flex items-center justify-between gap-3 mb-2">
                <h2 className="heading-sport text-base text-foreground">Canchas</h2>
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
                <div className="rounded-xl border border-hairline bg-card p-6 text-center">
                    <p className="text-[12px] text-subtle">Agregá al menos una cancha para poder poner parejas a jugar.</p>
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {canchas.map((c) => {
                        const m = partidoDe(c.id);
                        const ocupada = !!m;
                        const inhabilitada = c.estado === "inhabilitada";
                        return (
                            <div
                                key={c.id}
                                // Fondo sólido: estas tarjetas van directo sobre la grilla de la
                                // página, así que un tinte translúcido dejaba ver las líneas.
                                // El estado se distingue por el borde y el rótulo de color.
                                className={`rounded-xl border p-3 bg-card shadow-lg shadow-black/40 ${ocupada
                                    ? "border-live/40 ring-1 ring-inset ring-live/10"
                                    : c.estado === "inhabilitada"
                                        ? "border-hairline opacity-60"
                                        : "border-emerald-500/40 ring-1 ring-inset ring-emerald-500/10"
                                    }`}
                            >
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <span className="heading-sport text-sm text-foreground">
                                        {c.nombre || `Cancha ${c.numero}`}
                                    </span>
                                    <span className={`label-tech text-[7px] ${ocupada ? "text-live" : c.estado === "inhabilitada" ? "text-subtle" : "text-emerald-400"}`}>
                                        {ocupada ? "En juego" : c.estado === "inhabilitada" ? "Inhabilitada" : "Libre"}
                                    </span>
                                </div>

                                {ocupada ? (
                                    <>
                                        <div className="space-y-1 text-[11px]">
                                            <div className="text-foreground truncate" title={m!.equipo1.map((j) => j.nombre).join(" / ")}>{m!.equipo1.map((j) => j.nombre).join(" / ")}</div>
                                            <div className="text-subtle text-[9px]">vs</div>
                                            <div className="text-foreground truncate" title={m!.equipo2.map((j) => j.nombre).join(" / ")}>{m!.equipo2.map((j) => j.nombre).join(" / ")}</div>
                                        </div>
                                        {cargando === m!.id ? (
                                            <FormResultado
                                                inicial={m!.sets}
                                                pendiente={pendiente}
                                                onCancelar={() => setCargando(null)}
                                                onGuardar={(sets) =>
                                                    correr(
                                                        () => corregirResultado(m!.id, sets),
                                                        "Resultado cargado: falta confirmarlo.",
                                                        () => setCargando(null)
                                                    )
                                                }
                                            />
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => setCargando(m!.id)}
                                                disabled={pendiente}
                                                className="w-full mt-2.5 py-2 rounded-lg bg-volt text-carbon-950 label-tech text-[8px] hover:bg-volt-dark transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                                            >
                                                Cargar resultado
                                            </button>
                                        )}
                                        <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-hairline">
                                            <span className="flex items-center gap-1 label-tech text-[7px] text-muted-foreground">
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
                                                className="label-tech text-[7px] text-subtle hover:text-rojo transition-colors disabled:opacity-40 cursor-pointer"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* Arriba las dos parejas, abajo las acciones ocupando el
                                            ancho completo de la tarjeta. */}
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <SelectPareja
                                                valor={parejaPorId(elegidas(c.id).p1)}
                                                opciones={opcionesPara(c.id, "p1")}
                                                placeholder="Pareja 1"
                                                disabled={pendiente || inhabilitada}
                                                onElegir={(id) => elegir(c.id, "p1", id)}
                                            />
                                            <span className="label-tech text-[7px] text-subtle shrink-0">vs</span>
                                            <SelectPareja
                                                valor={parejaPorId(elegidas(c.id).p2)}
                                                opciones={opcionesPara(c.id, "p2")}
                                                placeholder="Pareja 2"
                                                disabled={pendiente || inhabilitada}
                                                onElegir={(id) => elegir(c.id, "p2", id)}
                                            />
                                        </div>
                                        <div className="flex items-stretch gap-1.5 mt-1.5">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const { p1, p2 } = elegidas(c.id);
                                                    correr(
                                                        () => iniciarPartido({ desafioId, canchaId: c.id, pareja1Id: p1!, pareja2Id: p2! }),
                                                        "¡A jugar!",
                                                        () => limpiarCancha(c.id)
                                                    );
                                                }}
                                                disabled={pendiente || inhabilitada || !listaParaJugar(c.id)}
                                                className="flex-1 flex items-center justify-center gap-1.5 px-2.5 h-8 rounded-lg bg-volt text-carbon-950 label-tech text-[8px] hover:bg-volt-dark transition-all active:scale-95 disabled:opacity-30 cursor-pointer"
                                            >
                                                <Play className="w-3 h-3" />
                                                Comenzar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => correr(
                                                    () => cambiarEstadoCancha(c.id, inhabilitada),
                                                    inhabilitada ? "Cancha habilitada." : "Cancha inhabilitada."
                                                )}
                                                disabled={pendiente}
                                                className="flex-1 flex items-center justify-center px-2.5 h-8 rounded-lg bg-muted border border-hairline text-muted-foreground label-tech text-[8px] hover:text-foreground transition-all disabled:opacity-40 cursor-pointer"
                                            >
                                                {inhabilitada ? "Habilitar" : "Inhabilitar"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => correr(() => eliminarCancha(c.id), "Cancha eliminada.")}
                                                disabled={pendiente}
                                                className="w-10 h-8 rounded-lg flex items-center justify-center bg-muted border border-hairline text-subtle hover:text-rojo hover:border-rojo/40 transition-all disabled:opacity-40 cursor-pointer shrink-0"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                        {cola.length > 0 && !inhabilitada && (
                                            <button
                                                type="button"
                                                onClick={() => correr(() => asignarSiguienteDeCola(desafioId, c.id), "Entró el siguiente de la cola.")}
                                                disabled={pendiente}
                                                className="mt-1.5 label-tech text-[7px] text-celeste hover:text-celeste-light transition-colors disabled:opacity-40 cursor-pointer"
                                            >
                                                Traer de la cola
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

        </section>
    );
}

/**
 * Desplegable de pareja con buscador. La búsqueda va por nombre de jugador, que
 * es como el admin las tiene en la cabeza ("¿dónde está Abril?"), no por el
 * nombre de la pareja.
 */
function SelectPareja({
    valor, opciones, placeholder, disabled, onElegir,
}: {
    valor: ParejaResumen | null;
    opciones: ParejaResumen[];
    placeholder: string;
    disabled: boolean;
    onElegir: (id: string | null) => void;
}) {
    const [abierto, setAbierto] = useState(false);
    const [q, setQ] = useState("");
    const caja = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!abierto) return;
        const fuera = (e: MouseEvent) => {
            if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false);
        };
        const escape = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
        document.addEventListener("mousedown", fuera);
        document.addEventListener("keydown", escape);
        return () => {
            document.removeEventListener("mousedown", fuera);
            document.removeEventListener("keydown", escape);
        };
    }, [abierto]);

    const filtradas = useMemo(() => {
        const b = q.trim().toLowerCase();
        if (!b) return opciones;
        return opciones.filter((p) => `${p.a.nombre} ${p.b.nombre}`.toLowerCase().includes(b));
    }, [opciones, q]);

    return (
        <div ref={caja} className="relative min-w-0 flex-1 basis-32">
            <button
                type="button"
                disabled={disabled}
                onClick={() => {
                    setQ("");
                    setAbierto((o) => !o);
                }}
                className={`w-full flex items-center gap-1 px-2 h-8 rounded-lg border text-left transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer ${valor
                    ? "bg-celeste/15 border-celeste/40"
                    : "bg-muted border-hairline hover:border-celeste/40"
                    }`}
            >
                <span
                    className={`text-[11px] truncate flex-1 ${valor ? "text-foreground font-bold" : "text-subtle"}`}
                    title={valor ? `${valor.a.nombre} / ${valor.b.nombre}` : undefined}
                >
                    {valor ? `${valor.a.nombre} / ${valor.b.nombre}` : placeholder}
                </span>
                {valor ? (
                    <X
                        className="w-3 h-3 text-subtle hover:text-rojo shrink-0"
                        onClick={(e) => {
                            e.stopPropagation();
                            onElegir(null);
                        }}
                    />
                ) : (
                    <ChevronDown className="w-3 h-3 text-subtle shrink-0" />
                )}
            </button>

            {abierto && (
                <div className="absolute z-20 mt-1 w-full min-w-56 rounded-xl border border-hairline bg-card shadow-xl shadow-black/40 p-2">
                    <div className="relative mb-1.5">
                        <input
                            autoFocus
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Buscar jugador..."
                            className="w-full bg-muted border border-hairline rounded-lg h-8 pl-7 pr-2 text-[11px] font-bold text-foreground placeholder:text-subtle focus:outline-none focus:border-celeste/40"
                        />
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-subtle" />
                    </div>
                    <ul className="max-h-52 overflow-y-auto space-y-0.5">
                        {filtradas.map((p) => (
                            <li key={p.id}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onElegir(p.id);
                                        setAbierto(false);
                                    }}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-muted transition-colors cursor-pointer"
                                >
                                    {/* Los nombres largos se cortan: el title los muestra enteros. */}
                                    <span className="text-[11px] text-foreground truncate flex-1" title={`${p.a.nombre} / ${p.b.nombre}`}>
                                        {p.a.nombre} / {p.b.nombre}
                                    </span>
                                    <span className="label-tech text-[7px] text-subtle shrink-0">
                                        {p.partidosJugados}PJ · {p.partidosGanados}PG
                                    </span>
                                </button>
                            </li>
                        ))}
                        {filtradas.length === 0 && (
                            <li className="text-[11px] text-subtle px-2 py-2">
                                {opciones.length === 0 ? "No hay parejas libres." : "Ningún jugador coincide."}
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}

// ── Parejas armadas ─────────────────────────────────────────────────────────

type ColumnaParejas = "estado" | "pareja" | "pj" | "pg";

const FILAS_POR_PAGINA = 20;

/** Libres primero: son las que el admin puede mandar a la cancha ahora mismo. */
const rangoEstado = (p: ParejaResumen) => (p.jugando ? 2 : p.enCola ? 1 : 0);

/** Encabezado que ordena al hacer clic; repetirlo marca el sentido inverso. */
function ThParejas({
    col, orden, onOrdenar, className = "", children,
}: {
    col: ColumnaParejas;
    orden: { col: ColumnaParejas; asc: boolean };
    onOrdenar: (col: ColumnaParejas) => void;
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <th className={`py-2.5 px-2 ${className}`}>
            <button
                type="button"
                onClick={() => onOrdenar(col)}
                className="inline-flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
            >
                {children}
                {orden.col === col &&
                    (orden.asc ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />)}
            </button>
        </th>
    );
}

function TablaParejas({
    parejas, pendiente, correr,
}: {
    parejas: ParejaResumen[];
    pendiente: boolean;
    correr: Correr;
}) {
    const [q, setQ] = useState("");
    // Por defecto, las que pueden entrar a jugar arriba y, dentro de esas, las
    // que menos jugaron: es el orden con el que se rota en un desafío en vivo.
    const [orden, setOrden] = useState<{ col: ColumnaParejas; asc: boolean }>({ col: "estado", asc: true });
    // La página se guarda junto con la búsqueda y el orden que la produjeron:
    // si cambia cualquiera de los dos, vuelve sola a la primera. Quedarse en la
    // página 3 de un resultado que ahora tiene una sola se lee como "no encontró
    // nada". Derivarlo acá evita el setState dentro de un efecto.
    const claveVista = `${q.trim().toLowerCase()}|${orden.col}|${orden.asc}`;
    const [vista, setVista] = useState({ clave: claveVista, pagina: 0 });
    const pagina = vista.clave === claveVista ? vista.pagina : 0;
    const irAPagina = (n: number) => setVista({ clave: claveVista, pagina: n });

    const ordenar = (col: ColumnaParejas) =>
        setOrden((o) => ({ col, asc: o.col === col ? !o.asc : true }));

    const filas = useMemo(() => {
        const b = q.trim().toLowerCase();
        const filtradas = b
            ? parejas.filter((p) => `${p.a.nombre} ${p.b.nombre}`.toLowerCase().includes(b))
            : parejas;

        const signo = orden.asc ? 1 : -1;
        return [...filtradas].sort((x, y) => {
            switch (orden.col) {
                case "pareja":
                    return signo * x.a.nombre.localeCompare(y.a.nombre);
                case "pj":
                    return signo * (x.partidosJugados - y.partidosJugados);
                case "pg":
                    return signo * (x.partidosGanados - y.partidosGanados);
                default:
                    return (
                        signo * (rangoEstado(x) - rangoEstado(y) || x.partidosJugados - y.partidosJugados)
                    );
            }
        });
    }, [parejas, q, orden]);

    // Alto fijo: la tabla siempre mide lo mismo, tenga o no filtro puesto. Se
    // reserva el alto de una página completa (o del total, si hay menos que una
    // página) y lo que falta se completa con filas vacías, así buscar no mueve
    // de lugar lo que está más abajo en la pantalla.
    const totalPaginas = Math.max(1, Math.ceil(filas.length / FILAS_POR_PAGINA));
    const paginaActual = Math.min(pagina, totalPaginas - 1);
    const visibles = filas.slice(paginaActual * FILAS_POR_PAGINA, (paginaActual + 1) * FILAS_POR_PAGINA);
    const altoEnFilas = Math.min(parejas.length, FILAS_POR_PAGINA);
    const relleno = Math.max(0, altoEnFilas - visibles.length);
    // La barra de paginación se decide por el total sin filtrar: si apareciera y
    // desapareciera según la búsqueda, volvería a cambiar el alto.
    const hayPaginacion = parejas.length > FILAS_POR_PAGINA;

    if (parejas.length === 0) {
        return (
            <section>
                <h2 className="heading-sport text-base text-foreground mb-2">Parejas armadas</h2>
                <div className="rounded-xl border border-hairline bg-card p-5 text-center">
                    <p className="text-[12px] text-subtle">Todavía no hay parejas. Elegí dos jugadores del pool de abajo.</p>
                </div>
            </section>
        );
    }

    return (
        <section>
            <div className="flex items-center justify-between gap-3 mb-2">
                <h2 className="heading-sport text-base text-foreground">
                    Parejas armadas{" "}
                    <span className="text-subtle">
                        ({q.trim() ? `${filas.length} de ${parejas.length}` : parejas.length})
                    </span>
                </h2>
                <div className="relative w-48 max-w-[50%]">
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Buscar jugador..."
                        className="w-full bg-muted border border-hairline rounded-lg h-8 pl-7 pr-2 text-[11px] font-bold text-foreground placeholder:text-subtle focus:outline-none focus:border-celeste/40"
                    />
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-subtle" />
                </div>
            </div>

            <div className="relative overflow-x-auto rounded-xl border border-hairline bg-card">
                <table className="w-full">
                    <thead>
                        <tr className="text-[9px] font-black uppercase tracking-widest text-subtle border-b border-hairline bg-muted">
                            <ThParejas col="pareja" orden={orden} onOrdenar={ordenar} className="text-left">Pareja</ThParejas>
                            <th className="py-2.5 px-2 text-left hidden md:table-cell">Lados</th>
                            <ThParejas col="estado" orden={orden} onOrdenar={ordenar} className="text-left">Estado</ThParejas>
                            <ThParejas col="pj" orden={orden} onOrdenar={ordenar} className="text-center">PJ</ThParejas>
                            <ThParejas col="pg" orden={orden} onOrdenar={ordenar} className="text-center">PG</ThParejas>
                            <th className="py-2.5 pr-4 pl-2 text-right">Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visibles.map((p) => (
                            <tr key={p.id} className="border-b border-hairline last:border-0">
                                <td className="py-2 px-2 max-w-0 md:max-w-none">
                                    <div
                                        className="text-[12px] font-bold text-foreground truncate"
                                        title={`${p.a.nombre} + ${p.b.nombre}`}
                                    >
                                        {p.a.nombre} <span className="text-subtle">+</span> {p.b.nombre}
                                    </div>
                                    {/* En pantallas chicas la columna Lados se esconde: el aviso de
                                        lados repetidos viaja acá para no perderse. */}
                                    <div className="md:hidden label-tech text-[7px] text-subtle mt-0.5">
                                        {ETIQUETA_LADO[p.a.lado]} · {ETIQUETA_LADO[p.b.lado]}
                                    </div>
                                </td>
                                <td className="py-2 px-2 hidden md:table-cell whitespace-nowrap">
                                    <span className="label-tech text-[7px] text-subtle">
                                        {ETIQUETA_LADO[p.a.lado]} · {ETIQUETA_LADO[p.b.lado]}
                                    </span>
                                    {p.aviso.nivel === "aviso" && (
                                        <span title={p.aviso.mensaje}>
                                            <AlertTriangle className="inline w-3 h-3 text-volt-ink ml-1.5 -mt-0.5" />
                                        </span>
                                    )}
                                </td>
                                <td className="py-2 px-2">
                                    {p.jugando ? (
                                        <Etiqueta color="live">Jugando</Etiqueta>
                                    ) : p.enCola ? (
                                        <Etiqueta color="celeste">En cola</Etiqueta>
                                    ) : (
                                        <span className="label-tech text-[7px] text-subtle">Libre</span>
                                    )}
                                </td>
                                <td className="py-2 px-2 text-center text-[12px] text-muted-foreground tabular-nums">
                                    {p.partidosJugados}
                                </td>
                                <td className="py-2 px-2 text-center text-[12px] text-emerald-400 tabular-nums">
                                    {p.partidosGanados}
                                </td>
                                <td className="py-2 pr-4 pl-2 text-right">
                                    {/* Desarmar y volver a armar es libre: los jugadores cambian de
                                        pareja cuando quieren. Lo único que lo frena es estar en
                                        medio de un partido. */}
                                    {p.jugando ? (
                                        <span
                                            className="label-tech text-[7px] text-subtle"
                                            title="Para desarmarla, cargá el resultado del partido o cancelalo desde la cancha."
                                        >
                                            En juego
                                        </span>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => correr(() => desarmarPareja(p.id), "Pareja desarmada: los dos vuelven al pool.")}
                                            disabled={pendiente}
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-muted border border-hairline text-muted-foreground label-tech text-[7px] hover:text-rojo hover:border-rojo/40 transition-all disabled:opacity-40 cursor-pointer"
                                        >
                                            <X className="w-3 h-3" />
                                            Desarmar
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {/* Relleno invisible que sostiene el alto. Repite la estructura de
                            una fila real (incluido el renglón de lados que sólo aparece en
                            mobile) para que mida exactamente lo mismo en los dos breakpoints. */}
                        {Array.from({ length: relleno }, (_, i) => (
                            <tr key={`relleno-${i}`} aria-hidden className="border-b border-hairline last:border-0">
                                <td className="py-2 px-2" colSpan={6}>
                                    <div className="text-[12px] font-bold invisible">—</div>
                                    <div className="md:hidden label-tech text-[7px] mt-0.5 invisible">—</div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filas.length === 0 && (
                    <p className="absolute inset-x-0 top-16 text-center text-[11px] text-subtle pointer-events-none">
                        Ninguna pareja con ese jugador.
                    </p>
                )}
            </div>

            {hayPaginacion && (
                <div className="flex items-center justify-between gap-3 mt-2">
                    <span className="label-tech text-[7px] text-subtle">
                        {filas.length === 0
                            ? "Sin resultados"
                            : `${paginaActual * FILAS_POR_PAGINA + 1}–${paginaActual * FILAS_POR_PAGINA + visibles.length} de ${filas.length}`}
                    </span>
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => irAPagina(Math.max(0, paginaActual - 1))}
                            disabled={paginaActual === 0}
                            className="w-7 h-7 rounded-lg flex items-center justify-center bg-muted border border-hairline text-muted-foreground hover:text-foreground transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                            <ChevronLeft className="w-3 h-3" />
                        </button>
                        <span className="label-tech text-[7px] text-subtle tabular-nums">
                            {paginaActual + 1} / {totalPaginas}
                        </span>
                        <button
                            type="button"
                            onClick={() => irAPagina(Math.min(totalPaginas - 1, paginaActual + 1))}
                            disabled={paginaActual >= totalPaginas - 1}
                            className="w-7 h-7 rounded-lg flex items-center justify-center bg-muted border border-hairline text-muted-foreground hover:text-foreground transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                            <ChevronRight className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            )}
        </section>
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
    // Filtro del pool por categoría. Vacío = se ven todos.
    const [filtroCats, setFiltroCats] = useState<string[]>([]);

    const alternar = (userId: string) =>
        setSel((s) => (s.includes(userId) ? s.filter((x) => x !== userId) : s.length < 2 ? [...s, userId] : [s[1], userId]));

    // `categoryName` es un snapshot de texto libre: se compara normalizado, igual
    // que en buscarCategoria.
    const clave = (c: string | null | undefined) => (c || "").trim().toLowerCase();

    // Los botones del filtro: primero las categorías del desafío, después las que
    // aparezcan en el pool sin estar en él (inscriptos por excepción) y, si hay,
    // los que no tienen categoría cargada.
    const botonesCat = useMemo(() => {
        const todos = [...pool.reves, ...pool.drive, ...pool.ambos];
        const cuenta = new Map<string, { rotulo: string; n: number }>();
        for (const j of todos) {
            const k = clave(j.categoria);
            const previo = cuenta.get(k);
            cuenta.set(k, { rotulo: j.categoria?.trim() || "Sin cat.", n: (previo?.n ?? 0) + 1 });
        }

        const orden = desafio.categorias.map((c) => clave(c.nombre));
        return [...cuenta.entries()]
            .map(([k, v]) => ({ clave: k, ...v }))
            .sort((a, b) => {
                // Las del desafío primero y en su orden; lo demás al final, alfabético.
                const ia = orden.indexOf(a.clave), ib = orden.indexOf(b.clave);
                if (ia !== ib) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
                return a.rotulo.localeCompare(b.rotulo);
            });
    }, [pool, desafio.categorias]);

    const visible = (j: { categoria: string | null }) =>
        filtroCats.length === 0 || filtroCats.includes(clave(j.categoria));

    const columnas = [
        { clave: "reves" as const, rotulo: "Revés", jugadores: pool.reves.filter(visible) },
        { clave: "drive" as const, rotulo: "Drive", jugadores: pool.drive.filter(visible) },
        { clave: "ambos" as const, rotulo: "Ambos", jugadores: pool.ambos.filter(visible) },
    ];
    const visibles = columnas.reduce((n, c) => n + c.jugadores.length, 0);

    // Con el filtro puesto, el elegido puede quedar oculto: la barra de selección
    // muestra los nombres para que no se pierda de vista quién está marcado.
    const nombreDe = (userId: string) =>
        [...pool.reves, ...pool.drive, ...pool.ambos].find((j) => j.userId === userId)?.nombre ?? "Jugador";

    return (
        <div className="space-y-5">
            {/* Parejas armadas */}
            <TablaParejas parejas={parejas} pendiente={pendiente} correr={correr} />

            {/* Disponibles en tres columnas */}
            <section>
                <div className="flex items-center justify-between gap-3 mb-2">
                    <h2 className="heading-sport text-base text-foreground">
                        Sin pareja{" "}
                        <span className="text-subtle">
                            ({filtroCats.length > 0 ? `${visibles} de ${pool.total}` : pool.total})
                        </span>
                    </h2>
                    <button
                        type="button"
                        onClick={() => setInscribiendo(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted border border-celeste/30 text-celeste label-tech text-[8px] hover:bg-muted transition-all cursor-pointer"
                    >
                        <UserPlus className="w-3 h-3" />
                        Inscribir jugador
                    </button>
                </div>

                {botonesCat.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        <span className="label-tech text-[7px] text-subtle mr-0.5">Categoría</span>
                        <button
                            type="button"
                            onClick={() => setFiltroCats([])}
                            className={`px-2.5 py-1 rounded-lg border label-tech text-[8px] transition-all cursor-pointer ${filtroCats.length === 0
                                ? "bg-celeste/15 border-celeste/40 text-celeste"
                                : "bg-muted border-hairline text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            Todas · {pool.total}
                        </button>
                        {botonesCat.map((c) => {
                            const activa = filtroCats.includes(c.clave);
                            return (
                                <button
                                    key={c.clave}
                                    type="button"
                                    aria-pressed={activa}
                                    onClick={() =>
                                        setFiltroCats((f) =>
                                            f.includes(c.clave) ? f.filter((x) => x !== c.clave) : [...f, c.clave]
                                        )
                                    }
                                    className={`px-2.5 py-1 rounded-lg border label-tech text-[8px] transition-all cursor-pointer ${activa
                                        ? "bg-celeste/15 border-celeste/40 text-celeste"
                                        : "bg-muted border-hairline text-muted-foreground hover:text-foreground"
                                        }`}
                                >
                                    {c.rotulo} · {c.n}
                                </button>
                            );
                        })}
                    </div>
                )}

                {sel.length > 0 && (
                    <div className="flex items-center gap-3 mb-2 px-3 py-2 rounded-xl bg-muted border border-celeste/30">
                        <span className="text-[11px] text-foreground flex-1 truncate">
                            {sel.length === 1
                                ? `${nombreDe(sel[0])} — elegí el compañero`
                                : `${nombreDe(sel[0])} + ${nombreDe(sel[1])}`}
                        </span>
                        <button type="button" onClick={() => setSel([])} className="label-tech text-[8px] text-muted-foreground hover:text-foreground cursor-pointer">
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
                        <div key={col.clave} className="rounded-xl border border-hairline bg-card p-3">
                            <div className="label-tech text-[8px] text-subtle mb-2">
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
                                                    : "bg-transparent border-transparent hover:bg-muted"
                                                    }`}
                                            >
                                                <span className="text-[12px] text-foreground truncate flex-1" title={j.nombre}>{j.nombre}</span>
                                                {j.categoria && <span className="text-[9px] font-black uppercase text-celeste-light shrink-0">{j.categoria}</span>}
                                            </button>
                                        </li>
                                    );
                                })}
                                {col.jugadores.length === 0 && <li className="text-[11px] text-subtle px-2">—</li>}
                            </ul>
                        </div>
                    ))}
                </div>
                {filtroCats.length > 0 && visibles === 0 && (
                    <p className="text-[11px] text-subtle mt-2">
                        Ningún jugador sin pareja en esa categoría.
                    </p>
                )}
                {pool.total % 2 === 1 && (
                    <p className="flex items-center gap-1.5 text-[10px] text-volt-ink mt-2">
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
    // Lado elegido a mano para los candidatos que no lo tienen en el perfil.
    const [lados, setLados] = useState<Record<string, Lado>>({});
    const filtrados = useMemo(
        () => candidatos.filter((c) => c.nombre.toLowerCase().includes(q.trim().toLowerCase())),
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
                    className="w-full bg-muted border border-hairline rounded-xl h-10 pl-9 pr-3 text-[12px] font-bold text-foreground placeholder:text-subtle focus:outline-none focus:border-celeste/40"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-subtle" />
            </div>

            <ul className="space-y-1 max-h-72 overflow-y-auto">
                {filtrados.map((c) => {
                    // El lado del perfil manda; si no lo tiene, el admin lo elige acá
                    // y recién ahí se habilita el botón (queda guardado en el perfil).
                    const lado = c.lado ?? lados[c.userId] ?? null;
                    const falta = lado === null;
                    return (
                        <li key={c.userId} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-muted">
                            <div className="min-w-0 flex-1">
                                <div className="text-[12px] font-bold text-foreground truncate" title={c.nombre}>{c.nombre}</div>
                                <div className="text-[9px] text-subtle">
                                    Cat {c.categoria || "—"} · {lado ? ETIQUETA_LADO[lado] : "sin lado"}
                                    {!c.elegible && <span className="text-volt-ink"> · {c.motivo}</span>}
                                </div>
                                {c.lado === null && (
                                    <div className="flex gap-1 mt-1.5">
                                        {([LADO.DRIVE, LADO.REVES, LADO.AMBOS] as Lado[]).map((l) => (
                                            <button
                                                key={l}
                                                type="button"
                                                onClick={() => setLados((s) => ({ ...s, [c.userId]: l }))}
                                                className={`px-2 py-1 rounded-md label-tech text-[8px] border transition-all cursor-pointer ${
                                                    lados[c.userId] === l
                                                        ? "bg-celeste/15 border-celeste/40 text-celeste"
                                                        : "bg-muted border-hairline text-subtle hover:text-foreground"
                                                }`}
                                            >
                                                {ETIQUETA_LADO[l]}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {c.elegible ? (
                                <button
                                    type="button"
                                    onClick={() => correr(() => inscribirJugador(desafioId, c.userId, { lado }), `${c.nombre} inscripto.`)}
                                    disabled={pendiente || falta}
                                    title={falta ? "Elegí de qué lado juega" : undefined}
                                    className="px-2.5 py-1.5 rounded-lg bg-volt text-carbon-950 label-tech text-[8px] hover:bg-volt-dark transition-all disabled:opacity-40 cursor-pointer shrink-0"
                                >
                                    Inscribir
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => correr(() => inscribirJugador(desafioId, c.userId, { lado, excepcion: true }), `${c.nombre} inscripto como excepción.`)}
                                    disabled={pendiente || falta}
                                    title={falta ? "Elegí de qué lado juega" : undefined}
                                    className="px-2.5 py-1.5 rounded-lg bg-muted border border-volt/30 text-volt-ink label-tech text-[8px] hover:bg-volt/10 transition-all disabled:opacity-40 cursor-pointer shrink-0"
                                >
                                    Excepción
                                </button>
                            )}
                        </li>
                    );
                })}
                {filtrados.length === 0 && <li className="text-[11px] text-subtle px-2 py-3">Ningún jugador coincide.</li>}
            </ul>

            {inscriptos.length > 0 && (
                <details className="mt-4">
                    <summary className="label-tech text-[8px] text-subtle cursor-pointer">
                        Ver los {inscriptos.length} inscriptos
                    </summary>
                    <ul className="mt-2 space-y-1">
                        {inscriptos.map((i) => (
                            <li key={i.id} className="flex items-center gap-2 px-2 py-1.5 text-[11px]">
                                <span className="text-foreground truncate flex-1" title={i.nombre}>{i.nombre}</span>
                                {i.esExcepcion && <Etiqueta color="volt">Excepción</Etiqueta>}
                                {i.juegaParaArriba && <Etiqueta color="celeste">Para arriba</Etiqueta>}
                                <span className="text-subtle text-[9px]">{i.estado}</span>
                                <button
                                    type="button"
                                    onClick={() => correr(() => darDeBajaJugador(desafioId, i.userId), `${i.nombre} dado de baja.`)}
                                    disabled={pendiente}
                                    className="text-subtle hover:text-rojo transition-colors disabled:opacity-40 cursor-pointer"
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

function Bandeja({
    partidos, pendiente, correr,
}: {
    partidos: PartidoResumen[];
    pendiente: boolean;
    correr: Correr;
}) {
    const [rechazando, setRechazando] = useState<string | null>(null);
    const [motivo, setMotivo] = useState("");
    const [editando, setEditando] = useState<string | null>(null);

    if (partidos.length === 0) {
        return (
            <div className="rounded-xl border border-hairline bg-card p-8 text-center">
                <Check className="w-8 h-8 text-emerald-400/40 mx-auto mb-2" />
                <p className="text-[12px] text-subtle">No hay resultados esperando confirmación.</p>
            </div>
        );
    }

    return (
        <ul className="space-y-2">
            {partidos.map((m) => (
                <li key={m.id} className="rounded-xl border border-volt/40 ring-1 ring-inset ring-volt/10 bg-card shadow-lg shadow-black/40 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <div className={`text-[13px] truncate ${m.ganador === 1 ? "text-emerald-400 font-bold" : "text-muted-foreground"}`} title={m.equipo1.map((j) => j.nombre).join(" / ")}>
                                {m.equipo1.map((j) => j.nombre).join(" / ")}
                            </div>
                            <div className={`text-[13px] truncate ${m.ganador === 2 ? "text-emerald-400 font-bold" : "text-muted-foreground"}`} title={m.equipo2.map((j) => j.nombre).join(" / ")}>
                                {m.equipo2.map((j) => j.nombre).join(" / ")}
                            </div>
                        </div>
                        <div className="text-right shrink-0">
                            <div className="text-scoreboard text-[15px] text-celeste">{m.resultado}</div>
                            <div className="label-tech text-[7px] text-subtle mt-0.5">
                                cargó {m.cargadoPor ?? "—"}
                            </div>
                        </div>
                    </div>

                    {editando === m.id ? (
                        <FormResultado
                            inicial={m.sets}
                            pendiente={pendiente}
                            onCancelar={() => setEditando(null)}
                            onGuardar={(sets) =>
                                correr(() => corregirResultado(m.id, sets), "Resultado corregido.", () => setEditando(null))
                            }
                        />
                    ) : rechazando === m.id ? (
                        <div className="mt-3 space-y-2">
                            <input
                                autoFocus
                                value={motivo}
                                onChange={(e) => setMotivo(e.target.value)}
                                placeholder="¿Qué está mal? (obligatorio)"
                                className="w-full bg-muted border border-hairline rounded-lg h-9 px-3 text-[12px] text-foreground placeholder:text-subtle focus:outline-none focus:border-rojo/40"
                            />
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => { setRechazando(null); setMotivo(""); }}
                                    className="px-3 py-2 rounded-lg bg-muted border border-hairline text-muted-foreground label-tech text-[8px] cursor-pointer"
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
                                onClick={() => setEditando(m.id)}
                                disabled={pendiente}
                                className="px-4 py-2.5 rounded-lg bg-muted border border-hairline text-muted-foreground label-tech text-[8px] hover:border-celeste/40 hover:text-foreground transition-all disabled:opacity-40 cursor-pointer"
                            >
                                Editar
                            </button>
                            <button
                                type="button"
                                onClick={() => setRechazando(m.id)}
                                disabled={pendiente}
                                className="px-4 py-2.5 rounded-lg bg-muted border border-hairline text-muted-foreground label-tech text-[8px] hover:text-rojo hover:border-rojo/40 transition-all disabled:opacity-40 cursor-pointer"
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
    desafioId, categorias, cola, parejas, historial, pendiente, correr,
}: {
    desafioId: string;
    categorias: DesafioResumen["categorias"];
    cola: EntradaCola[];
    parejas: ParejaResumen[];
    historial: PartidoResumen[];
    pendiente: boolean;
    correr: Correr;
}) {
    // Se puede anotar cualquier pareja armada, incluso una que esté jugando o
    // que ya tenga otro partido anotado: la cola es el plan de la jornada.
    const [p1, setP1] = useState<string | null>(null);
    const [p2, setP2] = useState<string | null>(null);
    const [q, setQ] = useState("");

    const porId = (id: string | null) => parejas.find((x) => x.id === id) ?? null;
    const opciones = (excluir: string | null) => parejas.filter((x) => x.id !== excluir);

    /**
     * Mover trabaja siempre sobre la cola completa, no sobre lo que se ve: con
     * el buscador puesto, subir una entrada la sube una posición real y no la
     * teletransporta al lugar de la anterior coincidencia.
     */
    const mover = (entradaId: string, delta: number) => {
        const ids = cola.map((e) => e.id);
        const i = ids.indexOf(entradaId);
        const j = i + delta;
        if (i < 0 || j < 0 || j >= ids.length) return;
        [ids[i], ids[j]] = [ids[j], ids[i]];
        correr(() => reordenarCola(desafioId, ids), "Cola reordenada.");
    };

    // Una entrada no puede entrar si su gente sigue en la cancha. El server la
    // saltea igual; marcarlo acá explica por qué no entró la de arriba.
    const bloqueada = (e: EntradaCola) =>
        !!porId(e.parejaId)?.jugando || (!!e.rivalParejaId && !!porId(e.rivalParejaId)?.jugando);

    const filtradas = useMemo(() => {
        const b = q.trim().toLowerCase();
        if (!b) return cola;
        return cola.filter((e) => `${e.pareja} ${e.rival ?? ""}`.toLowerCase().includes(b));
    }, [cola, q]);

    /**
     * Historial derivado de los partidos que el panel ya tiene cargados: no
     * cuesta ninguna consulta extra. Sólo cuentan los confirmados, que son los
     * que sumaron puntos.
     *
     *   · cruces  → cuántas veces se enfrentaron estas dos parejas y cómo salió
     *   · ultimo  → cuándo terminó el último partido de cada pareja (descanso)
     */
    const { cruces, ultimo } = useMemo(() => {
        // Clave del cruce con los dos ids ordenados, para que dé igual quién
        // figure como local. `ganaMenor` cuenta las del id que quedó primero.
        const cruces = new Map<string, { jugados: number; ganaMenor: number }>();
        const ultimo = new Map<string, number>();

        for (const m of historial) {
            if (m.estado !== ESTADO_PARTIDO.CONFIRMADO) continue;
            const { pareja1Id: p1, pareja2Id: p2 } = m;

            const fin = new Date(m.confirmadoEn ?? m.cargadoEn ?? m.iniciadoEn).getTime();
            for (const id of [p1, p2]) {
                if (id) ultimo.set(id, Math.max(ultimo.get(id) ?? 0, fin));
            }

            if (!p1 || !p2) continue;
            const menor = p1 < p2 ? p1 : p2;
            const clave = p1 < p2 ? `${p1}|${p2}` : `${p2}|${p1}`;
            const acc = cruces.get(clave) ?? { jugados: 0, ganaMenor: 0 };
            acc.jugados++;
            const ganadora = m.ganador === 1 ? p1 : m.ganador === 2 ? p2 : null;
            if (ganadora && ganadora === menor) acc.ganaMenor++;
            cruces.set(clave, acc);
        }
        return { cruces, ultimo };
    }, [historial]);

    /** El cara a cara visto desde `aId`: ganados suyos vs ganados del rival. */
    const caraACara = (aId: string, bId: string | null) => {
        if (!bId) return null;
        const clave = aId < bId ? `${aId}|${bId}` : `${bId}|${aId}`;
        const c = cruces.get(clave);
        if (!c || c.jugados === 0) return null;
        const suyos = aId < bId ? c.ganaMenor : c.jugados - c.ganaMenor;
        return { jugados: c.jugados, suyos, delRival: c.jugados - suyos };
    };

    /** Récord de la pareja en el desafío: ganados-perdidos. */
    const record = (parejaId: string) => {
        const p = porId(parejaId);
        if (!p) return null;
        return { ganados: p.partidosGanados, perdidos: p.partidosJugados - p.partidosGanados };
    };

    /** Hace cuánto terminó su último partido. Es el criterio de descanso. */
    const descanso = (parejaId: string) => {
        if (porId(parejaId)?.jugando) return "en cancha";
        const t = ultimo.get(parejaId);
        return t ? transcurrido(new Date(t).toISOString()) : null;
    };

    // ── Generador automático ────────────────────────────────────────────────
    const [generando, setGenerando] = useState(false);
    const [porPareja, setPorPareja] = useState(2);

    const ordenDeCategoria = (nombre: string | null) => {
        const clave = (nombre || "").trim().toLowerCase();
        return categorias.find((c) => c.nombre.trim().toLowerCase() === clave)?.orden ?? null;
    };

    /** Orden de la pareja: el promedio de sus dos jugadores. */
    const ordenPareja = (p: ParejaResumen) => {
        const oa = ordenDeCategoria(p.a.categoria);
        const ob = ordenDeCategoria(p.b.categoria);
        if (oa == null) return ob;
        if (ob == null) return oa;
        return (oa + ob) / 2;
    };

    const propuesta = useMemo(() => {
        // El historial que ve el generador incluye lo ya jugado y también lo que
        // está esperando en la cola: si no, generar dos veces seguidas armaría
        // los mismos cruces que ya están anotados.
        const previos = new Map<string, number>();
        for (const [k, v] of cruces) previos.set(k, v.jugados);
        for (const e of cola) {
            if (!e.rivalParejaId) continue;
            const k = claveCruce(e.parejaId, e.rivalParejaId);
            previos.set(k, (previos.get(k) ?? 0) + 1);
        }

        return generarCruces({
            parejas: parejas.map((p) => ({
                id: p.id,
                ordenCategoria: ordenPareja(p),
                jugados: p.partidosJugados,
            })),
            partidosPorPareja: porPareja,
            historial: previos,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [parejas, cola, cruces, porPareja, categorias]);

    const nombrePareja = (id: string) => {
        const p = porId(id);
        return p ? `${p.a.nombre} / ${p.b.nombre}` : "Pareja";
    };

    const listas = cola.filter((e) => !bloqueada(e) && e.rivalParejaId).length;

    return (
        <div className="space-y-4">
            {/* Armar: dos parejas y a la cola. Repetir para dejar la jornada lista. */}
            <section>
                <h2 className="heading-sport text-base text-foreground mb-1">Armar partido</h2>
                <p className="text-[10px] text-subtle mb-2">
                    Dejá los partidos anotados de antemano y se van mandando a la cancha a medida que
                    se libera. Sin rival, la pareja espera y se cruza con la siguiente que tampoco tenga.
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                    <SelectPareja
                        valor={porId(p1)}
                        opciones={opciones(p2)}
                        placeholder="Pareja"
                        disabled={pendiente}
                        onElegir={setP1}
                    />
                    <span className="label-tech text-[7px] text-subtle shrink-0">vs</span>
                    <SelectPareja
                        valor={porId(p2)}
                        opciones={opciones(p1)}
                        placeholder="Rival (opcional)"
                        disabled={pendiente}
                        onElegir={setP2}
                    />
                    <button
                        type="button"
                        disabled={pendiente || !p1}
                        onClick={() =>
                            correr(
                                () => anotarEnCola(desafioId, p1!, p2),
                                p2 ? "Partido anotado en la cola." : "Anotada en la cola, esperando rival.",
                                () => {
                                    setP1(null);
                                    setP2(null);
                                }
                            )
                        }
                        className="px-3 h-8 rounded-lg bg-volt text-carbon-950 label-tech text-[8px] hover:bg-volt-dark transition-all active:scale-95 disabled:opacity-30 cursor-pointer shrink-0"
                    >
                        {p2 ? "Anotar partido" : "Anotar sin rival"}
                    </button>
                    <button
                        type="button"
                        onClick={() => setGenerando(true)}
                        disabled={pendiente || parejas.length < 2}
                        title={parejas.length < 2 ? "Hacen falta al menos dos parejas armadas" : undefined}
                        className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-muted border border-celeste/30 text-celeste label-tech text-[8px] hover:bg-muted transition-all disabled:opacity-30 cursor-pointer shrink-0"
                    >
                        <Sparkles className="w-3 h-3" />
                        Generar cola
                    </button>
                </div>
            </section>

            <section>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <h2 className="heading-sport text-base text-foreground">
                        Cola{" "}
                        <span className="text-subtle">
                            ({q.trim() ? `${filtradas.length} de ${cola.length}` : cola.length})
                        </span>
                        {cola.length > 0 && (
                            <span className="label-tech text-[7px] text-subtle ml-2">
                                {listas} listo{listas === 1 ? "" : "s"} para entrar
                            </span>
                        )}
                    </h2>
                    <div className="flex items-center gap-2">
                        {cola.length > 0 && (
                            <div className="relative w-40">
                                <input
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    placeholder="Buscar jugador..."
                                    className="w-full bg-muted border border-hairline rounded-lg h-8 pl-7 pr-2 text-[11px] font-bold text-foreground placeholder:text-subtle focus:outline-none focus:border-celeste/40"
                                />
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-subtle" />
                            </div>
                        )}
                        {cola.length > 0 && (
                            <button
                                type="button"
                                onClick={() => correr(() => asignarSiguienteDeCola(desafioId), "Entró el siguiente de la cola.")}
                                disabled={pendiente}
                                className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-volt text-carbon-950 label-tech text-[8px] hover:bg-volt-dark transition-all disabled:opacity-40 cursor-pointer shrink-0"
                            >
                                <Play className="w-3 h-3" />
                                Mandar a cancha
                            </button>
                        )}
                    </div>
                </div>

                {cola.length === 0 ? (
                    <div className="rounded-xl border border-hairline bg-card p-6 text-center">
                        <ListOrdered className="w-8 h-8 text-subtle mx-auto mb-2" />
                        <p className="text-[12px] text-subtle">Nadie esperando cancha.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-hairline bg-card">
                        <table className="w-full">
                            <thead>
                                <tr className="text-[9px] font-black uppercase tracking-widest text-subtle border-b border-hairline bg-muted">
                                    <th className="py-2.5 pl-4 pr-1 w-10 text-center">#</th>
                                    <th className="py-2.5 px-2 text-left">Partido</th>
                                    <th className="py-2.5 px-2 text-center hidden lg:table-cell">Cruce</th>
                                    <th className="py-2.5 px-2 text-center hidden lg:table-cell">Récord</th>
                                    <th className="py-2.5 px-2 text-center hidden md:table-cell">Descanso</th>
                                    <th className="py-2.5 px-2 text-left">Estado</th>
                                    <th className="py-2.5 pr-4 pl-2 text-right">Orden</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtradas.map((e) => {
                                    const frenada = bloqueada(e);
                                    // El lugar real en la cola, no `posicion`: al cancelar entradas
                                    // quedan huecos en la numeración hasta el próximo reordenamiento.
                                    const i = cola.findIndex((x) => x.id === e.id);
                                    const h = caraACara(e.parejaId, e.rivalParejaId);
                                    const rec = record(e.parejaId);
                                    const recRival = e.rivalParejaId ? record(e.rivalParejaId) : null;
                                    const desc = descanso(e.parejaId);
                                    const descRival = e.rivalParejaId ? descanso(e.rivalParejaId) : null;
                                    return (
                                        <tr key={e.id} className="border-b border-hairline last:border-0">
                                            <td className="py-2 pl-4 pr-1 text-center text-scoreboard text-[13px] text-celeste">
                                                {i + 1}
                                            </td>
                                            {/* Las dos parejas son un enfrentamiento, no un título y su
                                                bajada: van en la misma línea y con el mismo peso. El
                                                ancho se reparte en partes iguales para que ninguna se
                                                corte antes que la otra. */}
                                            <td className="py-2 px-2 max-w-0">
                                                <div className="flex items-center gap-2 text-[12px] font-bold text-foreground">
                                                    <span className="flex-1 basis-0 min-w-0 truncate text-right" title={e.pareja}>
                                                        {e.pareja}
                                                    </span>
                                                    <span className="label-tech text-[7px] text-subtle shrink-0">vs</span>
                                                    {e.rival ? (
                                                        <span className="flex-1 basis-0 min-w-0 truncate" title={e.rival}>
                                                            {e.rival}
                                                        </span>
                                                    ) : (
                                                        <span className="flex-1 basis-0 min-w-0 truncate label-tech text-[7px] font-normal text-subtle">
                                                            sin rival definido
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-2 px-2 text-center hidden lg:table-cell whitespace-nowrap">
                                                {h ? (
                                                    <span
                                                        className="text-[12px] tabular-nums text-foreground"
                                                        title={`Ya se enfrentaron ${h.jugados} ${h.jugados === 1 ? "vez" : "veces"}: ${e.pareja} ${h.suyos} — ${e.rival} ${h.delRival}`}
                                                    >
                                                        {h.suyos}<span className="text-subtle">–</span>{h.delRival}
                                                    </span>
                                                ) : (
                                                    <span className="label-tech text-[7px] text-subtle">
                                                        {e.rivalParejaId ? "1er cruce" : "—"}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-2 px-2 text-center hidden lg:table-cell whitespace-nowrap">
                                                <span
                                                    className="text-[11px] tabular-nums text-muted-foreground"
                                                    title="Ganados-perdidos de cada pareja en el desafío"
                                                >
                                                    {rec ? `${rec.ganados}-${rec.perdidos}` : "—"}
                                                    <span className="text-subtle"> · </span>
                                                    {recRival ? `${recRival.ganados}-${recRival.perdidos}` : "—"}
                                                </span>
                                            </td>
                                            <td className="py-2 px-2 text-center hidden md:table-cell whitespace-nowrap">
                                                <span
                                                    className="label-tech text-[7px] text-muted-foreground"
                                                    title="Hace cuánto terminó el último partido de cada pareja"
                                                >
                                                    {desc ?? "sin jugar"}
                                                    {e.rivalParejaId && (
                                                        <>
                                                            <span className="text-subtle"> · </span>
                                                            {descRival ?? "sin jugar"}
                                                        </>
                                                    )}
                                                </span>
                                            </td>
                                            <td className="py-2 px-2 whitespace-nowrap">
                                                {frenada ? (
                                                    <span
                                                        className="label-tech text-[7px] text-live"
                                                        title="Todavía está jugando: la cola la saltea hasta que termine."
                                                    >
                                                        En cancha
                                                    </span>
                                                ) : e.rivalParejaId ? (
                                                    <Etiqueta color="celeste">Lista</Etiqueta>
                                                ) : (
                                                    <span className="label-tech text-[7px] text-subtle">Espera rival</span>
                                                )}
                                            </td>
                                            <td className="py-2 pr-4 pl-2">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => mover(e.id, -1)}
                                                        disabled={pendiente || i === 0}
                                                        className="w-6 h-6 rounded flex items-center justify-center text-subtle hover:text-foreground disabled:opacity-20 cursor-pointer"
                                                    >
                                                        <ArrowUp className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => mover(e.id, 1)}
                                                        disabled={pendiente || i === cola.length - 1}
                                                        className="w-6 h-6 rounded flex items-center justify-center text-subtle hover:text-foreground disabled:opacity-20 cursor-pointer"
                                                    >
                                                        <ArrowDown className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => correr(() => sacarDeCola(e.id), "Sacada de la cola.")}
                                                        disabled={pendiente}
                                                        className="w-6 h-6 rounded flex items-center justify-center text-subtle hover:text-rojo disabled:opacity-40 cursor-pointer"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filtradas.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="py-4 text-center text-[11px] text-subtle">
                                            Ninguna pareja de la cola con ese jugador.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {generando && (
                <Modal titulo="Generar la cola" onCerrar={() => setGenerando(false)}>
                    <label className="block">
                        <span className="label-tech text-[8px] text-subtle">Partidos por pareja</span>
                        <input
                            type="number"
                            min={1}
                            max={20}
                            value={porPareja}
                            onChange={(e) => setPorPareja(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                            className="mt-1 w-24 bg-muted border border-hairline rounded-lg h-9 px-3 text-[13px] font-bold text-foreground focus:outline-none focus:border-celeste/40"
                        />
                    </label>

                    <p className="text-[11px] text-muted-foreground mt-3">
                        {propuesta.partidos.length === 0
                            ? "No se puede armar ningún partido con estas parejas."
                            : `${propuesta.partidos.length} partidos para ${parejas.length} parejas. Se anotan al final de la cola.`}
                    </p>

                    {propuesta.avisos.map((a) => (
                        <p key={a} className="flex items-start gap-1.5 text-[10px] text-volt-ink mt-1.5">
                            <AlertTriangle className="w-3 h-3 shrink-0 mt-px" />
                            {a}
                        </p>
                    ))}

                    {propuesta.partidos.length > 0 && (
                        <ol className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-hairline divide-y divide-hairline">
                            {propuesta.partidos.map((m, i) => (
                                <li key={`${m.parejaA}-${m.parejaB}-${i}`} className="flex items-center gap-2 px-3 py-2">
                                    <span className="text-scoreboard text-[11px] text-celeste w-5 shrink-0">{i + 1}</span>
                                    <span className="flex-1 basis-0 min-w-0 truncate text-[11px] font-bold text-foreground text-right" title={nombrePareja(m.parejaA)}>
                                        {nombrePareja(m.parejaA)}
                                    </span>
                                    <span className="label-tech text-[7px] text-subtle shrink-0">vs</span>
                                    <span className="flex-1 basis-0 min-w-0 truncate text-[11px] font-bold text-foreground" title={nombrePareja(m.parejaB)}>
                                        {nombrePareja(m.parejaB)}
                                    </span>
                                </li>
                            ))}
                        </ol>
                    )}

                    <button
                        type="button"
                        disabled={pendiente || propuesta.partidos.length === 0}
                        onClick={() =>
                            correr(
                                () => anotarPartidosEnCola(desafioId, propuesta.partidos),
                                `${propuesta.partidos.length} partidos anotados en la cola.`,
                                () => setGenerando(false)
                            )
                        }
                        className="w-full mt-4 py-3 clip-notch bg-volt text-carbon-950 text-[10px] font-black uppercase tracking-widest hover:bg-volt-dark transition-all active:scale-95 disabled:opacity-30 cursor-pointer"
                    >
                        Anotar {propuesta.partidos.length} partidos
                    </button>
                </Modal>
            )}
        </div>
    );
}

// ── Ranking e historial ─────────────────────────────────────────────────────

function TablaRanking({ filas, puntos }: { filas: FilaRankingUI[]; puntos: DesafioResumen["puntos"] }) {
    if (filas.length === 0) {
        return (
            <div className="rounded-xl border border-hairline bg-card p-8 text-center">
                <Trophy className="w-8 h-8 text-subtle mx-auto mb-2" />
                <p className="text-[12px] text-subtle">Todavía no hay puntos cargados.</p>
            </div>
        );
    }
    return (
        <div>
            <div className="overflow-x-auto rounded-xl border border-hairline bg-card">
                <table className="w-full">
                    <thead>
                        <tr className="text-[9px] font-black uppercase tracking-widest text-subtle border-b border-hairline bg-muted">
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
                            <tr key={f.userId} className="border-b border-hairline last:border-0">
                                <td className="py-2 pl-4 pr-1 text-center">
                                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-scoreboard text-[11px] ${f.posicion === 1 ? "bg-gold/20 text-gold-ink" : f.posicion === 2 ? "bg-silver/20 text-silver-ink" : f.posicion === 3 ? "bg-bronze/20 text-bronze-ink" : "text-subtle"}`}>
                                        {f.posicion}
                                    </span>
                                </td>
                                <td className="py-2 px-2 text-[12px] font-bold text-foreground truncate">{f.nombre}</td>
                                <td className="py-2 px-2 text-center hidden sm:table-cell text-[10px] font-black uppercase text-celeste-light">{f.categoria || "—"}</td>
                                <td className="py-2 px-2 text-center text-[12px] text-muted-foreground tabular-nums">{f.jugados}</td>
                                <td className="py-2 px-2 text-center text-[12px] text-emerald-400 tabular-nums">{f.ganados}</td>
                                <td className="py-2 px-2 text-center hidden md:table-cell text-[11px] text-subtle tabular-nums">{f.gamesFavor}-{f.gamesContra}</td>
                                <td className={`py-2 px-2 text-center text-[12px] tabular-nums ${f.difGames >= 0 ? "text-emerald-400" : "text-rojo"}`}>
                                    {f.difGames > 0 ? "+" : ""}{f.difGames}
                                </td>
                                <td className="py-2 pr-4 pl-2 text-right text-scoreboard text-[15px] text-volt-ink">{f.puntos}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="text-[10px] text-subtle mt-2">
                {puntos.participacion} por participar · {puntos.victoria} por victoria · {puntos.derrota} por derrota.
                Desempata: partidos ganados, después diferencia de games.
            </p>
        </div>
    );
}

function Historial({
    partidos,
    onEditar,
}: {
    partidos: PartidoResumen[];
    onEditar: (partido: PartidoResumen) => void;
}) {
    if (partidos.length === 0) {
        return (
            <div className="rounded-xl border border-hairline bg-card p-8 text-center">
                <Swords className="w-8 h-8 text-subtle mx-auto mb-2" />
                <p className="text-[12px] text-subtle">Todavía no se jugó ningún partido.</p>
            </div>
        );
    }
    return (
        <ul className="rounded-xl border border-hairline bg-card divide-y divide-hairline">
            {partidos.map((m) => (
                <li key={m.id} className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1 text-[12px]">
                            <span className={m.ganador === 1 ? "text-emerald-400 font-bold" : "text-muted-foreground"}>
                                {m.equipo1.map((j) => j.nombre).join(" / ")}
                            </span>
                            <span className="text-subtle"> vs </span>
                            <span className={m.ganador === 2 ? "text-emerald-400 font-bold" : "text-muted-foreground"}>
                                {m.equipo2.map((j) => j.nombre).join(" / ")}
                            </span>
                        </div>
                        <span className="text-scoreboard text-[12px] text-celeste shrink-0">{m.resultado ?? "—"}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="label-tech text-[7px] text-subtle">{ETIQUETA_ESTADO_PARTIDO[m.estado]}</span>
                        {m.canchaNumero != null && <span className="label-tech text-[7px] text-subtle">· Cancha {m.canchaNumero}</span>}
                        {m.motivoRechazo && <span className="text-[9px] text-rojo">· {m.motivoRechazo}</span>}
                        {m.estado !== "cancelado" && (
                            <button
                                type="button"
                                onClick={() => onEditar(m)}
                                className="ml-auto label-tech text-[7px] text-subtle hover:text-celeste transition-colors cursor-pointer shrink-0"
                            >
                                {m.estado === "confirmado" ? "Corregir" : "Cargar resultado"}
                            </button>
                        )}
                    </div>
                </li>
            ))}
        </ul>
    );
}

// ── Formulario de resultado, inline ─────────────────────────────────────────

/**
 * Carga de resultado sin modal: se despliega dentro de la tarjeta.
 * Los games van por set; el ganador sale de cuántos sets ganó cada equipo.
 */
function FormResultado({
    inicial, pendiente, aviso, onGuardar, onCancelar,
}: {
    inicial?: SetPartido[] | null;
    pendiente: boolean;
    aviso?: string;
    onGuardar: (sets: SetPartido[]) => void;
    onCancelar: () => void;
}) {
    const [sets, setSets] = useState<{ t1: string; t2: string }[]>(() =>
        inicial?.length
            ? inicial.map((s) => ({ t1: String(s.t1), t2: String(s.t2) }))
            : [{ t1: "", t2: "" }, { t1: "", t2: "" }]
    );

    const set = (i: number, lado: "t1" | "t2", v: string) =>
        setSets((s) => s.map((x, j) => (j === i ? { ...x, [lado]: v.replace(/\D/g, "").slice(0, 2) } : x)));

    const limpios = sets
        .filter((s) => s.t1 !== "" && s.t2 !== "")
        .map((s) => ({ t1: Number(s.t1), t2: Number(s.t2) }));

    return (
        <div className="mt-2.5 pt-2.5 border-t border-hairline space-y-2">
            {aviso && (
                <p className="flex items-start gap-1.5 text-[10px] text-volt-ink">
                    <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                    {aviso}
                </p>
            )}

            {sets.map((s, i) => (
                <div key={i} className="flex items-center gap-1.5">
                    <span className="label-tech text-[7px] text-subtle w-8 shrink-0">S{i + 1}</span>
                    <input
                        inputMode="numeric"
                        value={s.t1}
                        onChange={(e) => set(i, "t1", e.target.value)}
                        className="w-11 bg-muted border border-hairline rounded-lg h-8 text-center text-[13px] text-scoreboard text-foreground focus:outline-none focus:border-celeste/50"
                    />
                    <span className="text-subtle text-[11px]">—</span>
                    <input
                        inputMode="numeric"
                        value={s.t2}
                        onChange={(e) => set(i, "t2", e.target.value)}
                        className="w-11 bg-muted border border-hairline rounded-lg h-8 text-center text-[13px] text-scoreboard text-foreground focus:outline-none focus:border-celeste/50"
                    />
                    {i === sets.length - 1 && sets.length < 5 && (
                        <button
                            type="button"
                            onClick={() => setSets((x) => [...x, { t1: "", t2: "" }])}
                            className="ml-auto flex items-center gap-0.5 label-tech text-[7px] text-celeste hover:text-celeste-light cursor-pointer shrink-0"
                        >
                            <Plus className="w-2.5 h-2.5" />
                            Set
                        </button>
                    )}
                </div>
            ))}

            <div className="flex gap-1.5 pt-0.5">
                <button
                    type="button"
                    onClick={onCancelar}
                    className="px-2.5 py-1.5 rounded-lg bg-muted border border-hairline text-muted-foreground label-tech text-[8px] hover:text-foreground transition-all cursor-pointer"
                >
                    Cancelar
                </button>
                <button
                    type="button"
                    onClick={() => onGuardar(limpios)}
                    disabled={limpios.length === 0 || pendiente}
                    className="flex-1 py-1.5 rounded-lg bg-volt text-carbon-950 label-tech text-[8px] hover:bg-volt-dark transition-all active:scale-95 disabled:opacity-30 cursor-pointer"
                >
                    Guardar
                </button>
            </div>
        </div>
    );
}

// ── Carga y corrección de resultado (admin) ─────────────────────────────────

function ModalResultado({
    partido, pendiente, onCerrar, onGuardar,
}: {
    partido: PartidoResumen;
    pendiente: boolean;
    onCerrar: () => void;
    onGuardar: (sets: SetPartido[]) => void;
}) {
    const yaConfirmado = partido.estado === "confirmado";
    const [sets, setSets] = useState<{ t1: string; t2: string }[]>(() =>
        partido.sets?.length
            ? partido.sets.map((s) => ({ t1: String(s.t1), t2: String(s.t2) }))
            : [{ t1: "", t2: "" }, { t1: "", t2: "" }]
    );

    const set = (i: number, lado: "t1" | "t2", v: string) =>
        setSets((s) => s.map((x, j) => (j === i ? { ...x, [lado]: v.replace(/\D/g, "").slice(0, 2) } : x)));

    const limpios = sets
        .filter((s) => s.t1 !== "" && s.t2 !== "")
        .map((s) => ({ t1: Number(s.t1), t2: Number(s.t2) }));

    return (
        <Modal titulo={yaConfirmado ? "Corregir resultado" : "Cargar resultado"} onCerrar={onCerrar}>
            <div className="space-y-3">
                <div className="text-[12px]">
                    <div className="text-foreground font-bold">{partido.equipo1.map((j) => j.nombre).join(" / ")}</div>
                    <div className="text-subtle text-[10px] my-0.5">vs</div>
                    <div className="text-foreground font-bold">{partido.equipo2.map((j) => j.nombre).join(" / ")}</div>
                </div>

                {yaConfirmado && (
                    <p className="flex items-start gap-1.5 text-[11px] text-volt-ink bg-muted border border-volt/30 rounded-lg p-2.5">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        Este partido ya estaba confirmado. Al guardar se reescriben los puntos de los cuatro
                        jugadores según el resultado nuevo.
                    </p>
                )}

                {sets.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <span className="label-tech text-[7px] text-subtle w-10">Set {i + 1}</span>
                        <input
                            inputMode="numeric"
                            value={s.t1}
                            onChange={(e) => set(i, "t1", e.target.value)}
                            className="w-14 bg-muted border border-hairline rounded-lg h-10 text-center text-[14px] text-scoreboard text-foreground focus:outline-none focus:border-celeste/40"
                        />
                        <span className="text-subtle">—</span>
                        <input
                            inputMode="numeric"
                            value={s.t2}
                            onChange={(e) => set(i, "t2", e.target.value)}
                            className="w-14 bg-muted border border-hairline rounded-lg h-10 text-center text-[14px] text-scoreboard text-foreground focus:outline-none focus:border-celeste/40"
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

                <button
                    type="button"
                    onClick={() => onGuardar(limpios)}
                    disabled={limpios.length === 0 || pendiente}
                    className="w-full py-3 clip-notch bg-volt text-carbon-950 text-[10px] font-black uppercase tracking-widest hover:bg-volt-dark transition-all active:scale-95 disabled:opacity-30 cursor-pointer"
                >
                    {yaConfirmado ? "Guardar y recalcular puntos" : "Guardar resultado"}
                </button>
            </div>
        </Modal>
    );
}

// ── Piezas comunes ──────────────────────────────────────────────────────────

function Etiqueta({ children, color }: { children: React.ReactNode; color: "live" | "celeste" | "volt" }) {
    const clases = {
        live: "bg-live/10 border-live/30 text-live",
        celeste: "bg-celeste/10 border-celeste/30 text-celeste",
        volt: "bg-volt/10 border-volt/30 text-volt-ink",
    }[color];
    return <span className={`px-1.5 py-0.5 rounded border text-[8px] font-black uppercase tracking-wider ${clases}`}>{children}</span>;
}

function Modal({ titulo, children, onCerrar }: { titulo: string; children: React.ReactNode; onCerrar: () => void }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
            <div className="absolute inset-0 bg-background/70 backdrop-blur-xl" onClick={onCerrar} />
            <div className="relative w-full sm:max-w-md max-h-[85vh] bg-background border border-hairline rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col shadow-2xl shadow-black/50">
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-hairline shrink-0">
                    <h3 className="heading-sport text-base text-foreground">{titulo}</h3>
                    <button
                        type="button"
                        onClick={onCerrar}
                        className="w-9 h-9 rounded-full bg-muted border border-hairline flex items-center justify-center hover:bg-muted active:scale-90 transition-all cursor-pointer"
                    >
                        <X className="w-4 h-4 text-foreground" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">{children}</div>
            </div>
        </div>
    );
}
