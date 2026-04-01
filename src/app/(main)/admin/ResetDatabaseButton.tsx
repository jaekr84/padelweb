"use client";

import { useState } from "react";
import { RefreshCcw, AlertTriangle, Trash2, ShieldAlert } from "lucide-react";
import { resetDatabaseAction } from "./actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function ResetDatabaseButton({ compact }: { compact?: boolean }) {
    const [loading, setLoading] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const router = useRouter();

    const handleReset = async () => {
        setLoading(true);
        try {
            const res = await resetDatabaseAction();
            if (res.success) {
                toast.success("Base de datos blanqueada correctamente");
                setShowConfirm(false);
                router.push("/home");
            } else {
                toast.error("Error: " + res.error);
            }
        } catch (err) {
            toast.error("Error crítico al resetear la base de datos");
        } finally {
            setLoading(false);
        }
    };

    if (compact) {
        return (
            <>
                <button
                    onClick={() => setShowConfirm(true)}
                    className="w-full aspect-square flex flex-col items-center justify-center bg-rose-500/10 border border-rose-500/20 rounded-xl transition-all hover:bg-rose-500/20 hover:border-rose-500/40 active:scale-95 group relative overflow-hidden"
                    title="Blanquear base de datos (ZONA DE PELIGRO)"
                >
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform mb-3">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-[0.15em] text-rose-500 text-center px-1">
                        Borrar DB
                    </span>
                    <div className="absolute top-2 right-2">
                        <ShieldAlert className="w-3 h-3 text-rose-500 opacity-40" />
                    </div>
                </button>

                {showConfirm && (
                    <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[100] flex items-center justify-center p-6">
                        <div className="bg-card border border-border p-10 rounded-[2.5rem] shadow-2xl max-w-md w-full space-y-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full blur-[80px] -mr-32 -mt-32" />
                            
                            <div className="text-center space-y-4 relative z-10">
                                <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-rose-500/20">
                                    <AlertTriangle className="w-10 h-10" />
                                </div>
                                <h3 className="text-3xl font-black uppercase italic tracking-tight text-foreground leading-[0.9]">
                                    ¿Estas seguro de <span className="text-rose-500">borrar todo</span>?
                                </h3>
                                <p className="text-xs font-semibold text-muted-foreground leading-relaxed uppercase tracking-widest opacity-60">
                                    Esta acción eliminará todos los registros del sistema. No se puede deshacer.
                                </p>
                            </div>

                            <div className="flex flex-col gap-3 relative z-10">
                                <button
                                    onClick={handleReset}
                                    disabled={loading}
                                    className="w-full bg-rose-600 hover:bg-rose-500 text-white py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-xl shadow-rose-600/30 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                                >
                                    {loading ? <RefreshCcw className="w-4 h-4 animate-spin" /> : "ELIMINAR DEFINITIVAMENTE"}
                                </button>
                                <button
                                    onClick={() => setShowConfirm(false)}
                                    disabled={loading}
                                    className="w-full bg-muted border border-border text-muted-foreground py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-border active:scale-95 disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    return (
        <section className="mt-16 bg-rose-500/[0.03] border border-rose-500/10 rounded-[3rem] p-8 md:p-14 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/10 rounded-full blur-[100px] -mr-48 -mt-48" />
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-12 text-center md:text-left relative z-10">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[9px] font-black uppercase tracking-widest">
                        <ShieldAlert className="w-3 h-3" />
                        Zona de Peligro
                    </div>
                    <h3 className="text-3xl md:text-4xl font-black uppercase italic text-foreground tracking-tight leading-tight">
                        Reset de <br className="hidden md:block" /> Base de Datos
                    </h3>
                    <p className="text-muted-foreground font-medium max-w-sm leading-relaxed text-xs md:text-sm">
                        Esta acción eliminará <span className="text-rose-500 font-bold underline">TODOS</span> los torneos, clubes, partidos y usuarios (excepto Superadmins). Úsalo solo para iniciar pruebas reales.
                    </p>
                </div>

                {!showConfirm ? (
                    <button
                        onClick={() => setShowConfirm(true)}
                        className="bg-rose-600 hover:bg-rose-500 text-white px-10 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-2xl shadow-rose-600/40 flex items-center gap-4 active:scale-95 shrink-0"
                    >
                        <Trash2 className="w-4 h-4" />
                        Blanquear Base de Datos
                    </button>
                ) : (
                    <div className="flex flex-col gap-4 w-full md:w-auto">
                        <p className="text-[10px] font-black uppercase text-rose-500 animate-pulse text-center italic">
                            ¿ESTÁS COMPLETAMENTE SEGURO? ESTO NO SE PUEDE DESHACER.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="flex-1 bg-slate-200  text-foreground px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleReset}
                                disabled={loading}
                                className="flex-1 bg-rose-600 text-white px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-rose-600/50"
                            >
                                {loading ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                                SÍ, BORRAR TODO
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
