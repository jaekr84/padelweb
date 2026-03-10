import { getAllCategoriesAdmin } from "./actions";
import CategoryManager from "./CategoryManager";
import { Info, Trophy } from "lucide-react";

export default async function AdminCategoriesPage() {
    const categories = await getAllCategoriesAdmin();

    return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-black uppercase italic tracking-tight">
                    Gestión de Categorías
                </h1>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Configuración global de niveles y puntos</p>
            </div>

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Summary & Info */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                    <div className="bg-slate-900 border border-border p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-indigo-500/5 blur-[50px] pointer-events-none" />
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Información del Sistema</h3>
                        <div className="flex flex-col gap-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                                    <Trophy className="h-6 w-6 text-indigo-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-black italic tracking-tighter">{categories.length}</p>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-white/30 leading-none">Categorías Activas</p>
                                </div>
                            </div>

                            <div className="bg-muted p-6 rounded-[1.5rem] border border-border/50">
                                <div className="flex items-center gap-2 mb-2">
                                    <Info className="h-3 w-3 text-white/40" />
                                    <span className="text-[8px] font-black uppercase tracking-widest text-white/40">Consejo Pro</span>
                                </div>
                                <p className="text-[10px] font-medium leading-relaxed text-white/50 italic uppercase tracking-wider">
                                    Configura los rangos de puntos para que el sistema asigne automáticamente el nivel a cada jugador según su performance en los torneos.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Category Manager */}
                <div className="lg:col-span-2">
                    <CategoryManager initialCategories={categories} />
                </div>
            </div>
        </div>
    );
}
