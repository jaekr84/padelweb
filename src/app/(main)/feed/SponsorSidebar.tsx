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
            <aside className="hidden xl:flex w-44 flex-col h-screen sticky top-0 z-40 border-l border-slate-100 bg-white">
                <div className="flex-1 flex flex-col min-h-0">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex-1 min-h-0 w-full bg-slate-100 animate-pulse border-b border-white" />
                    ))}
                </div>
            </aside>
        );
    }

    return (
        <aside className="hidden xl:flex w-44 flex-col h-screen sticky top-0 z-40 border-l border-slate-100 bg-white group/sidebar relative overflow-hidden">

            {/* Banners — sin contenedores, directo borde a borde */}
            <div className="flex-1 flex flex-col min-h-0">
                {displaySponsors.map((s: any) => (
                    s.imageUrl ? (
                        <Link
                            key={s.id}
                            href={s.link || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group/card relative flex-1 min-h-0 overflow-hidden border-b border-slate-100 last:border-0"
                        >
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
                            className="group/ph relative flex-1 min-h-0 border-b border-dashed border-slate-100 last:border-0 bg-slate-50/50 hover:bg-indigo-50/30 transition-colors flex flex-col items-center justify-center gap-1"
                        >
                            <Plus className="w-3 h-3 text-slate-300 group-hover/ph:text-indigo-400 transition-colors" />
                            <span className="text-[7px] font-bold uppercase tracking-widest text-slate-300 group-hover/ph:text-indigo-400 transition-colors">
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
                    className="absolute bottom-2 right-2 opacity-0 group-hover/sidebar:opacity-100 p-1 rounded-md text-slate-300 hover:text-red-400 hover:bg-red-50 transition-all"
                    title="Ocultar sidebar"
                >
                    <EyeOff className="w-3 h-3" />
                </button>
            )}
        </aside>
    );
}
