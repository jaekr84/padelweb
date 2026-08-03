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
    Star,
    Clock,
    MapPin,
    Shield,
    Users2
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/Select";




export type InitialData = {
    id: string;
    name: string;
    description: string | null;
    startDate: string | null;
    endDate: string | null;
    time: string | null;
    openDateClub: string | null;
    openDateGeneral: string | null;
    categories: string[] | null;
    imageUrl: string | null;
    surface: string | null;
    maxSlots: number | null;
    modalidad: {
        mode: "categorias" | "libre";
        participacion: "pareja" | "individual";
        genero: "hombre" | "mujer" | "mixto";
    } | null;
    registrationFee: number | null;
    memberRegistrationFee: number | null;
    type?: string | null;
    isMembersOnly?: boolean;
    hasPoints?: boolean;
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
    allCategoriesFromDb = ["A+", "A", "B", "C", "D"],
    userRole
}: {
    initialData?: InitialData | null,
    allCategoriesFromDb?: string[],
    userRole?: string
}) {
    const isEditing = !!initialData;
    const router = useRouter();
    const cats = initialData?.categories ?? [];
    const isCatMode = cats.length === 0 || cats[0] !== "libre";
    const [isMembersOnly, setIsMembersOnly] = useState<boolean>(initialData?.isMembersOnly || false);
    const [showReview, setShowReview] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const redirectPath = (userRole === "superadmin" || userRole === "admin") ? "/admin/tournaments" : userRole === "club" ? "/club/tournaments" : "/tournaments";

    const [imagePreview, setImagePreview] = useState<string | null>(initialData?.imageUrl ?? null);
    const [imageUploading, setImageUploading] = useState(false);
    const [compressedFile, setCompressedFile] = useState<File | null>(null);
    const [tournamentType, setTournamentType] = useState<"round_robin" | "americano">((initialData as any)?.type ?? "round_robin");
    const [hasPoints, setHasPoints] = useState<boolean>(initialData?.hasPoints ?? true);

    const today = new Date().toISOString().split('T')[0];

    const [info, setInfo] = useState({
        name: initialData?.name ?? "",
        startDate: initialData?.startDate ?? today,
        endDate: initialData?.endDate ?? today,
        time: initialData?.time ?? "18:00",
        openDateClub: initialData?.openDateClub ?? today,
        openDateGeneral: initialData?.openDateGeneral ?? today,
        description: initialData?.description ?? "",
        maxSlots: String(initialData?.maxSlots ?? 0),
        registrationFee: initialData?.registrationFee !== null && initialData?.registrationFee !== undefined ? String(initialData.registrationFee) : "",
        memberRegistrationFee: initialData?.memberRegistrationFee !== null && initialData?.memberRegistrationFee !== undefined ? String(initialData.memberRegistrationFee) : "",
        surface: initialData?.surface ?? "",
    });

    const [modalidad, setModalidad] = useState({
        mode: initialData?.modalidad?.mode ?? (isCatMode ? "categorias" : "libre"),
        selectedCats: isCatMode ? cats : ([] as string[]),
        participacion: initialData?.modalidad?.participacion ?? "pareja",
        genero: initialData?.modalidad?.genero ?? "mixto",
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

            const tournamentData = {
                name: info.name,
                description: info.description,
                startDate: info.startDate,
                endDate: info.endDate,
                time: info.time,
                openDateClub: info.openDateClub,
                openDateGeneral: info.openDateGeneral,
                categories: finalCategories,
                imageUrl: imageUrl,
                maxSlots: Number(info.maxSlots),
                modalidad: {
                    mode: modalidad.mode,
                    participacion: modalidad.participacion,
                    genero: modalidad.genero,
                },
                registrationFee: info.registrationFee ? Number(info.registrationFee) : null,
                memberRegistrationFee: info.memberRegistrationFee ? Number(info.memberRegistrationFee) : null,
                surface: info.surface,
                type: tournamentType,
                isMembersOnly: isMembersOnly,
                hasPoints: hasPoints,
            };

            if (isEditing && initialData) {
                await updateTournament(initialData.id, tournamentData);
                toast.success("Torneo actualizado correctamente");
            } else {
                await createTournament(tournamentData as any);
                toast.success("Torneo creado con éxito");
            }

            router.push(redirectPath);
        } catch (err: any) {
            toast.error(err.message || "Error al guardar");
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground pb-12 pt-4 px-3 md:px-6 font-sans selection:bg-azul-primary/10 transition-colors duration-300">
            <div className="max-w-6xl mx-auto flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-700">

                {/* HEADER COMPACTO */}
                <div className="flex items-center justify-between border-b border-border pb-3">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push(redirectPath)}
                            className="group w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-azul-primary hover:border-azul-primary/30 transition-all shadow-sm active:scale-95"
                        >
                            <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                        </button>
                        <div>
                            <h1 className="text-xl font-black uppercase italic tracking-tighter text-muted-foreground leading-none">
                                {isEditing ? `Editar: ${initialData?.name}` : "Nuevo Evento"}
                            </h1>
                            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-0.5">Terminal de Administración de Torneos</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-full shadow-sm">
                            <Activity className="w-3.5 h-3.5 text-azul-primary animate-pulse" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-subtle">Sistema Online</span>
                        </div>
                    </div>
                </div>

                {/* GRID PRINCIPAL HIGH DENSITY */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

                    {/* BARRA SUPERIOR DE CONFIGURACIÓN CORE */}
                    <div className="col-span-12 grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Config: Tipo */}
                        <div className="bg-card border border-border rounded-2xl p-3 shadow-sm flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Layers className="w-3 h-3" />
                                <span className="text-[9px] font-black uppercase tracking-widest">Formato</span>
                            </div>
                            <Select
                                value={tournamentType}
                                onValueChange={value => setTournamentType(value as any)}
                            >
                                <SelectTrigger className="bg-muted border-border rounded-xl h-9 text-[10px] font-bold uppercase shadow-sm">
                                    <SelectValue placeholder="Formato" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="round_robin">Round Robin</SelectItem>
                                    <SelectItem value="americano">Americano</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Config: Ranking */}
                        <div className="bg-card border border-border rounded-2xl p-3 shadow-sm flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Star className="w-3 h-3" />
                                <span className="text-[9px] font-black uppercase tracking-widest">Impacto</span>
                            </div>
                            <Select
                                value={hasPoints ? "oficial" : "amistoso"}
                                onValueChange={value => setHasPoints(value === "oficial")}
                            >
                                <SelectTrigger className="bg-muted border-border rounded-xl h-9 text-[10px] font-bold uppercase shadow-sm">
                                    <SelectValue placeholder="Tipo de Impacto" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="oficial">🏆 Oficial (Suma Puntos)</SelectItem>
                                    <SelectItem value="amistoso">⭐ Amistoso (Sin Puntos)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Config: Modalidad */}
                        <div className="bg-card border border-border rounded-2xl p-3 shadow-sm flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Target className="w-3 h-3" />
                                <span className="text-[9px] font-black uppercase tracking-widest">Modalidad</span>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                                <Select
                                    value={modalidad.genero}
                                    onValueChange={value => setModalidad({ ...modalidad, genero: value as any })}
                                >
                                    <SelectTrigger className="bg-muted border-border rounded-xl h-9 text-[10px] font-bold uppercase">
                                        <SelectValue placeholder="Género" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="mixto">Mixto</SelectItem>
                                        <SelectItem value="hombre">Hombres</SelectItem>
                                        <SelectItem value="mujer">Mujeres</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select
                                    value={modalidad.participacion}
                                    onValueChange={value => setModalidad({ ...modalidad, participacion: value as any })}
                                >
                                    <SelectTrigger className="bg-muted border-border rounded-xl h-9 text-[10px] font-bold uppercase">
                                        <SelectValue placeholder="Participación" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pareja">Parejas</SelectItem>
                                        <SelectItem value="individual">Individual</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* COLUMNA IZQUIERDA: IDENTIDAD Y CONTENIDO (7/12) */}
                    <div className="lg:col-span-7 flex flex-col gap-4">
                        <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-5">
                            {/* Banner Compacto y Mapa */}
                            <div className="grid grid-cols-1 md:grid-cols-10 gap-3">
                                <div className="md:col-span-7 relative group overflow-hidden rounded-2xl border border-border aspect-[21/9] md:aspect-auto md:h-32 bg-muted transition-all">
                                    {imagePreview ? (
                                        <>
                                            <img src={imagePreview} className="w-full h-full object-cover opacity-80" alt="Preview" />
                                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                                <button onClick={() => setImagePreview(null)} className="p-2 bg-surface-raised hover:bg-rojo text-foreground rounded-full backdrop-blur-md transition-all">
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <label className="w-full h-full flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-100/50 transition-all">
                                            <div className="w-8 h-8 rounded-full bg-azul-primary/5 flex items-center justify-center">
                                                {imageUploading ? <Activity className="w-4 h-4 text-azul-primary animate-spin" /> : <Camera className="w-4 h-4 text-azul-primary" />}
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-subtle leading-tight">Banner del Evento</p>
                                                <p className="text-[7px] text-muted-foreground">Dimensión: 1200x450px</p>
                                            </div>
                                            <input type="file" className="hidden" onChange={handleImageChange} accept="image/*" />
                                        </label>
                                    )}
                                </div>
                                <div className="md:col-span-3 h-32 rounded-2xl overflow-hidden border border-border shadow-sm opacity-80 hover:opacity-100 transition-all grayscale hover:grayscale-0 bg-muted">
                                    {info.surface && info.surface.length > 3 ? (
                                        <iframe
                                            width="100%"
                                            height="100%"
                                            style={{ border: 0 }}
                                            src={`https://maps.google.com/maps?q=${encodeURIComponent(info.surface)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                                        ></iframe>
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4 text-center">
                                            <MapPin className="w-5 h-5 text-muted-foreground" />
                                            <p className="text-[8px] font-bold uppercase tracking-tighter text-muted-foreground">Mapa no disponible</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Inputs Identidad */}
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nombre Oficial del Torneo</label>
                                    <input
                                        type="text"
                                        value={info.name}
                                        onChange={e => setInfo({ ...info, name: e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1) })}
                                        className="w-full bg-muted border border-border rounded-xl py-3 px-4 text-muted-foreground text-base font-black uppercase italic tracking-tight outline-none focus:border-azul-primary focus:ring-4 focus:ring-azul-primary/5 transition-all placeholder:text-muted-foreground"
                                        placeholder="Ej: MASTER CUP 2024"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Ubicación / Club</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                            <input
                                                type="text"
                                                value={info.surface}
                                                onChange={e => setInfo({ ...info, surface: e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1) })}
                                                className="w-full bg-muted border border-border rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold outline-none focus:border-azul-primary transition-all placeholder:text-muted-foreground"
                                                placeholder="Nombre del Club o Dirección"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Hora Predeterminada</label>
                                        <div className="flex items-center gap-1.5">
                                            <div className="flex-1 flex items-center gap-1 bg-muted border border-border rounded-xl px-2 py-1">
                                                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                                <Select
                                                    value={(() => {
                                                        const [h] = info.time.split(":");
                                                        let displayHour = parseInt(h) % 12;
                                                        if (displayHour === 0) displayHour = 12;
                                                        return String(displayHour).padStart(2, '0');
                                                    })()}
                                                    onValueChange={val => {
                                                        const [_, m] = info.time.split(":");
                                                        const hNum = parseInt(info.time.split(":")[0]);
                                                        const period = hNum >= 12 ? "PM" : "AM";
                                                        let newH = parseInt(val);
                                                        if (period === "PM" && newH < 12) newH += 12;
                                                        if (period === "AM" && newH === 12) newH = 0;
                                                        setInfo({ ...info, time: `${String(newH).padStart(2, '0')}:${m}` });
                                                    }}
                                                >
                                                    <SelectTrigger className="border-none bg-transparent h-7 px-1 w-12 shadow-none focus:ring-0">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => (
                                                            <SelectItem key={h} value={h}>{h}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <span className="text-muted-foreground font-bold">:</span>
                                                <Select
                                                    value={info.time.split(":")[1]}
                                                    onValueChange={val => {
                                                        const [h] = info.time.split(":");
                                                        setInfo({ ...info, time: `${h}:${val}` });
                                                    }}
                                                >
                                                    <SelectTrigger className="border-none bg-transparent h-7 px-1 w-12 shadow-none focus:ring-0">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {["00", "15", "30", "45"].map(m => (
                                                            <SelectItem key={m} value={m}>{m}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex bg-muted p-1 rounded-xl border border-border">
                                                <button
                                                    onClick={() => {
                                                        const [h, m] = info.time.split(":");
                                                        let hNum = parseInt(h);
                                                        if (hNum >= 12) hNum -= 12;
                                                        setInfo({ ...info, time: `${String(hNum).padStart(2, '0')}:${m}` });
                                                    }}
                                                    className={`px-2 py-1 rounded-lg text-[9px] font-black transition-all ${parseInt(info.time.split(":")[0]) < 12 ? "bg-card text-azul-primary shadow-sm" : "text-muted-foreground hover:text-subtle"}`}
                                                >
                                                    AM
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const [h, m] = info.time.split(":");
                                                        let hNum = parseInt(h);
                                                        if (hNum < 12) hNum += 12;
                                                        setInfo({ ...info, time: `${String(hNum).padStart(2, '0')}:${m}` });
                                                    }}
                                                    className={`px-2 py-1 rounded-lg text-[9px] font-black transition-all ${parseInt(info.time.split(":")[0]) >= 12 ? "bg-card text-azul-primary shadow-sm" : "text-muted-foreground hover:text-subtle"}`}
                                                >
                                                    PM
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Descripción y Premios</label>
                                    <textarea
                                        value={info.description}
                                        onChange={e => setInfo({ ...info, description: e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1) })}
                                        rows={4}
                                        className="w-full bg-muted border border-border rounded-xl py-3 px-4 text-muted-foreground text-xs font-medium leading-relaxed outline-none focus:border-azul-primary transition-all resize-none placeholder:text-muted-foreground"
                                        placeholder="Detalla el formato, premios, sets, etc..."
                                    />
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* COLUMNA DERECHA: LOGÍSTICA Y REGLAS (5/12) */}
                    <div className="lg:col-span-5 flex flex-col gap-4">
                        <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-6">
                            {/* Fechas de Juego */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 px-1">
                                    <Calendar className="w-3.5 h-3.5 text-azul-primary" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Cronograma del Evento</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Fecha Inicio</label>
                                        <input type="date" value={info.startDate} onChange={e => setInfo({ ...info, startDate: e.target.value })} className="w-full bg-muted border border-border rounded-xl py-2 px-3 text-[11px] font-bold outline-none focus:border-azul-primary transition-all" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Fecha Fin</label>
                                        <input type="date" value={info.endDate} onChange={e => setInfo({ ...info, endDate: e.target.value })} className="w-full bg-muted border border-border rounded-xl py-2 px-3 text-[11px] font-bold outline-none focus:border-azul-primary transition-all" />
                                    </div>
                                </div>
                            </div>

                            {/* Inscripciones */}
                            <div className="space-y-3 pt-4 border-t border-border">
                                <div className="flex items-center gap-2 px-1">
                                    <Sparkles className="w-3.5 h-3.5 text-celeste" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Apertura Inscripciones</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Socios Club</label>
                                        <input type="date" value={info.openDateClub} onChange={e => setInfo({ ...info, openDateClub: e.target.value })} className="w-full bg-muted border border-border rounded-xl py-2 px-3 text-[11px] font-bold outline-none focus:border-azul-primary transition-all" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Gral. Público</label>
                                        <input type="date" value={info.openDateGeneral} onChange={e => setInfo({ ...info, openDateGeneral: e.target.value })} className="w-full bg-muted border border-border rounded-xl py-2 px-3 text-[11px] font-bold outline-none focus:border-azul-primary transition-all" />
                                    </div>
                                </div>
                            </div>

                            {/* Finanzas y Cupos */}
                            <div className="space-y-3 pt-4 border-t border-border">
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Precio Gral</label>
                                        <div className="relative">
                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                                            <input type="number" value={info.registrationFee} onChange={e => setInfo({ ...info, registrationFee: e.target.value })} className="w-full bg-muted border border-border rounded-xl py-2 pl-6 pr-2 text-[11px] font-bold outline-none focus:border-azul-primary transition-all" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Precio Socio</label>
                                        <div className="relative">
                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                                            <input type="number" value={info.memberRegistrationFee} onChange={e => setInfo({ ...info, memberRegistrationFee: e.target.value })} className="w-full bg-muted border border-border rounded-xl py-2 pl-6 pr-2 text-[11px] font-bold outline-none focus:border-azul-primary transition-all" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Cupos Máx</label>
                                        <input type="number" value={info.maxSlots} onChange={e => setInfo({ ...info, maxSlots: e.target.value })} className="w-full bg-muted border border-border rounded-xl py-2 px-3 text-[11px] font-bold outline-none focus:border-azul-primary transition-all" />
                                    </div>
                                </div>
                            </div>

                            {/* Privacidad & Categorías */}
                            <div className="space-y-4 pt-4 border-t border-border">
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-subtle">Privacidad del Evento</span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setIsMembersOnly(false)}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-[9px] font-black uppercase tracking-widest ${!isMembersOnly ? "bg-azul-primary border-azul-primary text-white shadow-md shadow-azul-primary/10" : "bg-muted border-border text-muted-foreground hover:border-border"}`}
                                        >
                                            <Users2 className="w-3 h-3" /> Público
                                        </button>
                                        <button
                                            onClick={() => setIsMembersOnly(true)}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-[9px] font-black uppercase tracking-widest ${isMembersOnly ? "bg-card border-hairline text-foreground shadow-md" : "bg-muted border-border text-muted-foreground hover:border-border"}`}
                                        >
                                            <Shield className="w-3 h-3" /> Solo Miembros
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between px-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-subtle">Categorización</span>
                                        <div className="flex gap-1">
                                            <button onClick={() => setModalidad({ ...modalidad, mode: "categorias" })} className={`px-2 py-1 rounded-md text-[8px] font-bold uppercase transition-all ${modalidad.mode === "categorias" ? "bg-card text-foreground" : "bg-muted text-muted-foreground"}`}>Por Categorías</button>
                                            <button onClick={() => setModalidad({ ...modalidad, mode: "libre" })} className={`px-2 py-1 rounded-md text-[8px] font-bold uppercase transition-all ${modalidad.mode === "libre" ? "bg-card text-foreground" : "bg-muted text-muted-foreground"}`}>Libre</button>
                                        </div>
                                    </div>

                                    <div className={`grid grid-cols-5 gap-1.5 transition-all duration-300 ${modalidad.mode !== "categorias" ? "opacity-40 grayscale pointer-events-none" : "opacity-100"}`}>
                                        {allCategoriesFromDb.map(cat => (
                                            <button
                                                key={cat}
                                                disabled={modalidad.mode !== "categorias"}
                                                onClick={() => {
                                                    const next = modalidad.selectedCats.includes(cat) ? modalidad.selectedCats.filter(c => c !== cat) : [...modalidad.selectedCats, cat];
                                                    setModalidad({ ...modalidad, selectedCats: next });
                                                }}
                                                className={`py-2 rounded-lg border text-[10px] font-black transition-all ${modalidad.selectedCats.includes(cat) ? "bg-azul-primary border-azul-primary text-white" : "bg-muted border-border text-muted-foreground hover:border-border"}`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Botón Acción Final */}
                        <button
                            onClick={() => setShowReview(true)}
                            disabled={isLoading}
                            className="w-full bg-azul-primary hover:bg-azul-dark text-white py-4 rounded-2xl font-black uppercase italic tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-azul-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 group"
                        >
                            {isLoading ? <Activity className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform text-celeste" />}
                            <span className="text-sm">Revisar y Publicar</span>
                        </button>
                    </div>
                </div>

                {/* MODAL DE REVISIÓN PREMIUM */}
                <AnimatePresence>
                    {showReview && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                onClick={() => setShowReview(false)}
                                className="absolute inset-0 bg-background/40 backdrop-blur-md"
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                className="relative w-full max-w-md bg-card rounded-[2.5rem] shadow-2xl border border-border overflow-hidden"
                            >
                                <div className="p-6 space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-azul-primary/10 flex items-center justify-center">
                                            <Target className="w-5 h-5 text-azul-primary" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black uppercase italic tracking-tighter text-muted-foreground">Verificación de Datos</h3>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Paso final de seguridad</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4 bg-muted p-5 rounded-3xl border border-border">
                                        <div className="space-y-0.5">
                                            <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Nombre del Evento</p>
                                            <p className="text-base font-black uppercase italic text-muted-foreground tracking-tight leading-tight">{info.name}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Formato</p>
                                                <p className="text-[10px] font-bold uppercase text-azul-primary">{tournamentType === 'round_robin' ? 'Round Robin' : 'Americano'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Impacto</p>
                                                <p className="text-[10px] font-bold uppercase text-celeste">{hasPoints ? 'Suma Puntos' : 'Sin Puntos'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Fecha Inicio</p>
                                                <p className="text-[10px] font-bold text-muted-foreground">{info.startDate || 'No definida'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Inscripción</p>
                                                <p className="text-[10px] font-bold text-muted-foreground">{info.registrationFee ? `$${info.registrationFee}` : 'Gratis'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <button
                                            onClick={handleSubmit}
                                            disabled={isLoading}
                                            className="w-full bg-azul-primary hover:bg-azul-dark text-white h-14 rounded-2xl font-black uppercase italic tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-azul-primary/20 transition-all hover:scale-[1.02]"
                                        >
                                            {isLoading ? <Activity className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                                            {isEditing ? "Confirmar Cambios" : "Confirmar y Publicar"}
                                        </button>
                                        <button
                                            onClick={() => setShowReview(false)}
                                            className="w-full text-muted-foreground hover:text-subtle text-[10px] font-black uppercase tracking-[0.2em] py-2 transition-colors"
                                        >
                                            Volver a Corregir
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
