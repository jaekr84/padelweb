"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateLandingVariant } from "./actions";

type Variant = { id: string; name: string; description: string };

// La landing se renderiza a 1440×900 y se escala para entrar en la tarjeta.
const FRAME_W = 1440;
const FRAME_H = 900;

function LivePreview({ id, name }: { id: string; name: string }) {
    const boxRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0);

    useEffect(() => {
        const el = boxRef.current;
        if (!el) return;
        const ro = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / FRAME_W));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    return (
        <div ref={boxRef} className="relative w-full aspect-[16/10] overflow-hidden bg-carbon-950">
            {scale > 0 && (
                <iframe
                    src={`/landing-preview/${id}`}
                    title={`Vista previa: ${name}`}
                    loading="lazy"
                    tabIndex={-1}
                    className="absolute left-0 top-0 origin-top-left pointer-events-none border-0"
                    style={{ width: FRAME_W, height: FRAME_H, transform: `scale(${scale})` }}
                />
            )}
        </div>
    );
}

export default function LandingPickerClient({ variants, initialActive }: { variants: Variant[]; initialActive: string }) {
    const [active, setActive] = useState(initialActive);
    const [pending, setPending] = useState<string | null>(null);
    const [, startTransition] = useTransition();

    const choose = (id: string) => {
        setPending(id);
        startTransition(async () => {
            const res = await updateLandingVariant(id);
            if (res.error) {
                toast.error(res.error);
            } else {
                setActive(id);
                toast.success("Landing actualizada: ya es la que ven los visitantes");
            }
            setPending(null);
        });
    };

    return (
        <div className="max-w-6xl mx-auto space-y-10 pb-24 font-sans">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-hairline pb-10">
                <div className="space-y-1">
                    <Link href="/admin" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-azul-primary hover:text-celeste transition-colors mb-4 group">
                        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                        Volver al Panel
                    </Link>
                    <h1 className="text-4xl md:text-5xl heading-sport text-foreground">
                        Página de <span className="text-azul-primary italic">inicio</span>
                    </h1>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                        Elegí qué landing ven los visitantes sin sesión en la página principal.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {variants.map((v) => {
                    const isActive = v.id === active;
                    const isPending = pending === v.id;
                    return (
                        <div
                            key={v.id}
                            className={`rounded-2xl overflow-hidden border bg-card transition-colors ${isActive ? "border-azul-primary ring-2 ring-azul-primary/30" : "border-border"}`}
                        >
                            <div className="relative">
                                <LivePreview id={v.id} name={v.name} />
                                {isActive && (
                                    <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-azul-primary text-white px-3 py-1 text-[10px] font-black uppercase tracking-widest shadow-lg">
                                        <Check className="w-3 h-3" /> En uso
                                    </span>
                                )}
                            </div>

                            <div className="p-5 space-y-4">
                                <div>
                                    <h2 className="text-xl heading-sport text-foreground">{v.name}</h2>
                                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{v.description}</p>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    <button
                                        type="button"
                                        disabled={isActive || pending !== null}
                                        onClick={() => choose(v.id)}
                                        className="inline-flex items-center gap-2 rounded-xl bg-azul-primary text-white px-4 py-2.5 text-[11px] font-black uppercase tracking-widest hover:bg-azul-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                        {isActive ? "Es la actual" : "Usar esta"}
                                    </button>
                                    <a
                                        href={`/landing-preview/${v.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-foreground hover:bg-muted transition-colors"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" /> Ver completa
                                    </a>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
