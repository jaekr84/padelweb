"use client";

import { useState } from "react";
import { Share2, Loader2 } from "lucide-react";
import { publishTournamentResults } from "@/app/actions/tournaments";
import { toast } from "sonner";

interface Props {
    tournamentId: string;
    tournamentName: string;
    variant?: "admin" | "management" | "card";
}

export default function TournamentPublishButton({ tournamentId, tournamentName, variant = "admin" }: Props) {
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

    if (variant === "management") {
        return (
            <button
                onClick={handlePublish}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-celeste/10 border border-celeste/20 text-celeste text-[10px] font-black uppercase tracking-widest hover:bg-celeste hover:text-white transition-all disabled:opacity-50"
                title="Publicar resultados en el feed"
            >
                {loading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                    <Share2 className="w-3 h-3" />
                )}
                {loading ? "Publicando..." : "Publicar Feed"}
            </button>
        );
    }

    if (variant === "card") {
        return (
            <button
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handlePublish();
                }}
                disabled={loading}
                className="p-2 rounded-lg bg-black/60 backdrop-blur-md text-white hover:bg-black/80 transition-colors shadow-lg border border-white/10 group/btn disabled:opacity-50"
                title="Publicar resultados en el feed"
            >
                {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <Share2 className="w-4 h-4 group-hover/btn:text-celeste transition-colors" />
                )}
            </button>
        );
    }

    return (
        <button
            onClick={handlePublish}
            disabled={loading}
            className="h-7 flex items-center justify-center gap-1 px-2.5 bg-celeste/10 hover:bg-celeste text-celeste hover:text-white border border-celeste/20 rounded-lg transition-all active:scale-95 group/btn disabled:opacity-50 shadow-sm"
            title="Publicar resultados en el feed"
        >
            {loading ? (
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
            ) : (
                <Share2 className="w-2.5 h-2.5" />
            )}
            <span className="text-[7px] font-black uppercase tracking-widest leading-none">
                {loading ? "Publicando..." : "Publicar Feed"}
            </span>
        </button>
    );
}
