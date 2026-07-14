"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getSponsors } from "@/app/actions/sponsors";
import { useAppStore } from "@/store/useAppStore";
import { EyeOff, Plus } from "lucide-react";

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

    const PLACEHOLDER = (n: number) => ({
        id: `placeholder-${n}`,
        name: "Espacio disponible",
        imageUrl: "",
        link: "https://www.instagram.com/acaparg",
        isActive: true,
        isPlaceholder: true,
    });

    const displaySponsors = activeCount < 10
        ? [...activeSponsors, PLACEHOLDER(1), PLACEHOLDER(2), PLACEHOLDER(3)]
        : activeSponsors;

    if (!sponsorsVisible) return null;

    if (loading) {
        return (
            <aside className="hidden xl:flex w-44 flex-col h-screen sticky top-0 z-40 border-l border-white/10 bg-carbon-950">
                <div className="flex-1 flex flex-col min-h-0 p-2.5 gap-2.5">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex-1 min-h-0 w-full bg-white/5 rounded-xl animate-pulse" />
                    ))}
                </div>
            </aside>
        );
    }

    return (
        <aside className="hidden xl:flex w-44 flex-col h-screen sticky top-0 z-40 border-l border-white/10 bg-carbon-950 group/sidebar relative overflow-hidden">
            {/* Encabezado del muro */}
            <div className="shrink-0 px-3 pt-3 pb-1.5 flex items-center gap-2">
                <span className="w-4 h-px bg-volt/60" />
                <span className="label-tech text-[7px] text-slate-500">Sponsors</span>
            </div>

            {/* Muro de logos — cada logo en su tile blanco para mantener legibilidad */}
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto no-scrollbar px-2.5 pb-2.5 gap-2.5">
                {displaySponsors.map((s: any) => (
                    s.imageUrl ? (
                        <Link
                            key={s.id}
                            href={s.link || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group/card relative flex-1 min-h-[84px] max-h-[120px] shrink-0 overflow-hidden rounded-xl bg-carbon-800 border border-white/10 hover:border-volt/40 transition-colors shadow-lg shadow-black/20"
                        >
                            {/* Logo a sangre completa (cover) sobre toda la card */}
                            <Image
                                src={s.imageUrl}
                                alt={s.name}
                                fill
                                className="object-cover transition-transform duration-500 group-hover/card:scale-105"
                                sizes="176px"
                                priority={activeCount <= 4}
                            />
                        </Link>
                    ) : (
                        <a
                            key={s.id}
                            href="https://www.instagram.com/acaparg"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group/ph relative flex-1 min-h-[84px] max-h-[120px] shrink-0 rounded-xl border border-dashed border-white/10 bg-white/[0.02] hover:bg-white/5 hover:border-volt/30 transition-colors flex flex-col items-center justify-center gap-1"
                        >
                            <Plus className="w-3 h-3 text-slate-600 group-hover/ph:text-volt transition-colors" />
                            <span className="text-[7px] font-bold uppercase tracking-widest text-slate-600 group-hover/ph:text-volt transition-colors">
                                Tu marca
                            </span>
                        </a>
                    )
                ))}
            </div>

            {/* Botón ocultar — solo superadmin, visible al hover */}
            {userRole === "superadmin" && (
                <button
                    onClick={() => setSponsorsVisible(false)}
                    className="absolute bottom-2 right-2 opacity-0 group-hover/sidebar:opacity-100 p-1 rounded-md text-slate-500 hover:text-live hover:bg-live/10 transition-all"
                    title="Ocultar sidebar"
                >
                    <EyeOff className="w-3 h-3" />
                </button>
            )}
        </aside>
    );
}
