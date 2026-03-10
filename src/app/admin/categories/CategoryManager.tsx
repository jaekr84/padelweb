"use client"

import { useState } from "react";
import { Plus, Trash2, Save, X, Activity, Layers, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { createCategory, updateCategory, deleteCategory } from "./actions";
import { motion, AnimatePresence } from "framer-motion";

export default function CategoryManager({ initialCategories }: { initialCategories: any[] }) {
    const [categories, setCategories] = useState(initialCategories);
    const [isSaving, setIsSaving] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [newCat, setNewCat] = useState({
        name: "",
        minPoints: 0,
        maxPoints: 10000,
        gender: "mixto", // Applies to everyone
        categoryOrder: categories.length + 1,
        isActive: true
    });

    const handleUpdate = async (cat: any) => {
        setIsSaving(cat.id);
        try {
            await updateCategory(cat.id, cat);
            toast.success("Categoría actualizada");
        } catch (e: any) {
            toast.error(e.message || "Error al actualizar");
        } finally {
            setIsSaving(null);
        }
    };

    const handleCreate = async () => {
        setIsSaving("new");
        try {
            await createCategory(newCat);
            toast.success("Categoría creada");
            setIsCreating(false);
            setNewCat({
                name: "",
                minPoints: 0,
                maxPoints: 10000,
                gender: "mixto",
                categoryOrder: categories.length + 2,
                isActive: true
            });
            window.location.reload();
        } catch (e: any) {
            toast.error(e.message || "Error al crear");
        } finally {
            setIsSaving(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Seguro que quieres borrar esta categoría?")) return;
        try {
            await deleteCategory(id);
            toast.success("Categoría borrada");
            setCategories(categories.filter(c => c.id !== id));
        } catch (e: any) {
            toast.error(e.message || "Error al borrar");
        }
    };

    const sortedCategories = [...categories].sort((a, b) => a.categoryOrder - b.categoryOrder);

    return (
        <div className="flex flex-col gap-8">
            <div className="flex justify-between items-center px-2">
                <div className="flex flex-col gap-1">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                        <Layers className="h-3 w-3 text-indigo-500" /> Niveles Unificados
                    </h3>
                    <p className="text-[9px] font-medium text-white/20 uppercase tracking-widest leading-none">Las categorías se aplican automáticamente para masculino y femenino</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95"
                >
                    <Plus className="h-4 w-4" /> Crear Categoría
                </button>
            </div>

            <div className="flex flex-col gap-4">
                <AnimatePresence>
                    {isCreating && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-indigo-600/5 border border-indigo-500/30 p-8 rounded-[2.5rem] flex flex-col gap-6 shadow-2xl relative mb-4"
                        >
                            <div className="absolute top-0 right-0 p-4">
                                <button onClick={() => setIsCreating(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors"><X className="h-5 w-5 text-white/20 hover:text-white" /></button>
                            </div>

                            <div className="flex flex-col gap-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                    <span className="text-[12px] font-black uppercase tracking-[0.4em] text-indigo-400 italic">Nueva Categoría Global</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[9px] font-black uppercase text-white/30 ml-2 tracking-widest">Nombre (Ej: 5ta)</label>
                                        <input
                                            type="text"
                                            value={newCat.name}
                                            onChange={e => setNewCat({ ...newCat, name: e.target.value })}
                                            className="bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold placeholder:opacity-20 outline-none focus:border-indigo-500/50 transition-all uppercase"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <label className="text-[9px] font-black uppercase text-white/30 ml-2 tracking-widest">Rango de Puntos</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <input
                                                type="number"
                                                placeholder="Min"
                                                value={newCat.minPoints}
                                                onChange={e => setNewCat({ ...newCat, minPoints: Number(e.target.value) })}
                                                className="bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-indigo-500/50 transition-all text-center"
                                            />
                                            <input
                                                type="number"
                                                placeholder="Max"
                                                value={newCat.maxPoints}
                                                onChange={e => setNewCat({ ...newCat, maxPoints: Number(e.target.value) })}
                                                className="bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-indigo-500/50 transition-all text-center"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 justify-end">
                                        <button
                                            onClick={handleCreate}
                                            disabled={isSaving === "new" || !newCat.name}
                                            className="bg-white text-black hover:bg-white/90 disabled:opacity-50 disabled:hover:bg-white rounded-2xl py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95"
                                        >
                                            {isSaving === "new" ? <Activity className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Confirmar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex flex-col gap-3">
                    {sortedCategories.map((cat) => (
                        <div key={cat.id} className="bg-card border border-border/80 p-6 rounded-[1.8rem] hover:border-indigo-500/30 transition-all group relative overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-indigo-900/10">
                            <div className="flex flex-col xl:flex-row gap-6 items-center relative z-10">
                                <div className="flex items-center gap-6 flex-1 w-full">
                                    <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center shrink-0">
                                        <input
                                            type="number"
                                            value={cat.categoryOrder}
                                            onChange={e => setCategories(categories.map(c => c.id === cat.id ? { ...c, categoryOrder: Number(e.target.value) } : c))}
                                            className="bg-transparent w-full text-center text-[12px] font-black italic text-muted-foreground/60 outline-none"
                                        />
                                    </div>
                                    <div className="flex flex-col flex-1">
                                        <input
                                            type="text"
                                            value={cat.name}
                                            onChange={e => setCategories(categories.map(c => c.id === cat.id ? { ...c, name: e.target.value } : c))}
                                            className="bg-transparent text-xl font-black uppercase italic tracking-tight outline-none focus:text-indigo-400 transition-colors w-full"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 flex-[1.5] w-full">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-3 bg-muted/50 border border-border/50 rounded-2xl px-6 py-4 text-sm font-black tabular-nums">
                                            <input
                                                type="number"
                                                value={cat.minPoints}
                                                onChange={e => setCategories(categories.map(c => c.id === cat.id ? { ...c, minPoints: Number(e.target.value) } : c))}
                                                className="bg-transparent w-full text-right outline-none focus:text-indigo-400"
                                            />
                                            <ArrowRight className="h-3 w-3 opacity-20" />
                                            <input
                                                type="number"
                                                value={cat.maxPoints}
                                                onChange={e => setCategories(categories.map(c => c.id === cat.id ? { ...c, maxPoints: Number(e.target.value) } : c))}
                                                className="bg-transparent w-full outline-none focus:text-indigo-400"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-end gap-3 shrink-0">
                                        <button
                                            onClick={() => handleUpdate(cat)}
                                            disabled={isSaving === cat.id}
                                            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isSaving === cat.id ? "bg-indigo-600/20 text-indigo-400" : "bg-card border border-border text-muted-foreground hover:border-indigo-500/50 hover:text-indigo-400 shadow-sm"}`}
                                        >
                                            {isSaving === cat.id ? <Activity className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(cat.id)}
                                            className="w-14 h-14 rounded-2xl bg-card border border-border text-muted-foreground hover:border-red-500/50 hover:text-red-400 transition-all flex items-center justify-center shadow-sm"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
