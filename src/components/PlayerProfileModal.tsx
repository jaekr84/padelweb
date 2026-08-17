"use client";

// Modal de detalle de un jugador: su carta, sus KPIs y sus últimos partidos.
//
// El mismo modal estaba escrito a mano en varias pantallas (partidos, tarjeta
// pública de torneo, grilla del americano). Acá vive una sola vez y se pide por
// `userId`: el componente hace la carga solo, así quien lo usa no tiene que
// arrastrar estado de fetching.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Calendar, Info, MessageSquare, Users, X, Zap } from "lucide-react";
import PlayerCard from "@/components/PlayerCard";
import { getPlayerProfileData } from "@/app/actions/players";
import { startConversation } from "@/app/(main)/mensajes/actions";

export default function PlayerProfileModal({
    userId,
    currentUserId,
    onClose,
}: {
    userId: string;
    currentUserId?: string | null;
    onClose: () => void;
}) {
    const router = useRouter();
    const [perfil, setPerfil] = useState<any>(null);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        let vigente = true;
        setCargando(true);
        getPlayerProfileData(userId)
            .then((d) => {
                // Si el usuario cambió de jugador mientras cargaba, esta respuesta
                // ya no es la que corresponde mostrar.
                if (vigente) setPerfil(d);
            })
            .catch((e) => console.error("[PlayerProfileModal]", e))
            .finally(() => {
                if (vigente) setCargando(false);
            });
        return () => {
            vigente = false;
        };
    }, [userId]);

    // Escape cierra: el modal se abre desde listas donde el mouse ya está lejos.
    useEffect(() => {
        const alTeclear = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", alTeclear);
        return () => window.removeEventListener("keydown", alTeclear);
    }, [onClose]);

    const esVos = perfil?.player?.userId === currentUserId;

    // Va montado en el body: si se renderiza dentro de quien lo abre, cualquier
    // ancestro con overflow, transform o z-index propio lo recorta o lo pinta
    // debajo del contenido (le pasaba abierto desde el rail del ranking).
    if (typeof document === "undefined") return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-background/40 backdrop-blur-md"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative z-10 w-full max-w-3xl"
            >
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 w-7 h-7 bg-surface hover:bg-surface-raised rounded-lg flex items-center justify-center text-foreground/60 hover:text-foreground border border-hairline backdrop-blur-md transition-all z-50"
                >
                    <X className="w-4 h-4" />
                </button>

                {cargando ? (
                    <div className="bg-background/80 backdrop-blur-xl rounded-2xl p-14 flex flex-col items-center justify-center border border-hairline">
                        <div className="w-9 h-9 border-4 border-azul-primary/20 border-t-azul-primary rounded-full animate-spin mb-3" />
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-foreground/40">Cargando Perfil...</p>
                    </div>
                ) : perfil ? (
                    <div className={`bg-background/95 backdrop-blur-3xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] md:max-h-[540px] transition-all duration-500 ${esVos ? "border-red-500/80 shadow-red-500/10" : "border-hairline"}`}>
                        <div className="flex items-center justify-between px-6 py-3.5 border-b border-hairline bg-surface">
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-azul-primary animate-pulse" />
                                <span className="text-[9px] font-black uppercase tracking-[0.25em] text-foreground/90">Resumen del Jugador</span>
                            </div>
                            <div className="hidden sm:flex items-center gap-3 pr-8">
                                <div className="flex flex-col items-end">
                                    <span className="text-[6.5px] font-black uppercase text-foreground/20 tracking-widest leading-none mb-[2px]">Nivel Proyectado</span>
                                    <span className="text-[9px] font-black text-celeste italic leading-none">CATEGORÍA {perfil.player.category}</span>
                                </div>
                                <div className="w-7 h-7 rounded-lg bg-azul-primary/10 border border-azul-primary/20 flex items-center justify-center">
                                    <Zap className="w-3.5 h-3.5 text-azul-primary" />
                                </div>
                            </div>
                        </div>

                        <div className="p-5 overflow-y-auto md:overflow-hidden flex-1 min-h-0 flex flex-col">
                            <div className="flex flex-col md:flex-row gap-6 items-center md:items-stretch flex-1 min-h-0">
                                <div className="shrink-0 flex items-center justify-center scale-[0.82] origin-center -my-11 -mx-7 md:-my-10 md:-mx-6">
                                    <PlayerCard player={perfil.player} stats={perfil.stats} isCurrentUser={esVos} />
                                </div>

                                <div className="flex-1 space-y-3 py-1 w-full flex flex-col justify-between min-h-0">
                                    <div className="space-y-3 min-h-0 flex flex-col">
                                        <div className="grid grid-cols-2 gap-2.5 shrink-0">
                                            <div className="bg-surface border border-hairline p-3.5 rounded-2xl space-y-0.5">
                                                <p className="text-[7.5px] font-black text-foreground/30 uppercase tracking-widest">PJ Totales</p>
                                                <p className="text-xl font-black text-foreground italic leading-none">{perfil.stats.pj}</p>
                                            </div>
                                            <div className="bg-surface border border-hairline p-3.5 rounded-2xl space-y-0.5">
                                                <p className="text-[7.5px] font-black text-foreground/30 uppercase tracking-widest">Win Rate</p>
                                                <p className="text-xl font-black text-blue-400 italic leading-none">{perfil.stats.wr}%</p>
                                            </div>
                                        </div>

                                        <div className="bg-surface border border-hairline p-3.5 rounded-2xl space-y-2.5 w-full shrink-0">
                                            <h4 className="text-[7.5px] font-black text-foreground/30 uppercase tracking-[0.25em] leading-none">Últimos Resultados</h4>
                                            <div className="flex gap-2">
                                                {perfil.history.slice(0, 5).map((h: any, i: number) => (
                                                    <div
                                                        key={i}
                                                        className={`flex-1 h-7 rounded-lg flex items-center justify-center text-[9px] font-black transition-all ${h.isWin === true ? "bg-green-500/20 border border-green-500/30 text-green-400" : h.isWin === false ? "bg-red-500/20 border border-red-500/30 text-red-400" : "bg-surface border border-hairline text-foreground/30"}`}
                                                        title={h.tournament}
                                                    >
                                                        {h.isWin === true ? "G" : h.isWin === false ? "P" : "-"}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-1.5 min-h-0 flex flex-col flex-1">
                                            <h4 className="text-[7.5px] font-black text-foreground/45 uppercase tracking-[0.2em] px-1 shrink-0">Últimos 10 Partidos</h4>
                                            <div className="space-y-1.5 overflow-y-auto max-h-[250px] pr-1 no-scrollbar flex-1">
                                                {perfil.history.slice(0, 10).map((m: any) => (
                                                    <div key={m.id} className="group relative bg-surface hover:bg-surface border border-hairline p-2 rounded-xl flex items-center justify-between transition-all">
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${m.type === "Torneo" ? "bg-azul-primary/10 text-azul-primary" : m.type === "Cancha Abierta" ? "bg-celeste/10 text-celeste" : "bg-slate-500/10 text-subtle"}`}>
                                                                {m.type === "Torneo" ? <Zap className="w-3 h-3" /> : m.type === "Cancha Abierta" ? <Users className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <div className="flex items-center gap-1 leading-none">
                                                                    <span className={`text-[5.5px] font-black px-1 py-[0.1px] rounded uppercase tracking-widest ${m.isWin === true ? "bg-green-500/20 text-green-400" : m.isWin === false ? "bg-red-500/20 text-red-400" : "bg-surface-raised text-foreground/30"}`}>
                                                                        {m.isWin === true ? "G" : m.isWin === false ? "P" : "-"}
                                                                    </span>
                                                                    <span className="text-[6px] font-black text-foreground/20 uppercase tracking-widest truncate">{m.type} • {m.subType}</span>
                                                                </div>
                                                                <h4 className="text-[10px] font-black text-foreground truncate italic uppercase tracking-tight leading-none my-1">{m.tournament}</h4>
                                                                <p className="text-[6.5px] font-bold text-foreground/40 uppercase tracking-tight leading-none">vs {m.opponent}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right shrink-0 pr-1 leading-none">
                                                            <div className="text-xs font-black italic text-foreground leading-none mb-0.5 tracking-tighter">{m.score}</div>
                                                            {m.isWin === true ? (
                                                                <span className="text-[6.5px] font-black uppercase text-green-400 tracking-widest italic">Win</span>
                                                            ) : m.isWin === false ? (
                                                                <span className="text-[6.5px] font-black uppercase text-red-400 tracking-widest italic">Loss</span>
                                                            ) : (
                                                                <span className="text-[6.5px] font-black uppercase text-foreground/20 tracking-widest italic">Fin</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}

                                                {perfil.history.length === 0 && (
                                                    <div className="flex flex-col items-center justify-center py-6 opacity-30">
                                                        <Info className="w-5 h-5 mb-1.5 text-foreground/40" />
                                                        <p className="text-[6.5px] font-black uppercase tracking-widest text-foreground/40">Sin partidos registrados</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* A vos mismo no tiene sentido ofrecerte mandarte un mensaje. */}
                                    {!esVos && (
                                        <button
                                            onClick={async () => {
                                                try {
                                                    const { conversationId } = await startConversation(userId);
                                                    router.push(`/mensajes?conv=${conversationId}`);
                                                } catch {
                                                    alert("Error al iniciar conversación");
                                                }
                                            }}
                                            className="w-full h-9 bg-azul-primary/10 border border-azul-primary/30 text-azul-primary hover:bg-azul-primary hover:text-white rounded-xl text-[8.5px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shrink-0"
                                        >
                                            <MessageSquare className="w-3 h-3" />
                                            Enviar Mensaje
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-background border border-hairline rounded-2xl p-10 text-center">
                        <p className="text-muted-foreground font-black uppercase tracking-wider text-xs">No se encontró el perfil del jugador.</p>
                    </div>
                )}
            </motion.div>
        </div>,
        document.body
    );
}
