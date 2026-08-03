"use client";

import { Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { deleteTournament } from "../../tournaments/fixture/actions";
import { toast } from "sonner";

interface Props {
    tournamentId: string;
    tournamentName: string;
    compact?: boolean;
    showLabel?: boolean;
}

export default function DeleteTournamentButton({ tournamentId, tournamentName, compact, showLabel }: Props) {
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
            className={`flex items-center justify-center gap-1.5 font-black uppercase tracking-widest text-[8px] transition-all active:scale-95 border w-full h-8 ${
                confirming 
                ? "bg-rojo text-white border-rojo-dark hover:bg-rojo-dark animate-pulse shadow-lg shadow-rojo/20" 
                : "bg-rojo/5 hover:bg-rojo/10 border-rojo/10 text-rojo"
            } disabled:opacity-50 rounded-lg`}
        >
            {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : confirming ? (
                <span>{showLabel || !compact ? "¿Seguro?" : <Trash2 className="w-4 h-4 text-foreground" />}</span>
            ) : (
                <>
                    <Trash2 className="w-3 h-3" />
                    {(showLabel || !compact) && <span className="leading-none">Eliminar</span>}
                </>
            )}
        </button>
    );
}
 
