"use client";

// Reparto de premios de un evento: qué parte de lo recaudado va a premios y
// cómo se divide entre los puestos.
//
// Genera un gasto por puesto con rubro "premios en dinero", así el resultado
// del evento se calcula solo. Los premios REEMPLAZAN a los que ya había: el
// reparto es una foto del podio, no un historial, y acumularlos duplicaría.
//
// El cálculo no vive acá sino en `@/lib/contaduria`, y lo comparten la vista
// previa y el servidor: lo que se ve en pantalla es exactamente lo que termina
// en la caja, al centavo.

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trophy, X } from "lucide-react";
import {
    MAX_PUESTOS, PUESTOS_POR_DEFECTO, PUNTOS_BASICOS_TOTALES, calcularPool, formatearMonto,
    formatearPorcentaje, parsearPorcentaje, repartirPremios, rotuloDePuesto,
    type ConfigPremios, type PuestoPremio,
} from "@/lib/contaduria";
import { generarPremios } from "./eventos/actions";

export default function PremiosEvento({
    tipo, id, ingresosCentavos, config, onCerrar, onGenerado,
}: {
    tipo: string;
    id: string;
    /** Ingresos del evento ahora: la base del pool. */
    ingresosCentavos: number;
    /** Lo guardado la última vez, o `null` si nunca se generó. */
    config: ConfigPremios | null;
    onCerrar: () => void;
    onGenerado: () => void;
}) {
    const [poolTexto, setPoolTexto] = useState(
        config ? formatearPorcentaje(config.poolPuntosBasicos) : "50"
    );
    const [puestos, setPuestos] = useState<PuestoPremio[]>(
        config && config.puestos.length > 0 ? config.puestos : PUESTOS_POR_DEFECTO
    );
    const [guardando, setGuardando] = useState(false);

    const poolPuntosBasicos = parsearPorcentaje(poolTexto);
    const poolCentavos = poolPuntosBasicos === null ? 0 : calcularPool(ingresosCentavos, poolPuntosBasicos);

    const sumaPuntos = puestos.reduce((t, p) => t + p.puntosBasicos, 0);
    const premios = useMemo(() => repartirPremios(poolCentavos, puestos), [poolCentavos, puestos]);
    const repartido = premios.reduce((t, p) => t + p.montoCentavos, 0);
    const sinRepartir = poolCentavos - repartido;

    // La base cambió desde la última generación: los premios que están cargados
    // ya no corresponden a lo recaudado.
    const baseCambio = Boolean(config) && config!.baseCentavos !== ingresosCentavos;

    const excedido = sumaPuntos > PUNTOS_BASICOS_TOTALES;
    const listo = poolPuntosBasicos !== null && poolPuntosBasicos > 0
        && poolCentavos > 0 && puestos.length > 0 && !excedido
        && puestos.every((p) => p.rotulo.trim());

    const cambiarPuesto = (indice: number, cambios: Partial<PuestoPremio>) =>
        setPuestos((previos) => previos.map((p, i) => (i === indice ? { ...p, ...cambios } : p)));

    const agregar = () =>
        setPuestos((previos) => previos.length >= MAX_PUESTOS
            ? previos
            : [...previos, { rotulo: rotuloDePuesto(previos.length), puntosBasicos: 0 }]);

    const quitar = (indice: number) =>
        setPuestos((previos) => previos.filter((_, i) => i !== indice));

    const generar = async () => {
        if (!listo || poolPuntosBasicos === null) return;

        // Se avisa antes porque regenerar pisa lo que haya, incluida una
        // edición hecha a mano sobre un premio ya generado.
        if (config && !confirm(
            "Esto reemplaza los premios que ya están cargados en este evento. ¿Seguimos?"
        )) return;

        setGuardando(true);
        const r = await generarPremios(tipo, id, poolPuntosBasicos, puestos);
        setGuardando(false);

        if (!r.ok) return toast.error(r.error);
        toast.success(`${r.generados} premio${r.generados === 1 ? "" : "s"} por ${formatearMonto(r.totalCentavos)}.`);
        onGenerado();
        onCerrar();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
            <div className="absolute inset-0 bg-background/70 backdrop-blur-xl" onClick={onCerrar} />

            <div className="relative w-full sm:max-w-md max-h-[88vh] flex flex-col bg-background border border-hairline rounded-t-2xl sm:rounded-2xl shadow-2xl shadow-black/50">
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-hairline shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                        <Trophy className="w-4 h-4 text-volt-ink shrink-0" />
                        <h3 className="heading-sport text-base text-foreground truncate">Premios</h3>
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
                    {baseCambio && (
                        <p className="text-[10px] text-amber-400 px-3 py-2 rounded-xl bg-amber-400/10 border border-amber-400/30">
                            Los ingresos cambiaron desde la última vez ({formatearMonto(config!.baseCentavos)} →{" "}
                            {formatearMonto(ingresosCentavos)}). Regenerá para actualizar los premios.
                        </p>
                    )}

                    {/* El pool: qué parte de lo recaudado se reparte. */}
                    <div className="rounded-xl bg-muted border border-hairline p-3 space-y-2">
                        <label className="flex items-center gap-2">
                            <span className="label-tech text-[8px] text-subtle">Destinar a premios</span>
                            <span className="ml-auto flex items-center gap-1">
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={poolTexto}
                                    onChange={(e) => setPoolTexto(e.target.value)}
                                    className="w-16 h-9 px-2 rounded-lg bg-card border border-hairline text-[13px] text-scoreboard tabular-nums text-right text-foreground focus:outline-none focus:border-celeste/40"
                                />
                                <span className="text-[12px] font-black text-subtle">%</span>
                            </span>
                        </label>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-hairline">
                            <span className="text-[10px] text-subtle">
                                de {formatearMonto(ingresosCentavos)} de ingresos
                            </span>
                            <span className="text-scoreboard text-[14px] tabular-nums text-volt-ink">
                                {formatearMonto(poolCentavos)}
                            </span>
                        </div>

                        {ingresosCentavos <= 0 && (
                            <p className="text-[10px] text-amber-400">
                                Todavía no hay ingresos en el evento: cargá las inscripciones primero.
                            </p>
                        )}
                    </div>

                    {/* Los puestos. */}
                    <div className="space-y-2">
                        {puestos.map((p, i) => (
                            <FilaPuesto
                                key={i}
                                puesto={p}
                                montoCentavos={premios[i]?.montoCentavos ?? 0}
                                puedeQuitar={puestos.length > 1}
                                onCambiar={(cambios) => cambiarPuesto(i, cambios)}
                                onQuitar={() => quitar(i)}
                            />
                        ))}

                        {puestos.length < MAX_PUESTOS && (
                            <button
                                type="button"
                                onClick={agregar}
                                className="w-full flex items-center justify-center gap-1.5 h-10 rounded-xl bg-muted border border-dashed border-hairline text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:border-celeste/40 transition-all cursor-pointer"
                            >
                                <Plus className="w-3 h-3" />
                                Agregar puesto
                            </button>
                        )}
                    </div>

                    {/* El cierre de la cuenta, siempre visible: es lo que evita
                        generar un reparto que no suma lo que se cree. */}
                    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-card border border-hairline">
                        <span className={`text-[11px] font-black tabular-nums ${excedido ? "text-red-400" : "text-muted-foreground"}`}>
                            {formatearPorcentaje(sumaPuntos)}% repartido
                        </span>
                        <span className="text-scoreboard text-[13px] tabular-nums text-foreground">
                            {formatearMonto(repartido)}
                        </span>
                    </div>

                    {excedido ? (
                        <p className="text-[10px] text-red-400 text-center">
                            Los puestos suman más del 100%. Bajá alguno antes de generar.
                        </p>
                    ) : sinRepartir > 0 ? (
                        <p className="text-[10px] text-amber-400 text-center">
                            Quedan {formatearMonto(sinRepartir)} sin repartir ({formatearPorcentaje(PUNTOS_BASICOS_TOTALES - sumaPuntos)}% del pool).
                        </p>
                    ) : null}
                </div>

                <div className="flex gap-2 p-4 border-t border-hairline shrink-0">
                    <button
                        type="button"
                        onClick={onCerrar}
                        disabled={guardando}
                        className="flex-1 h-11 rounded-xl bg-muted border border-hairline text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={() => { void generar(); }}
                        disabled={guardando || !listo}
                        className="flex-1 h-11 rounded-xl bg-volt text-carbon-950 text-[10px] font-black uppercase tracking-widest hover:bg-volt-dark transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
                    >
                        {guardando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {config ? "Regenerar" : "Generar premios"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function FilaPuesto({
    puesto, montoCentavos, puedeQuitar, onCambiar, onQuitar,
}: {
    puesto: PuestoPremio;
    montoCentavos: number;
    puedeQuitar: boolean;
    onCambiar: (cambios: Partial<PuestoPremio>) => void;
    onQuitar: () => void;
}) {
    // El porcentaje se edita como texto para poder borrarlo y volver a
    // escribirlo: con un número controlado, vaciar el campo lo fuerza a 0 y no
    // se puede tipear "40" arriba de un "0".
    const [texto, setTexto] = useState(formatearPorcentaje(puesto.puntosBasicos));

    const alCambiar = (valor: string) => {
        setTexto(valor);
        const puntos = parsearPorcentaje(valor);
        if (puntos !== null) onCambiar({ puntosBasicos: puntos });
    };

    return (
        <div className="flex items-center gap-2">
            <input
                type="text"
                value={puesto.rotulo}
                maxLength={120}
                placeholder="Puesto"
                onChange={(e) => onCambiar({ rotulo: e.target.value })}
                className="flex-1 min-w-0 h-10 px-3 rounded-xl bg-muted border border-hairline text-[12px] font-bold text-foreground placeholder:text-subtle placeholder:font-medium focus:outline-none focus:border-celeste/40"
            />

            <div className="relative shrink-0">
                <input
                    type="text"
                    inputMode="decimal"
                    value={texto}
                    onChange={(e) => alCambiar(e.target.value)}
                    aria-label={`Porcentaje de ${puesto.rotulo || "el puesto"}`}
                    className="w-16 h-10 pl-2 pr-5 rounded-xl bg-muted border border-hairline text-[12px] text-scoreboard tabular-nums text-right text-foreground focus:outline-none focus:border-celeste/40"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-subtle pointer-events-none">%</span>
            </div>

            <span className="w-24 shrink-0 text-right text-scoreboard text-[12px] tabular-nums text-emerald-400">
                {formatearMonto(montoCentavos)}
            </span>

            <button
                type="button"
                onClick={onQuitar}
                disabled={!puedeQuitar}
                aria-label={`Quitar ${puesto.rotulo || "el puesto"}`}
                className="w-8 h-8 shrink-0 rounded-lg bg-muted border border-hairline flex items-center justify-center text-muted-foreground hover:text-rojo hover:border-rojo/40 transition-all active:scale-90 disabled:opacity-30 cursor-pointer"
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}
