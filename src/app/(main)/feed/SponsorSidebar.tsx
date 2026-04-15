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

    if (loading) {
        return (
            <aside className="hidden xl:flex w-80 border-l border-border bg-background flex-col h-screen sticky top-0 p-6 gap-6 animate-pulse">
                <div className="h-6 w-32 bg-muted rounded-lg" />
                <div className="flex flex-col gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="aspect-[4/5] w-full bg-muted rounded-2xl" />
                    ))}
                </div>
            </aside>
        );
    }

    if (sponsors.length === 0) {
        return null;
    }

    return (
        <aside className="hidden xl:flex w-72 border-l border-border bg-background flex-col h-screen sticky top-0 z-40">
            <div className="p-5 pb-3 flex flex-col border-b border-border/50 mb-2">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-600 mb-1">Publicidad</span>
                <h2 className="text-lg font-extrabold tracking-tight text-foreground leading-none lowercase">socios <span className="text-indigo-600 italic">acap</span></h2>
            </div>

            <div className="flex-1 px-4 py-2 space-y-4 overflow-y-hidden">
                {sponsors.map((s) => (
                    <div key={s.id} className="group relative">
                        {s.link ? (
                            <Link
                                href={s.link}
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
                                <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/5 transition-colors" />
                            </Link>
                        ) : (
                            <div className="relative aspect-[2/1] w-full rounded-xl overflow-hidden border border-border bg-white/[0.02]">
                                <Image
                                    src={s.imageUrl}
                                    alt={s.name}
                                    fill
                                    className="object-cover grayscale opacity-60"
                                    sizes="250px"
                                />
                            </div>
                        )}
                    </div>
                ))}

                {/* Promotional CTA - More compact version */}
                <Link
                    href="/contact"
                    className="block group relative overflow-hidden rounded-xl p-4 bg-indigo-600 text-white transition-all hover:brightness-110 active:scale-[0.98] mt-4"
                >
                    <div className="absolute -right-2 -top-2 w-16 h-16 bg-white/10 rounded-full blur-xl" />
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex flex-col">
                            <h3 className="text-[10px] font-black uppercase tracking-tight leading-none mb-1">Publicar acá</h3>
                            <p className="text-[9px] text-indigo-100 leading-tight font-medium opacity-80">
                                Info de sponsors
                            </p>
                        </div>
                        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                            <ExternalLink className="w-3 h-3 text-white" />
                        </div>
                    </div>
                </Link>
            </div>
        </aside>
    );
}
