"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    ArrowDownLeft, ArrowUpRight, Loader2, Pencil, Plus, Scale, Trash2, Wallet, X,
    type LucideIcon,
} from "lucide-react";
import {
    MOVIMIENTOS_POR_PERIODO, TIPO_MOVIMIENTO, etiquetaDeMes, formatearFecha, formatearMonto,
    formatearMontoTipeado, hoyISO, parsearMontoACentavos,
    type Movimiento, type TipoMovimiento, type Totales,
} from "@/lib/contaduria";
import { crearMovimiento, editarMovimiento, eliminarMovimiento, type DatosMovimiento } from "./actions";

type Filtro = TipoMovimiento | "todos";

export default function ContaduriaClient({
    movimientos,
    totales,
    meses,
    periodo,
}: {
    movimientos: Movimiento[];
    totales: Totales;
    meses: string[];
    periodo: string;
}) {
    const router = useRouter();
    const [pendiente, iniciar] = useTransition();
    // Guarda el tipo con el que se abrió el alta: hay un botón por tipo, así que
    // el modal ya arranca en el que se eligió.
    const [creando, setCreando] = useState<TipoMovimiento | null>(null);
    const [editando, setEditando] = useState<Movimiento | null>(null);
    const [filtro, setFiltro] = useState<Filtro>("todos");

    const visibles = useMemo(
        () => (filtro === "todos" ? movimientos : movimientos.filter((m) => m.tipo === filtro)),
        [movimientos, filtro]
    );

    const contar = (f: Filtro) => (f === "todos" ? movimientos.length : movimientos.filter((m) => m.tipo === f).length);

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

    const cambiarPeriodo = (valor: string) =>
        router.push(valor === "todos" ? "/admin/contaduria" : `/admin/contaduria?mes=${valor}`);

    const eliminar = (m: Movimiento) => {
        if (!confirm(`¿Eliminar "${m.descripcion}" por ${formatearMonto(m.montoCentavos)}? No se puede deshacer.`)) return;
        correr(() => eliminarMovimiento(m.id), "Movimiento eliminado.");
    };

    const rotuloPeriodo = periodo === "todos" ? "Histórico" : etiquetaDeMes(periodo);

    return (
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
            <header className="flex items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Wallet className="w-4 h-4 text-volt-ink" />
                        <span className="label-tech text-[8px] text-volt-ink">Caja de la app</span>
                    </div>
                    <h1 className="heading-sport text-2xl sm:text-3xl text-foreground">Contaduría</h1>
                    <p className="text-[11px] text-subtle mt-1">
                        Cargá los ingresos y los gastos. Cada movimiento queda con la fecha y con quién lo registró.
                    </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-muted border border-celeste/30 flex items-center justify-center shrink-0">
                    <Scale className="w-5 h-5 text-celeste" />
                </div>
            </header>

            {/* Los totales son siempre del período elegido, no del filtro de la
                tabla: un saldo que cambia al tocar "Gastos" no sería un saldo. */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Tarjeta rotulo={`Ingresos · ${rotuloPeriodo}`} monto={totales.ingresos} tono="ingreso" icono={ArrowUpRight} />
                <Tarjeta rotulo={`Gastos · ${rotuloPeriodo}`} monto={totales.gastos} tono="gasto" icono={ArrowDownLeft} />
                <Tarjeta
                    rotulo={`Saldo · ${rotuloPeriodo}`}
                    monto={totales.saldo}
                    tono={totales.saldo < 0 ? "gasto" : "saldo"}
                    icono={Scale}
                />
            </div>

            {/* Un botón por tipo: cargar un gasto es la acción más frecuente y no
                tiene por qué pasar por un paso de "¿qué es esto?" adentro del modal. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <BotonAlta tipo={TIPO_MOVIMIENTO.INGRESO} onClick={() => setCreando(TIPO_MOVIMIENTO.INGRESO)} />
                <BotonAlta tipo={TIPO_MOVIMIENTO.GASTO} onClick={() => setCreando(TIPO_MOVIMIENTO.GASTO)} />
            </div>

            {creando && (
                <ModalFormulario onCerrar={() => setCreando(null)}>
                    <Formulario
                        titulo={creando === TIPO_MOVIMIENTO.INGRESO ? "Nuevo ingreso" : "Nuevo gasto"}
                        accion={creando === TIPO_MOVIMIENTO.INGRESO ? "Registrar ingreso" : "Registrar gasto"}
                        tipoInicial={creando}
                        pendiente={pendiente}
                        onCancelar={() => setCreando(null)}
                        onGuardar={(datos) =>
                            correr(() => crearMovimiento(datos), "Movimiento registrado.", () => setCreando(null))
                        }
                    />
                </ModalFormulario>
            )}

            {editando && (
                <ModalFormulario onCerrar={() => setEditando(null)}>
                    <Formulario
                        titulo="Editar movimiento"
                        accion="Guardar cambios"
                        inicial={editando}
                        pendiente={pendiente}
                        onCancelar={() => setEditando(null)}
                        onGuardar={(datos) =>
                            correr(() => editarMovimiento(editando.id, datos), "Movimiento actualizado.", () => setEditando(null))
                        }
                    />
                </ModalFormulario>
            )}

            <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap gap-1.5">
                    {([
                        ["todos", "Todos"],
                        [TIPO_MOVIMIENTO.INGRESO, "Ingresos"],
                        [TIPO_MOVIMIENTO.GASTO, "Gastos"],
                    ] as const).map(([valor, rotulo]) => (
                        <button
                            key={valor}
                            type="button"
                            aria-pressed={filtro === valor}
                            onClick={() => setFiltro(valor as Filtro)}
                            className={`px-3 h-9 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 cursor-pointer ${filtro === valor
                                ? "bg-celeste text-carbon-950 border-celeste shadow-lg shadow-celeste/20"
                                : "bg-muted border-hairline text-muted-foreground hover:text-foreground hover:border-celeste/40"
                                }`}
                        >
                            {rotulo} <span className="opacity-60">{contar(valor as Filtro)}</span>
                        </button>
                    ))}
                </div>

                <select
                    value={periodo}
                    onChange={(e) => cambiarPeriodo(e.target.value)}
                    className="ml-auto h-9 px-3 rounded-xl bg-muted border border-hairline text-[10px] font-black uppercase tracking-widest text-foreground focus:outline-none focus:border-celeste/40 cursor-pointer"
                >
                    <option value="todos">Todos los meses</option>
                    {meses.map((m) => (
                        <option key={m} value={m}>{etiquetaDeMes(m)}</option>
                    ))}
                </select>
            </div>

            {movimientos.length === 0 ? (
                <Vacio
                    titulo={periodo === "todos" ? "Todavía no hay movimientos" : "Ningún movimiento en este mes"}
                    detalle={
                        periodo === "todos"
                            ? "Registrá el primer ingreso o gasto para empezar la caja."
                            : "Probá con otro mes o registrá un movimiento."
                    }
                />
            ) : visibles.length === 0 ? (
                <Vacio titulo="Nada para mostrar" detalle="No hay movimientos de ese tipo en el período elegido." />
            ) : (
                <>
                    <Tabla
                        movimientos={visibles}
                        pendiente={pendiente}
                        onEditar={setEditando}
                        onEliminar={eliminar}
                    />
                    <div className="md:hidden space-y-2">
                        {visibles.map((m) => (
                            <FilaCompacta
                                key={m.id}
                                movimiento={m}
                                pendiente={pendiente}
                                onEditar={() => setEditando(m)}
                                onEliminar={() => eliminar(m)}
                            />
                        ))}
                    </div>
                </>
            )}

            {movimientos.length >= MOVIMIENTOS_POR_PERIODO && (
                <p className="text-[10px] text-subtle text-center">
                    Se muestran los últimos {MOVIMIENTOS_POR_PERIODO} movimientos. Los totales de arriba incluyen todos
                    los del período: elegí un mes para ver el detalle completo.
                </p>
            )}
        </div>
    );
}

/**
 * Los dos botones tienen el mismo peso — ninguno es "el" principal — y se
 * distinguen por el color semántico que ya usa toda la pantalla: verde el que
 * suma, rojo el que resta.
 */
function BotonAlta({ tipo, onClick }: { tipo: TipoMovimiento; onClick: () => void }) {
    const ingreso = tipo === TIPO_MOVIMIENTO.INGRESO;
    return (
        <button
            type="button"
            onClick={onClick}
            className={`w-full flex items-center justify-center gap-2 py-3 clip-notch border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 cursor-pointer ${ingreso
                ? "bg-emerald-400/15 border-emerald-400/40 text-emerald-400 hover:bg-emerald-400/25 shadow-lg shadow-emerald-400/10"
                : "bg-red-400/15 border-red-400/40 text-red-400 hover:bg-red-400/25 shadow-lg shadow-red-400/10"
                }`}
        >
            <Plus className="w-3.5 h-3.5" />
            {ingreso ? "Registrar ingreso" : "Registrar gasto"}
        </button>
    );
}

// ── Totales ─────────────────────────────────────────────────────────────────

const TONOS = {
    ingreso: { texto: "text-emerald-400", borde: "border-emerald-400/30", fondo: "bg-emerald-400/10" },
    gasto: { texto: "text-red-400", borde: "border-red-400/30", fondo: "bg-red-400/10" },
    saldo: { texto: "text-foreground", borde: "border-hairline", fondo: "bg-muted" },
} as const;

function Tarjeta({
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

function Vacio({ titulo, detalle }: { titulo: string; detalle: string }) {
    return (
        <div className="rounded-2xl border border-hairline bg-card shadow-lg shadow-black/20 p-8 text-center">
            <Wallet className="w-10 h-10 text-subtle mx-auto mb-3" />
            <h2 className="heading-sport text-lg text-muted-foreground">{titulo}</h2>
            <p className="text-[12px] text-subtle mt-1.5">{detalle}</p>
        </div>
    );
}

// ── Listado ─────────────────────────────────────────────────────────────────
//
// Es una pantalla de gestión: en desktop va la tabla, y en mobile las mismas
// filas en formato compacto porque seis columnas no entran.

function Tabla({
    movimientos, pendiente, onEditar, onEliminar,
}: {
    movimientos: Movimiento[];
    pendiente: boolean;
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
                        <th className="py-2.5 px-2 text-left w-44">Registró</th>
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
                            </td>
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

function FilaCompacta({
    movimiento: m, pendiente, onEditar, onEliminar,
}: {
    movimiento: Movimiento;
    pendiente: boolean;
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
            <div className="flex items-center justify-between gap-2">
                <Chip tipo={m.tipo} />
                <Acciones pendiente={pendiente} onEditar={onEditar} onEliminar={onEliminar} />
            </div>
        </div>
    );
}

const colorDe = (tipo: TipoMovimiento) =>
    tipo === TIPO_MOVIMIENTO.INGRESO ? "text-emerald-400" : "text-red-400";

const signoDe = (tipo: TipoMovimiento) => (tipo === TIPO_MOVIMIENTO.INGRESO ? "+" : "−");

function Chip({ tipo }: { tipo: TipoMovimiento }) {
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

function Acciones({
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

function ModalFormulario({ children, onCerrar }: { children: React.ReactNode; onCerrar: () => void }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
            <div className="absolute inset-0 bg-background/70 backdrop-blur-xl" onClick={onCerrar} />
            <div className="relative w-full sm:max-w-md max-h-[85vh] bg-background border border-hairline rounded-t-2xl sm:rounded-2xl overflow-y-auto shadow-2xl shadow-black/50">
                {children}
            </div>
        </div>
    );
}

function Formulario({
    titulo, accion, inicial, tipoInicial, pendiente, onCancelar, onGuardar,
}: {
    titulo: string;
    accion: string;
    inicial?: Movimiento;
    /** Con qué tipo abre el alta. En edición manda el del movimiento. */
    tipoInicial?: TipoMovimiento;
    pendiente: boolean;
    onCancelar: () => void;
    onGuardar: (datos: DatosMovimiento) => void;
}) {
    // El selector de tipo sigue estando: sirve para corregirse sin cerrar el
    // modal, y es el único camino cuando se está editando.
    const [tipo, setTipo] = useState<TipoMovimiento>(inicial?.tipo ?? tipoInicial ?? TIPO_MOVIMIENTO.GASTO);
    const [fecha, setFecha] = useState(inicial?.fecha ?? hoyISO());
    // La descripción se guarda en mayúsculas, así el listado queda parejo sin
    // depender de cómo la escribió cada uno.
    const [descripcion, setDescripcion] = useState(inicial?.descripcion ?? "");
    // El monto se edita como texto, con los miles puestos al vuelo, y se parsea
    // al guardar: así el admin lo ve como lo lee ("1.500,50") mientras tipea.
    const [monto, setMonto] = useState(
        inicial ? formatearMontoTipeado((inicial.montoCentavos / 100).toFixed(2).replace(".", ",")) : ""
    );

    const centavos = parsearMontoACentavos(monto);
    const listo = Boolean(descripcion.trim()) && Boolean(fecha) && centavos !== null;

    const guardar = () => {
        if (centavos === null) return toast.error("Revisá el monto: tiene que ser un número mayor a cero.");
        if (!descripcion.trim()) return toast.error("Poné una descripción del movimiento.");
        onGuardar({ tipo, fecha, descripcion: descripcion.trim(), montoCentavos: centavos });
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
                                onClick={() => setTipo(valor)}
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

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="label-tech text-[8px] text-subtle block mb-1.5">{rotulo}</span>
            {children}
        </label>
    );
}
