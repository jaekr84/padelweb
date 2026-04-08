"use client";

import { useState } from "react";
import { cancelRegistration } from "../register/actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserMinus, Loader2 } from "lucide-react";

interface Props {
    tournamentId: string;
    tournamentName: string;
}

export default function UnregisterButton({ tournamentId, tournamentName }: Props) {
    const [loading, setLoading] = useState(false);
    const [confirm, setConfirm] = useState(false);
    const router = useRouter();

    const handleCancel = async () => {
        try {
            setLoading(true);
            await cancelRegistration(tournamentId);
            toast.success("Te has desincrito con éxito del torneo.");
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || "Error al desincribirse.");
        } finally {
            setLoading(false);
            setConfirm(false);
        }
    };

    if (confirm) {
        return (
            <div className="mt-8 p-6 bg-red-500/5 border border-red-500/20 rounded-[2rem] text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
                <p className="text-sm font-bold text-foreground mb-4">¿Estás seguro que deseas desincribirte de {tournamentName}?</p>
                <div className="flex items-center justify-center gap-3">
                    <button
                        onClick={() => setConfirm(false)}
                        disabled={loading}
                        className="px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-card border border-border transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleCancel}
                        disabled={loading}
                        className="px-6 py-2 bg-red-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all flex items-center gap-2"
                    >
                        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserMinus className="w-3 h-3" />}
                        Confirmar Desinscripción
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-8 text-center">
            <button
                onClick={() => setConfirm(true)}
                className="inline-flex items-center gap-2 px-8 py-3 bg-red-600/10 border border-red-600/20 text-red-600 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-xl shadow-red-600/10"
            >
                <UserMinus className="w-4 h-4" />
                Desincribirse del Torneo
            </button>
        </div>
    );
}
