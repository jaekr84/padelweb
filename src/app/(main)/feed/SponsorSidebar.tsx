"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getSponsors } from "@/app/actions/sponsors";
import { ExternalLink, Info } from "lucide-react";

export default function SponsorSidebar() {
    const [sponsors, setSponsors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
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
    }, []);

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
                link: "/contact",
                isActive: true,
                isPlaceholder: true
            }
        ]
        : activeSponsors;

    // Configuración de layout dinámica
    const getLayoutConfig = () => {
        if (activeCount <= 5) return { cols: "grid-cols-1", aspect: "aspect-[2/1]" };
        if (activeCount <= 7) return { cols: "grid-cols-1", aspect: "aspect-[3/1]" };
        return { cols: "grid-cols-2", aspect: "aspect-[2/1]" };
    };

    const { cols, aspect } = getLayoutConfig();

    if (loading) {
        return (
            <aside className="hidden xl:flex w-80 border-l border-border bg-background flex-col h-screen sticky top-0 z-40 animate-pulse">
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
        <aside className="hidden xl:flex w-80 border-l border-border bg-background flex-col h-screen sticky top-0 z-40 translate-x-1">
            <div className="p-5 pb-3 flex flex-col border-b border-border/50 mb-4 bg-white/50 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-600">Publicidad</span>
                </div>
                <h2 className="text-lg font-extrabold tracking-tight text-foreground leading-none uppercase">SPONSORS <span className="text-indigo-600 italic uppercase">A.C.A.P.</span></h2>
            </div>

            <div className="flex-1 px-4 py-2 overflow-y-auto scrollbar-hide">
                <div className={`grid ${cols} gap-3 pb-6`}>
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
                                <Link
                                    href="/contact"
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
                                </Link>
                            )}
                        </div>
                    ))}
                </div>

                {/* Promotional CTA */}
                <div className="px-1 mb-8">
                    <Link
                        href="/contact"
                        className="block group relative overflow-hidden rounded-2xl p-4 bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 transition-all hover:translate-y-[-2px] hover:shadow-indigo-600/30 active:translate-y-0"
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
                    </Link>
                </div>
            </div>
        </aside>
    );
}
