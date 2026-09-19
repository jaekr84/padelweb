"use client";

// Panel plegable de la caja de un evento, para incrustar en las pantallas de
// gestión (torneo robin, americano, cancha abierta y desafío).
//
// Se pide sus propios datos en vez de recibirlos por props: así entra en las
// cuatro pantallas con una línea y sin tocar el `page.tsx` de ninguna. La
// acción que consulta devuelve `null` a quien no es admin, y ese es todo el
// control de acceso que hace falta — a las pantallas de torneo y cancha
// abierta también entran usuarios `club` y dueños de torneo, que no ven la
// caja. Si no llegan datos, el panel no se dibuja.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, Lock, Plus, Wallet } from "lucide-react";
import {
    RUBRO, TIPO_MOVIMIENTO, formatearMonto, llevaInscripcionesAutomaticas, rutaDeEvento,
    type EventoRef, type TipoEvento,
} from "@/lib/contaduria";
import { Formulario, ModalFormulario, type Prefill } from "./componentes";
import { crearMovimiento } from "./actions";
import { obtenerCajaDeEvento, type CajaDeEvento } from "./eventos/actions";

/** Se recuerda plegado/desplegado para todos los eventos por igual. */
const CLAVE_ABIERTO = "contaduria:caja-evento-abierta";

/**
 * El plegado vive en localStorage y no en la URL: es una preferencia de quien
 * mira, no parte de lo que se está mirando. Se lee en el initializer y no en un
 * efecto — el panel no dibuja nada hasta que cargan los datos, así que el
 * servidor y el primer render del cliente coinciden en `null` y no hay desajuste
 * de hidratación. Si el navegador bloquea el storage, arranca cerrado.
 */
function leerPlegado(): boolean {
    if (typeof window === "undefined") return false;
    try {
        return window.localStorage.getItem(CLAVE_ABIERTO) === "1";
    } catch {
        return false;
    }
}

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
    const [abierto, setAbierto] = useState(leerPlegado);
    const [creando, setCreando] = useState<Prefill | null>(null);
    const [guardando, setGuardando] = useState(false);

    const evento: EventoRef = { tipo, id, nombre: caja?.nombre ?? nombre };

    /** Relee la caja después de cargar un movimiento. */
    const refrescar = useCallback(async () => {
        setCaja(await obtenerCajaDeEvento(tipo, id));
    }, [tipo, id]);

    // La respuesta se descarta si el panel cambió de evento mientras viajaba:
    // sin esto, una consulta lenta del evento anterior pisaría a la nueva.
    useEffect(() => {
        let vigente = true;
        void obtenerCajaDeEvento(tipo, id).then((datos) => {
            if (!vigente) return;
            setCaja(datos);
            setCargando(false);
        });
        return () => { vigente = false; };
    }, [tipo, id]);

    const alternar = () => {
        setAbierto((previo) => {
            const siguiente = !previo;
            try { window.localStorage.setItem(CLAVE_ABIERTO, siguiente ? "1" : "0"); } catch { }
            return siguiente;
        });
    };

    const guardar = async (datos: Parameters<typeof crearMovimiento>[0]) => {
        setGuardando(true);
        const r = await crearMovimiento(datos);
        setGuardando(false);
        if (!r.ok) return toast.error(r.error || "No se pudo registrar el movimiento");
        toast.success("Movimiento registrado.");
        setCreando(null);
        await refrescar();
        router.refresh();
    };

    // Ni el esqueleto se muestra mientras carga: si se dibujara y después
    // desapareciera, un usuario `club` vería parpadear un panel que no le
    // corresponde.
    if (cargando || !caja) return null;

    const { saldo } = caja.totales;
    const sinCargar = caja.movimientos === 0;

    return (
        <div className="rounded-2xl border border-hairline bg-card shadow-lg shadow-black/20 overflow-hidden">
            <button
                type="button"
                onClick={alternar}
                aria-expanded={abierto}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors cursor-pointer"
            >
                <span className="w-7 h-7 rounded-lg bg-celeste/10 border border-celeste/30 flex items-center justify-center shrink-0">
                    <Wallet className="w-3.5 h-3.5 text-celeste" />
                </span>
                <span className="label-tech text-[8px] text-celeste">Caja del evento</span>

                <span className="ml-auto flex items-center gap-2 shrink-0">
                    {sinCargar ? (
                        <span className="text-[10px] font-black uppercase tracking-widest text-subtle">Sin cargar</span>
                    ) : (
                        <span className={`text-scoreboard text-[15px] tabular-nums ${saldo < 0 ? "text-red-400" : "text-emerald-400"}`}>
                            {formatearMonto(saldo)}
                        </span>
                    )}
                    <ChevronDown className={`w-4 h-4 text-subtle transition-transform ${abierto ? "rotate-180" : ""}`} />
                </span>
            </button>

            {abierto && (
                <div className="px-4 pb-4 pt-1 space-y-3 border-t border-hairline">
                    <div className="grid grid-cols-2 gap-2">
                        <Dato rotulo="Ingresos" valor={formatearMonto(caja.totales.ingresos)} tono="text-emerald-400" />
                        <Dato rotulo="Gastos" valor={formatearMonto(caja.totales.gastos)} tono="text-red-400" />
                    </div>

                    {caja.inscripciones && (
                        <Inscripciones
                            datos={caja.inscripciones}
                            automatico={llevaInscripcionesAutomaticas(tipo)}
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
                        <BotonRapido
                            tipo={TIPO_MOVIMIENTO.INGRESO}
                            onClick={() => setCreando({ tipo: TIPO_MOVIMIENTO.INGRESO, evento })}
                        />
                        <BotonRapido
                            tipo={TIPO_MOVIMIENTO.GASTO}
                            onClick={() => setCreando({ tipo: TIPO_MOVIMIENTO.GASTO, evento })}
                        />
                    </div>

                    {/* El listado completo no se duplica acá: duplicaría el largo
                        de una pantalla que ya es densa. */}
                    <Link
                        href={rutaDeEvento(tipo, id)}
                        className="flex items-center justify-center gap-1.5 h-9 rounded-xl bg-muted border border-hairline text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:border-celeste/40 transition-all"
                    >
                        Ver los {caja.movimientos} movimientos →
                    </Link>
                </div>
            )}

            {creando && (
                <ModalFormulario onCerrar={() => setCreando(null)}>
                    <Formulario
                        titulo={creando.tipo === TIPO_MOVIMIENTO.INGRESO ? "Nuevo ingreso" : "Nuevo gasto"}
                        accion={creando.tipo === TIPO_MOVIMIENTO.INGRESO ? "Registrar ingreso" : "Registrar gasto"}
                        prefill={creando}
                        eventoFijo={evento}
                        pendiente={guardando}
                        onCancelar={() => setCreando(null)}
                        onGuardar={(datos) => { void guardar(datos); }}
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
            <div className={`text-scoreboard text-[13px] tabular-nums ${tono}`}>{valor}</div>
        </div>
    );
}

/**
 * Inscripciones, en una línea. El detalle completo vive en "Ver todo".
 *
 * En torneos y cancha abierta el monto lo mantiene el sistema con los pagos
 * marcados, así que acá sólo se informa. En el desafío, que no marca pagos
 * jugador por jugador, se ofrece cargar la diferencia.
 */
function Inscripciones({
    datos, automatico, onCargar,
}: {
    datos: NonNullable<CajaDeEvento["inscripciones"]>;
    automatico: boolean;
    onCargar: (montoCentavos: number) => void;
}) {
    const falta = datos.esperadoCentavos - datos.cargadoCentavos;

    if (automatico) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted border border-hairline">
                <Lock className="w-3 h-3 text-celeste shrink-0" />
                <span className="text-[10px] text-subtle truncate">
                    Inscripciones automáticas · {datos.base}
                </span>
                <span className="ml-auto text-scoreboard text-[12px] tabular-nums text-emerald-400 shrink-0">
                    {formatearMonto(datos.cargadoCentavos)}
                </span>
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
            {/* De dónde sale el esperado, explícito: el criterio cambia según el
                tipo de evento y no tiene por qué adivinarse. */}
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
