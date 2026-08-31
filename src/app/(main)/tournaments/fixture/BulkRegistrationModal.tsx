"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, Loader2, Check, AlertTriangle, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/Dialog";
import { bulkRegisterPlayers, getAvailablePlayers, type BulkRegistrationResult } from "./actions";

// Inscripción masiva: la carga rápida de una lista de papel. Mucha gente no
// quiere crearse una cuenta para jugar un torneo suelto, así que el admin carga
// los nombres y los que no existen se crean como invitados (ver
// bulkRegisterPlayers en ./actions).

type Sugerencia = {
    id: string;
    name: string;
    category: string | null;
    gender: string | null;
    side: string | null;
    isGuest?: boolean | null;
};

/**
 * Un jugador de la fila: o una cuenta existente elegida, o un nombre nuevo.
 * Lado, género y categoría son de cada jugador — una pareja mixta tiene un
 * integrante de cada género y pueden ser de categorías distintas.
 */
type SlotJugador = {
    userId?: string;
    name: string;
    side: string;
    gender: string;
    category: string;
};

type Fila = {
    key: string;
    p1: SlotJugador;
    p2: SlotJugador;
    estado?: "ok" | "error";
    mensaje?: string;
};

const LADOS = [
    { value: "", label: "—" },
    { value: "drive", label: "Drive" },
    { value: "reves", label: "Revés" },
    { value: "ambos", label: "Ambos" },
];

const GENEROS = [
    { value: "masculino", label: "Masc." },
    { value: "femenino", label: "Fem." },
];

const slotVacio = (categoria: string): SlotJugador => ({
    name: "",
    side: "",
    gender: "masculino",
    category: categoria,
});

const filaVacia = (categoriaPorDefecto: string): Fila => ({
    key: crypto.randomUUID(),
    p1: slotVacio(categoriaPorDefecto),
    p2: slotVacio(categoriaPorDefecto),
});

interface Props {
    open: boolean;
    onClose: () => void;
    tournamentId: string;
    isIndividual: boolean;
    categories: string[];
    /** Recibe las inscripciones creadas para sumarlas a la lista sin recargar. */
    onRegistered: (players: any[]) => void;
}

/** Tecla en la ayuda de navegación. */
const Tecla = ({ children }: { children: React.ReactNode }) => (
    <kbd className="inline-flex items-center px-1.5 py-0.5 rounded border border-hairline-strong bg-surface text-[9px] font-black text-muted-foreground leading-none">
        {children}
    </kbd>
);

/** Campo de nombre con sugerencias: elegís una cuenta existente o creás una nueva. */
function CampoNombre({
    slot,
    sugerencias,
    usados,
    placeholder,
    autoFocus,
    onChange,
    onEnter,
}: {
    slot: SlotJugador;
    sugerencias: Sugerencia[];
    usados: Set<string>;
    placeholder: string;
    autoFocus?: boolean;
    onChange: (next: SlotJugador, elegido?: Sugerencia) => void;
    /** Enter cuando el campo no tiene sugerencia que consumir. */
    onEnter: () => void;
}) {
    const [abierto, setAbierto] = useState(false);
    const [resaltado, setResaltado] = useState(0);
    const contenedor = useRef<HTMLDivElement>(null);
    const input = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!autoFocus) return;
        input.current?.focus();
        // El foco solo no alcanza dentro de un contenedor con scroll propio.
        input.current?.scrollIntoView({ block: "nearest" });
    }, [autoFocus]);

    useEffect(() => {
        if (!abierto) return;
        const fuera = (e: MouseEvent) => {
            if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
        };
        document.addEventListener("mousedown", fuera);
        return () => document.removeEventListener("mousedown", fuera);
    }, [abierto]);

    const elegir = (s: Sugerencia) => {
        onChange({ ...slot, userId: s.id, name: s.name, side: s.side || slot.side }, s);
        setAbierto(false);
    };

    const coincidencias = useMemo(() => {
        const q = slot.name.trim().toLowerCase();
        if (q.length < 2) return [];
        return sugerencias
            .filter(s => !usados.has(s.id) && s.name.toLowerCase().includes(q))
            .slice(0, 6);
    }, [slot.name, sugerencias, usados]);

    return (
        <div ref={contenedor} className="relative flex-1 min-w-0">
            <div className="flex items-center gap-1">
                <input
                    ref={input}
                    type="text"
                    value={slot.name}
                    placeholder={placeholder}
                    onChange={e => {
                        // Al editar el texto se suelta la cuenta elegida: el nombre
                        // ya no representa a ese usuario.
                        onChange({ ...slot, userId: undefined, name: e.target.value });
                        setAbierto(true);
                        setResaltado(0);
                    }}
                    onFocus={() => setAbierto(true)}
                    onKeyDown={e => {
                        const hayLista = abierto && coincidencias.length > 0;
                        if (e.key === "ArrowDown" && hayLista) {
                            e.preventDefault();
                            setResaltado(i => Math.min(i + 1, coincidencias.length - 1));
                            return;
                        }
                        if (e.key === "ArrowUp" && hayLista) {
                            e.preventDefault();
                            setResaltado(i => Math.max(i - 1, 0));
                            return;
                        }
                        if (e.key === "Escape" && abierto) {
                            e.preventDefault();
                            setAbierto(false);
                            return;
                        }
                        if (e.key === "Enter") {
                            e.preventDefault();
                            // El Enter no salta de campo mientras haya una sugerencia
                            // para elegir: primero se resuelve el nombre.
                            e.stopPropagation();
                            if (hayLista) {
                                elegir(coincidencias[resaltado]);
                                return;
                            }
                            setAbierto(false);
                            onEnter();
                        }
                    }}
                    className={`w-full bg-surface border rounded-lg px-2 py-1.5 text-[11px] font-bold outline-none transition-colors ${slot.userId
                        ? "border-emerald-500/50 text-emerald-500"
                        : "border-hairline text-foreground focus:border-celeste/60"}`}
                />
                {slot.userId && (
                    <span title="Cuenta existente" className="shrink-0 text-emerald-500">
                        <Check className="w-3 h-3" />
                    </span>
                )}
            </div>

            {abierto && coincidencias.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border border-hairline bg-card shadow-2xl overflow-hidden">
                    {coincidencias.map((s, i) => (
                        <button
                            key={s.id}
                            type="button"
                            onMouseEnter={() => setResaltado(i)}
                            onClick={() => elegir(s)}
                            className={`w-full text-left px-2 py-1.5 transition-colors flex items-center justify-between gap-2 ${i === resaltado ? "bg-surface" : "hover:bg-surface"}`}
                        >
                            <span className="text-[11px] font-bold text-foreground truncate">{s.name}</span>
                            <span className="text-[9px] font-black uppercase tracking-wider text-subtle shrink-0">
                                {s.isGuest ? "invitado" : s.category || ""}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function BulkRegistrationModal({
    open,
    onClose,
    tournamentId,
    isIndividual,
    categories,
    onRegistered,
}: Props) {
    const categoriaPorDefecto = categories[categories.length - 1] || "D";
    const [filas, setFilas] = useState<Fila[]>([]);
    const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
    const [guardando, setGuardando] = useState(false);
    // Qué campo de nombre debe recibir el foco (fila + integrante).
    const [foco, setFoco] = useState<{ key: string; slot: 1 | 2 } | null>(null);
    const listaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        setFilas([filaVacia(categoriaPorDefecto), filaVacia(categoriaPorDefecto), filaVacia(categoriaPorDefecto)]);
        getAvailablePlayers(tournamentId).then(p => setSugerencias(p as Sugerencia[]));
    }, [open, tournamentId, categoriaPorDefecto]);

    // Una cuenta no puede aparecer dos veces en la misma tanda.
    const usados = useMemo(() => {
        const set = new Set<string>();
        filas.forEach(f => {
            if (f.p1.userId) set.add(f.p1.userId);
            if (f.p2.userId) set.add(f.p2.userId);
        });
        return set;
    }, [filas]);

    const actualizar = (key: string, cambio: Partial<Fila>) =>
        setFilas(prev => prev.map(f => (f.key === key ? { ...f, ...cambio, estado: undefined, mensaje: undefined } : f)));

    // Al agregar una fila el cursor va directo a su primer campo: cargando una
    // lista larga, tener que buscar el input con el mouse cada vez es un embudo.
    const agregarFila = () => {
        const nueva = filaVacia(categoriaPorDefecto);
        setFilas(prev => [...prev, nueva]);
        setFoco({ key: nueva.key, slot: 1 });
        return nueva;
    };

    /**
     * Enter avanza al próximo campo de nombre: del jugador 1 al 2 dentro de la
     * pareja, y de ahí a la fila siguiente — creándola si estabas en la última.
     * Cargar una lista larga se hace entera con el teclado.
     */
    const avanzar = (key: string, slot: 1 | 2) => {
        if (slot === 1 && !isIndividual) {
            setFoco({ key, slot: 2 });
            return;
        }
        const idx = filas.findIndex(f => f.key === key);
        const siguiente = filas[idx + 1];
        if (siguiente) setFoco({ key: siguiente.key, slot: 1 });
        else agregarFila();
    };
    const borrarFila = (key: string) => setFilas(prev => prev.filter(f => f.key !== key));

    const filaCompleta = (f: Fila) =>
        !!(f.p1.userId || f.p1.name.trim()) && (isIndividual || !!(f.p2.userId || f.p2.name.trim()));

    const listas = filas.filter(filaCompleta);
    // Una fila a medias (un solo integrante de la pareja) no se manda: avisamos.
    const incompletas = filas.filter(
        f => !filaCompleta(f) && (f.p1.name.trim() || f.p2.name.trim() || f.p1.userId || f.p2.userId),
    ).length;

    const inscribir = async () => {
        if (listas.length === 0) {
            toast.error("Cargá al menos una inscripción completa");
            return;
        }
        setGuardando(true);
        try {
            const res = await bulkRegisterPlayers(
                tournamentId,
                listas.map(f => ({
                    key: f.key,
                    // La inscripción guarda una sola categoría (la del jugador 1);
                    // la de cada uno va a su ficha de usuario.
                    player1: {
                        userId: f.p1.userId,
                        name: f.p1.name.trim(),
                        category: f.p1.category,
                        gender: f.p1.gender,
                        side: f.p1.side || undefined,
                    },
                    player2: isIndividual
                        ? undefined
                        : {
                            userId: f.p2.userId,
                            name: f.p2.name.trim(),
                            category: f.p2.category,
                            gender: f.p2.gender,
                            side: f.p2.side || undefined,
                        },
                })),
            );

            if (res.error) {
                toast.error(res.error);
                return;
            }

            const porKey = new Map<string, BulkRegistrationResult>(res.results.map(r => [r.key, r]));
            const ok = res.results.filter(r => r.ok).length;
            const fallidas = res.results.filter(r => !r.ok);

            // Las que entraron desaparecen; las que fallaron quedan con su motivo
            // para corregirlas sin volver a cargar todo.
            setFilas(prev =>
                prev
                    .filter(f => porKey.get(f.key)?.ok !== true)
                    .map(f => {
                        const r = porKey.get(f.key);
                        return r && !r.ok ? { ...f, estado: "error" as const, mensaje: r.error } : f;
                    }),
            );

            if (ok > 0) {
                toast.success(`${ok} ${ok === 1 ? "inscripción cargada" : "inscripciones cargadas"}`);
                onRegistered(res.results.filter(r => r.ok && r.player).map(r => r.player));
            }
            if (fallidas.length > 0) {
                toast.error(`${fallidas.length} ${fallidas.length === 1 ? "fila quedó" : "filas quedaron"} sin cargar`);
            } else {
                onClose();
            }
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={o => !o && !guardando && onClose()}>
            {/* Alto fijo: con `grid` y `max-h` el modal crecía con cada fila. Ahora es
                una columna flex de alto fijo y lo único que scrollea es la lista. */}
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col gap-3 rounded-2xl p-5" hideClose>
                <DialogHeader className="shrink-0">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <DialogTitle className="text-base font-black uppercase italic tracking-tighter flex items-center gap-2">
                                <UserPlus className="w-4 h-4 text-celeste" />
                                Inscripción masiva
                            </DialogTitle>
                            <DialogDescription className="text-[11px]">
                                Los nombres que ya tienen cuenta aparecen como sugerencia: elegilos para que la
                                inscripción quede atada a esa cuenta. Los demás se crean como invitados y
                                después se pueden promover.
                            </DialogDescription>
                        </div>
                        <button
                            onClick={() => !guardando && onClose()}
                            className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </DialogHeader>

                {/* La carga es por teclado: sin esto el flujo queda escondido. */}
                <div className="shrink-0 flex flex-wrap items-center gap-x-3 gap-y-1 px-2 py-1.5 rounded-lg bg-surface/60 border border-hairline">
                    <span className="flex items-center gap-1 text-[10px] font-bold text-subtle">
                        <Tecla>Enter</Tecla>
                        {isIndividual ? "fila siguiente · crea una al final" : "compañero → fila siguiente · crea una al final"}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-subtle">
                        <Tecla>↑</Tecla><Tecla>↓</Tecla>
                        elegir sugerencia
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-subtle">
                        <Tecla>Esc</Tecla>
                        cerrar sugerencias
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-subtle">
                        <Tecla>Tab</Tecla>
                        campo por campo
                    </span>
                </div>

                <div ref={listaRef} className="flex-1 min-h-0 overflow-y-auto custom-scrollbar -mx-1 px-1 space-y-1.5">
                    {filas.map((f, idx) => (
                        <div
                            key={f.key}
                            className={`rounded-xl border p-2 transition-colors ${f.estado === "error"
                                ? "border-rojo/40 bg-rojo/[0.05]"
                                : "border-hairline bg-surface/40"}`}
                        >
                            <div className="flex items-start gap-1.5">
                                <span className="shrink-0 w-5 pt-2 text-[10px] font-black tabular-nums text-subtle text-right">
                                    {idx + 1}
                                </span>

                                {/* Una línea por jugador: cada uno con su lado, género
                                    y categoría. En una pareja mixta no son los mismos. */}
                                <div className="flex-1 min-w-0 space-y-1">
                                    {([1, 2] as const)
                                        .filter(n => n === 1 || !isIndividual)
                                        .map(n => {
                                            const slot = n === 1 ? f.p1 : f.p2;
                                            const set = (next: SlotJugador) =>
                                                actualizar(f.key, n === 1 ? { p1: next } : { p2: next });
                                            return (
                                                <div
                                                    key={n}
                                                    // Los selects no manejan Enter: se captura acá para que
                                                    // el salto de fila funcione desde cualquier campo.
                                                    onKeyDown={e => {
                                                        if (e.key !== "Enter") return;
                                                        e.preventDefault();
                                                        avanzar(f.key, n);
                                                    }}
                                                    className="flex items-center gap-1.5"
                                                >
                                                    <CampoNombre
                                                        slot={slot}
                                                        sugerencias={sugerencias}
                                                        usados={usados}
                                                        placeholder={isIndividual ? "Jugador" : `Jugador ${n}`}
                                                        autoFocus={foco?.key === f.key && foco.slot === n}
                                                        onEnter={() => avanzar(f.key, n)}
                                                        onChange={(next, elegido) => set({
                                                            ...next,
                                                            // Elegir una cuenta trae sus datos ya cargados.
                                                            category: elegido?.category || next.category,
                                                            gender: elegido?.gender || next.gender,
                                                        })}
                                                    />
                                                    {!isIndividual && (
                                                        <select
                                                            value={slot.side}
                                                            onChange={e => set({ ...slot, side: e.target.value })}
                                                            title="Lado de la cancha"
                                                            className="shrink-0 w-[70px] bg-surface border border-hairline rounded-lg px-1 py-1.5 text-[10px] font-bold text-muted-foreground outline-none focus:border-celeste/60 cursor-pointer"
                                                        >
                                                            {LADOS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                                                        </select>
                                                    )}
                                                    <select
                                                        value={slot.gender}
                                                        onChange={e => set({ ...slot, gender: e.target.value })}
                                                        title="Género"
                                                        className="shrink-0 w-[68px] bg-surface border border-hairline rounded-lg px-1 py-1.5 text-[10px] font-bold text-muted-foreground outline-none focus:border-celeste/60 cursor-pointer"
                                                    >
                                                        {GENEROS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                                                    </select>
                                                    <select
                                                        value={slot.category}
                                                        onChange={e => set({ ...slot, category: e.target.value })}
                                                        title="Categoría"
                                                        className="shrink-0 w-[58px] bg-surface border border-hairline rounded-lg px-1 py-1.5 text-[10px] font-bold text-muted-foreground outline-none focus:border-celeste/60 cursor-pointer"
                                                    >
                                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                </div>
                                            );
                                        })}
                                </div>

                                <button
                                    onClick={() => borrarFila(f.key)}
                                    title="Quitar fila"
                                    className="shrink-0 mt-1 p-1.5 rounded-lg text-subtle hover:text-rojo hover:bg-rojo/10 transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {f.estado === "error" && (
                                <p className="mt-1 pl-7 text-[10px] font-bold text-rojo">{f.mensaje}</p>
                            )}
                        </div>
                    ))}
                </div>

                <button
                    onClick={agregarFila}
                    className="shrink-0 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-hairline-strong text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-celeste hover:border-celeste/50 transition-colors"
                >
                    <Plus className="w-3.5 h-3.5" />
                    Agregar fila
                </button>

                {incompletas > 0 && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30">
                        <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                        <span className="text-[10px] font-bold text-amber-500">
                            {incompletas} {incompletas === 1 ? "fila incompleta se va a ignorar" : "filas incompletas se van a ignorar"}
                        </span>
                    </div>
                )}

                <div className="shrink-0 flex gap-3">
                    <button
                        onClick={() => !guardando && onClose()}
                        className="flex-1 px-4 py-3 bg-muted hover:bg-muted/80 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={inscribir}
                        disabled={guardando || listas.length === 0}
                        className="flex-[2] px-4 py-3 bg-celeste hover:bg-celeste-light text-carbon-950 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-celeste/20 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
                    >
                        {guardando
                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Inscribiendo...</>
                            : <>Inscribir {listas.length > 0 ? `(${listas.length})` : ""}</>}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
