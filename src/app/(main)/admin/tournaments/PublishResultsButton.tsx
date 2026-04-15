"use client";

import { useState } from "react";
import { Share2, Loader2 } from "lucide-react";
import { publishTournamentResults } from "./actions";
import { toast } from "sonner";

interface Props {
    tournamentId: string;
    tournamentName: string;
}

export default function PublishResultsButton({ tournamentId, tournamentName }: Props) {
    const [loading, setLoading] = useState(false);

    const handlePublish = async () => {
        if (!confirm(`¿Estás seguro de que querés publicar los resultados de "${tournamentName}" en el feed?`)) {
            return;
        }

        setLoading(true);
        try {
            const res = await publishTournamentResults(tournamentId);
            if (res.ok) {
                toast.success("¡Resultados publicados en el feed con éxito!");
            } else {
                toast.error("Error: " + (res.error || "No se pudo publicar"));
            }
        } catch (err) {
            console.error(err);
            toast.error("Error inesperado al publicar");
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handlePublish}
            disabled={loading}
            className="w-full h-8 flex items-center justify-center gap-1.5 px-3 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-emerald-600/20 rounded-lg transition-all active:scale-95 group/btn disabled:opacity-50"
            title="Publicar resultados en el feed"
        >
            {loading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
                <Share2 className="w-3 h-3" />
            )}
            <span className="text-[8px] font-black uppercase tracking-widest leading-none">
                {loading ? "Publicando..." : "Publicar Feed"}
            </span>
        </button>
    );
}
