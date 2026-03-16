"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { finalizeTournament } from "../../tournaments/fixture/actions";
import { toast } from "sonner";

interface Props {
    tournamentId: string;
    tournamentName: string;
}

export default function FinalizeTournamentButton({ tournamentId, tournamentName }: Props) {
    const [loading, setLoading] = useState(false);
    const [confirming, setConfirming] = useState(false);

    const handleFinalize = async () => {
        if (!confirming) {
            setConfirming(true);
            // Reset after 3 seconds if not clicked again
            setTimeout(() => setConfirming(false), 3000);
            return;
        }

        setLoading(true);
        try {
            const res = await finalizeTournament(tournamentId);
            if (res.ok) {
                toast.success("Torneo finalizado correctamente. Ya no se puede editar.");
            } else {
                toast.error(res.error || "Error al finalizar el torneo");
                setConfirming(false);
            }
        } catch (err) {
            console.error(err);
            toast.error("Error inesperado");
            setConfirming(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleFinalize}
            disabled={loading}
            className={`flex items-center gap-1.5 font-black uppercase tracking-widest text-[9px] py-3 px-5 rounded-xl transition-all active:scale-95 border ${
                confirming 
                ? "bg-slate-700 text-white border-slate-800 hover:bg-slate-600 animate-pulse" 
                : "bg-slate-600/10 hover:bg-slate-600/20 border-slate-500/30 text-slate-400"
            } disabled:opacity-50`}
        >
            {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : confirming ? (
                "¿Finalizar?"
            ) : (
                <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Finalizar
                </>
            )}
        </button>
    );
}
