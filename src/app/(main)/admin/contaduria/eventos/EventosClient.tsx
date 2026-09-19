"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, Scale, Trophy } from "lucide-react";
import {
    TIPOS_EVENTO, etiquetaDeMes, etiquetaDeTipoEvento, formatearFecha, formatearMonto, rutaDeEvento,
    type ResumenEvento, type TipoEvento,
} from "@/lib/contaduria";
import { Tarjeta, Vacio } from "../componentes";

type FiltroTipo = TipoEvento | "todos";
type Orden = "fecha" | "resultado";

const TODOS = "todos";

export default function EventosClient({
    eventos, meses, periodo,
}: {
    eventos: ResumenEvento[];
    meses: string[];
    periodo: string;
}) {
    const router = useRouter();
    const [tipo, setTipo] = useState<FiltroTipo>(TODOS);
    const [orden, setOrden] = useState<Orden>("fecha");

    // El filtro por tipo y el orden son de cliente: la lista está acotada a los
    // últimos eventos de cada tipo, así que no hace falta volver al servidor.
    const visibles = useMemo(() => {
        const filtrados = tipo === TODOS ? eventos : eventos.filter((e) => e.tipo === tipo);
        // El orden por fecha ya viene del servidor; sólo hay que rehacerlo
        // cuando se pide por resultado, de mayor a menor.
        return orden === "resultado"
            ? [...filtrados].sort((a, b) => b.resultado - a.resultado)
            : filtrados;
    }, [eventos, tipo, orden]);

    // Los totales son de lo que se está viendo: el encabezado tiene que
    // explicar la lista de abajo, no otra cosa.
    const totales = useMemo(() => visibles.reduce(
        (acc, e) => ({
            ingresos: acc.ingresos + e.ingresos,
            gastos: acc.gastos + e.gastos,
            resultado: acc.resultado + e.resultado,
        }),
        { ingresos: 0, gastos: 0, resultado: 0 }
    ), [visibles]);

    const contar = (f: FiltroTipo) => (f === TODOS ? eventos.length : eventos.filter((e) => e.tipo === f).length);

    const cambiarPeriodo = (valor: string) =>
        router.push(valor === TODOS ? "/admin/contaduria/eventos" : `/admin/contaduria/eventos?mes=${valor}`);

    const rotuloPeriodo = periodo === TODOS ? "Histórico" : etiquetaDeMes(periodo);

    return (
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
            <Link
                href="/admin/contaduria"
                className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-subtle hover:text-foreground transition-colors"
            >
                <ArrowLeft className="w-3.5 h-3.5" />
                Contaduría
            </Link>

            <header className="flex items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Trophy className="w-4 h-4 text-volt-ink" />
                        <span className="label-tech text-[8px] text-volt-ink">Resultado por evento</span>
                    </div>
                    <h1 className="heading-sport text-2xl sm:text-3xl text-foreground">Eventos</h1>
                    <p className="text-[11px] text-subtle mt-1">
                        Lo que dejó cada torneo, desafío y cancha abierta. Son los mismos movimientos de la caja,
                        agrupados por evento.
                    </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-muted border border-celeste/30 flex items-center justify-center shrink-0">
                    <Scale className="w-5 h-5 text-celeste" />
                </div>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Tarjeta rotulo={`Ingresos · ${rotuloPeriodo}`} monto={totales.ingresos} tono="ingreso" icono={ArrowUpRight} />
                <Tarjeta rotulo={`Gastos · ${rotuloPeriodo}`} monto={totales.gastos} tono="gasto" icono={ArrowDownLeft} />
                <Tarjeta
                    rotulo={`Resultado · ${rotuloPeriodo}`}
                    monto={totales.resultado}
                    tono={totales.resultado < 0 ? "gasto" : "saldo"}
                    icono={Scale}
                />
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap gap-1.5">
                    {([TODOS, ...TIPOS_EVENTO] as FiltroTipo[]).map((valor) => (
                        <button
                            key={valor}
                            type="button"
                            aria-pressed={tipo === valor}
                            onClick={() => setTipo(valor)}
                            className={`px-3 h-9 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 cursor-pointer ${tipo === valor
                                ? "bg-celeste text-carbon-950 border-celeste shadow-lg shadow-celeste/20"
                                : "bg-muted border-hairline text-muted-foreground hover:text-foreground hover:border-celeste/40"
                                }`}
                        >
                            {valor === TODOS ? "Todos" : etiquetaDeTipoEvento(valor)}{" "}
                            <span className="opacity-60">{contar(valor)}</span>
                        </button>
                    ))}
                </div>

                <select
                    value={periodo}
                    onChange={(e) => cambiarPeriodo(e.target.value)}
                    aria-label="Filtrar por mes"
                    className="ml-auto h-9 px-3 rounded-xl bg-muted border border-hairline text-[10px] font-black uppercase tracking-widest text-foreground focus:outline-none focus:border-celeste/40 cursor-pointer"
                >
                    <option value={TODOS}>Todos los meses</option>
                    {meses.map((m) => (
                        <option key={m} value={m}>{etiquetaDeMes(m)}</option>
                    ))}
                </select>

                <select
                    value={orden}
                    onChange={(e) => setOrden(e.target.value as Orden)}
                    aria-label="Ordenar"
                    className="h-9 px-3 rounded-xl bg-muted border border-hairline text-[10px] font-black uppercase tracking-widest text-foreground focus:outline-none focus:border-celeste/40 cursor-pointer"
                >
                    <option value="fecha">Más recientes</option>
                    <option value="resultado">Mejor resultado</option>
                </select>
            </div>

            {visibles.length === 0 ? (
                <Vacio
                    titulo="No hay eventos para mostrar"
                    detalle="Probá con otro mes o con otro tipo de evento."
                />
            ) : (
                <div className="space-y-2">
                    {visibles.map((e) => <FilaEvento key={`${e.tipo}:${e.id}`} evento={e} />)}
                </div>
            )}
        </div>
    );
}

function FilaEvento({ evento: e }: { evento: ResumenEvento }) {
    const sinCargar = e.movimientos === 0;
    const positivo = e.resultado >= 0;

    return (
        <Link
            href={rutaDeEvento(e.tipo, e.id)}
            className="block rounded-2xl border border-hairline bg-card shadow-lg shadow-black/20 p-3.5 hover:border-celeste/40 transition-colors"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                        <span className="inline-flex items-center px-1.5 h-5 rounded-md bg-muted border border-hairline text-[9px] font-black uppercase tracking-wider text-subtle">
                            {etiquetaDeTipoEvento(e.tipo)}
                        </span>
                        {e.fecha && (
                            <span className="text-[10px] text-subtle tabular-nums">{formatearFecha(e.fecha)}</span>
                        )}
                    </div>
                    <div className="text-[13px] font-bold text-foreground truncate">{e.nombre}</div>
                </div>

                <div className="text-right shrink-0">
                    <div className="label-tech text-[8px] text-subtle mb-0.5">Resultado</div>
                    {sinCargar ? (
                        <div className="text-[11px] font-black uppercase tracking-widest text-subtle">Sin cargar</div>
                    ) : (
                        <div className={`text-scoreboard text-lg tabular-nums ${positivo ? "text-emerald-400" : "text-red-400"}`}>
                            {formatearMonto(e.resultado)}
                        </div>
                    )}
                </div>
            </div>

            {!sinCargar && (
                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-hairline text-[10px] tabular-nums">
                    <span className="text-emerald-400">+{formatearMonto(e.ingresos)}</span>
                    <span className="text-red-400">−{formatearMonto(e.gastos)}</span>
                    <span className="ml-auto text-subtle">
                        {e.movimientos} {e.movimientos === 1 ? "movimiento" : "movimientos"}
                    </span>
                </div>
            )}
        </Link>
    );
}
