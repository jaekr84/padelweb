"use client";

import { useState } from "react";
import { Plus, Trash2, Save, MoveUp, MoveDown, Layers, Pencil, X } from "lucide-react";
import { addCategory, updateCategory, deleteCategory } from "./actions";
import { toast } from "sonner";

interface Category {
    id: string;
    name: string;
    minPoints: number;
    maxPoints: number;
    categoryOrder: number;
}

export default function CategoriesManager({ initialCategories }: { initialCategories: any[] }) {
    const [categories, setCategories] = useState<Category[]>(initialCategories);
    const [loading, setLoading] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<Partial<Category>>({});

    const [newCat, setNewCat] = useState({
        name: "",
        minPoints: 0,
        maxPoints: 1000,
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
            setNewCat({ name: "", minPoints: 0, maxPoints: 1000 });
            window.location.reload(); // Refresh to get the new ID and updated list
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
        <div className="space-y-6">
            {/* Add New Section */}
            <div className="bg-card border border-border p-6 md:p-10 rounded-[2.5rem] shadow-xl">
                <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground mb-6 flex items-center gap-2">
                    <Plus className="w-3.5 h-3.5" /> Nueva Categoría
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                        type="text"
                        placeholder="Nombre (ej: 5ta)"
                        className="bg-muted border border-border rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-foreground"
                        value={newCat.name}
                        onChange={e => setNewCat({ ...newCat, name: e.target.value })}
                    />
                    <div className="flex gap-2">
                        <input
                            type="number"
                            placeholder="Min"
                            className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-foreground"
                            value={isNaN(newCat.minPoints) ? "" : newCat.minPoints}
                            onChange={e => {
                                const val = parseInt(e.target.value);
                                setNewCat({ ...newCat, minPoints: isNaN(val) ? 0 : val });
                            }}
                        />
                        <input
                            type="number"
                            placeholder="Max"
                            className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-foreground"
                            value={isNaN(newCat.maxPoints) ? "" : newCat.maxPoints}
                            onChange={e => {
                                const val = parseInt(e.target.value);
                                setNewCat({ ...newCat, maxPoints: isNaN(val) ? 0 : val });
                            }}
                        />
                    </div>
                    <button
                        onClick={handleAdd}
                        disabled={loading === "add"}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-xl disabled:opacity-50 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                    >
                        {loading === "add" ? "Añadiendo..." : "Añadir Categoría"}
                    </button>
                </div>
            </div>

            {/* Categories Table/List */}
            <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-xl">
                {/* Table Header - Visible on all screens for the "table" look */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-8 py-5 bg-muted/30 border-b border-border text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                    <div className="col-span-1 text-center">#</div>
                    <div className="col-span-6">Categoría</div>
                    <div className="col-span-3">Rango de Puntos</div>
                    <div className="col-span-2 text-right">Acciones</div>
                </div>

                <div className="divide-y divide-border">
                    {categories.map((cat, idx) => {
                        const isEditing = editingId === cat.id;

                        return (
                            <div 
                                key={cat.id} 
                                className="grid grid-cols-12 gap-2 md:gap-4 px-4 py-4 md:px-8 md:py-6 items-center hover:bg-muted/20 transition-colors group"
                            >
                                {/* Order */}
                                <div className="col-span-2 md:col-span-1 flex justify-center">
                                    <div className="w-8 h-8 md:w-10 md:h-10 bg-muted rounded-xl flex items-center justify-center text-[10px] md:text-[11px] font-black text-muted-foreground border border-border/50">
                                        {idx + 1}
                                    </div>
                                </div>

                                {/* Name */}
                                <div className="col-span-6 md:col-span-6 flex flex-col">
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            className="bg-muted border border-border rounded-lg px-3 py-1 text-sm font-bold outline-none focus:border-indigo-500 transition-all text-foreground w-full"
                                            value={editData.name}
                                            onChange={e => setEditData({ ...editData, name: e.target.value })}
                                        />
                                    ) : (
                                        <>
                                            <div className="font-black uppercase italic tracking-tight text-foreground text-sm md:text-lg leading-none">
                                                {cat.name}
                                            </div>
                                            {/* Mobile-only sub-info */}
                                            <div className="md:hidden text-[8px] font-bold uppercase tracking-wider text-muted-foreground mt-1 flex items-center gap-2">
                                                <span>{cat.minPoints}-{cat.maxPoints} pts</span>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Points Range - Desktop */}
                                <div className="hidden md:block col-span-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    {isEditing ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                className="bg-muted border border-border rounded-lg px-2 py-1 text-[10px] font-bold outline-none focus:border-indigo-500 transition-all text-foreground w-20"
                                                value={isNaN(editData.minPoints ?? 0) ? "" : editData.minPoints}
                                                onChange={e => {
                                                    const val = parseInt(e.target.value);
                                                    setEditData({ ...editData, minPoints: isNaN(val) ? 0 : val });
                                                }}
                                            />
                                            <span className="text-border">—</span>
                                            <input
                                                type="number"
                                                className="bg-muted border border-border rounded-lg px-2 py-1 text-[10px] font-bold outline-none focus:border-indigo-500 transition-all text-foreground w-20"
                                                value={isNaN(editData.maxPoints ?? 0) ? "" : editData.maxPoints}
                                                onChange={e => {
                                                    const val = parseInt(e.target.value);
                                                    setEditData({ ...editData, maxPoints: isNaN(val) ? 0 : val });
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <>
                                            <span className="text-foreground">{cat.minPoints}</span>
                                            <span className="mx-2 text-border">—</span>
                                            <span className="text-foreground">{cat.maxPoints} pts</span>
                                        </>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="col-span-4 md:col-span-2 flex justify-end gap-2">
                                    {isEditing ? (
                                        <>
                                            <button
                                                onClick={() => handleSave(cat.id)}
                                                disabled={loading === cat.id}
                                                className="p-2.5 md:p-3 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-xl transition-all disabled:opacity-50 active:scale-90"
                                                title="Guardar"
                                            >
                                                <Save className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                            </button>
                                            <button
                                                onClick={handleCancel}
                                                className="p-2.5 md:p-3 bg-muted text-muted-foreground hover:bg-border rounded-xl transition-all active:scale-90"
                                                title="Cancelar"
                                            >
                                                <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => handleEdit(cat)}
                                                className="p-2.5 md:p-3 bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white rounded-xl transition-all active:scale-90"
                                                title="Editar"
                                            >
                                                <Pencil className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(cat.id)}
                                                disabled={loading === cat.id}
                                                className="p-2.5 md:p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all disabled:opacity-50 active:scale-90"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                {categories.length === 0 && (
                    <div className="text-center py-20 bg-muted/5 flex flex-col items-center gap-4">
                        <Layers className="w-12 h-12 text-muted-foreground opacity-20" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Sin categorías configuradas</span>
                    </div>
                )}
            </div>
        </div>
    );
}
