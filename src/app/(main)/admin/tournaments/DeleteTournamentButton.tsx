"use client";

import { Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { deleteTournament } from "../../tournaments/fixture/actions";
import { toast } from "sonner";

interface Props {
    tournamentId: string;
    tournamentName: string;
    compact?: boolean;
}

export default function DeleteTournamentButton({ tournamentId, tournamentName, compact }: Props) {
    const [loading, setLoading] = useState(false);
    const [confirming, setConfirming] = useState(false);

    const handleDelete = async () => {
        if (!confirming) {
            setConfirming(true);
            // Reset after 3 seconds if not clicked again
            setTimeout(() => setConfirming(false), 3000);
            return;
        }

        setLoading(true);
        try {
            const res = await deleteTournament(tournamentId);
            if (res.ok) {
                toast.success("Torneo eliminado correctamente");
            } else {
                toast.error(res.error || "Error al eliminar el torneo");
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
            onClick={handleDelete}
            disabled={loading}
            title={confirming ? "Hacé clic de nuevo para confirmar eliminación" : "Eliminar Torneo"}
            className={`flex items-center justify-center gap-1.5 font-black uppercase tracking-widest text-[9px] transition-all active:scale-95 border ${
                compact ? "p-2 rounded-lg" : "py-3 px-5 rounded-xl"
            } ${
                confirming 
                ? "bg-red-600 text-white border-red-700 hover:bg-red-500 animate-pulse" 
                : "bg-rose-50 hover:bg-rose-100 dark:bg-rose-600/10 dark:hover:bg-rose-600/20 border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400"
            } disabled:opacity-50`}
        >
            {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : confirming ? (
                compact ? <Trash2 className="w-4 h-4 text-white" /> : "¿Seguro?"
            ) : (
                <>
                    <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    {!compact && "Eliminar"}
                </>
            )}
        </button>
    );
}
 
