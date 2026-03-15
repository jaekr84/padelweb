"use client";

import { Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { deleteTournament } from "../../tournaments/fixture/actions";
import { toast } from "sonner";

interface Props {
    tournamentId: string;
    tournamentName: string;
}

export default function DeleteTournamentButton({ tournamentId, tournamentName }: Props) {
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
            className={`flex items-center gap-1.5 font-black uppercase tracking-widest text-[9px] py-3 px-5 rounded-xl transition-all active:scale-95 border ${
                confirming 
                ? "bg-red-600 text-white border-red-700 hover:bg-red-500 animate-pulse" 
                : "bg-red-600/10 hover:bg-red-600/20 border-red-500/30 text-red-500"
            } disabled:opacity-50`}
        >
            {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : confirming ? (
                "¿Seguro?"
            ) : (
                <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar
                </>
            )}
        </button>
    );
} 
