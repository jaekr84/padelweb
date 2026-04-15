"use client";

import { useState } from "react";
import { Plus, Trash2, Link as LinkIcon, Image as ImageIcon, Check, X, Loader2, ArrowLeft } from "lucide-react";
import { addSponsor, deleteSponsor } from "@/app/actions/sponsors";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";
import imageCompression from "browser-image-compression";

interface Sponsor {
    id: string;
    name: string;
    imageUrl: string;
    link: string | null;
    isActive: boolean | null;
    createdAt: Date;
}

interface Props {
    initialSponsors: Sponsor[];
}

export default function SponsorManagementClient({ initialSponsors }: Props) {
    const [sponsors, setSponsors] = useState<Sponsor[]>(initialSponsors);
    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // Form state
    const [newName, setNewName] = useState("");
    const [newLink, setNewLink] = useState("https://");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.includes("png")) {
            toast.error("Por favor, subí una imagen PNG con fondo transparente.");
            // We'll still try to process it but let's warn the user.
        }

        setLoading(true);
        try {
            // Options for compression
            const options = {
                maxSizeMB: 0.2, // Target weight < 200KB
                maxWidthOrHeight: 800,
                useWebWorker: true,
                fileType: 'image/png' // Force PNG for transparency
            };

            const compressedFile = await imageCompression(file, options);
            setSelectedFile(compressedFile);
            setPreviewUrl(URL.createObjectURL(compressedFile));
            toast.success("Imagen procesada y optimizada correctamente.");
        } catch (error) {
            console.error(error);
            toast.error("Error al procesar la imagen.");
        } finally {
            setLoading(false);
        }
    };

    const handleAddSponsor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName || !selectedFile) {
            toast.error("Nombre e imagen son obligatorios");
            return;
        }

        setLoading(true);
        try {
            // 1. Upload the optimized file
            const formData = new FormData();
            formData.append("file", selectedFile);
            
            const uploadRes = await fetch("/api/upload", {
                method: "POST",
                body: formData
            });

            if (!uploadRes.ok) throw new Error("Error al subir imagen");
            const { url } = await uploadRes.json();

            // 2. Save sponsor to DB
            await addSponsor({
                name: newName,
                imageUrl: url,
                link: newLink || undefined
            });

            toast.success("Sponsor agregado con éxito");
            
            // Reset form
            setNewName("");
            setNewLink("https://");
            setSelectedFile(null);
            setPreviewUrl(null);
            setIsAdding(false);
            
            // Refresh list (simplified, in a real app better to optimistic update or router.refresh)
            window.location.reload();
        } catch (error: any) {
            toast.error(error.message || "Error al agregar sponsor");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSponsor = async (id: string) => {
        if (!confirm("¿Estás seguro de que querés eliminar este sponsor?")) return;

        setLoading(true);
        try {
            await deleteSponsor(id);
            setSponsors(sponsors.filter(s => s.id !== id));
            toast.success("Sponsor eliminado");
        } catch (error: any) {
            toast.error(error.message || "Error al eliminar");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-12 pb-24 font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-10">
                <div className="space-y-1">
                    <Link href="/admin" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:text-emerald-400 transition-colors mb-4 group">
                        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                        Volver al Panel
                    </Link>
                    <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter text-white">
                        Gestión de <span className="text-emerald-500 italic">Sponsors</span>
                    </h1>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">
                        Administrá las marcas que acompañan a ACAP.
                    </p>
                </div>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-[10px] py-4 px-8 rounded-2xl shadow-xl shadow-emerald-500/10 transition-all active:scale-95 flex items-center gap-3"
                    >
                        <Plus className="w-4 h-4" />
                        Agregar Sponsor
                    </button>
                )}
            </div>

            {/* Add Sponsor Form */}
            {isAdding && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] -z-10" />
                        <h2 className="text-xl font-black uppercase italic tracking-tight text-white mb-8">Nuevo Sponsor</h2>
                        
                        <form onSubmit={handleAddSponsor} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6 text-left">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Nombre de la Marca</label>
                                        <input
                                            type="text"
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            placeholder="Ej: Wilson, Bullpadel..."
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Link Web (Opcional)</label>
                                        <div className="relative">
                                            <LinkIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                            <input
                                                type="url"
                                                value={newLink}
                                                onChange={(e) => setNewLink(e.target.value)}
                                                placeholder="https://wilson.com"
                                                className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-5 py-4 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Logo (PNG transparente)</label>
                                        <div className="relative group">
                                            {previewUrl ? (
                                                <div className="w-full hidden h-48 bg-black/40 border-2 border-dashed border-emerald-500/30 rounded-2xl overflow-hidden md:flex items-center justify-center p-8 group-hover:border-emerald-500/60 transition-all">
                                                    <div className="relative w-full h-full">
                                                        <Image src={previewUrl} alt="Preview" fill className="object-contain" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="w-full h-48 bg-black/40 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-3 text-slate-500 group-hover:text-slate-300 group-hover:border-emerald-500/30 transition-all">
                                                    <ImageIcon className="w-8 h-8" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Subir PNG</span>
                                                </div>
                                            )}
                                            <input
                                                type="file"
                                                accept="image/png"
                                                onChange={handleFileSelect}
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                            />
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-600 italic">La imagen se ajustará a máximo 800px para optimizar la velocidad.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="submit"
                                    disabled={loading || !selectedFile}
                                    className="flex-1 bg-white text-black font-black uppercase tracking-widest text-[10px] py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-emerald-400 hover:scale-[1.02] active:scale-95 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    Guardar Sponsor
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsAdding(false);
                                        setPreviewUrl(null);
                                        setSelectedFile(null);
                                    }}
                                    className="px-8 bg-slate-800 text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-2xl border border-white/10 hover:bg-rose-900/40 hover:text-rose-400 hover:border-rose-900/50 transition-all"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Sponsors Grid */}
            <div className="space-y-6">
                <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 flex items-center gap-3">
                    <span className="w-8 h-px bg-white/10" /> Marcas Registradas
                </h2>
                
                {sponsors.length === 0 ? (
                    <div className="bg-slate-900/40 border border-white/5 rounded-[2rem] p-20 text-center flex flex-col items-center gap-4">
                        <ImageIcon className="w-12 h-12 text-slate-700" />
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs italic">No hay sponsors registrados aún.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {sponsors.map((sponsor) => (
                            <div key={sponsor.id} className="group relative bg-slate-900 border border-white/10 rounded-2xl p-6 transition-all hover:border-emerald-500/40 hover:shadow-2xl hover:shadow-emerald-500/5">
                                <div className="h-24 relative mb-4">
                                    <Image
                                        src={sponsor.imageUrl}
                                        alt={sponsor.name}
                                        fill
                                        className="object-contain filter grayscale group-hover:grayscale-0 transition-all duration-500"
                                    />
                                </div>
                                <div className="text-center space-y-2">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-white truncate px-2">{sponsor.name}</h4>
                                    {sponsor.link && (
                                        <p className="text-[8px] font-bold text-emerald-500 truncate lowercase opacity-60">
                                            {sponsor.link.replace(/^https?:\/\//, '')}
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleDeleteSponsor(sponsor.id)}
                                    className="absolute -top-2 -right-2 p-2 bg-rose-900 text-rose-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600 shadow-xl"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
