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
import { ThemeToggle } from "@/components/ThemeToggle";


export type PointsConfig = { winner: number; finalist: number; semi: number; quarter: number };

export type InitialData = {
    id: string;
    name: string;
    description: string | null;
    startDate: string | null;
    endDate: string | null;
    openDateClub: string | null;
    openDateGeneral: string | null;
    categories: string[] | null;
    pointsConfig: PointsConfig | null;
    imageUrl: string | null;
    surface: string | null;
    modalidad: {
        mode: "categorias" | "libre";
        participacion: "pareja" | "individual";
        genero: "hombre" | "mujer" | "mixto";
    } | null;
};


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
    allCategoriesFromDb = ["A+", "A", "B", "C", "D"]
}: {
    initialData?: InitialData | null,
    allCategoriesFromDb?: string[]
}) {
    const isEditing = !!initialData;
    const router = useRouter();
    const cats = initialData?.categories ?? [];
    const isCatMode = cats.length === 0 || cats[0] !== "libre";
    const pc = initialData?.pointsConfig ?? null;

    const [isLoading, setIsLoading] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(initialData?.imageUrl ?? null);
    const [imageUploading, setImageUploading] = useState(false);
    const [compressedFile, setCompressedFile] = useState<File | null>(null);

    const [info, setInfo] = useState({
        name: initialData?.name ?? "",
        startDate: initialData?.startDate ?? "",
        endDate: initialData?.endDate ?? "",
        openDateClub: initialData?.openDateClub ?? "",
        openDateGeneral: initialData?.openDateGeneral ?? "",
        description: initialData?.description ?? "",
    });

    const [modalidad, setModalidad] = useState({
        mode: initialData?.modalidad?.mode ?? (isCatMode ? "categorias" : "libre"),
        selectedCats: isCatMode ? cats : ([] as string[]),
        participacion: initialData?.modalidad?.participacion ?? "pareja",
        genero: initialData?.modalidad?.genero ?? "mixto",
    });

    const [customPoints, setCustomPoints] = useState({
        winner: String(pc?.winner ?? 1000),
        finalist: String(pc?.finalist ?? 600),
        semi: String(pc?.semi ?? 360),
        quarter: String(pc?.quarter ?? 180),
        octavos: String((pc as any)?.octavos ?? 90),
        groupMatchWin: String((pc as any)?.groupMatchWin ?? 40),
        participation: String((pc as any)?.participation ?? 20),
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
            const points = {
                winner: Number(customPoints.winner),
                finalist: Number(customPoints.finalist),
                semi: Number(customPoints.semi),
                quarter: Number(customPoints.quarter),
                octavos: Number(customPoints.octavos),
                groupMatchWin: Number(customPoints.groupMatchWin),
                participation: Number(customPoints.participation),
            };

            const tournamentData = {
                name: info.name,
                description: info.description,
                startDate: info.startDate,
                endDate: info.endDate,
                openDateClub: info.openDateClub,
                openDateGeneral: info.openDateGeneral,
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
                await createTournament(tournamentData as any);
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
        <div className="min-h-screen bg-background text-foreground pb-20 pt-6 px-4 font-sans selection:bg-indigo-500/30 transition-colors duration-300">
            <div className="max-w-3xl mx-auto flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                
                {/* Header Superior */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <button 
                            onClick={() => router.back()} 
                            className="group w-12 h-12 rounded-2xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-accent transition-all active:scale-95"
                        >
                            <ChevronLeft className="h-6 w-6 group-hover:-translate-x-0.5 transition-transform" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">
                                {isEditing ? "Editar Torneo" : "Nuevo Torneo"}
                            </h1>
                            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-indigo-500/60 transition-colors">Gestión de Competición ACAP</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        <Trophy className="w-10 h-10 text-indigo-500 opacity-20 hidden md:block" />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-10">
                    
                    {/* SECCIÓN 1: IDENTIDAD VISUAL Y GENERAL */}
                    <div className="flex flex-col gap-6">
                        <div className="flex items-center gap-3 px-2">
                            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center border border-indigo-500/30">
                                <Sparkles className="w-4 h-4 text-indigo-400" />
                            </div>
                            <h2 className="text-xs font-black uppercase tracking-widest text-foreground/50 italic">Información Principal</h2>
                        </div>

                        <div className="bg-card/40 border border-border rounded-[2.5rem] p-8 backdrop-blur-sm shadow-2xl space-y-8 transition-colors">
                            {/* Banner Upload */}
                            <div className="relative group overflow-hidden rounded-3xl border border-border aspect-[21/9] bg-muted/50 transition-colors">
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
                                    <label className="w-full h-full flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-muted transition-all border-2 border-dashed border-border hover:border-indigo-500/30">
                                        <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center">
                                            {imageUploading ? <Activity className="h-8 w-8 text-indigo-500 animate-spin" /> : <Camera className="h-8 w-8 text-indigo-500" />}
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Subir Banner del Torneo</p>
                                            <span className="text-[9px] font-medium text-muted-foreground/60">Recomendado: 1200x500px</span>
                                        </div>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                    </label>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-foreground">
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-2">Nombre del Evento</label>
                                    <input
                                        type="text"
                                        value={info.name}
                                        onChange={e => setInfo({ ...info, name: e.target.value })}
                                        className="w-full bg-muted/30 border border-border rounded-2xl py-5 px-6 text-foreground text-lg font-black uppercase italic tracking-tight outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-foreground/20"
                                        placeholder="Ej: MASTER SERIES 2024"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-2">Fecha de Inicio</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <input
                                            type="date"
                                            value={info.startDate}
                                            onChange={e => setInfo({ ...info, startDate: e.target.value })}
                                            className="w-full bg-muted/30 border border-border rounded-2xl py-4 pl-12 pr-5 text-foreground text-xs font-bold outline-none focus:border-indigo-500 transition-all appearance-none"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-2">Fecha de Finalización</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <input
                                            type="date"
                                            value={info.endDate}
                                            onChange={e => setInfo({ ...info, endDate: e.target.value })}
                                            className="w-full bg-muted/30 border border-border rounded-2xl py-4 pl-12 pr-5 text-foreground text-xs font-bold outline-none focus:border-indigo-500 transition-all appearance-none"
                                        />
                                    </div>
                                </div>

                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-2">Descripción y Premios</label>
                                    <textarea
                                        value={info.description}
                                        onChange={e => setInfo({ ...info, description: e.target.value })}
                                        rows={4}
                                        className="w-full bg-muted/30 border border-border rounded-2xl py-4 px-6 text-foreground/80 text-sm font-medium leading-relaxed outline-none focus:border-indigo-500 transition-all resize-none placeholder:text-foreground/20"
                                        placeholder="Detalles sobre el formato del torneo, premios para ganadores, etc..."
                                    />
                                </div>

                                <div className="flex flex-col gap-3 pt-4 border-t border-border/50 md:col-span-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500/60 ml-2 mb-2">Apertura de Inscripciones (Personalizable)</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-2">Jugadores con Club</label>
                                            <div className="relative">
                                                <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                <input
                                                    type="date"
                                                    value={info.openDateClub}
                                                    onChange={e => setInfo({ ...info, openDateClub: e.target.value })}
                                                    className="w-full bg-muted/30 border border-border rounded-2xl py-4 pl-12 pr-5 text-foreground text-xs font-bold outline-none focus:border-indigo-500 transition-all appearance-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-2">Público General</label>
                                            <div className="relative">
                                                <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                <input
                                                    type="date"
                                                    value={info.openDateGeneral}
                                                    onChange={e => setInfo({ ...info, openDateGeneral: e.target.value })}
                                                    className="w-full bg-muted/30 border border-border rounded-2xl py-4 pl-12 pr-5 text-foreground text-xs font-bold outline-none focus:border-indigo-500 transition-all appearance-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
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
                            <h2 className="text-xs font-black uppercase tracking-widest text-foreground/50 italic">Modalidad de Juego</h2>
                        </div>

                        <div className="bg-card/40 border border-border rounded-[2.5rem] p-8 backdrop-blur-sm shadow-2xl space-y-10 transition-colors">
                            
                            {/* Género y Participación */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-foreground">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-2">Género</label>
                                    <select
                                        value={modalidad.genero}
                                        onChange={e => setModalidad({ ...modalidad, genero: e.target.value as any })}
                                        className="w-full bg-muted/30 border border-border rounded-2xl py-4 px-5 text-foreground text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-500 transition-all appearance-none"
                                    >
                                        <option value="mixto">Mixto</option>
                                        <option value="hombre">Solo Hombres</option>
                                        <option value="mujer">Solo Mujeres</option>
                                    </select>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-2">Participación</label>
                                    <select
                                        value={modalidad.participacion}
                                        onChange={e => setModalidad({ ...modalidad, participacion: e.target.value as any })}
                                        className="w-full bg-muted/30 border border-border rounded-2xl py-4 px-5 text-foreground text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-500 transition-all appearance-none"
                                    >
                                        <option value="pareja">Parejas</option>
                                        <option value="individual">Individual</option>
                                    </select>
                                </div>
                            </div>

                            {/* Toggle Modo */}
                            <div className="space-y-4 pt-4 border-t border-border">
                                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-2">Formato de Categorización</label>
                                <div className="bg-muted/30 p-2 rounded-2xl border border-border flex gap-2">
                                    <button
                                        onClick={() => setModalidad({ ...modalidad, mode: "categorias" })}
                                        className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${modalidad.mode === "categorias" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-muted-foreground hover:text-foreground"}`}
                                    >
                                        <Layers className="w-4 h-4" />
                                        Por Categoría
                                    </button>
                                    <button
                                        onClick={() => setModalidad({ ...modalidad, mode: "libre" })}
                                        className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${modalidad.mode === "libre" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-muted-foreground hover:text-foreground"}`}
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
                                                        setModalidad({ ...modalidad, selectedCats: [cat] });
                                                    }}
                                                    className={`py-3.5 rounded-xl border transition-all text-[11px] font-bold uppercase ${isSelected ? "bg-indigo-600 border-indigo-500 text-white shadow-indigo-900/40" : "bg-muted/30 border-border text-muted-foreground hover:border-accent hover:text-foreground"}`}
                                                >
                                                    {cat}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* SECCIÓN 3: PUNTUACIÓN Y RANKING */}
                    <div className="flex flex-col gap-6">
                        <div className="flex items-center gap-3 px-2">
                            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center border border-indigo-500/30">
                                <Star className="w-4 h-4 text-indigo-400" />
                            </div>
                            <h2 className="text-xs font-black uppercase tracking-widest text-foreground/50 italic">Sistema de Puntos (Ranking)</h2>
                        </div>

                        <div className="bg-card/40 border border-border rounded-[2.5rem] p-8 backdrop-blur-sm shadow-2xl space-y-8 transition-colors">
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                                {[
                                    { id: "winner", label: "Campeón" },
                                    { id: "finalist", label: "Final" },
                                    { id: "semi", label: "Semis" },
                                    { id: "quarter", label: "Cuartos" },
                                    { id: "octavos", label: "Octavos" },
                                    { id: "groupMatchWin", label: "Victoria Zona" },
                                    { id: "participation", label: "Asistencia" }
                                ].map(k => (
                                    <div key={k.id} className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500/50 block text-center italic leading-tight">{k.label}</label>
                                        <div className="relative group">
                                            <input
                                                type="number"
                                                value={customPoints[k.id as keyof typeof customPoints]}
                                                onChange={e => setCustomPoints({ ...customPoints, [k.id]: e.target.value })}
                                                className="w-full bg-muted/30 border border-border rounded-2xl py-4 px-2 text-center text-lg font-black italic tracking-tighter text-foreground outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Botón de Acción Final */}
                <div className="w-full pt-10 border-t border-border/50">
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="w-full shadow-2xl shadow-indigo-900/20 bg-indigo-600 hover:bg-indigo-500 text-white py-6 rounded-3xl font-black uppercase italic tracking-tighter flex items-center justify-center gap-4 transition-all active:scale-[0.98] disabled:opacity-50 group border border-indigo-400/20"
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
                    <p className="text-center mt-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
                        Al publicar, el torneo será visible para todos los jugadores de la plataforma.
                    </p>
                </div>

            </div>
        </div>
    );
}
