"use client";

import { useState } from "react";
import { switchRole } from "@/app/dev/actions";
import { Loader2, Settings2, User, Users, GraduationCap, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const ROLES = [
    { id: "jugador", label: "Jug.", icon: User },
    { id: "profe", label: "Profe", icon: GraduationCap },
    { id: "centro_de_padel", label: "Centro", icon: Building2 },
    { id: "club", label: "Club", icon: Users },
] as const;

export function RoleSwitcher({ currentRole }: { currentRole: string }) {
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();

    const handleSwitch = async (roleId: any) => {
        if (roleId === currentRole) return;
        setLoadingId(roleId);
        try {
            await switchRole(roleId);
            toast.success(`Rol cambiado a ${roleId}`);
            router.refresh();
            // Optional: force a full reload if the UI doesn't catch all states
            // window.location.reload(); 
        } catch (err: any) {
            toast.error(err.message || "Error al cambiar de rol");
        } finally {
            setLoadingId(null);
            setIsOpen(false);
        }
    };

    return (
        <div className="fixed bottom-28 right-4 z-[9999]">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute bottom-14 right-0 bg-[#0f111a] border border-white/10 p-2 rounded-2xl shadow-2xl flex flex-col gap-1 w-40 backdrop-blur-xl"
                    >
                        <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/40 mb-1 border-b border-white/5">
                            DEV: Cambiar Rol
                        </div>
                        {ROLES.map((r) => {
                            const Icon = r.icon;
                            let isActive = currentRole === r.id;
                            // Special case for 'profesor' from onboarding trying to match 'profe' in DB
                            if (currentRole === 'profesor' && r.id === 'profe') isActive = true;

                            return (
                                <button
                                    key={r.id}
                                    onClick={() => handleSwitch(r.id)}
                                    disabled={!!loadingId || isActive}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all w-full text-left ${isActive
                                        ? "bg-blue-600/20 text-blue-400"
                                        : "text-white/70 hover:bg-white/5 hover:text-white"
                                        }`}
                                >
                                    {loadingId === r.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                                    ) : (
                                        <Icon className={`w-4 h-4 ${isActive ? "text-blue-400" : "text-white/40"}`} />
                                    )}
                                    {r.label}
                                </button>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-center w-12 h-12 rounded-full border shadow-xl transition-all ${isOpen
                    ? "bg-blue-600 border-blue-400 text-white shadow-[0_0_30px_-5px_#3b82f6]"
                    : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:border-white/20 hover:text-white backdrop-blur-xl"
                    }`}
                title="Cambiar Rol (Dev Only)"
            >
                <Settings2 className="w-5 h-5" />
            </button>
        </div>
    );
}
