"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    CalendarDays, Check, ChevronRight, Clock, Lock, MapPin, Pencil, Plus,
    Settings2, Swords, Ticket, Trash2, Trophy, Unlock, Users, X,
} from "lucide-react";
import { ESTADO_DESAFIO, ETIQUETA_ESTADO_DESAFIO } from "@/lib/desafio";
import {
    abrirDesafio, cerrarDesafio, crearDesafio, editarDesafio, eliminarDesafio, reabrirDesafio,
    type DatosDesafio, type DesafioResumen,
} from "../desafio/actions/desafios";

type Categoria = { id: string; nombre: string; orden: number };

export default function GestionDesafiosClient({
    desafios,
    categorias,
}: {
    desafios: DesafioResumen[];
    categorias: Categoria[];
}) {
    const router = useRouter();
    const [creando, setCreando] = useState(false);
    const [editando, setEditando] = useState<string | null>(null);
    const [pendiente, iniciar] = useTransition();

    const correr = (
        fn: () => Promise<{ ok: boolean; error?: string }>,
        exito: string,
        despues?: () => void
    ) => {
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

    return (
        <div className="min-h-screen bg-grid-carbon">
            <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
                <header className="flex items-start justify-between gap-4">
                    <div>
                        <Link
                            href="/desafio"
                            className="inline-flex items-center gap-1.5 label-tech text-[8px] text-muted-foreground hover:text-foreground transition-colors mb-2"
                        >
                            <Swords className="w-3 h-3" />
                            Ver la página pública
                        </Link>
                        <h1 className="heading-sport text-2xl sm:text-3xl text-foreground">Gestión de Desafíos</h1>
                        <p className="text-[11px] text-subtle mt-1">
                            Cada desafío tiene su categoría, sus canchas y su propia tabla de posiciones.
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-muted border border-celeste/30 flex items-center justify-center shrink-0">
                        <Settings2 className="w-5 h-5 text-celeste" />
                    </div>
                </header>

                {creando ? (
                    <Formulario
                        titulo="Crear un desafío"
                        accion="Crear desafío"
                        categorias={categorias}
                        pendiente={pendiente}
                        onCancelar={() => setCreando(false)}
                        onGuardar={(datos) =>
                            correr(() => crearDesafio(datos), "Desafío creado en borrador.", () => setCreando(false))
                        }
                    />
                ) : (
                    <button
                        type="button"
                        onClick={() => setCreando(true)}
                        className="w-full flex items-center justify-center gap-2 py-3 clip-notch bg-volt text-carbon-950 text-[10px] font-black uppercase tracking-widest hover:bg-volt-dark transition-all active:scale-95 shadow-lg shadow-volt/20 cursor-pointer"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Crear un desafío
                    </button>
                )}

                {desafios.length === 0 && !creando ? (
                    <div className="rounded-2xl border border-hairline bg-card shadow-lg shadow-black/40 p-8 text-center">
                        <Swords className="w-10 h-10 text-subtle mx-auto mb-3" />
                        <h2 className="heading-sport text-lg text-muted-foreground">Todavía no hay desafíos</h2>
                        <p className="text-[12px] text-subtle mt-1.5">Creá el primero para empezar a recibir inscripciones.</p>
                    </div>
                ) : (
                    desafios.map((d) =>
                        editando === d.id ? (
                            <Formulario
                                key={d.id}
                                titulo={`Editar "${d.nombre}"`}
                                accion="Guardar cambios"
                                categorias={categorias}
                                pendiente={pendiente}
                                inicial={d}
                                onCancelar={() => setEditando(null)}
                                onGuardar={(datos) =>
                                    correr(() => editarDesafio(d.id, datos), "Desafío actualizado.", () => setEditando(null))
                                }
                            />
                        ) : (
                            <TarjetaDesafio
                                key={d.id}
                                desafio={d}
                                pendiente={pendiente}
                                onEditar={() => setEditando(d.id)}
                                onAbrir={() => correr(() => abrirDesafio(d.id), "Desafío abierto: ya se pueden inscribir.")}
                                onCerrar={() => correr(() => cerrarDesafio(d.id), "Desafío cerrado.")}
                                onReabrir={() => correr(() => reabrirDesafio(d.id), "Desafío reabierto.")}
                                onEliminar={() => {
                                    if (!confirm(`¿Eliminar "${d.nombre}"? Se borran también sus inscriptos.`)) return;
                                    correr(() => eliminarDesafio(d.id), "Desafío eliminado.");
                                }}
                            />
                        )
                    )
                )}
            </div>
        </div>
    );
}

// ── Tarjeta ─────────────────────────────────────────────────────────────────

function TarjetaDesafio({
    desafio: d,
    pendiente,
    onEditar,
    onAbrir,
    onCerrar,
    onReabrir,
    onEliminar,
}: {
    desafio: DesafioResumen;
    pendiente: boolean;
    onEditar: () => void;
    onAbrir: () => void;
    onCerrar: () => void;
    onReabrir: () => void;
    onEliminar: () => void;
}) {
    const borrador = d.estado === ESTADO_DESAFIO.BORRADOR;
    const abierto = d.estado === ESTADO_DESAFIO.ABIERTO;
    const cerrado = d.estado === ESTADO_DESAFIO.CERRADO;

    return (
        <section className="rounded-2xl border border-hairline bg-card shadow-lg shadow-black/40 overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-hairline bg-background/60">
                <div className="flex items-center gap-2 min-w-0">
                    {abierto ? <span className="live-dot" /> : cerrado ? <Trophy className="w-3.5 h-3.5 text-gold-ink" /> : <Swords className="w-3.5 h-3.5 text-muted-foreground" />}
                    <span className={`label-tech text-[8px] ${abierto ? "text-volt-ink" : cerrado ? "text-gold-ink" : "text-muted-foreground"}`}>
                        {ETIQUETA_ESTADO_DESAFIO[d.estado]}
                    </span>
                </div>
                <button
                    type="button"
                    onClick={onEditar}
                    disabled={pendiente}
                    className="flex items-center gap-1.5 label-tech text-[8px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 cursor-pointer"
                >
                    <Pencil className="w-3 h-3" />
                    Editar
                </button>
            </div>

            <div className="p-5">
                <div className="flex items-center gap-3.5">
                    <ChipCategoria nombres={d.categorias.map((c) => c.nombre)} />
                    <div className="min-w-0">
                        <h2 className="heading-sport text-xl text-foreground truncate">{d.nombre}</h2>
                        <p className="label-tech text-[7px] text-celeste mt-1">
                            {d.categorias.length === 0
                                ? "Sin categoría"
                                : `Exclusivo categoría ${d.categorias.map((c) => c.nombre).join(", ")}`}
                        </p>
                    </div>
                </div>

                {d.descripcion && <p className="text-[12px] text-muted-foreground mt-3 leading-relaxed">{d.descripcion}</p>}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                    <Dato icono={CalendarDays} rotulo="Período" valor={periodo(d.fechaInicio, d.fechaFin)} />
                    <Dato icono={Clock} rotulo="Hora" valor={d.hora || "A confirmar"} />
                    <Dato icono={MapPin} rotulo="Lugar" valor={d.lugar || "A confirmar"} />
                    <Dato
                        icono={Ticket}
                        rotulo="Inscripción"
                        valor={d.inscripcion ? `$${d.inscripcion.toLocaleString("es-AR")}` : "Gratis"}
                    />
                </div>

                <div className="flex items-center justify-between gap-3 mt-4 px-3 py-2.5 rounded-xl bg-muted border border-hairline">
                    <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-celeste" />
                        <span className="label-tech text-[8px] text-muted-foreground">Inscriptos</span>
                    </div>
                    <span className="text-scoreboard text-[15px] text-foreground">
                        {d.inscriptos}{d.cupo > 0 ? `/${d.cupo}` : ""}
                    </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    {borrador && (
                        <button
                            type="button"
                            onClick={onAbrir}
                            disabled={pendiente}
                            className="flex-1 flex items-center justify-center gap-2 py-3 clip-notch bg-volt text-carbon-950 text-[10px] font-black uppercase tracking-widest hover:bg-volt-dark transition-all active:scale-95 shadow-lg shadow-volt/20 disabled:opacity-40 cursor-pointer"
                        >
                            <Unlock className="w-3.5 h-3.5" />
                            Abrir el desafío
                        </button>
                    )}
                    {abierto && (
                        <button
                            type="button"
                            onClick={onCerrar}
                            disabled={pendiente}
                            className="sm:w-auto px-4 py-3 clip-notch bg-muted border border-hairline text-muted-foreground text-[10px] font-black uppercase tracking-widest hover:border-rojo/40 hover:text-rojo transition-all active:scale-95 disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
                        >
                            <Lock className="w-3.5 h-3.5" />
                            Cerrar
                        </button>
                    )}
                    {cerrado && (
                        <button
                            type="button"
                            onClick={onReabrir}
                            disabled={pendiente}
                            className="sm:w-auto px-4 py-3 clip-notch bg-muted border border-hairline text-muted-foreground text-[10px] font-black uppercase tracking-widest hover:border-celeste/40 hover:text-foreground transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                        >
                            Reabrir
                        </button>
                    )}

                    {!borrador && (
                        <Link
                            href={`/gestionDesafio/${d.id}`}
                            className="flex-1 flex items-center justify-center gap-2 py-3 clip-notch bg-celeste text-carbon-950 text-[10px] font-black uppercase tracking-widest hover:bg-celeste-light transition-all active:scale-95 shadow-lg shadow-celeste/20"
                        >
                            Panel en vivo
                            <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                    )}
                </div>

                {borrador && (
                    <button
                        type="button"
                        onClick={onEliminar}
                        disabled={pendiente}
                        className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-hairline text-subtle text-[9px] font-black uppercase tracking-widest hover:text-rojo hover:border-rojo/30 transition-all disabled:opacity-40 cursor-pointer"
                    >
                        <Trash2 className="w-3 h-3" />
                        Eliminar desafío
                    </button>
                )}
            </div>
        </section>
    );
}

/**
 * El cuadrito de categoría de la tarjeta. Con varias categorías admitidas las
 * muestra juntas ("C/B") y achica la tipografía para que sigan entrando.
 */
export function ChipCategoria({ nombres, size = "md" }: { nombres: string[]; size?: "md" | "lg" }) {
    const caja = size === "lg" ? "w-16 h-16" : "w-14 h-14";
    const nombre = nombres.join("/");
    const valor =
        nombres.length <= 1 ? (size === "lg" ? "text-2xl" : "text-xl")
            : nombre.length <= 4 ? (size === "lg" ? "text-lg" : "text-base")
                : nombre.length <= 7 ? "text-[11px]"
                    : "text-[9px]";

    if (nombres.length === 0) {
        return (
            <div className={`${caja} shrink-0 clip-notch bg-muted border border-hairline flex flex-col items-center justify-center`}>
                <span className="label-tech text-[6px] text-subtle leading-none">Cat</span>
                <span className={`heading-sport ${valor} text-muted-foreground leading-none mt-1`}>—</span>
            </div>
        );
    }
    return (
        <div className={`${caja} shrink-0 clip-notch bg-celeste/15 border border-celeste/35 flex flex-col items-center justify-center shadow-lg shadow-celeste/10`}>
            <span className="label-tech text-[6px] text-celeste/70 leading-none">Cat</span>
            <span className={`heading-sport ${valor} text-celeste leading-none mt-1 px-1 text-center`}>{nombre}</span>
        </div>
    );
}

function Dato({ icono: Icono, rotulo, valor }: { icono: any; rotulo: string; valor: string }) {
    return (
        <div className="px-3 py-2 rounded-xl bg-muted border border-hairline min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
                <Icono className="w-3 h-3 text-subtle shrink-0" />
                <span className="label-tech text-[7px] text-subtle">{rotulo}</span>
            </div>
            <div className="text-[11px] font-bold text-foreground truncate">{valor}</div>
        </div>
    );
}

function fechaLocal(s: string) {
    if (s.length === 10 && s.includes("-")) {
        const [y, m, d] = s.split("-").map(Number);
        return new Date(y, m - 1, d);
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
}

/** "12 de agosto" para un día, "12 ago – 30 ago" para un período. */
export function periodo(inicio: string | null, fin: string | null) {
    const a = inicio ? fechaLocal(inicio) : null;
    const b = fin ? fechaLocal(fin) : null;
    if (!a) return "Sin fecha";
    const largo = (d: Date) => d.toLocaleDateString("es-AR", { day: "numeric", month: "long" });
    const corto = (d: Date) => d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
    if (!b || inicio === fin) return largo(a);
    return `${corto(a)} – ${corto(b)}`;
}

// ── Formulario ──────────────────────────────────────────────────────────────

function Formulario({
    titulo,
    accion,
    categorias,
    inicial,
    pendiente,
    onGuardar,
    onCancelar,
}: {
    titulo: string;
    accion: string;
    categorias: Categoria[];
    inicial?: DesafioResumen;
    pendiente: boolean;
    onGuardar: (datos: DatosDesafio) => void;
    onCancelar: () => void;
}) {
    const [form, setForm] = useState<DatosDesafio>({
        nombre: inicial?.nombre ?? "",
        categoriaIds: inicial?.categorias.map((c) => c.id) ?? [],
        descripcion: inicial?.descripcion ?? "",
        fechaInicio: inicial?.fechaInicio ?? "",
        fechaFin: inicial?.fechaFin ?? "",
        hora: inicial?.hora ?? "",
        lugar: inicial?.lugar ?? "",
        inscripcion: inicial?.inscripcion ?? null,
        cupo: inicial?.cupo ?? 0,
        puntosParticipacion: inicial?.puntos.participacion ?? 1,
        puntosVictoria: inicial?.puntos.victoria ?? 3,
        puntosDerrota: inicial?.puntos.derrota ?? 0,
    });

    const set = <K extends keyof DatosDesafio>(k: K, v: DatosDesafio[K]) => setForm((p) => ({ ...p, [k]: v }));
    const periodoInvalido = !!form.fechaInicio && !!form.fechaFin && form.fechaFin < form.fechaInicio;
    const listo = !!form.nombre?.trim() && form.categoriaIds.length > 0 && !periodoInvalido;

    const alternarCategoria = (id: string) =>
        setForm((p) => ({
            ...p,
            categoriaIds: p.categoriaIds.includes(id)
                ? p.categoriaIds.filter((x) => x !== id)
                : [...p.categoriaIds, id],
        }));

    // Para el texto de ayuda: los nombres elegidos, de la más baja a la más alta.
    const elegidas = categorias.filter((c) => form.categoriaIds.includes(c.id)).map((c) => c.nombre);

    return (
        <section className="rounded-2xl border border-hairline bg-card shadow-lg shadow-black/40 p-5">
            <h2 className="heading-sport text-lg text-foreground mb-4">{titulo}</h2>

            <div className="space-y-3">
                <Campo rotulo="Nombre">
                    <input
                        value={form.nombre}
                        onChange={(e) => set("nombre", e.target.value)}
                        placeholder="Desafío de Agosto"
                        className={entrada}
                    />
                </Campo>

                <Campo rotulo="Categorías (al menos una)">
                    {categorias.length === 0 ? (
                        <p className="text-[11px] text-rojo">
                            No hay categorías activas. Creá una en Admin → Categorías antes de seguir.
                        </p>
                    ) : (
                        <div className="flex flex-wrap gap-1.5">
                            {categorias.map((c) => {
                                const elegida = form.categoriaIds.includes(c.id);
                                return (
                                    <button
                                        key={c.id}
                                        type="button"
                                        aria-pressed={elegida}
                                        onClick={() => alternarCategoria(c.id)}
                                        className={`px-3 h-9 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 cursor-pointer ${elegida
                                            ? "bg-celeste text-carbon-950 border-celeste shadow-lg shadow-celeste/20"
                                            : "bg-muted border-hairline text-muted-foreground hover:text-foreground hover:border-celeste/40"
                                            }`}
                                    >
                                        {c.nombre}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    <p className="text-[10px] text-subtle mt-1.5">
                        {elegidas.length === 0
                            ? "Sólo se van a poder inscribir los jugadores de las categorías que marques."
                            : `Se pueden inscribir únicamente los de ${elegidas.join(", ")}. Para que jueguen "para arriba", marcá también su categoría.`}
                    </p>
                </Campo>

                <Campo rotulo="Descripción (opcional)">
                    <textarea
                        value={form.descripcion ?? ""}
                        onChange={(e) => set("descripcion", e.target.value)}
                        rows={2}
                        placeholder="Cómo se juega, qué llevar, etc."
                        className={`${entrada} h-auto py-2.5 resize-none`}
                    />
                </Campo>

                <div className="grid grid-cols-2 gap-3">
                    <Campo rotulo="Fecha de inicio">
                        <input type="date" value={form.fechaInicio ?? ""} onChange={(e) => set("fechaInicio", e.target.value)} className={entrada} />
                    </Campo>
                    <Campo rotulo="Fecha de fin">
                        <input
                            type="date"
                            value={form.fechaFin ?? ""}
                            min={form.fechaInicio || undefined}
                            onChange={(e) => set("fechaFin", e.target.value)}
                            className={periodoInvalido ? entradaError : entrada}
                        />
                    </Campo>
                </div>
                {periodoInvalido && <p className="text-[10px] text-rojo -mt-1">La fecha de fin no puede ser anterior a la de inicio.</p>}

                <div className="grid grid-cols-2 gap-3">
                    <Campo rotulo="Hora">
                        <input type="time" value={form.hora ?? ""} onChange={(e) => set("hora", e.target.value)} className={entrada} />
                    </Campo>
                    <Campo rotulo="Lugar">
                        <input value={form.lugar ?? ""} onChange={(e) => set("lugar", e.target.value)} placeholder="Club, dirección..." className={entrada} />
                    </Campo>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <Campo rotulo="Monto de inscripción ($)">
                        <input
                            type="number"
                            min={0}
                            value={form.inscripcion ?? ""}
                            onChange={(e) => set("inscripcion", e.target.value ? Number(e.target.value) : null)}
                            placeholder="0 = gratis"
                            className={entrada}
                        />
                    </Campo>
                    <Campo rotulo="Cupo (0 = sin límite)">
                        <input
                            type="number"
                            min={0}
                            value={form.cupo ?? 0}
                            onChange={(e) => set("cupo", e.target.value ? Number(e.target.value) : 0)}
                            className={entrada}
                        />
                    </Campo>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <Campo rotulo="Pts participación">
                        <input type="number" min={0} value={form.puntosParticipacion ?? 1} onChange={(e) => set("puntosParticipacion", Number(e.target.value))} className={entrada} />
                    </Campo>
                    <Campo rotulo="Pts victoria">
                        <input type="number" min={0} value={form.puntosVictoria ?? 3} onChange={(e) => set("puntosVictoria", Number(e.target.value))} className={entrada} />
                    </Campo>
                    <Campo rotulo="Pts derrota">
                        <input type="number" min={0} value={form.puntosDerrota ?? 0} onChange={(e) => set("puntosDerrota", Number(e.target.value))} className={entrada} />
                    </Campo>
                </div>
            </div>

            <div className="flex gap-2 mt-5">
                <button
                    type="button"
                    onClick={onCancelar}
                    className="px-4 py-3 clip-notch bg-muted border border-hairline text-muted-foreground text-[10px] font-black uppercase tracking-widest hover:text-foreground transition-all active:scale-95 cursor-pointer"
                >
                    Cancelar
                </button>
                <button
                    type="button"
                    onClick={() => onGuardar(form)}
                    disabled={pendiente || !listo}
                    className="flex-1 flex items-center justify-center gap-2 py-3 clip-notch bg-volt text-carbon-950 text-[10px] font-black uppercase tracking-widest hover:bg-volt-dark transition-all active:scale-95 shadow-lg shadow-volt/20 disabled:opacity-30 cursor-pointer"
                >
                    <Check className="w-3.5 h-3.5" />
                    {accion}
                </button>
            </div>
        </section>
    );
}

const entrada =
    "w-full bg-muted border border-hairline rounded-xl h-11 px-3 text-[12px] font-bold text-foreground placeholder:text-subtle focus:outline-none focus:border-celeste/40 transition-all";
const entradaError =
    "w-full bg-muted border border-rojo/60 rounded-xl h-11 px-3 text-[12px] font-bold text-foreground focus:outline-none transition-all";

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="label-tech text-[7px] text-subtle block mb-1.5">{rotulo}</span>
            {children}
        </label>
    );
}
