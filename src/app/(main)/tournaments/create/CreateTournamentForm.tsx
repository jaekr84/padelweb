"use client";

import { useState } from "react";
import { createTournament, updateTournament } from "./actions";
import {
    Camera,
    Calendar,
    Check,
    Trophy,
    Trash2,
    CheckCircle2,
    ChevronLeft,
    Sparkles,
    Target,
    Activity,
    Layers,
    Star
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const POINTS_PRESETS = [
    { label: "Estándar (1000/600/360/180)", winner: 1000, finalist: 600, semi: 360, quarter: 180 },
    { label: "Amateur (500/300/160/80)", winner: 500, finalist: 300, semi: 160, quarter: 80 },
    { label: "Personalizado", winner: 0, finalist: 0, semi: 0, quarter: 0 },
];

export type PointsConfig = { winner: number; finalist: number; semi: number; quarter: number };

export type InitialData = {
    id: string;
    name: string;
    description: string | null;
    surface: string | null;
    startDate: string | null;
    endDate: string | null;
    categories: string[] | null;
    pointsConfig: PointsConfig | null;
    imageUrl: string | null;
    modalidad: {
        mode: "categorias" | "libre";
        participacion: "pareja" | "individual";
        genero: "hombre" | "mujer" | "mixto";
    } | null;
};

function detectPreset(pc: PointsConfig | null): number {
    if (!pc) return 0;
    if (pc.winner === 1000 && pc.finalist === 600) return 0;
    if (pc.winner === 500 && pc.finalist === 300) return 1;
    return 2;
}

const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let width = img.width;
                let height = img.height;
                const MAX_SIZE = 1200;

                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                if (!ctx) return reject(new Error("Could not get canvas context"));

                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error("Error al comprimir la imagen"));
                    },
                    "image/jpeg",
                    0.82
                );
            };
        };
        reader.onerror = (error) => reject(error);
    });
};

export default function CreateTournamentForm({
    initialData,
    allCategoriesFromDb = ["1ra", "2da", "3ra", "4ta", "5ta", "6ta", "7ma", "8va", "9na"]
}: {
    initialData?: InitialData | null,
    allCategoriesFromDb?: string[]
}) {
    const isEditing = !!initialData;
    const router = useRouter();
    const cats = initialData?.categories ?? [];
    const isCatMode = cats.length === 0 || cats[0] !== "libre";
    const pc = initialData?.pointsConfig ?? null;
    const detectedPreset = detectPreset(pc);

    const [isLoading, setIsLoading] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(initialData?.imageUrl ?? null);
    const [imageUploading, setImageUploading] = useState(false);
    const [compressedFile, setCompressedFile] = useState<File | null>(null);

    const [info, setInfo] = useState({
        name: initialData?.name ?? "",
        startDate: initialData?.startDate ?? "",
        endDate: initialData?.endDate ?? "",
        description: initialData?.description ?? "",
        surface: initialData?.surface ?? "cemento",
    });

    const [modalidad, setModalidad] = useState({
        mode: initialData?.modalidad?.mode ?? (isCatMode ? "categorias" : "libre"),
        selectedCats: isCatMode ? cats : ([] as string[]),
        participacion: initialData?.modalidad?.participacion ?? "pareja",
        genero: initialData?.modalidad?.genero ?? "mixto",
    });

    const [preset, setPreset] = useState(detectedPreset);
    const [customPoints, setCustomPoints] = useState({
        winner: String(pc?.winner ?? 1000),
        finalist: String(pc?.finalist ?? 600),
        semi: String(pc?.semi ?? 360),
        quarter: String(pc?.quarter ?? 180),
    });

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageUploading(true);
        try {
            const blob = await compressImage(file);
            const cFile = new File([blob], "tournament.jpg", { type: "image/jpeg" });
            setCompressedFile(cFile);
            setImagePreview(URL.createObjectURL(cFile));
            toast.success("Imagen optimizada");
        } catch (err) {
            toast.error("Error al procesar la imagen");
        } finally {
            setImageUploading(false);
        }
    };

    const uploadImage = async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Error al subir la imagen");
        }
        const data = await res.json();
        return data.url;
    };

    const handleSubmit = async () => {
        if (!info.name) {
            toast.error("El nombre del torneo es obligatorio");
            return;
        }
        if (modalidad.mode === "categorias" && modalidad.selectedCats.length === 0) {
            toast.error("Debes seleccionar al menos una categoría");
            return;
        }

        setIsLoading(true);
        try {
            let imageUrl = imagePreview;

            if (compressedFile) {
                imageUrl = await uploadImage(compressedFile);
            }

            const finalCategories = modalidad.mode === "libre" ? ["libre"] : modalidad.selectedCats;
            const points = preset === 2 ? {
                winner: Number(customPoints.winner),
                finalist: Number(customPoints.finalist),
                semi: Number(customPoints.semi),
                quarter: Number(customPoints.quarter),
            } : POINTS_PRESETS[preset];

            const tournamentData = {
                name: info.name,
                description: info.description,
                surface: info.surface,
                startDate: info.startDate,
                endDate: info.endDate,
                categories: finalCategories,
                pointsConfig: points,
                imageUrl: imageUrl,
                modalidad: {
                    mode: modalidad.mode,
                    participacion: modalidad.participacion,
                    genero: modalidad.genero,
                }
            };

            if (isEditing && initialData) {
                await updateTournament(initialData.id, tournamentData);
                toast.success("Torneo actualizado correctamente");
            } else {
                await createTournament(tournamentData);
                toast.success("Torneo creado con éxito");
            }

            const getTargetProfileUrl = () => {
                if (typeof document === "undefined") return "/profile";
                const match = document.cookie.match(/(?:^|;\s*)__padel_role=([^;]+)/);
                const role = match ? decodeURIComponent(match[1]) : "jugador";
                return role === "club" ? "/profiles/club" : "/profile";
            };

            router.push(getTargetProfileUrl());
        } catch (err: any) {
            toast.error(err.message || "Error al guardar");
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0c] text-slate-200 pb-40 pt-6 px-4 font-sans selection:bg-indigo-500/30">
            <div className="max-w-3xl mx-auto flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                
                {/* Header Superior */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <button 
                            onClick={() => router.back()} 
                            className="group w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 hover:text-white hover:border-slate-700 transition-all active:scale-95"
                        >
                            <ChevronLeft className="h-6 w-6 group-hover:-translate-x-0.5 transition-transform" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">
                                {isEditing ? "Editar Torneo" : "Nuevo Torneo"}
                            </h1>
                            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-indigo-500/60">Gestión de Competición ACAP</p>
                        </div>
                    </div>
                    <Trophy className="w-10 h-10 text-indigo-500 opacity-20 hidden md:block" />
                </div>

                <div className="grid grid-cols-1 gap-10">
                    
                    {/* SECCIÓN 1: IDENTIDAD VISUAL Y GENERAL */}
                    <div className="flex flex-col gap-6">
                        <div className="flex items-center gap-3 px-2">
                            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center border border-indigo-500/30">
                                <Sparkles className="w-4 h-4 text-indigo-400" />
                            </div>
                            <h2 className="text-xs font-black uppercase tracking-widest text-white/50 italic">Información Principal</h2>
                        </div>

                        <div className="bg-slate-900/40 border border-slate-800/60 rounded-[2.5rem] p-8 backdrop-blur-sm shadow-2xl space-y-8">
                            {/* Banner Upload */}
                            <div className="relative group overflow-hidden rounded-3xl border border-slate-800 aspect-[21/9] bg-slate-950/50">
                                {imagePreview ? (
                                    <>
                                        <img src={imagePreview} className="w-full h-full object-cover opacity-60 transition-transform duration-700 group-hover:scale-105" alt="Banner Preview" />
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm">
                                            <button
                                                type="button"
                                                onClick={() => setImagePreview(null)}
                                                className="w-14 h-14 rounded-full bg-red-500 text-white flex items-center justify-center shadow-2xl active:scale-90 transition-all"
                                            >
                                                <Trash2 className="h-6 w-6" />
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <label className="w-full h-full flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-slate-900 transition-all border-2 border-dashed border-slate-800 hover:border-indigo-500/30">
                                        <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center">
                                            {imageUploading ? <Activity className="h-8 w-8 text-indigo-500 animate-spin" /> : <Camera className="h-8 w-8 text-indigo-500" />}
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Subir Banner del Torneo</p>
                                            <span className="text-[9px] font-medium text-slate-600">Recomendado: 1200x500px</span>
                                        </div>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                    </label>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Nombre del Evento</label>
                                    <input
                                        type="text"
                                        value={info.name}
                                        onChange={e => setInfo({ ...info, name: e.target.value })}
                                        className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-5 px-6 text-white text-lg font-black uppercase italic tracking-tight outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                        placeholder="Ej: MASTER SERIES 2024"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Fecha de Inicio</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <input
                                            type="date"
                                            value={info.startDate}
                                            onChange={e => setInfo({ ...info, startDate: e.target.value })}
                                            className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-4 pl-12 pr-5 text-white text-xs font-bold outline-none focus:border-indigo-500 transition-all appearance-none"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Fecha de Finalización</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <input
                                            type="date"
                                            value={info.endDate}
                                            onChange={e => setInfo({ ...info, endDate: e.target.value })}
                                            className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-4 pl-12 pr-5 text-white text-xs font-bold outline-none focus:border-indigo-500 transition-all appearance-none"
                                        />
                                    </div>
                                </div>

                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Descripción y Premios</label>
                                    <textarea
                                        value={info.description}
                                        onChange={e => setInfo({ ...info, description: e.target.value })}
                                        rows={4}
                                        className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-4 px-6 text-slate-300 text-sm font-medium leading-relaxed outline-none focus:border-indigo-500 transition-all resize-none"
                                        placeholder="Detalles sobre el formato del torneo, premios para ganadores, etc..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN 2: REGLAS Y COMPETICIÓN */}
                    <div className="flex flex-col gap-6">
                        <div className="flex items-center gap-3 px-2">
                            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center border border-indigo-500/30">
                                <Target className="w-4 h-4 text-indigo-400" />
                            </div>
                            <h2 className="text-xs font-black uppercase tracking-widest text-white/50 italic">Modalidad de Juego</h2>
                        </div>

                        <div className="bg-slate-900/40 border border-slate-800/60 rounded-[2.5rem] p-8 backdrop-blur-sm shadow-2xl space-y-10">
                            
                            {/* Toggle Modo */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Formato de Categorización</label>
                                <div className="bg-slate-950/50 p-2 rounded-2xl border border-slate-800 flex gap-2">
                                    <button
                                        onClick={() => setModalidad({ ...modalidad, mode: "categorias" })}
                                        className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${modalidad.mode === "categorias" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-slate-500 hover:text-slate-300"}`}
                                    >
                                        <Layers className="w-4 h-4" />
                                        Múltiples Categorías
                                    </button>
                                    <button
                                        onClick={() => setModalidad({ ...modalidad, mode: "libre" })}
                                        className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${modalidad.mode === "libre" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-slate-500 hover:text-slate-300"}`}
                                    >
                                        <Activity className="w-4 h-4" />
                                        Categoría única / Libre
                                    </button>
                                </div>
                            </div>

                            {modalidad.mode === "categorias" && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
                                    <p className="text-[10px] font-black uppercase text-indigo-500/60 italic ml-2">Selección de Categorías</p>
                                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                                        {allCategoriesFromDb.map((cat, idx) => {
                                            const isSelected = modalidad.selectedCats.includes(cat);
                                            return (
                                                <button
                                                    key={`${cat}-${idx}`}
                                                    onClick={() => {
                                                        const next = isSelected
                                                            ? modalidad.selectedCats.filter(c => c !== cat)
                                                            : [...modalidad.selectedCats, cat].sort();
                                                        setModalidad({ ...modalidad, selectedCats: next });
                                                    }}
                                                    className={`py-3.5 rounded-xl border transition-all text-[11px] font-bold uppercase ${isSelected ? "bg-indigo-600 border-indigo-500 text-white shadow-indigo-900/40" : "bg-slate-950/50 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300"}`}
                                                >
                                                    {cat}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Participación</label>
                                    <select
                                        value={modalidad.participacion}
                                        onChange={e => setModalidad({ ...modalidad, participacion: e.target.value as any })}
                                        className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-4 px-5 text-white text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-500 transition-all appearance-none"
                                    >
                                        <option value="pareja">Parejas</option>
                                        <option value="individual">Individual</option>
                                    </select>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Género</label>
                                    <select
                                        value={modalidad.genero}
                                        onChange={e => setModalidad({ ...modalidad, genero: e.target.value as any })}
                                        className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-4 px-5 text-white text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-500 transition-all appearance-none"
                                    >
                                        <option value="mixto">Mixto</option>
                                        <option value="hombre">Solo Hombres</option>
                                        <option value="mujer">Solo Mujeres</option>
                                    </select>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Superficie</label>
                                    <select
                                        value={info.surface}
                                        onChange={e => setInfo({ ...info, surface: e.target.value })}
                                        className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-4 px-5 text-white text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-500 transition-all appearance-none"
                                    >
                                        <option value="sintetico">Césped Sintético</option>
                                        <option value="cemento">Cemento</option>
                                        <option value="alfombra">Alfombra Pro</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN 3: PUNTUACIÓN Y RANKING */}
                    <div className="flex flex-col gap-6">
                        <div className="flex items-center gap-3 px-2">
                            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center border border-indigo-500/30">
                                <Star className="w-4 h-4 text-indigo-400" />
                            </div>
                            <h2 className="text-xs font-black uppercase tracking-widest text-white/50 italic">Sistema de Puntos (Ranking)</h2>
                        </div>

                        <div className="bg-slate-900/40 border border-slate-800/60 rounded-[2.5rem] p-8 backdrop-blur-sm shadow-2xl space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {POINTS_PRESETS.map((p, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setPreset(i)}
                                        className={`p-5 rounded-2xl border transition-all text-left flex flex-col gap-2 relative overflow-hidden group ${preset === i ? "bg-indigo-600 border-indigo-500 shadow-xl shadow-indigo-900/40" : "bg-slate-950/50 border-slate-800 hover:border-slate-700"}`}
                                    >
                                        <span className={`text-[10px] font-black uppercase tracking-tighter ${preset === i ? "text-white" : "text-slate-500"}`}>{p.label}</span>
                                        {p.winner > 0 && (
                                            <span className={`text-[10px] font-bold ${preset === i ? "text-indigo-200" : "text-slate-600"}`}>
                                                {p.winner} / {p.finalist} / {p.semi}
                                            </span>
                                        )}
                                        {preset === i && (
                                            <div className="absolute top-3 right-3 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                                                <Check className="w-2.5 h-2.5 text-indigo-600 font-black" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {preset === 2 && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-in slide-in-from-top-4 duration-500 pt-4 border-t border-slate-800/50">
                                    {[
                                        { id: "winner", label: "Campeón" },
                                        { id: "finalist", label: "Final" },
                                        { id: "semi", label: "Semis" },
                                        { id: "quarter", label: "Cuartos" }
                                    ].map(k => (
                                        <div key={k.id} className="space-y-2 text-center">
                                            <label className="text-[8px] font-black uppercase text-indigo-500/50">{k.label}</label>
                                            <input
                                                type="number"
                                                value={customPoints[k.id as keyof typeof customPoints]}
                                                onChange={e => setCustomPoints({ ...customPoints, [k.id]: e.target.value })}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-2 text-center text-sm font-black italic tracking-tighter text-white outline-none focus:border-indigo-500"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Flotante Acciones */}
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 z-40">
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="w-full shadow-2xl shadow-indigo-900/60 bg-indigo-600 hover:bg-indigo-500 text-white py-6 rounded-3xl font-black uppercase italic tracking-tighter flex items-center justify-center gap-4 transition-all active:scale-[0.98] disabled:opacity-50 group border border-indigo-400/20"
                    >
                        {isLoading ? (
                            <Activity className="h-6 w-6 animate-spin" />
                        ) : (
                            <CheckCircle2 className="h-6 w-6 group-hover:scale-110 transition-transform" />
                        )}
                        <span className="text-lg">
                            {isEditing ? "Guardar Cambios del Torneo" : "Publicar Torneo Oficial"}
                        </span>
                    </button>
                </div>

            </div>
        </div>
    );
}
