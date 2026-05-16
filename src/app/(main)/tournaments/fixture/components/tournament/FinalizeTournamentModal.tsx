"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/Dialog";
import { Trophy, Check, Loader2, ArrowRight, AlertTriangle } from "lucide-react";

interface FinalizeTournamentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<boolean>;
    tournamentName: string;
    onRedirect: () => void;
}

type ModalState = "confirm" | "loading" | "success" | "error";

export default function FinalizeTournamentModal({
    isOpen,
    onClose,
    onConfirm,
    tournamentName,
    onRedirect
}: FinalizeTournamentModalProps) {
    const [state, setState] = useState<ModalState>("confirm");
    const [errorMessage, setErrorMessage] = useState("");

    const handleConfirm = async () => {
        setState("loading");
        try {
            const success = await onConfirm();
            if (success) {
                setState("success");
            } else {
                setState("error");
                setErrorMessage("Ocurrió un error inesperado al procesar la finalización.");
            }
        } catch (err) {
            setState("error");
            setErrorMessage(err instanceof Error ? err.message : String(err));
        }
    };

    const handleClose = () => {
        if (state === "loading") return; // Prevent closing during operation
        onClose();
        // Reset states
        setTimeout(() => {
            setState("confirm");
            setErrorMessage("");
        }, 300);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-md bg-card border border-border/50 rounded-[2.5rem] p-0 overflow-hidden">
                <div className="relative p-8 text-center space-y-6">
                    {/* Visual Ambient Glows */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-azul-primary to-transparent" />
                    <div className="absolute -top-[30%] -right-[30%] w-60 h-60 rounded-full bg-azul-primary/10 blur-[50px] pointer-events-none" />
                    <div className="absolute -bottom-[30%] -left-[30%] w-60 h-60 rounded-full bg-rojo/5 blur-[50px] pointer-events-none" />

                    {state === "confirm" && (
                        <div className="flex flex-col items-center space-y-6 py-4">
                            <div className="w-16 h-16 rounded-2xl bg-azul-primary/10 border border-azul-primary/20 flex items-center justify-center relative shadow-lg shadow-azul-primary/5">
                                <Trophy className="w-8 h-8 text-azul-primary animate-bounce" />
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 border-2 border-background flex items-center justify-center">
                                    <Check className="w-3 h-3 text-white stroke-[3px]" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <DialogTitle className="text-2xl font-black uppercase italic tracking-tight text-foreground leading-tight">
                                    Finalizar Torneo
                                </DialogTitle>
                                <span className="text-[10px] font-black uppercase tracking-widest text-azul-primary">
                                    {tournamentName}
                                </span>
                            </div>

                            <p className="text-sm text-muted-foreground leading-relaxed px-2">
                                ¿Estás seguro de que deseas finalizar este torneo? Esta acción calculará las posiciones finales de los jugadores, <strong className="text-foreground">repartirá los puntos de ranking correspondientes</strong> y cerrará el torneo de forma definitiva.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-3 w-full pt-2">
                                <button
                                    onClick={handleClose}
                                    type="button"
                                    className="w-full order-2 sm:order-1 rounded-2xl border border-border bg-transparent hover:bg-muted py-3.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground transition-all duration-200"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    type="button"
                                    className="w-full order-1 sm:order-2 rounded-2xl bg-rojo hover:bg-rojo/90 py-3.5 text-[10px] font-black uppercase tracking-widest text-white transition-all duration-200 shadow-xl shadow-rojo/20 active:scale-[0.98]"
                                >
                                    ¡Sí, finalizar!
                                </button>
                            </div>
                        </div>
                    )}

                    {state === "loading" && (
                        <div className="flex flex-col items-center space-y-6 py-10">
                            <div className="relative flex items-center justify-center">
                                <div className="w-16 h-16 rounded-2xl bg-azul-primary/5 border border-azul-primary/10 flex items-center justify-center">
                                    <Trophy className="w-8 h-8 text-azul-primary/30" />
                                </div>
                                <Loader2 className="absolute w-20 h-20 text-azul-primary animate-spin stroke-[1.5px]" />
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-xl font-black uppercase italic tracking-tight text-foreground">
                                    Procesando Cierre
                                </h3>
                                <p className="text-xs text-muted-foreground tracking-wide">
                                    Calculando puntos de ranking y cerrando fixture...
                                </p>
                            </div>
                        </div>
                    )}

                    {state === "success" && (
                        <div className="flex flex-col items-center space-y-6 py-6">
                            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center relative shadow-lg shadow-emerald-500/10">
                                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center animate-pulse">
                                    <Check className="w-6 h-6 text-white stroke-[3px]" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-2xl font-black uppercase italic tracking-tight text-emerald-500">
                                    ¡Torneo Finalizado!
                                </h3>
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    Todos los datos se actualizaron correctamente
                                </span>
                            </div>

                            <p className="text-sm text-muted-foreground px-4">
                                El torneo ha sido cerrado formalmente. Los puntos de ranking se han adjudicado a los jugadores y los resultados ya están visibles en la cartelera.
                            </p>

                            <button
                                onClick={onRedirect}
                                type="button"
                                className="w-full rounded-2xl bg-azul-primary hover:bg-azul-dark py-4 text-[10px] font-black uppercase tracking-widest text-white transition-all duration-200 shadow-xl shadow-azul-primary/25 flex items-center justify-center gap-2 group active:scale-[0.98]"
                            >
                                <span>Volver a Torneos</span>
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    )}

                    {state === "error" && (
                        <div className="flex flex-col items-center space-y-6 py-4">
                            <div className="w-16 h-16 rounded-2xl bg-rojo/10 border border-rojo/20 flex items-center justify-center shadow-lg shadow-rojo/5">
                                <AlertTriangle className="w-8 h-8 text-rojo animate-pulse" />
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-xl font-black uppercase italic tracking-tight text-rojo">
                                    Error de Finalización
                                </h3>
                                <p className="text-xs text-muted-foreground px-6 leading-relaxed">
                                    {errorMessage || "No se pudo finalizar el torneo correctamente."}
                                </p>
                            </div>

                            <div className="flex gap-3 w-full pt-2">
                                <button
                                    onClick={() => setState("confirm")}
                                    type="button"
                                    className="w-full rounded-2xl border border-border bg-transparent hover:bg-muted py-3.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground transition-all duration-200"
                                >
                                    Reintentar
                                </button>
                                <button
                                    onClick={handleClose}
                                    type="button"
                                    className="w-full rounded-2xl bg-muted py-3.5 text-[10px] font-black uppercase tracking-widest text-foreground transition-all duration-200"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
