"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    AlertTriangle, ArrowDownLeft, ArrowLeft, ArrowUpRight, Check, ChevronDown, Loader2, Lock, Plus, Scale,
    Ticket, Trophy,
} from "lucide-react";
import {
    RUBRO, TIPO_MOVIMIENTO, etiquetaDeRubro, etiquetaDeTipoEvento, formatearFecha, formatearMonto,
    llevaInscripcionesAutomaticas,
    type EventoRef, type Movimiento, type TipoMovimiento,
} from "@/lib/contaduria";
import {
    FilaCompacta, Formulario, ModalFormulario, Tabla, Tarjeta, Vacio, colorDe, signoDe,
    type Prefill,
} from "../../../componentes";
import { crearMovimiento, editarMovimiento, eliminarMovimiento } from "../../../actions";
import PremiosEvento from "../../../PremiosEvento";
import { obtenerDatosPremios, type DatosPremios, type DetalleEvento } from "../../actions";

export default function EventoDetalleClient({ detalle }: { detalle: DetalleEvento }) {
    const router = useRouter();
    const [pendiente, iniciar] = useTransition();
    const [creando, setCreando] = useState<Prefill | null>(null);
    const [editando, setEditando] = useState<Movimiento | null>(null);
    // Se pide recién al abrir el reparto: la mayoría de las visitas no lo tocan.
    const [premios, setPremios] = useState<DatosPremios | null>(null);
    const [abriendoPremios, setAbriendoPremios] = useState(false);

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
                    automatico={llevaInscripcionesAutomaticas(detalle.tipo)}
                    pagadores={detalle.pagadores}
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

            <button
                type="button"
                disabled={abriendoPremios}
                onClick={async () => {
                    setAbriendoPremios(true);
                    setPremios(await obtenerDatosPremios(detalle.tipo, detalle.id));
                    setAbriendoPremios(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-3 clip-notch bg-volt/10 border border-volt/40 text-[10px] font-black uppercase tracking-widest text-volt-ink hover:bg-volt/20 transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
            >
                {abriendoPremios ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trophy className="w-3.5 h-3.5" />}
                Repartir premios
            </button>

            {premios && (
                <PremiosEvento
                    tipo={detalle.tipo}
                    id={detalle.id}
                    ingresosCentavos={premios.ingresosCentavos}
                    config={premios.config}
                    onCerrar={() => setPremios(null)}
                    onGenerado={() => router.refresh()}
                />
            )}

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
 * En torneos y cancha abierta el asiento lo mantiene el sistema: acá sólo se
 * explica de dónde sale el monto y quiénes están detrás. En el desafío, que no
 * marca pagos jugador por jugador, sigue habiendo un botón que sugiere la
 * diferencia y la deja editable.
 */
function PanelInscripciones({
    datos, automatico, pagadores, onCargar,
}: {
    datos: NonNullable<DetalleEvento["inscripciones"]>;
    automatico: boolean;
    pagadores: DetalleEvento["pagadores"];
    onCargar: (montoCentavos: number) => void;
}) {
    const falta = datos.esperadoCentavos - datos.cargadoCentavos;
    const completo = falta <= 0;

    if (automatico) {
        return (
            <div className="rounded-2xl border border-hairline bg-card shadow-lg shadow-black/20 p-4 space-y-3">
                <div className="flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-celeste" />
                    <span className="label-tech text-[8px] text-celeste">Inscripciones</span>
                    <span className="ml-auto inline-flex items-center gap-1 px-1.5 h-5 rounded-md bg-celeste/10 border border-celeste/30 text-[9px] font-black uppercase tracking-wider text-celeste">
                        <Lock className="w-2.5 h-2.5" />
                        Automático
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center">
                    <Dato rotulo="En la caja" valor={formatearMonto(datos.cargadoCentavos)} tono="text-emerald-400" />
                    <Dato rotulo="Precio" valor={formatearMonto(datos.feeCentavos)} />
                </div>

                <p className="text-[10px] text-subtle text-center">
                    {datos.base}. Se actualiza sola cada vez que marcás o desmarcás un pago.
                </p>

                {/* El "de dónde viene": los jugadores detrás del monto. Es el
                    estado de ahora, no un historial — si desmarcás a alguien,
                    deja de estar acá igual que deja de estar en el total. */}
                {pagadores.length > 0 && <ListaPagadores pagadores={pagadores} />}

                {/* Si difiere de lo esperado es porque alguien cargó además un
                    movimiento manual de inscripciones. No es un error, pero se
                    avisa para que no parezca uno. */}
                {datos.cargadoCentavos !== datos.esperadoCentavos && (
                    <p className="text-[10px] text-amber-400 text-center">
                        Hay {formatearMonto(Math.abs(falta))} cargados a mano además del automático.
                    </p>
                )}
            </div>
        );
    }

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

/** Quiénes pagaron. Plegada por defecto: en un torneo grande son 40 nombres. */
function ListaPagadores({ pagadores }: { pagadores: DetalleEvento["pagadores"] }) {
    const [abierta, setAbierta] = useState(false);

    return (
        <div className="rounded-xl bg-muted border border-hairline overflow-hidden">
            <button
                type="button"
                onClick={() => setAbierta((v) => !v)}
                aria-expanded={abierta}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-card transition-colors cursor-pointer"
            >
                <span className="label-tech text-[8px] text-subtle">
                    {pagadores.length} {pagadores.length === 1 ? "jugador pagó" : "jugadores pagaron"}
                </span>
                <ChevronDown className={`ml-auto w-3.5 h-3.5 text-subtle transition-transform ${abierta ? "rotate-180" : ""}`} />
            </button>

            {abierta && (
                <ul className="px-3 pb-2.5 space-y-0.5 border-t border-hairline pt-2">
                    {pagadores.map((p) => (
                        <li key={p.id} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span className="truncate">{p.nombre}</span>
                            {/* Qué precio se le cobró: es la explicación de por
                                qué el total no es la cantidad por un precio. */}
                            <span className={`ml-auto shrink-0 text-[8px] font-black uppercase tracking-wider ${p.esSocio ? "text-celeste" : "text-subtle"}`}>
                                {p.esSocio ? "socio" : "invitado"}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
