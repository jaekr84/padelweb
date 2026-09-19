"use client";

// Piezas compartidas por la caja general y por la pantalla de un evento: las
// dos muestran la misma tabla de movimientos y abren el mismo formulario, así
// que viven acá una sola vez. Si se duplicaran, cargar un gasto desde un torneo
// y cargarlo desde la caja terminarían validando distinto.

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
    ArrowDownLeft, ArrowUpRight, Loader2, Pencil, Trash2, Trophy, Wallet, X,
    type LucideIcon,
} from "lucide-react";
import {
    RUBROS_POR_TIPO, TIPO_MOVIMIENTO, etiquetaDeRubro, etiquetaDeTipoEvento, formatearFecha, formatearMonto,
    formatearMontoTipeado, hoyISO, parsearMontoACentavos, rubroValido, rutaDeEvento,
    type EventoRef, type Movimiento, type OpcionEvento, type Rubro, type TipoMovimiento,
} from "@/lib/contaduria";
import type { DatosMovimiento } from "./actions";

export const colorDe = (tipo: TipoMovimiento) =>
    tipo === TIPO_MOVIMIENTO.INGRESO ? "text-emerald-400" : "text-red-400";

export const signoDe = (tipo: TipoMovimiento) => (tipo === TIPO_MOVIMIENTO.INGRESO ? "+" : "−");

// ── Totales ─────────────────────────────────────────────────────────────────

const TONOS = {
    ingreso: { texto: "text-emerald-400", borde: "border-emerald-400/30", fondo: "bg-emerald-400/10" },
    gasto: { texto: "text-red-400", borde: "border-red-400/30", fondo: "bg-red-400/10" },
    saldo: { texto: "text-foreground", borde: "border-hairline", fondo: "bg-muted" },
} as const;

export function Tarjeta({
    rotulo, monto, tono, icono: Icono,
}: {
    rotulo: string;
    monto: number;
    tono: keyof typeof TONOS;
    icono: LucideIcon;
}) {
    const t = TONOS[tono];
    return (
        <div className={`rounded-2xl border ${t.borde} bg-card shadow-lg shadow-black/20 p-4`}>
            <div className="flex items-center justify-between gap-2 mb-2">
                <span className="label-tech text-[8px] text-subtle truncate">{rotulo}</span>
                <span className={`w-7 h-7 rounded-lg ${t.fondo} flex items-center justify-center shrink-0`}>
                    <Icono className={`w-3.5 h-3.5 ${t.texto}`} />
                </span>
            </div>
            <div className={`text-scoreboard text-xl sm:text-2xl ${t.texto} tabular-nums`}>{formatearMonto(monto)}</div>
        </div>
    );
}

export function Vacio({ titulo, detalle }: { titulo: string; detalle: string }) {
    return (
        <div className="rounded-2xl border border-hairline bg-card shadow-lg shadow-black/20 p-8 text-center">
            <Wallet className="w-10 h-10 text-subtle mx-auto mb-3" />
            <h2 className="heading-sport text-lg text-muted-foreground">{titulo}</h2>
            <p className="text-[12px] text-subtle mt-1.5">{detalle}</p>
        </div>
    );
}

// ── Chips ───────────────────────────────────────────────────────────────────

export function Chip({ tipo }: { tipo: TipoMovimiento }) {
    const ingreso = tipo === TIPO_MOVIMIENTO.INGRESO;
    return (
        <span
            className={`inline-flex items-center gap-1 px-2 h-6 rounded-lg border text-[9px] font-black uppercase tracking-widest ${ingreso
                ? "bg-emerald-400/10 border-emerald-400/30 text-emerald-400"
                : "bg-red-400/10 border-red-400/30 text-red-400"
                }`}
        >
            {ingreso ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
            {ingreso ? "Ingreso" : "Gasto"}
        </span>
    );
}

export function ChipRubro({ rubro }: { rubro: Rubro }) {
    return (
        <span className="inline-flex items-center px-1.5 h-5 rounded-md bg-muted border border-hairline text-[9px] font-black uppercase tracking-wider text-subtle whitespace-nowrap">
            {etiquetaDeRubro(rubro)}
        </span>
    );
}

/** El evento del movimiento, clickeable: lleva a su contaduría. */
export function ChipEvento({ evento }: { evento: EventoRef }) {
    return (
        <Link
            href={rutaDeEvento(evento.tipo, evento.id)}
            title={`${etiquetaDeTipoEvento(evento.tipo)}: ${evento.nombre}`}
            className="inline-flex items-center gap-1 px-2 h-6 max-w-full rounded-lg bg-celeste/10 border border-celeste/30 text-[9px] font-black uppercase tracking-wider text-celeste hover:bg-celeste/20 transition-colors"
        >
            <Trophy className="w-3 h-3 shrink-0" />
            <span className="truncate">{evento.nombre}</span>
        </Link>
    );
}

// ── Listado ─────────────────────────────────────────────────────────────────
//
// Es una pantalla de gestión: en desktop va la tabla, y en mobile las mismas
// filas en formato compacto porque siete columnas no entran.

export function Tabla({
    movimientos, pendiente, mostrarEvento = true, onEditar, onEliminar,
}: {
    movimientos: Movimiento[];
    pendiente: boolean;
    /** En la pantalla de un evento la columna sobra: son todos del mismo. */
    mostrarEvento?: boolean;
    onEditar: (m: Movimiento) => void;
    onEliminar: (m: Movimiento) => void;
}) {
    return (
        <div className="hidden md:block overflow-x-auto rounded-2xl border border-hairline bg-card shadow-lg shadow-black/20">
            <table className="w-full">
                <thead>
                    <tr className="text-[9px] font-black uppercase tracking-widest text-subtle border-b border-hairline bg-muted">
                        <th className="py-2.5 pl-4 pr-2 text-left w-28">Fecha</th>
                        <th className="py-2.5 px-2 text-left w-24">Tipo</th>
                        <th className="py-2.5 px-2 text-left">Descripción</th>
                        {mostrarEvento && <th className="py-2.5 px-2 text-left w-44">Evento</th>}
                        <th className="py-2.5 px-2 text-left w-40">Registró</th>
                        <th className="py-2.5 px-2 text-right w-36">Monto</th>
                        <th className="py-2.5 pr-4 pl-2 text-right w-24">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {movimientos.map((m) => (
                        <tr key={m.id} className="border-b border-hairline last:border-0 hover:bg-muted/60 transition-colors">
                            <td className="py-2 pl-4 pr-2 text-[11px] text-muted-foreground whitespace-nowrap tabular-nums">
                                {formatearFecha(m.fecha)}
                            </td>
                            <td className="py-2 px-2"><Chip tipo={m.tipo} /></td>
                            <td className="py-2 px-2 max-w-0">
                                <div className="text-[12px] font-bold text-foreground truncate" title={m.descripcion}>
                                    {m.descripcion}
                                </div>
                                <div className="mt-0.5"><ChipRubro rubro={m.rubro} /></div>
                            </td>
                            {mostrarEvento && (
                                <td className="py-2 px-2 max-w-0">
                                    {m.evento
                                        ? <ChipEvento evento={m.evento} />
                                        : <span className="text-[10px] text-subtle">Caja general</span>}
                                </td>
                            )}
                            <td className="py-2 px-2 max-w-0" title={`${m.registradoPor.nombre}${m.registradoPor.email ? ` · ${m.registradoPor.email}` : ""}`}>
                                <div className="text-[11px] text-muted-foreground truncate">{m.registradoPor.nombre}</div>
                                {/* Sin repetirlo cuando el nombre ya es el email (usuario sin nombre cargado). */}
                                {m.registradoPor.email && m.registradoPor.email !== m.registradoPor.nombre && (
                                    <div className="text-[9px] text-subtle truncate">{m.registradoPor.email}</div>
                                )}
                            </td>
                            <td className={`py-2 px-2 text-right text-[13px] text-scoreboard tabular-nums whitespace-nowrap ${colorDe(m.tipo)}`}>
                                {signoDe(m.tipo)}{formatearMonto(m.montoCentavos)}
                            </td>
                            <td className="py-2 pr-4 pl-2">
                                <Acciones pendiente={pendiente} onEditar={() => onEditar(m)} onEliminar={() => onEliminar(m)} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function FilaCompacta({
    movimiento: m, pendiente, mostrarEvento = true, onEditar, onEliminar,
}: {
    movimiento: Movimiento;
    pendiente: boolean;
    mostrarEvento?: boolean;
    onEditar: () => void;
    onEliminar: () => void;
}) {
    return (
        <div className="rounded-xl border border-hairline bg-card p-3 space-y-2">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-[12px] font-bold text-foreground truncate">{m.descripcion}</div>
                    {/* En mobile no entra el email: va en el title y queda el nombre. */}
                    <div className="text-[10px] text-subtle mt-0.5 tabular-nums" title={m.registradoPor.email ?? undefined}>
                        {formatearFecha(m.fecha)} · {m.registradoPor.nombre}
                    </div>
                </div>
                <div className={`text-[13px] text-scoreboard tabular-nums whitespace-nowrap ${colorDe(m.tipo)}`}>
                    {signoDe(m.tipo)}{formatearMonto(m.montoCentavos)}
                </div>
            </div>
            {mostrarEvento && m.evento && (
                <div className="min-w-0"><ChipEvento evento={m.evento} /></div>
            )}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                    <Chip tipo={m.tipo} />
                    <ChipRubro rubro={m.rubro} />
                </div>
                <Acciones pendiente={pendiente} onEditar={onEditar} onEliminar={onEliminar} />
            </div>
        </div>
    );
}

export function Acciones({
    pendiente, onEditar, onEliminar,
}: {
    pendiente: boolean;
    onEditar: () => void;
    onEliminar: () => void;
}) {
    return (
        <div className="flex items-center justify-end gap-1.5">
            <button
                type="button"
                onClick={onEditar}
                disabled={pendiente}
                title="Editar"
                className="w-8 h-8 rounded-lg bg-muted border border-hairline flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-celeste/40 transition-all active:scale-90 disabled:opacity-40 cursor-pointer"
            >
                <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
                type="button"
                onClick={onEliminar}
                disabled={pendiente}
                title="Eliminar"
                className="w-8 h-8 rounded-lg bg-muted border border-hairline flex items-center justify-center text-muted-foreground hover:text-rojo hover:border-rojo/40 transition-all active:scale-90 disabled:opacity-40 cursor-pointer"
            >
                <Trash2 className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}

// ── Alta y edición ──────────────────────────────────────────────────────────

export function ModalFormulario({ children, onCerrar }: { children: React.ReactNode; onCerrar: () => void }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
            <div className="absolute inset-0 bg-background/70 backdrop-blur-xl" onClick={onCerrar} />
            <div className="relative w-full sm:max-w-md max-h-[85vh] bg-background border border-hairline rounded-t-2xl sm:rounded-2xl overflow-y-auto shadow-2xl shadow-black/50">
                {children}
            </div>
        </div>
    );
}

/** Valores con los que puede abrir el alta (sugerencia de inscripciones, evento fijo). */
export type Prefill = {
    tipo?: TipoMovimiento;
    rubro?: Rubro;
    descripcion?: string;
    /** En centavos. */
    montoCentavos?: number;
    evento?: EventoRef | null;
};

export function Formulario({
    titulo, accion, inicial, prefill, eventos, eventoFijo, pendiente, onCancelar, onGuardar,
}: {
    titulo: string;
    accion: string;
    inicial?: Movimiento;
    /** Con qué valores abre el alta. En edición manda el movimiento. */
    prefill?: Prefill;
    /** Eventos elegibles. Vacío cuando el evento ya viene fijado. */
    eventos?: OpcionEvento[];
    /**
     * Desde la pantalla de un evento el movimiento nace atado a él y el
     * selector no se muestra: elegir otro evento ahí sería cargar el gasto en
     * una pantalla y verlo aparecer en otra.
     */
    eventoFijo?: EventoRef | null;
    pendiente: boolean;
    onCancelar: () => void;
    onGuardar: (datos: DatosMovimiento) => void;
}) {
    // El selector de tipo sigue estando: sirve para corregirse sin cerrar el
    // modal, y es el único camino cuando se está editando.
    const [tipo, setTipo] = useState<TipoMovimiento>(
        inicial?.tipo ?? prefill?.tipo ?? TIPO_MOVIMIENTO.GASTO
    );
    const [fecha, setFecha] = useState(inicial?.fecha ?? hoyISO());
    // La descripción se guarda en mayúsculas, así el listado queda parejo sin
    // depender de cómo la escribió cada uno.
    const [descripcion, setDescripcion] = useState(inicial?.descripcion ?? prefill?.descripcion ?? "");
    // El monto se edita como texto, con los miles puestos al vuelo, y se parsea
    // al guardar: así el admin lo ve como lo lee ("1.500,50") mientras tipea.
    const [monto, setMonto] = useState(() => montoInicial(inicial?.montoCentavos ?? prefill?.montoCentavos));
    const [rubro, setRubro] = useState<Rubro>(
        inicial?.rubro ?? prefill?.rubro ?? RUBROS_POR_TIPO[inicial?.tipo ?? prefill?.tipo ?? TIPO_MOVIMIENTO.GASTO][0]
    );
    const [evento, setEvento] = useState<EventoRef | null>(
        eventoFijo ?? inicial?.evento ?? prefill?.evento ?? null
    );

    // Cambiar de tipo cambia el catálogo de rubros: el que estaba puede ya no
    // existir de ese lado ("premios" no es un ingreso), y en ese caso se cae al
    // primero del nuevo catálogo en vez de quedar en un estado inválido.
    const cambiarTipo = (nuevo: TipoMovimiento) => {
        setTipo(nuevo);
        if (!rubroValido(nuevo, rubro)) setRubro(RUBROS_POR_TIPO[nuevo][0]);
    };

    const centavos = parsearMontoACentavos(monto);
    const listo = Boolean(descripcion.trim()) && Boolean(fecha) && centavos !== null;

    const guardar = () => {
        if (centavos === null) return toast.error("Revisá el monto: tiene que ser un número mayor a cero.");
        if (!descripcion.trim()) return toast.error("Poné una descripción del movimiento.");
        onGuardar({ tipo, fecha, descripcion: descripcion.trim(), montoCentavos: centavos, rubro, evento });
    };

    return (
        <div>
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-hairline">
                <h3 className="heading-sport text-base text-foreground truncate">{titulo}</h3>
                <button
                    type="button"
                    onClick={onCancelar}
                    className="w-9 h-9 rounded-full bg-muted border border-hairline flex items-center justify-center hover:bg-muted active:scale-90 transition-all cursor-pointer shrink-0"
                >
                    <X className="w-4 h-4 text-foreground" />
                </button>
            </div>

            <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                    {([
                        [TIPO_MOVIMIENTO.INGRESO, "Ingreso", ArrowUpRight],
                        [TIPO_MOVIMIENTO.GASTO, "Gasto", ArrowDownLeft],
                    ] as const).map(([valor, rotulo, Icono]) => {
                        const activo = tipo === valor;
                        const ingreso = valor === TIPO_MOVIMIENTO.INGRESO;
                        return (
                            <button
                                key={valor}
                                type="button"
                                aria-pressed={activo}
                                onClick={() => cambiarTipo(valor)}
                                className={`flex items-center justify-center gap-1.5 h-11 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 cursor-pointer ${activo
                                    ? ingreso
                                        ? "bg-emerald-400/15 border-emerald-400/50 text-emerald-400"
                                        : "bg-red-400/15 border-red-400/50 text-red-400"
                                    : "bg-muted border-hairline text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                <Icono className="w-3.5 h-3.5" />
                                {rotulo}
                            </button>
                        );
                    })}
                </div>

                <Campo rotulo="Fecha">
                    <input
                        type="date"
                        value={fecha}
                        onChange={(e) => setFecha(e.target.value)}
                        className="w-full h-11 px-3 rounded-xl bg-muted border border-hairline text-[12px] font-bold text-foreground focus:outline-none focus:border-celeste/40"
                    />
                </Campo>

                <Campo rotulo="Rubro">
                    <select
                        value={rubro}
                        onChange={(e) => setRubro(e.target.value as Rubro)}
                        className="w-full h-11 px-3 rounded-xl bg-muted border border-hairline text-[12px] font-bold text-foreground focus:outline-none focus:border-celeste/40 cursor-pointer"
                    >
                        {RUBROS_POR_TIPO[tipo].map((r) => (
                            <option key={r} value={r}>{etiquetaDeRubro(r)}</option>
                        ))}
                    </select>
                </Campo>

                {eventoFijo ? (
                    <Campo rotulo="Evento">
                        <div className="w-full h-11 px-3 rounded-xl bg-muted border border-hairline flex items-center text-[12px] font-bold text-foreground">
                            <span className="truncate">{eventoFijo.nombre}</span>
                        </div>
                    </Campo>
                ) : (
                    <Campo rotulo="Evento (opcional)">
                        <select
                            value={evento ? `${evento.tipo}:${evento.id}` : ""}
                            onChange={(e) => setEvento(buscarEvento(eventos ?? [], e.target.value))}
                            className="w-full h-11 px-3 rounded-xl bg-muted border border-hairline text-[12px] font-bold text-foreground focus:outline-none focus:border-celeste/40 cursor-pointer"
                        >
                            <option value="">Caja general (sin evento)</option>
                            {(eventos ?? []).map((e) => (
                                <option key={`${e.tipo}:${e.id}`} value={`${e.tipo}:${e.id}`}>
                                    {etiquetaDeTipoEvento(e.tipo)} · {e.nombre}
                                    {e.fecha ? ` (${formatearFecha(e.fecha)})` : ""}
                                </option>
                            ))}
                        </select>
                        {/* Un movimiento editado puede apuntar a un evento que ya
                            no está en la lista (viejo o borrado); si se deja el
                            select mudo, guardar lo desvincularía sin avisar. */}
                        {evento && !(eventos ?? []).some((e) => e.tipo === evento.tipo && e.id === evento.id) && (
                            <p className="text-[9px] text-amber-400 mt-1">
                                Vinculado a “{evento.nombre}”, que no está en la lista. Si guardás así, se mantiene.
                            </p>
                        )}
                    </Campo>
                )}

                <Campo rotulo="Descripción">
                    <input
                        type="text"
                        value={descripcion}
                        maxLength={255}
                        placeholder="Ej: pelotas, alquiler de cancha, inscripciones"
                        // Se pasa a mayúsculas en el valor y no con CSS: lo que se
                        // ve tiene que ser exactamente lo que se guarda.
                        onChange={(e) => setDescripcion(e.target.value.toUpperCase())}
                        className="w-full h-11 px-3 rounded-xl bg-muted border border-hairline text-[12px] font-bold text-foreground placeholder:text-subtle placeholder:font-medium placeholder:normal-case focus:outline-none focus:border-celeste/40"
                    />
                </Campo>

                <Campo rotulo="Monto">
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-black text-subtle">$</span>
                        <input
                            type="text"
                            inputMode="decimal"
                            value={monto}
                            placeholder="0,00"
                            onChange={(e) => setMonto(formatearMontoTipeado(e.target.value))}
                            className="w-full h-11 pl-7 pr-3 rounded-xl bg-muted border border-hairline text-[14px] text-scoreboard tabular-nums text-foreground placeholder:text-subtle focus:outline-none focus:border-celeste/40"
                        />
                    </div>
                    <p className="text-[9px] text-subtle mt-1">
                        {monto && centavos === null
                            ? "No se entiende ese monto. Escribí sólo números y, si hace falta, la coma de los centavos."
                            : centavos !== null
                                ? `Se registra ${formatearMonto(centavos)}.`
                                : "Los puntos de mil los ponemos nosotros; usá la coma para los centavos."}
                    </p>
                </Campo>

                <div className="flex gap-2 pt-1">
                    <button
                        type="button"
                        onClick={onCancelar}
                        disabled={pendiente}
                        className="flex-1 h-11 rounded-xl bg-muted border border-hairline text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={guardar}
                        disabled={pendiente || !listo}
                        className="flex-1 h-11 rounded-xl bg-volt text-carbon-950 text-[10px] font-black uppercase tracking-widest hover:bg-volt-dark transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
                    >
                        {pendiente && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {accion}
                    </button>
                </div>
            </div>
        </div>
    );
}

/** Centavos → el texto que el input espera ("1.500,50"). */
function montoInicial(centavos: number | undefined): string {
    if (centavos === undefined) return "";
    return formatearMontoTipeado((centavos / 100).toFixed(2).replace(".", ","));
}

function buscarEvento(eventos: OpcionEvento[], clave: string): EventoRef | null {
    if (!clave) return null;
    const elegido = eventos.find((e) => `${e.tipo}:${e.id}` === clave);
    return elegido ? { tipo: elegido.tipo, id: elegido.id, nombre: elegido.nombre } : null;
}

export function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="label-tech text-[8px] text-subtle block mb-1.5">{rotulo}</span>
            {children}
        </label>
    );
}
