"use client";

import { useState } from "react";
import FeedLayout from "@/app/feed/layout";
import { createTournament, updateTournament } from "./actions";
import {
    Camera,
    Image as ImageIcon,
    MapPin,
    Calendar,
    Info,
    Check,
    Trophy,
    Trash2,
    ArrowRight,
    ArrowLeft,
    Users,
    CheckCircle2,
    ChevronLeft,
    Sparkles,
    Settings,
    ChevronRight,
    Target,
    Activity,
    Layers,
    Layout
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// Removing the hardcoded ALL_CATEGORIES as it will now be passed as a prop from the DB

const POINTS_PRESETS = [
    { label: "Estándar (1000/600/360/180)", winner: 1000, finalist: 600, semi: 360, quarter: 180 },
    { label: "Amateur (500/300/160/80)", winner: 500, finalist: 300, semi: 160, quarter: 80 },
    { label: "Personalizado", winner: 0, finalist: 0, semi: 0, quarter: 0 },
];

const STEPS = [
    { id: 0, label: "Info", icon: Info },
    { id: 1, label: "Modo", icon: Layers },
    { id: 2, label: "Puntos", icon: Target },
    { id: 3, label: "Finalizar", icon: CheckCircle2 }
];

type PointsConfig = { winner: number; finalist: number; semi: number; quarter: number };

type InitialData = {
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

    const [step, setStep] = useState(0);
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

    const nextStep = () => {
        if (step === 0 && !info.name) {
            toast.error("Danos un nombre para el torneo");
            return;
        }
        setStep(s => s + 1);
    };
    const prevStep = () => setStep(s => s - 1);

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
        if (isLoading) return; // Prevent double submission
        setIsLoading(true);
        try {
            let imageUrl = imagePreview;

            // 1. Upload image if there's a new one
            if (compressedFile) {
                imageUrl = await uploadImage(compressedFile);
            }

            // 2. Prepare the object
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
                toast.success("Torneo actualizado");
            } else {
                await createTournament(tournamentData);
                toast.success("Torneo creado con éxito");
            }

            // Get target profile based on role
            const getTargetProfileUrl = () => {
                if (typeof document === "undefined") return "/profile";
                const match = document.cookie.match(/(?:^|;\s*)__padel_role=([^;]+)/);
                const role = match ? decodeURIComponent(match[1]) : "jugador";

                if (role === "club") return "/profiles/club";
                if (role === "centro_de_padel") return "/profiles/centro";
                if (role === "profesor" || role === "profe") return "/profiles/profe";
                return "/profile";
            };

            const target = getTargetProfileUrl();
            router.push(target);
            // Non-infinite loading fix: if navigation is slow, we eventually want to reset state if we ever come back
            // but for now, we leave it in loading until the new page arrives.
        } catch (err: any) {
            toast.error(err.message || "Error al guardar");
            setIsLoading(false); // Re-enable only on error
        }
    };

    const stepVariants = {
        hidden: { opacity: 0, x: 20 },
        visible: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -20 }
    };

    return (
        <FeedLayout>
            <div className="min-h-screen bg-background text-foreground pb-20 pt-4 px-4 font-sans selection:bg-blue-500/30">
                <div className="max-w-2xl mx-auto flex flex-col gap-8 animate-in fade-in duration-700">

                    {/* Header */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4">
                            <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-90">
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-black uppercase italic tracking-tight">{isEditing ? "Editar Torneo" : "Nuevo Torneo"}</h1>
                                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30">Configuración Profesional</p>
                            </div>
                        </div>
                    </div>

                    {/* Step Indicator */}
                    <div className="bg-card border border-border p-4 rounded-[2rem] shadow-xl flex justify-between relative overflow-hidden">
                        <div className="absolute inset-0 bg-blue-500/5 blur-[50px] pointer-events-none" />
                        {STEPS.map((s, idx) => {
                            const Icon = s.icon;
                            const isActive = step === idx;
                            const isDone = step > idx;
                            return (
                                <div key={s.id} className="flex flex-col items-center gap-2 relative z-10 flex-1">
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 ${isActive ? "bg-blue-600 text-white shadow-xl shadow-blue-900/40 scale-110" :
                                        isDone ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                                            "bg-card text-white/20 border border-border/50 opacity-40"
                                        }`}>
                                        {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                                    </div>
                                    <span className={`text-[8px] font-black uppercase tracking-widest ${isActive ? "text-blue-400" : "text-white/20"}`}>{s.label}</span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Form Body */}
                    <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden min-h-[400px]">
                        <AnimatePresence mode="wait">
                            {step === 0 && (
                                <motion.div
                                    key="step0" variants={stepVariants} initial="hidden" animate="visible" exit="exit"
                                    className="flex flex-col gap-8"
                                >
                                    <div className="flex flex-col gap-6">
                                        <div className="bg-card border border-border p-2 rounded-3xl relative aspect-video overflow-hidden group">
                                            {imagePreview ? (
                                                <>
                                                    <img src={imagePreview} className="w-full h-full object-cover rounded-2xl opacity-60 transition-transform duration-700 group-hover:scale-105" alt="Preview" />
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => setImagePreview(null)}
                                                            className="w-12 h-12 rounded-full bg-red-500/20 backdrop-blur-md border border-red-500/30 text-red-400 flex items-center justify-center shadow-2xl active:scale-90 transition-all"
                                                        >
                                                            <Trash2 className="h-5 w-5" />
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <label className="w-full h-full flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-card transition-all">
                                                    <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                                        {imageUploading ? <Activity className="h-8 w-8 text-blue-500 animate-spin" /> : <Camera className="h-8 w-8 text-blue-500" />}
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Banner del Torneo</p>
                                                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20 italic">Click para subir (Max 5MB)</span>
                                                    </div>
                                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                                </label>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2">Nombre del Torneo</label>
                                            <input
                                                type="text"
                                                value={info.name}
                                                onChange={e => setInfo({ ...info, name: e.target.value })}
                                                className="w-full bg-card border border-border rounded-2xl py-5 px-6 text-white text-lg font-black uppercase italic tracking-tight outline-none focus:border-blue-500 transition-all shadow-inner"
                                                placeholder="CIRCUITO PADEL PRO..."
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="flex flex-col gap-2">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2">Inicio</label>
                                                <input
                                                    type="date"
                                                    value={info.startDate}
                                                    onChange={e => setInfo({ ...info, startDate: e.target.value })}
                                                    className="w-full bg-card border border-border rounded-2xl py-4 px-5 text-white text-xs font-bold outline-none focus:border-blue-500 transition-all appearance-none"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2">Fin</label>
                                                <input
                                                    type="date"
                                                    value={info.endDate}
                                                    onChange={e => setInfo({ ...info, endDate: e.target.value })}
                                                    className="w-full bg-card border border-border rounded-2xl py-4 px-5 text-white text-xs font-bold outline-none focus:border-blue-500 transition-all appearance-none"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2">Detalles del Torneo</label>
                                            <textarea
                                                value={info.description}
                                                onChange={e => setInfo({ ...info, description: e.target.value })}
                                                rows={4}
                                                className="w-full bg-card border border-border rounded-2xl py-4 px-5 text-white text-sm font-medium leading-relaxed outline-none focus:border-blue-500 transition-all resize-none shadow-inner"
                                                placeholder="Contá de qué trata el evento, premios, formato..."
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {step === 1 && (
                                <motion.div
                                    key="step1" variants={stepVariants} initial="hidden" animate="visible" exit="exit"
                                    className="flex flex-col gap-8"
                                >
                                    <div className="flex flex-col gap-8">
                                        <div className="flex flex-col gap-4">
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 italic px-2">Configuración de Categoría</h3>
                                            <div className="bg-card p-1.5 rounded-3xl border border-border flex">
                                                <button
                                                    onClick={() => setModalidad({ ...modalidad, mode: "categorias" })}
                                                    className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${modalidad.mode === "categorias" ? "bg-blue-600 text-white shadow-lg" : "text-white/30 hover:text-white"}`}
                                                >
                                                    Por Categorías
                                                </button>
                                                <button
                                                    onClick={() => setModalidad({ ...modalidad, mode: "libre" })}
                                                    className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${modalidad.mode === "libre" ? "bg-blue-600 text-white shadow-lg" : "text-white/30 hover:text-white"}`}
                                                >
                                                    Categoría Libre
                                                </button>
                                            </div>
                                        </div>

                                        {modalidad.mode === "categorias" && (
                                            <div className="flex flex-col gap-4">
                                                <p className="text-[10px] font-black uppercase text-white/20 italic ml-2">Selecciona categorías habilitadas</p>
                                                <div className="grid grid-cols-3 gap-3">
                                                    {allCategoriesFromDb.map(cat => {
                                                        const isSelected = modalidad.selectedCats.includes(cat);
                                                        return (
                                                            <button
                                                                key={cat}
                                                                onClick={() => {
                                                                    const next = isSelected
                                                                        ? modalidad.selectedCats.filter(c => c !== cat)
                                                                        : [...modalidad.selectedCats, cat].sort();
                                                                    setModalidad({ ...modalidad, selectedCats: next });
                                                                }}
                                                                className={`py-4 rounded-2xl border transition-all text-[11px] font-black uppercase italic ${isSelected ? "bg-blue-600 border-blue-500 shadow-lg shadow-blue-900/40" : "bg-card border-border/50 text-white/30 hover:border-white/20"}`}
                                                            >
                                                                {cat}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex flex-col gap-4">
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 italic px-2">Tipo de Participación</h3>
                                            <div className="bg-card p-1.5 rounded-3xl border border-border flex">
                                                <button
                                                    onClick={() => setModalidad({ ...modalidad, participacion: "individual" })}
                                                    className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${modalidad.participacion === "individual" ? "bg-blue-600 text-white shadow-lg" : "text-white/30 hover:text-white"}`}
                                                >
                                                    Individual
                                                </button>
                                                <button
                                                    onClick={() => setModalidad({ ...modalidad, participacion: "pareja" })}
                                                    className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${modalidad.participacion === "pareja" ? "bg-blue-600 text-white shadow-lg" : "text-white/30 hover:text-white"}`}
                                                >
                                                    Pareja
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="flex flex-col gap-4">
                                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 italic px-2">Género</h3>
                                                <select
                                                    value={modalidad.genero}
                                                    onChange={e => setModalidad({ ...modalidad, genero: e.target.value as any })}
                                                    className="w-full bg-card border border-border rounded-2xl py-4 px-5 text-white text-[10px] font-black uppercase tracking-widest outline-none transition-all appearance-none"
                                                >
                                                    <option value="mixto">Mixto</option>
                                                    <option value="hombre">Solo Hombres</option>
                                                    <option value="mujer">Solo Mujeres</option>
                                                </select>
                                            </div>
                                            <div className="flex flex-col gap-4">
                                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 italic px-2">Superficie</h3>
                                                <select
                                                    value={info.surface}
                                                    onChange={e => setInfo({ ...info, surface: e.target.value })}
                                                    className="w-full bg-card border border-border rounded-2xl py-4 px-5 text-white text-[10px] font-black uppercase tracking-widest outline-none transition-all appearance-none"
                                                >
                                                    <option value="cemento">Cemento</option>
                                                    <option value="sintetico">Césped Sintético</option>
                                                    <option value="alfombra">Alfombra Pro</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {step === 2 && (
                                <motion.div
                                    key="step2" variants={stepVariants} initial="hidden" animate="visible" exit="exit"
                                    className="flex flex-col gap-8"
                                >
                                    <div className="flex flex-col gap-8">
                                        <div className="flex flex-col gap-4">
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 italic px-2">Sistema de Puntos (Ranking)</h3>
                                            <div className="flex flex-col gap-3">
                                                {POINTS_PRESETS.map((p, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => setPreset(i)}
                                                        className={`w-full p-6 rounded-[2rem] border transition-all text-left flex justify-between items-center group ${preset === i ? "bg-blue-600 border-blue-500 shadow-xl shadow-blue-900/40" : "bg-card border-border/50 hover:border-border"}`}
                                                    >
                                                        <span className={`text-[11px] font-black uppercase tracking-widest ${preset === i ? "text-white" : "text-white/40 group-hover:text-white"}`}>{p.label}</span>
                                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${preset === i ? "border-white bg-white text-blue-600" : "border-border"}`}>
                                                            {preset === i && <Check className="h-4 w-4" />}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {preset === 2 && (
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-in slide-in-from-top-4">
                                                {["winner", "finalist", "semi", "quarter"].map(k => (
                                                    <div key={k} className="flex flex-col gap-2">
                                                        <label className="text-[8px] font-black uppercase text-white/30 ml-2">{k === 'winner' ? 'Campeón' : k === 'finalist' ? 'Final' : k === 'semi' ? 'Semis' : 'Cuartos'}</label>
                                                        <input
                                                            type="number"
                                                            value={customPoints[k as keyof typeof customPoints]}
                                                            onChange={e => setCustomPoints({ ...customPoints, [k]: e.target.value })}
                                                            className="w-full bg-card border border-border rounded-2xl py-4 px-4 text-center text-sm font-black italic tracking-tight outline-none"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {step === 3 && (
                                <motion.div
                                    key="step3" variants={stepVariants} initial="hidden" animate="visible" exit="exit"
                                    className="flex flex-col gap-8"
                                >
                                    <div className="flex flex-col gap-8">
                                        <div className="bg-card p-8 rounded-[2rem] border border-border flex flex-col gap-6 text-center shadow-xl">
                                            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center self-center shadow-lg shadow-emerald-900/20 mb-2">
                                                <Sparkles className="h-8 w-8 text-emerald-500" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black uppercase italic tracking-tight mb-2">¡Todo listo para brillar!</h3>
                                                <p className="text-[10px] font-medium text-white/40 leading-relaxed uppercase tracking-widest">
                                                    Revisá los datos antes de publicar. <br /> El torneo aparecerá en el feed de todos los jugadores.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-card border border-border/50 p-6 rounded-[2rem] flex flex-col gap-2">
                                                <span className="text-[8px] font-black uppercase text-white/20 tracking-widest">Nombre</span>
                                                <span className="text-sm font-black italic tracking-tight truncate">{info.name}</span>
                                            </div>
                                            <div className="bg-card border border-border/50 p-6 rounded-[2rem] flex flex-col gap-2">
                                                <span className="text-[8px] font-black uppercase text-white/20 tracking-widest">Modalidad</span>
                                                <span className="text-sm font-black italic tracking-tight truncate uppercase">
                                                    {modalidad.mode === "libre" ? "Libre" : modalidad.selectedCats.join(", ")} • {modalidad.participacion}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Navigation Buttons */}
                        <div className="flex gap-4 mt-12 bg-card -m-8 p-8 border-t border-border/50">
                            {step > 0 && (
                                <button
                                    onClick={prevStep}
                                    className="px-6 py-5 rounded-3xl bg-card border border-border text-white/60 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex-1"
                                >
                                    Atrás
                                </button>
                            )}
                            {step < 3 ? (
                                <button
                                    onClick={nextStep}
                                    className="px-8 py-5 rounded-3xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-900/40 hover:bg-blue-500 transition-all flex-[2] flex items-center justify-center gap-2 active:scale-95"
                                >
                                    Siguiente <ArrowRight className="h-4 w-4" />
                                </button>
                            ) : (
                                <button
                                    onClick={handleSubmit}
                                    disabled={isLoading}
                                    className="px-8 py-5 rounded-3xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-900/40 hover:bg-blue-500 transition-all flex-[2] flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                                >
                                    {isLoading ? <Activity className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                    {isEditing ? "Guardar Cambios" : "Publicar Torneo"}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </FeedLayout>
    );
}

