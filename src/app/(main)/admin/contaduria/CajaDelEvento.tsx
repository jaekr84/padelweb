"use client";

// Caja del evento: un botón flotante siempre a mano y un modal para gestionarla,
// para incrustar en las pantallas de gestión (torneo robin, americano, cancha
// abierta y desafío).
//
// Flotante y no una tarjeta en el flujo porque la pantalla de gestión se usa en
// vivo: la caja tiene que estar disponible todo el tiempo sin robarle alto a los
// grupos, y sobre todo sin sacar a nadie de la pantalla. Por eso el listado de
// movimientos vive adentro del modal y no detrás de un link — navegar a la
// contaduría en medio de un torneo hace perder el lugar.
//
// Se pide sus propios datos en vez de recibirlos por props: así entra en las
// cuatro pantallas con una línea y sin tocar el `page.tsx` de ninguna. La acción
// que consulta devuelve `null` a quien no es admin, y ese es todo el control de
// acceso que hace falta — a las pantallas de torneo y cancha abierta también
// entran usuarios `club` y dueños de torneo, que no ven la caja. Si no llegan
// datos, el botón no se dibuja.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, Loader2, Lock, Plus, Trophy, Wallet, X } from "lucide-react";
import {
    EVENTO_CAJA_DESACTUALIZADA, RUBRO, TIPO_MOVIMIENTO, etiquetaDeRubro, formatearMonto,
    llevaInscripcionesAutomaticas, rutaDeEvento,
    type EventoRef, type Movimiento, type TipoEvento,
} from "@/lib/contaduria";
import { FilaCompacta, Formulario, ModalFormulario, type Prefill } from "./componentes";
import { crearMovimiento, editarMovimiento, eliminarMovimiento } from "./actions";
import {
    obtenerCajaDeEvento, obtenerDatosPremios, obtenerDetalleEvento,
    type CajaDeEvento, type DatosPremios, type DetalleEvento,
} from "./eventos/actions";
import PremiosEvento from "./PremiosEvento";

export default function CajaDelEvento({
    tipo, id, nombre,
}: {
    tipo: TipoEvento;
    id: string;
    /** Nombre del evento en la pantalla que lo incrusta. Se usa hasta que carga. */
    nombre: string;
}) {
    const router = useRouter();
    const [caja, setCaja] = useState<CajaDeEvento | null>(null);
    const [cargando, setCargando] = useState(true);
    const [abierto, setAbierto] = useState(false);

    const evento: EventoRef = { tipo, id, nombre: caja?.nombre ?? nombre };

    /** Resumen liviano: es lo único que necesita el botón. */
    const refrescar = useCallback(async () => {
        setCaja(await obtenerCajaDeEvento(tipo, id));
    }, [tipo, id]);

    useEffect(() => {
        let vigente = true;
        void obtenerCajaDeEvento(tipo, id).then((datos) => {
            if (!vigente) return;
            setCaja(datos);
            setCargando(false);
        });
        return () => { vigente = false; };
    }, [tipo, id]);

    // El pago se marca en otra parte de la pantalla (la tarjeta del grupo, la
    // lista de asistencia) y el asiento lo recalcula el servidor. Quien lo marca
    // avisa cuando el guardado terminó, y recién ahí se vuelve a pedir.
    useEffect(() => {
        const alAvisar = () => { void refrescar(); };
        window.addEventListener(EVENTO_CAJA_DESACTUALIZADA, alAvisar);
        return () => window.removeEventListener(EVENTO_CAJA_DESACTUALIZADA, alAvisar);
    }, [refrescar]);

    // Ni el botón se muestra mientras carga: si se dibujara y después
    // desapareciera, un usuario `club` vería parpadear algo que no le
    // corresponde.
    if (cargando || !caja) return null;

    const { saldo } = caja.totales;
    const sinCargar = caja.movimientos === 0;

    return (
        <>
            {/* Apoyado sobre el borde inferior derecho, por encima de la barra
                de mobile y despejando la esquina, donde suelen vivir otros
                widgets flotantes. */}
            <button
                type="button"
                onClick={() => setAbierto(true)}
                aria-label="Abrir la caja del evento"
                className="fixed bottom-24 right-4 z-40 flex items-center gap-2 h-12 pl-3 pr-4 rounded-full bg-card border border-celeste/40 shadow-2xl shadow-black/40 hover:border-celeste transition-all active:scale-95 cursor-pointer"
            >
                <span className="w-8 h-8 rounded-full bg-celeste/15 flex items-center justify-center shrink-0">
                    <Wallet className="w-4 h-4 text-celeste" />
                </span>
                <span className="text-left leading-none">
                    <span className="block label-tech text-[7px] text-subtle mb-0.5">Caja</span>
                    {sinCargar ? (
                        <span className="block text-[10px] font-black uppercase tracking-widest text-subtle">Vacía</span>
                    ) : (
                        <span className={`block text-scoreboard text-[13px] tabular-nums ${saldo < 0 ? "text-red-400" : "text-emerald-400"}`}>
                            {formatearMonto(saldo)}
                        </span>
                    )}
                </span>
            </button>

            {abierto && (
                <ModalCaja
                    evento={evento}
                    onCerrar={() => setAbierto(false)}
                    onCambio={() => { void refrescar(); router.refresh(); }}
                />
            )}
        </>
    );
}

/**
 * Todo lo que se puede hacer con la caja del evento, sin salir de la pantalla:
 * el resultado, las inscripciones, el alta y el listado completo de movimientos
 * con su edición y su borrado.
 */
function ModalCaja({
    evento, onCerrar, onCambio,
}: {
    evento: EventoRef;
    onCerrar: () => void;
    onCambio: () => void;
}) {
    const [detalle, setDetalle] = useState<DetalleEvento | null>(null);
    const [cargando, setCargando] = useState(true);
    const [creando, setCreando] = useState<Prefill | null>(null);
    const [editando, setEditando] = useState<Movimiento | null>(null);
    const [guardando, setGuardando] = useState(false);
    // Se pide recién al abrir el reparto: la mayoría de las veces que se
    // abre la caja no se tocan los premios.
    const [premios, setPremios] = useState<DatosPremios | null>(null);
    const [abriendoPremios, setAbriendoPremios] = useState(false);

    /** Relee el detalle después de cargar, editar o borrar un movimiento. */
    const cargar = useCallback(async () => {
        setDetalle(await obtenerDetalleEvento(evento.tipo, evento.id));
    }, [evento.tipo, evento.id]);

    // La respuesta se descarta si el modal se cerró mientras viajaba.
    useEffect(() => {
        let vigente = true;
        void obtenerDetalleEvento(evento.tipo, evento.id).then((datos) => {
            if (!vigente) return;
            setDetalle(datos);
            setCargando(false);
        });
        return () => { vigente = false; };
    }, [evento.tipo, evento.id]);

    // Cerrar con Escape: es un modal que se abre y se cierra muchas veces
    // durante un torneo, y volver al teclado es más rápido que buscar la X.
    useEffect(() => {
        const alTeclear = (e: KeyboardEvent) => { if (e.key === "Escape") onCerrar(); };
        window.addEventListener("keydown", alTeclear);
        return () => window.removeEventListener("keydown", alTeclear);
    }, [onCerrar]);

    const correr = async (
        fn: () => Promise<{ ok: boolean; error?: string }>,
        exito: string,
        despues?: () => void,
    ) => {
        setGuardando(true);
        const r = await fn();
        setGuardando(false);
        if (!r.ok) return toast.error(r.error || "No se pudo completar la acción");
        toast.success(exito);
        despues?.();
        await cargar();
        onCambio();
    };

    const eliminar = (m: Movimiento) => {
        if (!confirm(`¿Eliminar "${m.descripcion}" por ${formatearMonto(m.montoCentavos)}? No se puede deshacer.`)) return;
        void correr(() => eliminarMovimiento(m.id), "Movimiento eliminado.");
    };

    const automatico = llevaInscripcionesAutomaticas(evento.tipo);

    return (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-6">
            <div className="absolute inset-0 bg-background/70 backdrop-blur-xl" onClick={onCerrar} />

            <div className="relative w-full sm:max-w-lg max-h-[88vh] flex flex-col bg-background border border-hairline rounded-t-2xl sm:rounded-2xl shadow-2xl shadow-black/50">
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-hairline shrink-0">
                    <div className="min-w-0">
                        <span className="label-tech text-[8px] text-celeste block">Caja del evento</span>
                        <h3 className="heading-sport text-base text-foreground truncate">{evento.nombre}</h3>
                    </div>
                    <button
                        type="button"
                        onClick={onCerrar}
                        aria-label="Cerrar"
                        className="w-9 h-9 rounded-full bg-muted border border-hairline flex items-center justify-center hover:bg-card active:scale-90 transition-all cursor-pointer shrink-0"
                    >
                        <X className="w-4 h-4 text-foreground" />
                    </button>
                </div>

                <div className="overflow-y-auto p-4 space-y-3">
                    {cargando ? (
                        <div className="py-10 flex justify-center">
                            <Loader2 className="w-5 h-5 text-subtle animate-spin" />
                        </div>
                    ) : !detalle ? (
                        <p className="py-10 text-center text-[12px] text-subtle">No se pudo cargar la caja del evento.</p>
                    ) : (
                        <>
                            <div className="grid grid-cols-3 gap-2">
                                <Dato rotulo="Ingresos" valor={formatearMonto(detalle.totales.ingresos)} tono="text-emerald-400" />
                                <Dato rotulo="Gastos" valor={formatearMonto(detalle.totales.gastos)} tono="text-red-400" />
                                <Dato
                                    rotulo="Resultado"
                                    valor={formatearMonto(detalle.totales.saldo)}
                                    tono={detalle.totales.saldo < 0 ? "text-red-400" : "text-foreground"}
                                />
                            </div>

                            {detalle.inscripciones && (
                                <Inscripciones
                                    datos={detalle.inscripciones}
                                    automatico={automatico}
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

                            <div className="grid grid-cols-2 gap-2">
                                <BotonRapido tipo={TIPO_MOVIMIENTO.INGRESO} onClick={() => setCreando({ tipo: TIPO_MOVIMIENTO.INGRESO, evento })} />
                                <BotonRapido tipo={TIPO_MOVIMIENTO.GASTO} onClick={() => setCreando({ tipo: TIPO_MOVIMIENTO.GASTO, evento })} />
                            </div>

                            <button
                                type="button"
                                disabled={abriendoPremios}
                                onClick={async () => {
                                    setAbriendoPremios(true);
                                    setPremios(await obtenerDatosPremios(evento.tipo, evento.id));
                                    setAbriendoPremios(false);
                                }}
                                className="w-full flex items-center justify-center gap-1.5 h-10 rounded-xl bg-volt/10 border border-volt/30 text-[9px] font-black uppercase tracking-widest text-volt-ink hover:bg-volt/20 transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                            >
                                {abriendoPremios ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trophy className="w-3 h-3" />}
                                Repartir premios
                            </button>

                            {/* El listado completo, acá adentro: es justamente lo
                                que antes obligaba a navegar y perder la pantalla. */}
                            {detalle.movimientos.length === 0 ? (
                                <p className="py-6 text-center text-[11px] text-subtle">
                                    Todavía no hay movimientos en este evento.
                                </p>
                            ) : (
                                <div className="space-y-2 pt-1">
                                    <span className="label-tech text-[8px] text-subtle block">
                                        {detalle.movimientos.length} {detalle.movimientos.length === 1 ? "movimiento" : "movimientos"}
                                    </span>
                                    {detalle.movimientos.map((m) => (
                                        <FilaCompacta
                                            key={m.id}
                                            movimiento={m}
                                            pendiente={guardando}
                                            mostrarEvento={false}
                                            onEditar={() => setEditando(m)}
                                            onEliminar={() => eliminar(m)}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Escape hacia la pantalla completa, en otra pestaña
                                para no perder la gestión que está corriendo. */}
                            <Link
                                href={rutaDeEvento(evento.tipo, evento.id)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-1.5 h-9 rounded-xl bg-muted border border-hairline text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:border-celeste/40 transition-all"
                            >
                                Abrir en contaduría
                                <ExternalLink className="w-3 h-3" />
                            </Link>
                        </>
                    )}
                </div>
            </div>

            {/* Van por encima (z-[100] en ModalFormulario) del modal de la caja. */}
            {creando && (
                <ModalFormulario onCerrar={() => setCreando(null)}>
                    <Formulario
                        titulo={creando.tipo === TIPO_MOVIMIENTO.INGRESO ? "Nuevo ingreso" : "Nuevo gasto"}
                        accion={creando.tipo === TIPO_MOVIMIENTO.INGRESO ? "Registrar ingreso" : "Registrar gasto"}
                        prefill={creando}
                        eventoFijo={evento}
                        pendiente={guardando}
                        onCancelar={() => setCreando(null)}
                        onGuardar={(datos) => {
                            void correr(() => crearMovimiento(datos), "Movimiento registrado.", () => setCreando(null));
                        }}
                    />
                </ModalFormulario>
            )}

            {premios && (
                <PremiosEvento
                    tipo={evento.tipo}
                    id={evento.id}
                    ingresosCentavos={premios.ingresosCentavos}
                    config={premios.config}
                    onCerrar={() => setPremios(null)}
                    onGenerado={() => { void cargar(); onCambio(); }}
                />
            )}

            {editando && (
                <ModalFormulario onCerrar={() => setEditando(null)}>
                    <Formulario
                        titulo="Editar movimiento"
                        accion="Guardar cambios"
                        inicial={editando}
                        eventoFijo={evento}
                        pendiente={guardando}
                        onCancelar={() => setEditando(null)}
                        onGuardar={(datos) => {
                            void correr(() => editarMovimiento(editando.id, datos), "Movimiento actualizado.", () => setEditando(null));
                        }}
                    />
                </ModalFormulario>
            )}
        </div>
    );
}

function Dato({ rotulo, valor, tono }: { rotulo: string; valor: string; tono: string }) {
    return (
        <div className="rounded-xl bg-muted border border-hairline p-2.5">
            <div className="label-tech text-[8px] text-subtle mb-1">{rotulo}</div>
            <div className={`text-scoreboard text-[12px] tabular-nums ${tono}`}>{valor}</div>
        </div>
    );
}

/**
 * En torneos y cancha abierta el monto lo mantiene el sistema con los pagos
 * marcados, así que acá sólo se informa y se muestra quiénes están detrás. En el
 * desafío, que no marca pagos jugador por jugador, se ofrece cargar la
 * diferencia.
 */
function Inscripciones({
    datos, automatico, pagadores, onCargar,
}: {
    datos: NonNullable<DetalleEvento["inscripciones"]>;
    automatico: boolean;
    pagadores: DetalleEvento["pagadores"];
    onCargar: (montoCentavos: number) => void;
}) {
    const [verQuienes, setVerQuienes] = useState(false);
    const falta = datos.esperadoCentavos - datos.cargadoCentavos;

    if (automatico) {
        return (
            <div className="rounded-xl bg-muted border border-hairline p-3 space-y-2">
                <div className="flex items-center gap-2">
                    <Lock className="w-3 h-3 text-celeste shrink-0" />
                    <span className="label-tech text-[8px] text-celeste">
                        {etiquetaDeRubro(RUBRO.INSCRIPCIONES)} · automático
                    </span>
                    <span className="ml-auto text-scoreboard text-[12px] tabular-nums text-emerald-400">
                        {formatearMonto(datos.cargadoCentavos)}
                    </span>
                </div>

                <p className="text-[10px] text-subtle">
                    {datos.base} × {formatearMonto(datos.feeCentavos)}. Se actualiza sola al marcar un pago.
                </p>

                {pagadores.length > 0 && (
                    <>
                        <button
                            type="button"
                            onClick={() => setVerQuienes((v) => !v)}
                            aria-expanded={verQuienes}
                            className="text-[9px] font-black uppercase tracking-widest text-celeste hover:text-celeste-light transition-colors cursor-pointer"
                        >
                            {verQuienes ? "Ocultar" : "Ver"} quiénes pagaron
                        </button>
                        {verQuienes && (
                            <ul className="pt-1 space-y-0.5 border-t border-hairline">
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
                    </>
                )}

                {datos.cargadoCentavos !== datos.esperadoCentavos && (
                    <p className="text-[10px] text-amber-400">
                        Hay {formatearMonto(Math.abs(falta))} cargados a mano además del automático.
                    </p>
                )}
            </div>
        );
    }

    if (falta <= 0) {
        return (
            <p className="text-[10px] text-emerald-400 text-center">
                Inscripciones cargadas · {datos.base} × {formatearMonto(datos.feeCentavos)}
            </p>
        );
    }

    return (
        <button
            type="button"
            onClick={() => onCargar(falta)}
            className="w-full px-3 py-2.5 rounded-xl bg-celeste/10 border border-celeste/30 hover:bg-celeste/20 transition-colors text-left cursor-pointer"
        >
            <div className="flex items-center justify-between gap-2">
                <span className="label-tech text-[8px] text-celeste">Faltan inscripciones</span>
                <span className="text-scoreboard text-[13px] tabular-nums text-celeste">{formatearMonto(falta)}</span>
            </div>
            <p className="text-[9px] text-subtle mt-0.5">
                {datos.base} × {formatearMonto(datos.feeCentavos)} · tocá para cargar
            </p>
        </button>
    );
}

function BotonRapido({ tipo, onClick }: { tipo: typeof TIPO_MOVIMIENTO[keyof typeof TIPO_MOVIMIENTO]; onClick: () => void }) {
    const ingreso = tipo === TIPO_MOVIMIENTO.INGRESO;
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex items-center justify-center gap-1.5 h-10 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 cursor-pointer ${ingreso
                ? "bg-emerald-400/10 border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/20"
                : "bg-red-400/10 border-red-400/30 text-red-400 hover:bg-red-400/20"
                }`}
        >
            <Plus className="w-3 h-3" />
            {ingreso ? "Ingreso" : "Gasto"}
        </button>
    );
}
