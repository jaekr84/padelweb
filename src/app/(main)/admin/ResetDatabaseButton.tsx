"use client";

import { useState } from "react";
import { RefreshCcw, AlertTriangle, Trash2, ShieldAlert } from "lucide-react";
import { resetDatabaseAction } from "./actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function ResetDatabaseButton() {
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
                router.push("/home"); // Redirigir para refrescar estado global
            } else {
                toast.error("Error: " + res.error);
            }
        } catch (err) {
            toast.error("Error crítico al resetear la base de datos");
        } finally {
            setLoading(false);
        }
    };

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
                                className="flex-1 bg-slate-200 dark:bg-slate-800 text-foreground px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest"
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
