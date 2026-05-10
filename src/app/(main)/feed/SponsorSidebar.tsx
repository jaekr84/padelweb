"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getSponsors } from "@/app/actions/sponsors";
import { useAppStore } from "@/store/useAppStore";
import { ExternalLink, Info, EyeOff } from "lucide-react";

export default function SponsorSidebar({ 
    initialSponsors, 
    userRole 
}: { 
    initialSponsors?: any[], 
    userRole?: string 
}) {
    const { sponsorsVisible, setSponsorsVisible } = useAppStore();
    const [sponsors, setSponsors] = useState<any[]>(initialSponsors || []);
    const [loading, setLoading] = useState(!initialSponsors);

    useEffect(() => {
        if (initialSponsors) return;
        
        const fetchSponsors = async () => {
            try {
                const data = await getSponsors();
                // Solo mostrar sponsors activos
                setSponsors(data.filter((s: any) => s.isActive));
            } catch (error) {
                console.error("Error fetching sponsors for sidebar:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSponsors();
    }, [initialSponsors]);

    const activeSponsors = sponsors.filter((s: any) => s.isActive);
    const activeCount = activeSponsors.length;

    // Lógica dinámica: Si hay menos de 10, mostramos los activos + 1 placeholder
    // Si hay muchos, mostramos todos sin placeholders extras
    const displaySponsors = activeCount < 10
        ? [
            ...activeSponsors,
            {
                id: "placeholder-invite",
                name: "Espacio Disponible",
                imageUrl: "",
                link: "https://www.instagram.com/acaparg",
                isActive: true,
                isPlaceholder: true
            }
        ]
        : activeSponsors;

    // Configuración de layout dinámica
    const getLayoutConfig = () => {
        return { cols: "grid-cols-1", aspect: "aspect-[2/1]" };
    };

    const { cols, aspect } = getLayoutConfig();

    if (!sponsorsVisible) return null;

    if (loading) {
        return (
            <aside className="hidden xl:flex w-40 border-l border-border bg-background flex-col h-screen sticky top-0 z-40 animate-pulse">
                <div className="p-5 pb-3 flex flex-col border-b border-border/50 mb-4 items-center">
                    <div className="h-3 w-16 bg-muted rounded mb-2" />
                    <div className="h-6 w-32 bg-muted rounded" />
                </div>
                <div className="px-4 space-y-3">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="aspect-[2/1] w-full bg-muted rounded-2xl" />
                    ))}
                </div>
            </aside>
        );
    }

    return (
        <aside className="hidden xl:flex w-40 border-l border-border bg-background flex-col h-screen sticky top-0 z-40 translate-x-1">
            <div className="p-3 pb-2 flex flex-col border-b border-border/50 mb-3 bg-white/50 backdrop-blur-sm relative group/sidebar">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-600">Publicidad</span>
                    {userRole === "superadmin" && (
                        <button
                            onClick={() => setSponsorsVisible(false)}
                            className="opacity-0 group-hover/sidebar:opacity-100 p-1 hover:bg-slate-100 rounded-md transition-all text-slate-400 hover:text-red-500"
                            title="Ocultar Sidebar (Solo Admin)"
                        >
                            <EyeOff className="w-3 h-3" />
                        </button>
                    )}
                </div>
                <h2 className="text-sm font-extrabold tracking-tight text-foreground leading-none uppercase">SPONSORS <span className="text-indigo-600 italic uppercase">A.C.A.P.</span></h2>
            </div>

            <div className="flex-1 px-2.5 py-2 overflow-y-auto scrollbar-hide">
                <div className={`grid ${cols} gap-2 pb-4`}>
                    {displaySponsors.map((s: any) => (
                        <div key={s.id} className="group relative">
                            {s.imageUrl ? (
                                <Link
                                    href={s.link || "#"}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`block relative ${aspect} w-full rounded-2xl overflow-hidden border border-border bg-white/[0.02] transition-all duration-300 hover:border-indigo-500/30 hover:shadow-xl group-hover:-translate-y-1 shadow-sm`}
                                >
                                    <Image
                                        src={s.imageUrl}
                                        alt={s.name}
                                        fill
                                        className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                                        sizes="(max-width: 1280px) 0px, 300px"
                                        priority={activeCount <= 4}
                                    />
                                    <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/5 transition-colors" />
                                </Link>
                            ) : (
                                <a
                                    href="https://www.instagram.com/acaparg"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`block relative ${aspect} w-full rounded-2xl border-2 border-dashed border-border/30 bg-muted/5 hover:bg-indigo-50/10 transition-all group-hover:border-indigo-500/20 group-hover:shadow-lg group-hover:-translate-y-1`}
                                >
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
                                        <div className="w-6 h-6 rounded-full bg-muted/20 flex items-center justify-center mb-2 group-hover:bg-indigo-500/10 group-hover:scale-110 transition-all">
                                            <Info className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-indigo-500 transition-colors" />
                                        </div>
                                        <div className="space-y-0.5">
                                            <span className="block text-[8px] font-black uppercase text-muted-foreground/40 tracking-[0.2em]">Espacio</span>
                                            <span className="block text-[10px] font-black uppercase text-indigo-600/40 tracking-widest">Disponible</span>
                                        </div>
                                    </div>
                                </a>
                            )}
                        </div>
                    ))}
                </div>

                {/* Promotional CTA */}
                <div className="px-0.5 mb-6">
                    <a
                        href="https://www.instagram.com/acaparg"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block group relative overflow-hidden rounded-xl p-3 bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 transition-all hover:translate-y-[-2px] hover:shadow-indigo-600/30 active:translate-y-0"
                    >
                        <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-2xl" />
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex flex-col">
                                <h3 className="text-[11px] font-black uppercase tracking-tight leading-none mb-1">Tu marca aquí</h3>
                                <p className="text-[9px] text-indigo-100/80 leading-tight font-medium">
                                    Únete a la red ACAP
                                </p>
                            </div>
                            <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:bg-white/30 transition-colors">
                                <ExternalLink className="w-3 h-3 text-white" />
                            </div>
                        </div>
                    </a>
                </div>
            </div>
        </aside>
    );
}
