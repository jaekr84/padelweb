"use client";

import { useState } from "react";
import { Plus, Trash2, Link as LinkIcon, Image as ImageIcon, Check, X, Loader2, ArrowLeft, Info, Edit, Undo, Save } from "lucide-react";
import { addSponsor, deleteSponsor, updateSponsor } from "@/app/actions/sponsors";
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
    const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);
    const [loading, setLoading] = useState(false);

    // Form state
    const [newName, setNewName] = useState("");
    const [newLink, setNewLink] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const processSponsorImage = (file: File): Promise<File> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new window.Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    const ctx = canvas.getContext("2d");
                    if (!ctx) return reject("Could not create canvas context");

                    // Definimos el "tamaño ideal" (2:1 para los banners)
                    const targetWidth = 800;
                    const targetHeight = 400;

                    canvas.width = targetWidth;
                    canvas.height = targetHeight;

                    // Limpiamos el fondo (transparente)
                    ctx.clearRect(0, 0, targetWidth, targetHeight);

                    // Escalado "contain": el logo entra COMPLETO en el canvas, sin recortar.
                    // El sobrante queda transparente (luego el sidebar lo rellena con un
                    // fondo difuso de los propios colores del logo).
                    const imgRatio = img.width / img.height;
                    const targetRatio = targetWidth / targetHeight;

                    let drawWidth, drawHeight;
                    if (imgRatio > targetRatio) {
                        // La imagen es más ancha -> ajustamos al ancho (entra completa)
                        drawWidth = targetWidth;
                        drawHeight = targetWidth / imgRatio;
                    } else {
                        // La imagen es más alta -> ajustamos al alto (entra completa)
                        drawHeight = targetHeight;
                        drawWidth = targetHeight * imgRatio;
                    }

                    // Centramos la imagen en el canvas
                    const x = (targetWidth - drawWidth) / 2;
                    const y = (targetHeight - drawHeight) / 2;

                    ctx.drawImage(img, x, y, drawWidth, drawHeight);

                    // Exportamos como File
                    canvas.toBlob(async (blob) => {
                        if (!blob) return reject("Blob creation failed");
                        const processedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".png", {
                            type: "image/png",
                            lastModified: Date.now(),
                        });
                        resolve(processedFile);
                    }, "image/png", 0.9);
                };
            };
            reader.onerror = (err) => reject(err);
        });
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        try {
            // 1. Procesamiento de Redimensionado y Centrado (Canvas)
            const processedFile = await processSponsorImage(file);

            // 2. Compresión Final (Optimización de peso)
            const options = {
                maxSizeMB: 0.1, // Aún más ligero < 100KB ya que es solo el logo
                maxWidthOrHeight: 800,
                useWebWorker: true,
                fileType: 'image/png'
            };

            const compressedFile = await imageCompression(processedFile, options);
            setSelectedFile(compressedFile);
            setPreviewUrl(URL.createObjectURL(compressedFile));
            toast.success("Imagen procesada y adaptada automáticamente.");
        } catch (error) {
            console.error(error);
            toast.error("Error al procesar la imagen.");
        } finally {
            setLoading(false);
        }
    };

    const handleEditSponsor = (sponsor: Sponsor) => {
        setEditingSponsor(sponsor);
        setNewName(sponsor.name);
        setNewLink(sponsor.link || "");
        setPreviewUrl(sponsor.imageUrl);
        setIsAdding(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setIsAdding(false);
        setEditingSponsor(null);
        setNewName("");
        setNewLink("");
        setSelectedFile(null);
        setPreviewUrl(null);
    };

    const handleSaveSponsor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName || (!selectedFile && !editingSponsor)) {
            toast.error("Nombre e imagen son obligatorios");
            return;
        }

        setLoading(true);
        try {
            let imageUrl = editingSponsor?.imageUrl;

            // 1. If new file selected, upload it
            if (selectedFile) {
                const formData = new FormData();
                formData.append("file", selectedFile);

                const uploadRes = await fetch("/api/upload", {
                    method: "POST",
                    body: formData
                });

                if (!uploadRes.ok) throw new Error("Error al subir imagen");
                const { url } = await uploadRes.json();
                imageUrl = url;
            }

            // 2. Add or Update
            if (editingSponsor) {
                await updateSponsor(editingSponsor.id, {
                    name: newName,
                    imageUrl: imageUrl!,
                    link: newLink || undefined,
                });
                toast.success("Sponsor actualizado con éxito");
            } else {
                await addSponsor({
                    name: newName,
                    imageUrl: imageUrl!,
                    link: newLink || undefined
                });
                toast.success("Sponsor agregado con éxito");
            }

            // Reset form and reload
            handleCancelEdit();
            window.location.reload();
        } catch (error: any) {
            toast.error(error.message || "Error al procesar sponsor");
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
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border pb-10">
                <div className="space-y-1">
                    <Link href="/admin" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-azul-primary hover:text-celeste transition-colors mb-4 group">
                        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                        Volver al Panel
                    </Link>
                    <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter text-foreground">
                        Gestión de <span className="text-azul-primary italic">Sponsors</span>
                    </h1>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                        Administrá las marcas que acompañan a ACAP.
                    </p>
                </div>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="bg-azul-primary hover:bg-azul-dark text-white font-black uppercase tracking-widest text-[10px] py-4 px-8 rounded-2xl shadow-xl shadow-azul-primary/10 transition-all active:scale-95 flex items-center gap-3"
                    >
                        <Plus className="w-4 h-4" />
                        Agregar Sponsor
                    </button>
                )}
            </div>

            {/* Add Sponsor Form */}
            {isAdding && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="bg-card border border-border rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-azul-primary/5 rounded-full blur-[80px] -z-10" />
                        <h2 className="text-xl font-black uppercase italic tracking-tight text-foreground mb-8">
                            {editingSponsor ? "Editar Sponsor" : "Nuevo Sponsor"}
                        </h2>

                        <form onSubmit={handleSaveSponsor} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6 text-left">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Nombre de la Marca</label>
                                        <input
                                            type="text"
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            placeholder="Ej: Wilson, Bullpadel..."
                                            className="w-full bg-muted/40 border border-border rounded-2xl px-5 py-4 text-foreground focus:outline-none focus:ring-1 focus:ring-azul-primary/50 transition-all"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Link Web (Opcional)</label>
                                        <div className="relative">
                                            <LinkIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <input
                                                type="url"
                                                value={newLink}
                                                onChange={(e) => setNewLink(e.target.value)}
                                                placeholder="https://wilson.com"
                                                className="w-full bg-muted/40 border border-border rounded-2xl pl-12 pr-5 py-4 text-foreground focus:outline-none focus:ring-1 focus:ring-azul-primary/50 transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Logo del Sponsor</label>
                                                <div className="flex items-center gap-1 text-[9px] font-bold text-azul-primary bg-azul-primary/10 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                                    <ImageIcon className="w-2.5 h-2.5" />
                                                    {editingSponsor ? "Opcional (cambiar)" : "Recomendado"}
                                                </div>
                                            </div>
                                            <div className="relative group">
                                                {previewUrl ? (
                                                    <div className="w-full h-48 bg-muted/40 border-2 border-dashed border-azul-primary/30 rounded-2xl overflow-hidden flex items-center justify-center p-8 group-hover:border-azul-primary/60 transition-all">
                                                        <div className="relative w-full h-full">
                                                            <Image src={previewUrl} alt="Preview" fill className="object-contain" />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="w-full h-48 bg-muted/40 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-3 text-muted-foreground group-hover:text-slate-300 group-hover:border-azul-primary/30 transition-all">
                                                        <ImageIcon className="w-8 h-8" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Subir Imagen</span>
                                                    </div>
                                                )}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleFileSelect}
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                />
                                            </div>
                                        </div>

                                        {/* Preview de cómo se ve en el sidebar */}
                                        {previewUrl && (
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Vista en el sidebar</label>
                                                <div className="flex items-center gap-4">
                                                    <div className="w-44 rounded-xl overflow-hidden border border-border shadow-xl bg-white shrink-0">
                                                        {/* Celda real del sponsor — mismo ancho (176px) y altura que el sidebar */}
                                                        <div className="relative h-[112px] overflow-hidden border-b border-slate-100 bg-white px-3 py-2">
                                                            <img src={previewUrl} alt="Vista previa" className="w-full h-full object-contain" />
                                                        </div>
                                                        {/* Celda vecina (mismo tamaño) para dar contexto */}
                                                        <div className="h-[112px] bg-slate-50 flex items-center justify-center">
                                                            <span className="text-[7px] font-bold uppercase tracking-widest text-slate-300">Otro sponsor</span>
                                                        </div>
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground leading-relaxed flex-1">
                                                        Así se verá tu logo en el sidebar: <span className="text-celeste">completo</span> y centrado sobre un fondo claro uniforme, igual que el resto de los sponsors. Sin recortes.
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Clarification Box */}
                                        <div className="bg-azul-primary/5 border border-azul-primary/10 rounded-2xl p-5 space-y-3">
                                            <div className="flex items-center gap-2 text-azul-primary">
                                                <Info className="w-4 h-4" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Recomendaciones de Imagen</span>
                                            </div>
                                            <ul className="space-y-2">
                                                <li className="flex items-start gap-2">
                                                    <div className="w-1 h-1 rounded-full bg-azul-primary mt-1.5 shrink-0" />
                                                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                                                        <strong className="text-foreground">Subí cualquier imagen:</strong> el logo siempre se muestra <span className="text-celeste">completo, sin recortes</span>, sin importar el tamaño o la proporción del archivo.
                                                    </p>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <div className="w-1 h-1 rounded-full bg-azul-primary mt-1.5 shrink-0" />
                                                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                                                        <strong className="text-foreground">Mejor sobre fondo claro:</strong> ideal un logo con fondo <span className="text-celeste">transparente o blanco</span>. Evitá subir fotos o capturas con cuadritos de transparencia.
                                                    </p>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <div className="w-1 h-1 rounded-full bg-azul-primary mt-1.5 shrink-0" />
                                                    <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                                                        <strong className="text-foreground">Mejor calidad:</strong> para máxima nitidez, idealmente un logo de <span className="text-foreground">~800 px de ancho</span> o más.
                                                    </p>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="submit"
                                    disabled={loading || (!selectedFile && !editingSponsor)}
                                    className="flex-1 bg-azul-primary text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-azul-dark hover:scale-[1.02] active:scale-95 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : editingSponsor ? <Save className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                                    {editingSponsor ? "Guardar Cambios" : "Guardar Sponsor"}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    className="px-8 bg-muted text-foreground font-black uppercase tracking-widest text-[10px] py-4 rounded-2xl border border-border hover:bg-rose-900/40 hover:text-rose-400 hover:border-rose-900/50 transition-all"
                                >
                                    {editingSponsor ? <Undo className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Sponsors Grid */}
            <div className="space-y-6">
                <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground flex items-center gap-3">
                    <span className="w-8 h-px bg-white/10" /> Marcas Registradas
                </h2>

                {sponsors.length === 0 ? (
                    <div className="bg-card/40 border border-border rounded-[2rem] p-20 text-center flex flex-col items-center gap-4">
                        <ImageIcon className="w-12 h-12 text-slate-700" />
                        <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs italic">No hay sponsors registrados aún.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {sponsors.map((sponsor) => (
                            <div key={sponsor.id} className="group relative bg-card border border-border rounded-2xl p-6 transition-all hover:border-azul-primary/40 hover:shadow-2xl hover:shadow-azul-primary/5">
                                <div className="h-24 relative mb-4">
                                    <Image
                                        src={sponsor.imageUrl}
                                        alt={sponsor.name}
                                        fill
                                        className="object-contain filter grayscale group-hover:grayscale-0 transition-all duration-500"
                                        sizes="120px"
                                    />
                                </div>
                                <div className="text-center space-y-2">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground truncate px-2">{sponsor.name}</h4>
                                    {sponsor.link && (
                                        <p className="text-[8px] font-bold text-azul-primary truncate lowercase opacity-60">
                                            {sponsor.link.replace(/^https?:\/\//, '')}
                                        </p>
                                    )}
                                </div>
                                <div className="absolute -top-2 -right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleEditSponsor(sponsor)}
                                        className="p-2 bg-azul-primary text-white rounded-full hover:bg-azul-dark shadow-xl transition-colors"
                                        title="Editar"
                                    >
                                        <Edit className="w-3 h-3" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteSponsor(sponsor.id)}
                                        className="p-2 bg-rose-900 text-rose-100 rounded-full hover:bg-rose-600 shadow-xl transition-colors"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
