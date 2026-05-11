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
                <div className="max-w-4xl mx-auto space-y-4 relative z-10">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-3 mb-1">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-lg shadow-emerald-500/5">
                                    <Shield className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <span className="text-[9px] font-black uppercase tracking-[0.4em] text-emerald-600 italic">Admin Tactical Console</span>
                                    <div className="h-px w-10 bg-emerald-500/30 mt-0.5" />
                                </div>
                            </div>
                            <h1 className="text-xl md:text-3xl font-black uppercase italic tracking-tighter leading-none text-foreground">
                                Gestión de <span className="text-emerald-600">Categorías</span>
                            </h1>
                            <p className="text-muted-foreground text-[9px] font-black mt-1.5 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Activity className="w-2.5 h-2.5" /> Configuración dinámica de niveles y umbrales de puntuación
                            </p>
                        </div>
                    </div>

                    {/* Categories Table */}
                    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm relative mt-2">
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse table-auto">
                                <thead>
                                    <tr className="bg-muted/30 border-b border-border">
                                        <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground w-16">Nº</th>
                                        <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Nombre</th>
                                        <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground text-center">Rango Min</th>
                                        <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground text-center">Rango Max</th>
                                        <th className="px-4 py-3 text-right text-[9px] font-black uppercase tracking-widest text-muted-foreground">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {/* Direct Add Row */}
                                    <tr className="bg-emerald-500/[0.03] group hover:bg-emerald-500/[0.06] transition-colors border-b border-emerald-500/10">
                                        <td className="px-4 py-2 text-center">
                                            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 text-[10px] font-black italic">
                                                +
                                            </div>
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="text"
                                                placeholder="NUEVA CATEGORÍA..."
                                                className="w-full bg-background/50 border border-border rounded-lg px-3 py-1.5 text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all text-foreground"
                                                value={newCat.name}
                                                onChange={e => setNewCat({ ...newCat, name: e.target.value.toUpperCase() })}
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="number"
                                                className="w-full max-w-[80px] mx-auto bg-background/50 border border-border rounded-lg px-3 py-1.5 text-[10px] font-black outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all text-foreground text-center"
                                                value={newCat.minPoints === 0 && highestMax === -1 ? "" : newCat.minPoints}
                                                onChange={e => {
                                                    const val = parseInt(e.target.value);
                                                    setNewCat({ ...newCat, minPoints: isNaN(val) ? 0 : val });
                                                }}
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="number"
                                                className="w-full max-w-[80px] mx-auto bg-background/50 border border-border rounded-lg px-3 py-1.5 text-[10px] font-black outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all text-foreground text-center"
                                                value={newCat.maxPoints === 0 ? "" : newCat.maxPoints}
                                                onChange={e => {
                                                    const val = parseInt(e.target.value);
                                                    setNewCat({ ...newCat, maxPoints: isNaN(val) ? 0 : val });
                                                }}
                                            />
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            <button
                                                onClick={handleAdd}
                                                disabled={loading === "add" || !newCat.name}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[8px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all active:scale-95 disabled:opacity-30 shadow-sm"
                                            >
                                                {loading === "add" ? <Activity className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                                                AGREGAR
                                            </button>
                                        </td>
                                    </tr>

                                    {/* Categories Rows */}
                                    {categories.map((cat, idx) => {
                                        const isEditing = editingId === cat.id;

                                        return (
                                            <tr
                                                key={cat.id}
                                                className={`group hover:bg-muted/30 transition-colors ${loading === cat.id ? "opacity-30 pointer-events-none" : ""}`}
                                            >
                                                <td className="px-4 py-2.5">
                                                    <div className="w-7 h-7 rounded-lg bg-muted border border-border flex items-center justify-center text-[10px] font-black italic text-muted-foreground mx-auto">
                                                        {idx + 1}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    {isEditing ? (
                                                        <input
                                                            type="text"
                                                            className="w-full bg-background border border-emerald-500/30 rounded-lg px-3 py-1.5 text-[11px] font-black uppercase outline-none focus:ring-1 focus:ring-emerald-600 transition-all text-foreground"
                                                            value={editData.name}
                                                            onChange={e => setEditData({ ...editData, name: e.target.value.toUpperCase() })}
                                                        />
                                                    ) : (
                                                        <span className="text-[11px] font-black uppercase italic tracking-tight text-foreground group-hover:text-emerald-600 transition-colors">{cat.name}</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    {isEditing ? (
                                                        <input
                                                            type="number"
                                                            className="w-full max-w-[80px] mx-auto bg-background border border-emerald-500/30 rounded-lg px-3 py-1.5 text-[11px] font-black outline-none focus:ring-1 focus:ring-emerald-600 transition-all text-foreground text-center"
                                                            value={isNaN(editData.minPoints ?? 0) ? "" : editData.minPoints}
                                                            onChange={e => {
                                                                const val = parseInt(e.target.value);
                                                                setEditData({ ...editData, minPoints: isNaN(val) ? 0 : val });
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="text-center">
                                                            <span className="text-[11px] font-black italic text-foreground tracking-widest">{cat.minPoints}</span>
                                                            <span className="text-[7px] font-black text-muted-foreground ml-1">PTS</span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    {isEditing ? (
                                                        <input
                                                            type="number"
                                                            className="w-full max-w-[80px] mx-auto bg-background border border-emerald-500/30 rounded-lg px-3 py-1.5 text-[11px] font-black outline-none focus:ring-1 focus:ring-emerald-600 transition-all text-foreground text-center"
                                                            value={isNaN(editData.maxPoints ?? 0) ? "" : editData.maxPoints}
                                                            onChange={e => {
                                                                const val = parseInt(e.target.value);
                                                                setEditData({ ...editData, maxPoints: isNaN(val) ? 0 : val });
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="text-center">
                                                            <span className="text-[11px] font-black italic text-foreground tracking-widest">{cat.maxPoints}</span>
                                                            <span className="text-[7px] font-black text-muted-foreground ml-1">PTS</span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2.5 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {isEditing ? (
                                                            <>
                                                                <button
                                                                    onClick={() => handleSave(cat.id)}
                                                                    disabled={loading === cat.id}
                                                                    className="w-7 h-7 flex items-center justify-center bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-all active:scale-95 shadow-sm"
                                                                    title="GUARDAR"
                                                                >
                                                                    <Save className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={handleCancel}
                                                                    className="w-7 h-7 flex items-center justify-center bg-muted text-muted-foreground rounded-lg hover:text-foreground transition-all active:scale-95"
                                                                    title="CANCELAR"
                                                                >
                                                                    <X className="w-3.5 h-3.5" />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    onClick={() => handleEdit(cat)}
                                                                    className="w-7 h-7 flex items-center justify-center bg-muted text-muted-foreground rounded-lg hover:text-emerald-600 hover:border-emerald-500/30 border border-transparent transition-all active:scale-95"
                                                                    title="EDITAR"
                                                                >
                                                                    <Pencil className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(cat.id)}
                                                                    className="w-7 h-7 flex items-center justify-center bg-muted text-muted-foreground rounded-lg hover:text-rose-600 hover:border-rose-500/30 border border-transparent transition-all active:scale-95"
                                                                    title="ELIMINAR"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {categories.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-24 bg-card border-border rounded-[3rem] mt-4 flex flex-col items-center gap-6 relative overflow-hidden shadow-xl"
                    >
                        <div className="absolute inset-0 bg-emerald-500/5 blur-[80px]" />
                        <Layers className="w-16 h-16 text-muted-foreground/60 relative z-10" />
                        <div className="space-y-1 relative z-10">
                            <p className="text-foreground text-xl font-black uppercase italic tracking-[0.2em]">SISTEMA SIN NIVELES</p>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">INICIA LA CONFIGURACIÓN DESPLEGANDO LA PRIMERA CATEGORÍA</p>
                        </div>
                    </motion.div>
                )}
                {/* Footer Info */}
                <div className="mt-6 px-6 py-4 bg-muted/30 border border-border rounded-xl flex items-start gap-3">
                    <Info className="w-4 h-4 text-muted-foreground/70 shrink-0 mt-0.5" />
                    <p className="text-[8px] font-black uppercase tracking-[0.15em] text-muted-foreground italic leading-relaxed">
                        NÚCLEO DE INFRAESTRUCTURA: EL ORDEN DE LAS CATEGORÍAS ES AUTOMÁTICO BASADO EN LA CREACIÓN. LOS JUGADORES SERÁN ASIGNADOS SEGÚN EL RANGO DE PUNTOS DEFINIDO EN ESTA CONSOLA TÁCTICA.
                    </p>
                </div>
            </div>
        </div>
    );
}
