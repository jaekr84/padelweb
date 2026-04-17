"use client";

import { PaddleLoading } from "@/components/ui/PaddleLoading";

export default function Loading() {
    return (
        <div className="fixed inset-0 z-[9999] bg-background/50 backdrop-blur-sm flex items-center justify-center pointer-events-none">
            <div className="bg-card border border-border p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center gap-8 animate-in zoom-in duration-300">
                <div className="relative">
                    <div className="absolute inset-0 bg-azul-primary rounded-full blur-3xl opacity-10 animate-pulse" />
                    <PaddleLoading size="lg" className="relative z-10" />
                </div>
                <div className="flex flex-col items-center gap-2">
                    <span className="text-base font-black uppercase tracking-[0.2em] text-foreground">Cargando</span>
                    <span className="text-xs text-muted-foreground font-semibold px-4 py-1 bg-muted rounded-full">A.C.A.P. Padel Cloud</span>
                </div>
            </div>
        </div>
    );
}
