"use client";

// Piezas que comparten la lista y el detalle del desafío: el modal genérico, la
// carga de resultado y el hook que corre una server action mostrando el toast.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import type { SetPartido } from "@/lib/desafio";

/**
 * Convención del módulo: las actions devuelven `{ ok }` en vez de tirar. Este
 * hook las corre, avisa por toast y refresca el server component.
 */
export function useAccion() {
    const router = useRouter();
    const [pendiente, iniciar] = useTransition();

    const correr = (fn: () => Promise<{ ok: boolean; error?: string }>, exito: string, despues?: () => void) => {
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

    return { pendiente, correr };
}

export function Modal({ titulo, children, onCerrar }: { titulo: string; children: React.ReactNode; onCerrar: () => void }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
            <div className="absolute inset-0 bg-background/70 backdrop-blur-xl" onClick={onCerrar} />
            <div className="relative w-full sm:max-w-md max-h-[85vh] bg-background border border-hairline rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col shadow-2xl shadow-black/50">
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-hairline shrink-0">
                    <h3 className="heading-sport text-base text-foreground truncate">{titulo}</h3>
                    <button
                        type="button"
                        onClick={onCerrar}
                        className="w-9 h-9 rounded-full bg-muted border border-hairline flex items-center justify-center hover:bg-muted active:scale-90 transition-all cursor-pointer shrink-0"
                    >
                        <X className="w-4 h-4 text-foreground" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">{children}</div>
            </div>
        </div>
    );
}

export function ModalResultado({
    compañero, rivales, pendiente, onCerrar, onGuardar,
}: {
    compañero: string;
    rivales: string[];
    pendiente: boolean;
    onCerrar: () => void;
    onGuardar: (sets: SetPartido[]) => void;
}) {
    const [sets, setSets] = useState<{ t1: string; t2: string }[]>([{ t1: "", t2: "" }, { t1: "", t2: "" }]);

    const set = (i: number, lado: "t1" | "t2", v: string) =>
        setSets((s) => s.map((x, j) => (j === i ? { ...x, [lado]: v.replace(/\D/g, "").slice(0, 2) } : x)));

    const limpios = sets
        .filter((s) => s.t1 !== "" && s.t2 !== "")
        .map((s) => ({ t1: Number(s.t1), t2: Number(s.t2) }));

    return (
        <Modal titulo="Cargar resultado" onCerrar={onCerrar}>
            <div className="space-y-3">
                <div className="text-[12px]">
                    <div className="text-foreground font-bold">Vos y {compañero}</div>
                    <div className="text-subtle text-[10px] my-0.5">vs</div>
                    <div className="text-foreground font-bold">{rivales.join(" / ")}</div>
                </div>

                {sets.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <span className="label-tech text-[7px] text-subtle w-10">Set {i + 1}</span>
                        <input
                            inputMode="numeric"
                            value={s.t1}
                            onChange={(e) => set(i, "t1", e.target.value)}
                            className="w-14 bg-muted border border-hairline rounded-lg h-10 text-center text-[14px] text-scoreboard text-foreground focus:outline-none focus:border-celeste/40"
                        />
                        <span className="text-subtle">—</span>
                        <input
                            inputMode="numeric"
                            value={s.t2}
                            onChange={(e) => set(i, "t2", e.target.value)}
                            className="w-14 bg-muted border border-hairline rounded-lg h-10 text-center text-[14px] text-scoreboard text-foreground focus:outline-none focus:border-celeste/40"
                        />
                        {i === sets.length - 1 && sets.length < 5 && (
                            <button
                                type="button"
                                onClick={() => setSets((x) => [...x, { t1: "", t2: "" }])}
                                className="ml-auto flex items-center gap-1 label-tech text-[8px] text-celeste hover:text-celeste-light cursor-pointer"
                            >
                                <Plus className="w-3 h-3" />
                                Set
                            </button>
                        )}
                    </div>
                ))}

                <p className="text-[10px] text-subtle">
                    Los games van del lado de cada equipo. El admin confirma el resultado antes de que sumen los puntos.
                </p>

                <button
                    type="button"
                    onClick={() => onGuardar(limpios)}
                    disabled={limpios.length === 0 || pendiente}
                    className="w-full py-3 clip-notch bg-volt text-carbon-950 text-[10px] font-black uppercase tracking-widest hover:bg-volt-dark transition-all active:scale-95 disabled:opacity-30 cursor-pointer"
                >
                    Enviar resultado
                </button>
            </div>
        </Modal>
    );
}

export function Dato({ icono: Icono, rotulo, valor }: { icono: any; rotulo: string; valor: string }) {
    return (
        <div className="px-3 py-2 rounded-xl bg-muted border border-hairline min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
                <Icono className="w-3 h-3 text-subtle shrink-0" />
                <span className="label-tech text-[7px] text-subtle">{rotulo}</span>
            </div>
            <div className="text-[11px] font-bold text-foreground truncate">{valor}</div>
        </div>
    );
}
