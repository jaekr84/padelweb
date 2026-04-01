"use client";

import { useState } from "react";
import { Plus, Trash2, Save, MoveUp, MoveDown, Layers, Pencil, X, Shield, Activity, Info } from "lucide-react";
import { addCategory, updateCategory, deleteCategory } from "./actions";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Category {
    id: string;
    name: string;
    minPoints: number;
    maxPoints: number;
    categoryOrder: number;
}

export default function CategoriesManager({ initialCategories }: { initialCategories: Category[] }) {
    const [categories, setCategories] = useState<Category[]>(initialCategories);
    const [loading, setLoading] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<Partial<Category>>({});

    const highestMax = categories.length > 0
        ? Math.max(...categories.map(c => c.maxPoints))
        : -1;

    const [newCat, setNewCat] = useState({
        name: "",
        minPoints: highestMax + 1,
        maxPoints: highestMax + 501,
    });

    const handleAdd = async () => {
        if (!newCat.name) return;
        setLoading("add");
        try {
            await addCategory({
                ...newCat,
                categoryOrder: categories.length,
            });
            toast.success("Categoría añadida");
            // Although it reloads, we set it correctly for safety/non-reload behavior
            const nextMin = newCat.maxPoints + 1;
            setNewCat({ name: "", minPoints: nextMin, maxPoints: nextMin + 500 });
            window.location.reload();
        } catch (e) {
            toast.error("Error al añadir");
        } finally {
            setLoading(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Seguro que quieres eliminar esta categoría?")) return;
        setLoading(id);
        try {
            await deleteCategory(id);
            toast.success("Categoría eliminada");
            setCategories(categories.filter(c => c.id !== id));
        } catch (e) {
            toast.error("Error al eliminar");
        } finally {
            setLoading(null);
        }
    };

    const handleEdit = (cat: Category) => {
        setEditingId(cat.id);
        setEditData({ ...cat });
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditData({});
    };

    const handleSave = async (id: string) => {
        setLoading(id);
        try {
            await updateCategory(id, editData);
            setCategories(categories.map(c => c.id === id ? { ...c, ...editData } as Category : c));
            setEditingId(null);
            setEditData({});
            toast.success("Categoría actualizada");
        } catch (e) {
            toast.error("Error al actualizar");
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground pb-20 pt-8 px-4 md:px-8 relative overflow-hidden">
            {/* Ambient Background Effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-5%] right-[-5%] w-[35%] h-[35%] bg-emerald-500/5 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[45%] h-[45%] bg-indigo-500/5 rounded-full blur-[120px] animate-pulse [animation-delay:3s]" />
            </div>

            <div className="max-w-4xl mx-auto space-y-10 relative z-10">
                {/* Header */}
                <div className="flex flex-col gap-3">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3 mb-1"
                    >
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/5">
                            <Shield className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-400/80 italic">INFRAESTRUCTURA DE RANGOS</span>
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-5xl md:text-6xl font-black uppercase italic tracking-tighter leading-none text-foreground"
                    >
                        GESTIÓN DE <span className="text-emerald-600">CATEGORÍAS</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-slate-500 text-[11px] font-black mt-2 uppercase tracking-[0.2em] max-w-xl leading-relaxed"
                    >
                        CONFIGURACIÓN DINÁMICA DE NIVELES OPERATIVOS Y UMBRALES DE PUNTUACIÓN DEL RANKING.
                    </motion.p>
                </div>

                {/* Add New Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card border border-border backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] shadow-2xl relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2" />

                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 mb-8 flex items-center gap-3 italic">
                        <Plus className="w-4 h-4" /> DESPLEGAR NUEVA CATEGORÍA
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-5 relative z-10">
                        <div className="md:col-span-1">
                            <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2 block ml-1">IDENTIFICADOR</label>
                            <input
                                type="text"
                                placeholder="EJ: 5TA"
                                className="w-full bg-muted border border-border rounded-2xl px-5 py-4 text-xs font-black uppercase outline-none focus:border-emerald-600/50 transition-all text-foreground placeholder:text-muted-foreground/30 shadow-inner"
                                value={newCat.name}
                                onChange={e => setNewCat({ ...newCat, name: e.target.value.toUpperCase() })}
                            />
                        </div>
                        <div className="md:col-span-2 grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2 block ml-1">PISO PUNTOS</label>
                                <input
                                    type="number"
                                    placeholder="MIN"
                                    className="w-full bg-muted border border-border rounded-2xl px-5 py-4 text-xs font-black outline-none focus:border-emerald-600/50 transition-all text-foreground placeholder:text-muted-foreground/30 shadow-inner"
                                    value={newCat.minPoints === 0 && highestMax === -1 ? "" : newCat.minPoints}
                                    onChange={e => {
                                        const val = parseInt(e.target.value);
                                        setNewCat({ ...newCat, minPoints: isNaN(val) ? 0 : val });
                                    }}
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2 block ml-1">TECHO PUNTOS</label>
                                <input
                                    type="number"
                                    placeholder="MAX"
                                    className="w-full bg-muted border border-border rounded-2xl px-5 py-4 text-xs font-black outline-none focus:border-emerald-600/50 transition-all text-foreground placeholder:text-muted-foreground/30 shadow-inner"
                                    value={newCat.maxPoints === 0 ? "" : newCat.maxPoints}
                                    onChange={e => {
                                        const val = parseInt(e.target.value);
                                        setNewCat({ ...newCat, maxPoints: isNaN(val) ? 0 : val });
                                    }}
                                />
                            </div>
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={handleAdd}
                                disabled={loading === "add"}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-[0.2em] text-[10px] py-4 rounded-2xl disabled:opacity-50 transition-all shadow-xl shadow-emerald-900/40 active:scale-95 flex items-center justify-center gap-3"
                            >
                                {loading === "add" ? <Activity className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                CREAR NIVEL
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Categories Table/List */}
                <div className="space-y-4 relative z-10">
                    <div className="px-10 py-4 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic">JERARQUÍA OPERATIVA</span>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic">{categories.length} NIVELES</span>
                    </div>

                    <div className="space-y-4">
                        <AnimatePresence mode="popLayout">
                            {categories.map((cat, idx) => {
                                const isEditing = editingId === cat.id;

                                return (
                                    <motion.div
                                        layout
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        key={cat.id}
                                        className="bg-card border border-border backdrop-blur-xl p-6 md:p-8 rounded-[2rem] flex flex-col md:flex-row items-center gap-6 group hover:border-indigo-500/30 transition-all duration-500 shadow-xl relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 w-48 h-48 bg-muted rounded-full blur-[60px] pointer-events-none group-hover:bg-indigo-500/5 transition-all" />

                                        {/* Order */}
                                        <div className="shrink-0 relative z-10">
                                            <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center text-lg font-black italic text-emerald-600 border border-border shadow-inner">
                                                {idx + 1}
                                            </div>
                                        </div>

                                        {/* Name */}
                                        <div className="flex-1 min-w-0 relative z-10 w-full">
                                            {isEditing ? (
                                                <div className="space-y-2">
                                                    <label className="text-[8px] font-black uppercase tracking-widest text-emerald-600 ml-1">DENOMINACIÓN</label>
                                                    <input
                                                        type="text"
                                                        className="w-full bg-muted border border-emerald-500/30 rounded-xl px-4 py-3 text-sm font-black uppercase outline-none focus:border-emerald-600 transition-all text-foreground"
                                                        value={editData.name}
                                                        onChange={e => setEditData({ ...editData, name: e.target.value.toUpperCase() })}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="flex flex-col">
                                                    <div className="text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-1">CATEGORÍA</div>
                                                    <div className="text-3xl font-black uppercase italic tracking-tighter text-foreground group-hover:text-emerald-600 transition-colors">
                                                        {cat.name}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Points Range */}
                                        <div className="flex-1 w-full md:w-auto px-8 border-x border-border relative z-10">
                                            {isEditing ? (
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-[8px] font-black uppercase tracking-widest text-emerald-600 ml-1">MIN</label>
                                                        <input
                                                            type="number"
                                                            className="w-full bg-muted border border-emerald-500/30 rounded-xl px-4 py-3 text-xs font-black outline-none focus:border-emerald-600 transition-all text-foreground"
                                                            value={isNaN(editData.minPoints ?? 0) ? "" : editData.minPoints}
                                                            onChange={e => {
                                                                const val = parseInt(e.target.value);
                                                                setEditData({ ...editData, minPoints: isNaN(val) ? 0 : val });
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[8px] font-black uppercase tracking-widest text-emerald-600 ml-1">MAX</label>
                                                        <input
                                                            type="number"
                                                            className="w-full bg-muted border border-emerald-500/30 rounded-xl px-4 py-3 text-xs font-black outline-none focus:border-emerald-600 transition-all text-foreground"
                                                            value={isNaN(editData.maxPoints ?? 0) ? "" : editData.maxPoints}
                                                            onChange={e => {
                                                                const val = parseInt(e.target.value);
                                                                setEditData({ ...editData, maxPoints: isNaN(val) ? 0 : val });
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col">
                                                    <div className="text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-2">ESPECTRO DE PUNTOS</div>
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-xl font-black italic text-foreground tracking-widest">{cat.minPoints}</span>
                                                        <div className="h-0.5 w-6 bg-muted" />
                                                        <span className="text-xl font-black italic text-foreground tracking-widest">{cat.maxPoints} <span className="text-[10px] text-muted-foreground not-italic ml-1">PTS</span></span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-3 shrink-0 relative z-10 w-full md:w-auto justify-end mt-4 md:mt-0">
                                            {isEditing ? (
                                            <>
                                                <button
                                                    onClick={() => handleSave(cat.id)}
                                                    disabled={loading === cat.id}
                                                    className="flex-1 md:flex-none p-4 bg-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-2xl border border-emerald-500/20 transition-all active:scale-95 shadow-lg shadow-emerald-500/10"
                                                >
                                                    <Save className="w-5 h-5 mx-auto" />
                                                </button>
                                                <button
                                                    onClick={handleCancel}
                                                    className="flex-1 md:flex-none p-4 bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground rounded-2xl border border-border transition-all active:scale-95"
                                                >
                                                    <X className="w-5 h-5 mx-auto" />
                                                </button>
                                            </>
                                            ) : (
                                                <>
                                                <button
                                                    onClick={() => handleEdit(cat)}
                                                    className="flex-1 md:flex-none p-4 bg-muted text-muted-foreground hover:bg-emerald-600 group-hover:bg-emerald-600 group-hover:text-white rounded-2xl border border-border transition-all duration-500 active:scale-95 shadow-sm"
                                                >
                                                    <Pencil className="w-5 h-5 mx-auto" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(cat.id)}
                                                    disabled={loading === cat.id}
                                                    className="flex-1 md:flex-none p-4 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl border border-red-500/10 transition-all active:scale-95 shadow-sm"
                                                >
                                                    {loading === cat.id ? <Activity className="w-5 h-5 animate-spin mx-auto" /> : <Trash2 className="w-5 h-5 mx-auto" />}
                                                </button>
                                                </>
                                            )}
                                    </div>
                                </motion.div>
                        );
                        })}
                    </AnimatePresence>
                </div>
            </div>

            {categories.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-24 bg-card border-border rounded-[3rem] mt-4 flex flex-col items-center gap-6 relative overflow-hidden shadow-xl"
                    >
                        <div className="absolute inset-0 bg-emerald-500/5 blur-[80px]" />
                        <Layers className="w-16 h-16 text-muted-foreground/30 relative z-10" />
                        <div className="space-y-1 relative z-10">
                            <p className="text-foreground text-xl font-black uppercase italic tracking-[0.2em]">SISTEMA SIN NIVELES</p>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">INICIA LA CONFIGURACIÓN DESPLEGANDO LA PRIMERA CATEGORÍA</p>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Footer Info */}
            <div className="px-10 py-6 bg-card border border-border rounded-[2rem] flex items-start gap-4">
                <Info className="w-5 h-5 text-muted-foreground/40 shrink-0 mt-0.5" />
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground italic leading-relaxed">
                    IMPORTANTE: EL ORDEN DE LAS CATEGORÍAS ES AUTOMÁTICO BASADO EN LA CREACIÓN. LOS JUGADORES SERÁN ASIGNADOS SEGÚN EL RANGO DE PUNTOS DEFINIDO EN ESTA CONSOLA.
                </p>
            </div>
        </div>
    );
}
