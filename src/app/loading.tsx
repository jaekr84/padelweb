"use client";

import { Loader2 } from "lucide-react";

export default function Loading() {
    return (
        <div className="fixed inset-0 z-[9999] bg-background/50 backdrop-blur-sm flex items-center justify-center pointer-events-none">
            <div className="bg-card border border-border p-8 rounded-[2rem] shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in duration-300">
                <div className="relative">
                    <div className="absolute inset-0 bg-indigo-500 rounded-full blur-xl opacity-20 animate-pulse" />
                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin relative z-10" />
                </div>
                <div className="flex flex-col items-center gap-1">
                    <span className="text-sm font-black uppercase tracking-widest text-foreground">Cargando</span>
                    <span className="text-[10px] text-muted-foreground font-medium animate-pulse">A.C.A.P. Padel Cloud</span>
                </div>
            </div>
        </div>
    );
}
