"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowUpRight, Plus, Scale, Trophy, Wallet } from "lucide-react";
import {
    MOVIMIENTOS_POR_PERIODO, RUBROS_POR_TIPO, SIN_EVENTO, TIPO_MOVIMIENTO, claveDeEvento, etiquetaDeMes,
    etiquetaDeRubro, etiquetaDeTipoEvento, formatearFecha, formatearMonto,
    type Movimiento, type OpcionEvento, type TipoMovimiento, type Totales,
} from "@/lib/contaduria";
import {
    Formulario, FilaCompacta, ModalFormulario, Tabla, Tarjeta, Vacio,
} from "./componentes";
import { crearMovimiento, editarMovimiento, eliminarMovimiento } from "./actions";

type Filtro = TipoMovimiento | "todos";

const TODOS = "todos";

/** Los rubros de los dos tipos, sin repetir "Otros". */
const RUBROS_TODOS = [
    ...RUBROS_POR_TIPO[TIPO_MOVIMIENTO.INGRESO],
    ...RUBROS_POR_TIPO[TIPO_MOVIMIENTO.GASTO],
].filter((r, i, todos) => todos.indexOf(r) === i);

export default function ContaduriaClient({
    movimientos,
    totales,
    meses,
    eventos,
    periodo,
    rubro,
    evento,
}: {
    movimientos: Movimiento[];
    totales: Totales;
    meses: string[];
    eventos: OpcionEvento[];
    periodo: string;
    rubro: string;
    evento: string;
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

    /**
     * Los tres filtros de servidor viajan en la URL, así que cambiar uno es
     * reescribirla conservando los otros dos. Los valores en "todos" no se
     * escriben: la URL limpia es la del estado sin filtrar.
     */
    const navegar = (cambios: Partial<{ mes: string; rubro: string; evento: string }>) => {
        const valores = { mes: periodo, rubro, evento, ...cambios };
        const params = new URLSearchParams();
        for (const [clave, valor] of Object.entries(valores)) {
            if (valor && valor !== TODOS) params.set(clave, valor);
        }
        const query = params.toString();
        router.push(query ? `/admin/contaduria?${query}` : "/admin/contaduria");
    };

    const eliminar = (m: Movimiento) => {
        if (!confirm(`¿Eliminar "${m.descripcion}" por ${formatearMonto(m.montoCentavos)}? No se puede deshacer.`)) return;
        correr(() => eliminarMovimiento(m.id), "Movimiento eliminado.");
    };

    const rotuloPeriodo = periodo === TODOS ? "Histórico" : etiquetaDeMes(periodo);
    const filtrado = rubro !== TODOS || evento !== TODOS;

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

            {/* Los eventos no son otra caja: son esta misma, mirada por torneo. */}
            <Link
                href="/admin/contaduria/eventos"
                className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-celeste/30 bg-celeste/5 hover:bg-celeste/10 transition-colors group"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-xl bg-celeste/15 border border-celeste/30 flex items-center justify-center shrink-0">
                        <Trophy className="w-4 h-4 text-celeste" />
                    </span>
                    <div className="min-w-0">
                        <div className="text-[12px] font-black uppercase tracking-widest text-foreground">
                            Resultado por evento
                        </div>
                        <p className="text-[10px] text-subtle truncate">
                            Cuánto dejó cada torneo, desafío y cancha abierta.
                        </p>
                    </div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-celeste group-hover:translate-x-0.5 transition-transform shrink-0">
                    Ver →
                </span>
            </Link>

            {/* Los totales son siempre de los filtros del servidor (período,
                rubro y evento), no del filtro de tipo de la tabla: un saldo que
                cambia al tocar "Gastos" no sería un saldo. */}
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

            {filtrado && (
                <p className="text-[10px] text-amber-400 -mt-2">
                    Los totales de arriba son sólo de los movimientos que pasan los filtros elegidos.
                </p>
            )}

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
                        prefill={{ tipo: creando }}
                        eventos={eventos}
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
                        eventos={eventos}
                        pendiente={pendiente}
                        onCancelar={() => setEditando(null)}
                        onGuardar={(datos) =>
                            correr(() => editarMovimiento(editando.id, datos), "Movimiento actualizado.", () => setEditando(null))
                        }
                    />
                </ModalFormulario>
            )}

            <div className="space-y-2">
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
                        onChange={(e) => navegar({ mes: e.target.value })}
                        className="ml-auto h-9 px-3 rounded-xl bg-muted border border-hairline text-[10px] font-black uppercase tracking-widest text-foreground focus:outline-none focus:border-celeste/40 cursor-pointer"
                    >
                        <option value={TODOS}>Todos los meses</option>
                        {meses.map((m) => (
                            <option key={m} value={m}>{etiquetaDeMes(m)}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                        value={rubro}
                        onChange={(e) => navegar({ rubro: e.target.value })}
                        aria-label="Filtrar por rubro"
                        className="h-9 px-3 rounded-xl bg-muted border border-hairline text-[10px] font-black uppercase tracking-widest text-foreground focus:outline-none focus:border-celeste/40 cursor-pointer"
                    >
                        <option value={TODOS}>Todos los rubros</option>
                        {RUBROS_TODOS.map((r) => (
                            <option key={r} value={r}>{etiquetaDeRubro(r)}</option>
                        ))}
                    </select>

                    <select
                        value={evento}
                        onChange={(e) => navegar({ evento: e.target.value })}
                        aria-label="Filtrar por evento"
                        className="h-9 px-3 rounded-xl bg-muted border border-hairline text-[10px] font-black uppercase tracking-widest text-foreground focus:outline-none focus:border-celeste/40 cursor-pointer"
                    >
                        <option value={TODOS}>Todos los eventos</option>
                        <option value={SIN_EVENTO}>Sólo caja general</option>
                        {eventos.map((e) => (
                            <option key={claveDeEvento(e.tipo, e.id)} value={claveDeEvento(e.tipo, e.id)}>
                                {etiquetaDeTipoEvento(e.tipo)} · {e.nombre}
                                {e.fecha ? ` (${formatearFecha(e.fecha)})` : ""}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {movimientos.length === 0 ? (
                <Vacio
                    titulo={filtrado || periodo !== TODOS ? "Ningún movimiento con esos filtros" : "Todavía no hay movimientos"}
                    detalle={
                        filtrado || periodo !== TODOS
                            ? "Probá con otro mes, otro rubro u otro evento."
                            : "Registrá el primer ingreso o gasto para empezar la caja."
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
