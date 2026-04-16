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

    // Generamos 10 espacios (sponsors reales + placeholders si faltan)
    const displaySponsors = sponsors.length >= 16
        ? sponsors.slice(0, 16)
        : [
            ...sponsors,
            ...Array(18 - sponsors.length).fill(null).map((_, i) => ({
                id: `placeholder-${i}`,
                name: "Espacio Disponible",
                imageUrl: "", // Usaremos un div con color si no hay imagen
                link: "/contact",
                isActive: true,
                isPlaceholder: true
            }))
        ];

    const isTwoColumns = true; // Forzamos 2 columnas para el preview de 10 espacios

    if (loading) {
        return (
            <aside className="hidden xl:flex w-72 border-l border-border bg-background flex-col h-screen sticky top-0 z-40 animate-pulse">
                <div className="p-5 pb-3 flex flex-col border-b border-border/50 mb-2">
                    <div className="h-3 w-16 bg-muted rounded mb-1" />
                    <div className="h-6 w-32 bg-muted rounded" />
                </div>
                <div className="flex-1 px-4 py-2 grid grid-cols-2 gap-2 overflow-y-hidden">
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="aspect-[2/1] w-full bg-muted rounded-xl" />
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
                <div className="grid grid-cols-2 gap-2 pb-6">
                    {displaySponsors.map((s: any) => (
                        <div key={s.id} className="group relative">
                            {s.imageUrl ? (
                                <Link
                                    href={s.link || "#"}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block relative aspect-[2/1] w-full rounded-xl overflow-hidden border border-border bg-white/[0.02] transition-all duration-300 hover:border-indigo-500/30 hover:shadow-lg group-hover:-translate-y-0.5"
                                >
                                    <Image
                                        src={s.imageUrl}
                                        alt={s.name}
                                        fill
                                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                                        sizes="250px"
                                    />
                                    <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/10 transition-colors" />
                                </Link>
                            ) : (
                                <Link
                                    href="/contact"
                                    className="block relative aspect-[2/1] w-full rounded-xl border border-dashed border-border/50 bg-muted/20 hover:bg-muted/30 transition-all group-hover:border-indigo-500/20"
                                >
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center">
                                        <div className="w-4 h-4 rounded-full bg-muted/40 flex items-center justify-center mb-1">
                                            <Info className="w-2.5 h-2.5 text-muted-foreground" />
                                        </div>
                                        <span className="text-[7px] font-bold uppercase text-muted-foreground/60 tracking-wider">Espacio<br />Disponible</span>
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
