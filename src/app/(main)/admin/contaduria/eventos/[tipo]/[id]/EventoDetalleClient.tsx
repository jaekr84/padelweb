"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    AlertTriangle, ArrowDownLeft, ArrowLeft, ArrowUpRight, Check, Plus, Scale, Ticket,
} from "lucide-react";
import {
    RUBRO, TIPO_MOVIMIENTO, etiquetaDeRubro, etiquetaDeTipoEvento, formatearFecha, formatearMonto,
    type EventoRef, type Movimiento, type TipoMovimiento,
} from "@/lib/contaduria";
import {
    FilaCompacta, Formulario, ModalFormulario, Tabla, Tarjeta, Vacio, colorDe, signoDe,
    type Prefill,
} from "../../../componentes";
import { crearMovimiento, editarMovimiento, eliminarMovimiento } from "../../../actions";
import type { DetalleEvento } from "../../actions";

export default function EventoDetalleClient({ detalle }: { detalle: DetalleEvento }) {
    const router = useRouter();
    const [pendiente, iniciar] = useTransition();
    const [creando, setCreando] = useState<Prefill | null>(null);
    const [editando, setEditando] = useState<Movimiento | null>(null);

    const evento: EventoRef = { tipo: detalle.tipo, id: detalle.id, nombre: detalle.nombre };

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

    const eliminar = (m: Movimiento) => {
        if (!confirm(`¿Eliminar "${m.descripcion}" por ${formatearMonto(m.montoCentavos)}? No se puede deshacer.`)) return;
        correr(() => eliminarMovimiento(m.id), "Movimiento eliminado.");
    };

    return (
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
            <Link
                href="/admin/contaduria/eventos"
                className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-subtle hover:text-foreground transition-colors"
            >
                <ArrowLeft className="w-3.5 h-3.5" />
                Eventos
            </Link>

            <header className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                        <span className="inline-flex items-center px-1.5 h-5 rounded-md bg-muted border border-hairline text-[9px] font-black uppercase tracking-wider text-volt-ink">
                            {etiquetaDeTipoEvento(detalle.tipo)}
                        </span>
                        {detalle.fecha && (
                            <span className="text-[10px] text-subtle tabular-nums">{formatearFecha(detalle.fecha)}</span>
                        )}
                    </div>
                    <h1 className="heading-sport text-2xl sm:text-3xl text-foreground break-words">{detalle.nombre}</h1>
                </div>
                <div className="w-10 h-10 rounded-xl bg-muted border border-celeste/30 flex items-center justify-center shrink-0">
                    <Scale className="w-5 h-5 text-celeste" />
                </div>
            </header>

            {/* El evento ya no está en su tabla: los movimientos sobreviven con
                el nombre que quedó guardado en cada fila. */}
            {!detalle.existe && (
                <div className="flex items-start gap-2 p-3 rounded-xl border border-amber-400/30 bg-amber-400/10">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-400">
                        Este evento ya no existe. Sus movimientos siguen en la caja con el nombre que tenían al
                        cargarse, pero no se puede calcular lo esperado por inscripciones.
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Tarjeta rotulo="Ingresos del evento" monto={detalle.totales.ingresos} tono="ingreso" icono={ArrowUpRight} />
                <Tarjeta rotulo="Gastos del evento" monto={detalle.totales.gastos} tono="gasto" icono={ArrowDownLeft} />
                <Tarjeta
                    rotulo="Resultado"
                    monto={detalle.totales.saldo}
                    tono={detalle.totales.saldo < 0 ? "gasto" : "saldo"}
                    icono={Scale}
                />
            </div>

            {detalle.inscripciones && (
                <PanelInscripciones
                    datos={detalle.inscripciones}
                    onCargar={(montoCentavos) => setCreando({
                        tipo: TIPO_MOVIMIENTO.INGRESO,
                        rubro: RUBRO.INSCRIPCIONES,
                        descripcion: "INSCRIPCIONES",
                        montoCentavos,
                        evento,
                    })}
                />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <BotonAlta tipo={TIPO_MOVIMIENTO.INGRESO} onClick={() => setCreando({ tipo: TIPO_MOVIMIENTO.INGRESO, evento })} />
                <BotonAlta tipo={TIPO_MOVIMIENTO.GASTO} onClick={() => setCreando({ tipo: TIPO_MOVIMIENTO.GASTO, evento })} />
            </div>

            {creando && (
                <ModalFormulario onCerrar={() => setCreando(null)}>
                    <Formulario
                        titulo={creando.tipo === TIPO_MOVIMIENTO.INGRESO ? "Nuevo ingreso" : "Nuevo gasto"}
                        accion={creando.tipo === TIPO_MOVIMIENTO.INGRESO ? "Registrar ingreso" : "Registrar gasto"}
                        prefill={creando}
                        eventoFijo={evento}
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
                        eventoFijo={evento}
                        pendiente={pendiente}
                        onCancelar={() => setEditando(null)}
                        onGuardar={(datos) =>
                            correr(() => editarMovimiento(editando.id, datos), "Movimiento actualizado.", () => setEditando(null))
                        }
                    />
                </ModalFormulario>
            )}

            {detalle.desglose.length > 0 && <Desglose filas={detalle.desglose} />}

            {detalle.movimientos.length === 0 ? (
                <Vacio
                    titulo="Todavía no hay movimientos"
                    detalle="Cargá la recaudación de las inscripciones, los premios y los gastos del evento."
                />
            ) : (
                <>
                    <Tabla
                        movimientos={detalle.movimientos}
                        pendiente={pendiente}
                        mostrarEvento={false}
                        onEditar={setEditando}
                        onEliminar={eliminar}
                    />
                    <div className="md:hidden space-y-2">
                        {detalle.movimientos.map((m) => (
                            <FilaCompacta
                                key={m.id}
                                movimiento={m}
                                pendiente={pendiente}
                                mostrarEvento={false}
                                onEditar={() => setEditando(m)}
                                onEliminar={() => eliminar(m)}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

/**
 * Esperado vs cargado por inscripciones.
 *
 * El esperado no es un asiento: es el número contra el que se compara lo que
 * está en la caja. El botón sugiere la diferencia y la deja editable, porque
 * siempre hay una cortesía, un descuento o alguien que pagó de más.
 */
function PanelInscripciones({
    datos, onCargar,
}: {
    datos: NonNullable<DetalleEvento["inscripciones"]>;
    onCargar: (montoCentavos: number) => void;
}) {
    const falta = datos.esperadoCentavos - datos.cargadoCentavos;
    const completo = falta <= 0;

    return (
        <div className="rounded-2xl border border-hairline bg-card shadow-lg shadow-black/20 p-4 space-y-3">
            <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4 text-celeste" />
                <span className="label-tech text-[8px] text-celeste">Inscripciones</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
                <Dato rotulo="Esperado" valor={formatearMonto(datos.esperadoCentavos)} />
                <Dato rotulo="Cargado" valor={formatearMonto(datos.cargadoCentavos)} />
                <Dato
                    rotulo="Diferencia"
                    valor={formatearMonto(falta)}
                    tono={completo ? "text-emerald-400" : "text-amber-400"}
                />
            </div>

            {/* De dónde sale el esperado, explícito: el criterio cambia según el
                tipo de evento y no tiene por qué adivinarse. */}
            <p className="text-[10px] text-subtle text-center">
                {datos.base} × {formatearMonto(datos.feeCentavos)}
            </p>

            {completo ? (
                <div className="flex items-center justify-center gap-1.5 h-10 rounded-xl bg-emerald-400/10 border border-emerald-400/30 text-[10px] font-black uppercase tracking-widest text-emerald-400">
                    <Check className="w-3.5 h-3.5" />
                    {falta === 0 ? "Recaudación cargada" : "Cargado de más"}
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => onCargar(falta)}
                    className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-celeste text-carbon-950 text-[10px] font-black uppercase tracking-widest hover:bg-celeste/90 transition-all active:scale-95 cursor-pointer"
                >
                    <Plus className="w-3.5 h-3.5" />
                    Cargar {formatearMonto(falta)}
                </button>
            )}
        </div>
    );
}

function Dato({ rotulo, valor, tono = "text-foreground" }: { rotulo: string; valor: string; tono?: string }) {
    return (
        <div className="rounded-xl bg-muted border border-hairline p-2.5">
            <div className="label-tech text-[8px] text-subtle mb-1">{rotulo}</div>
            <div className={`text-scoreboard text-[13px] tabular-nums ${tono}`}>{valor}</div>
        </div>
    );
}

function Desglose({ filas }: { filas: DetalleEvento["desglose"] }) {
    return (
        <div className="rounded-2xl border border-hairline bg-card shadow-lg shadow-black/20 p-4 space-y-2">
            <span className="label-tech text-[8px] text-subtle">Por rubro</span>
            {filas.map((f) => (
                <div key={`${f.tipo}:${f.rubro}`} className="flex items-center justify-between gap-3 text-[11px]">
                    <span className="text-muted-foreground truncate">{etiquetaDeRubro(f.rubro)}</span>
                    <span className={`text-scoreboard tabular-nums whitespace-nowrap ${colorDe(f.tipo)}`}>
                        {signoDe(f.tipo)}{formatearMonto(f.montoCentavos)}
                    </span>
                </div>
            ))}
        </div>
    );
}

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
