"use client";

import { useState, useRef } from "react";
import { updateCentroProfile } from "./actions";
import Link from "next/link";
import {
    Edit2,
    MapPin,
    Phone,
    Globe,
    Instagram,
    Clock,
    Star,
    Info,
    Camera,
    Trash2,
    Plus,
    LayoutDashboard,
    CheckCircle2,
    CalendarDays,
    MessageCircle,
    Trophy,
    Target,
    Zap,
    GraduationCap,
    Clock as ClockIcon
} from "lucide-react";
import { toast } from "sonner";

const DAYS_OF_WEEK = [
    { key: "lun", label: "Lunes" },
    { key: "mar", label: "Martes" },
    { key: "mie", label: "Miércoles" },
    { key: "jue", label: "Jueves" },
    { key: "vie", label: "Viernes" },
    { key: "sab", label: "Sábado" },
    { key: "dom", label: "Domingo" },
];

const DEFAULT_SCHEDULE = Object.fromEntries(
    DAYS_OF_WEEK.map(({ key }) => [key, { open: "08:00", close: "22:00", closed: false }])
);

interface CentroProfileClientProps {
    centro: any;
    isOwner: boolean;
    embedded?: boolean;
}

export default function CentroProfileClient({ centro, isOwner, embedded = false }: CentroProfileClientProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState<"info" | "photos" | "academy" | "schedule">("info");
    const [saving, setSaving] = useState(false);
    const [photos, setPhotos] = useState<string[]>(centro?.photos || []);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        name: centro?.name || "",
        bio: centro?.bio || "",
        location: centro?.location || "",
        address: centro?.address || "",
        phone: centro?.phone || "",
        whatsapp: centro?.whatsapp || "",
        instagram: centro?.instagram || "",
        website: centro?.website || "",
        courts: centro?.courts || 0,
        amenities: centro?.amenities?.join(", ") || "",
        schedule: centro?.schedule || DEFAULT_SCHEDULE,
    });

    const [scheduleData, setScheduleData] = useState<Record<string, { open: string; close: string; closed: boolean }>>(
        centro?.schedule || DEFAULT_SCHEDULE
    );

    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                const MAX = 900;
                let { width, height } = img;
                if (width > MAX || height > MAX) {
                    if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
                    else { width = Math.round((width * MAX) / height); height = MAX; }
                }
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
                URL.revokeObjectURL(url);
                resolve(canvas.toDataURL("image/jpeg", 0.72));
            };
            img.src = url;
        });
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const remaining = 5 - photos.length;
        if (remaining <= 0) {
            toast.error("Máximo 5 fotos permitidas");
            return;
        }

        const toProcess = files.slice(0, remaining);
        const compressed = await Promise.all(toProcess.map(compressImage));
        setPhotos(prev => [...prev, ...compressed].slice(0, 5));
        e.target.value = "";
    };

    const handleRemovePhoto = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateCentroProfile({
                name: formData.name,
                bio: formData.bio,
                location: formData.location,
                address: formData.address,
                phone: formData.phone,
                whatsapp: formData.whatsapp,
                instagram: formData.instagram,
                website: formData.website,
                courts: Number(formData.courts),
                amenities: formData.amenities.split(",").map((s: string) => s.trim()).filter(Boolean),
                schedule: scheduleData,
                photos,
            });
            setIsEditing(false);
            toast.success("Perfil de centro actualizado");
            window.location.reload();
        } catch (err) {
            toast.error("Error al guardar el perfil");
        }
        setSaving(false);
    };

    return (
        <div className={`flex flex-col gap-6 animate-in fade-in duration-700 ${embedded ? "" : "min-h-screen bg-[#090A0F] text-white pb-20 pt-4 px-4"}`}>
            <div className={`max-w-4xl mx-auto w-full flex flex-col gap-6`}>

                {/* ── Hero Section ── */}
                <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl relative">
                    <div className="h-32 md:h-48 bg-gradient-to-br from-indigo-900/40 via-blue-900/30 to-slate-900/50 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(99,102,241,0.1),transparent)]" />
                        {photos.length > 0 && (
                            <img src={photos[0]} alt="Centro" className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-overlay blur-[2px]" />
                        )}
                    </div>

                    <div className="absolute top-4 right-4 z-10">
                        {isOwner && (
                            <button
                                className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md border border-white/20 text-white px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all hover:bg-white/20 active:scale-95 shadow-lg"
                                onClick={() => setIsEditing(true)}
                            >
                                <Edit2 className="h-3.5 w-3.5" /> Editar Centro
                            </button>
                        )}
                    </div>

                    <div className="px-6 pb-8 -mt-12 md:-mt-16 relative flex flex-col md:flex-row items-center md:items-end gap-6">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity" />
                            <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl border-4 border-[#090A0F] overflow-hidden bg-slate-800 shadow-2xl relative flex items-center justify-center">
                                {photos.length > 0 ? (
                                    <img src={photos[0]} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <LayoutDashboard className="h-10 w-10 text-white/20" />
                                )}
                            </div>
                        </div>

                        <div className="flex-1 text-center md:text-left pt-2 pb-1">
                            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2 justify-center md:justify-start">
                                <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tight">{centro?.name || "Nuevo Centro"}</h1>
                                <div className="flex self-center md:self-auto px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-full">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Centro de Pádel</span>
                                </div>
                            </div>

                            <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-2 text-white/40 text-[10px] font-black uppercase tracking-widest">
                                {centro?.location && (
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-3.5 w-3.5" /> {centro.location}
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <Star className="h-3.5 w-3.5 text-yellow-500/50" /> 4.9 (Verificado)
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500/50" /> {centro?.courts || 0} Canchas
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Content Navigation ── */}
                <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-[1.5rem] border border-white/10 overflow-x-auto no-scrollbar shadow-inner">
                    <button
                        className={`flex-1 min-w-[100px] px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "info" ? "bg-indigo-600 text-white shadow-xl shadow-indigo-900/40" : "text-white/40 hover:text-white hover:bg-white/5"}`}
                        onClick={() => setActiveTab("info")}
                    >
                        Info
                    </button>
                    <button
                        className={`flex-1 min-w-[100px] px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "photos" ? "bg-indigo-600 text-white shadow-xl shadow-indigo-900/40" : "text-white/40 hover:text-white hover:bg-white/5"}`}
                        onClick={() => setActiveTab("photos")}
                    >
                        Fotos
                    </button>
                    <button
                        className={`flex-1 min-w-[100px] px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "academy" ? "bg-indigo-600 text-white shadow-xl shadow-indigo-900/40" : "text-white/40 hover:text-white hover:bg-white/5"}`}
                        onClick={() => setActiveTab("academy")}
                    >
                        PROFE
                    </button>
                    <button
                        className={`flex-1 min-w-[100px] px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "schedule" ? "bg-indigo-600 text-white shadow-xl shadow-indigo-900/40" : "text-white/40 hover:text-white hover:bg-white/5"}`}
                        onClick={() => setActiveTab("schedule")}
                    >
                        Horarios
                    </button>
                </div>

                {/* ── Active Content ── */}
                <div className="animate-in slide-in-from-bottom-4 duration-500">
                    {activeTab === "info" && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2 flex flex-col gap-6">
                                <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] shadow-xl">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-4">Descripción</h3>
                                    <p className="text-white/70 text-sm leading-relaxed font-medium">
                                        {centro?.bio || "Sin descripción disponible."}
                                    </p>
                                </div>
                                <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] shadow-xl">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-4">Amenidades</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {centro?.amenities?.map((a: string, i: number) => (
                                            <span key={i} className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] font-black uppercase tracking-widest text-indigo-400">
                                                {a}
                                            </span>
                                        )) || <span className="text-white/30 text-[10px]">No hay servicios listados</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col gap-6">
                                <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] shadow-xl flex flex-col gap-6">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Contacto</h3>
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center gap-3 text-white/80">
                                            <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10"><Phone className="h-4 w-4" /></div>
                                            <span className="text-sm font-bold tracking-tight">{centro?.phone || "-"}</span>
                                        </div>


                                        <div className="flex items-center gap-3 text-white/80">
                                            <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10"><Globe className="h-4 w-4" /></div>
                                            <span className="text-sm font-bold tracking-tight truncate">{centro?.website || "-"}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-white/80">
                                            <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10"><Instagram className="h-4 w-4" /></div>
                                            <span className="text-sm font-bold tracking-tight italic">@{centro?.instagram || "-"}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] shadow-xl flex flex-col gap-6">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Dirección</h3>
                                    <div className="flex flex-col gap-2">
                                        <p className="text-sm font-bold tracking-tight text-white/80">{centro?.address || "No especificada"}</p>
                                        <span className="text-[10px] font-black uppercase text-white/30">{centro?.location}</span>
                                    </div>
                                </div>
                                {(centro?.phone || centro?.whatsapp) && (
                                    <a
                                        href={`https://wa.me/${(centro?.whatsapp || centro?.phone).replace(/\D/g, '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/40 active:scale-95"
                                    >
                                        <MessageCircle className="h-4 w-4 fill-current" /> Contactar por WhatsApp
                                    </a>
                                )}

                            </div>
                        </div>
                    )}

                    {activeTab === "photos" && (
                        <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] shadow-xl">
                            {photos.length === 0 ? (
                                <div className="p-16 border-2 border-dashed border-white/10 rounded-[1.5rem] flex flex-col items-center gap-4 text-center">
                                    <Camera className="h-12 w-12 text-white/10" />
                                    <p className="text-white/40 text-sm font-medium">No hay fotos en la galería.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {photos.map((p, i) => (
                                        <div key={i} className="aspect-square rounded-[1.5rem] overflow-hidden border border-white/10 shadow-lg relative group">
                                            <img src={p} alt="Centro" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "academy" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] shadow-xl flex flex-col gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                                        <Trophy className="h-6 w-6 text-indigo-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black uppercase italic tracking-tight">Programas de la Escuela</h3>
                                        <p className="text-[10px] text-white/30 uppercase font-black tracking-widest">Escuela de Menores y Adultos</p>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-4 mt-2">
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Escualita de Menores</span>
                                            <span className="text-[10px] font-bold text-white/20 italic">6-14 años</span>
                                        </div>
                                        <p className="text-xs text-white/60 leading-relaxed">Formación integral desde lo básico hasta la técnica competitiva.</p>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Entrenamiento Adultos</span>
                                            <span className="text-[10px] font-bold text-white/20 italic">Todos los Niveles</span>
                                        </div>
                                        <p className="text-xs text-white/60 leading-relaxed">Clases grupales y particulares adaptadas a tu ritmo de juego.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] shadow-xl flex flex-col gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                                        <Target className="h-6 w-6 text-red-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black uppercase italic tracking-tight">Nuestra Metodología</h3>
                                        <p className="text-[10px] text-white/30 uppercase font-black tracking-widest">A.C.A.P. Performance</p>
                                    </div>
                                </div>
                                <div className="space-y-4 mt-2">
                                    <div className="flex items-start gap-4 p-4 hover:bg-white/5 rounded-2xl transition-all">
                                        <div className="text-indigo-400 font-black text-xl italic">01.</div>
                                        <div>
                                            <h4 className="text-[10px] font-black uppercase tracking-widest mb-1">Técnica Moderna</h4>
                                            <p className="text-xs text-white/50 leading-relaxed">Enfoque en desplazamientos eficientes y golpes de control.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4 p-4 hover:bg-white/5 rounded-2xl transition-all">
                                        <div className="text-indigo-400 font-black text-xl italic">02.</div>
                                        <div>
                                            <h4 className="text-[10px] font-black uppercase tracking-widest mb-1">Táctica en Cancha</h4>
                                            <p className="text-xs text-white/50 leading-relaxed">Situaciones de juego real para mejorar la toma de decisiones.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "schedule" && (
                        <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 shadow-xl">
                            <div className="flex flex-col gap-3">
                                {DAYS_OF_WEEK.map(({ key, label }) => {
                                    const s = scheduleData[key];
                                    return (
                                        <div key={key} className="flex items-center justify-between py-4 border-b border-white/5 last:border-0 hover:bg-white/5 px-4 rounded-xl transition-colors group">
                                            <span className="text-xs font-black uppercase tracking-widest text-white/40 group-hover:text-white/60">{label}</span>
                                            <div className="flex items-center gap-4">
                                                {s?.closed ? (
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-red-500/50">Cerrado</span>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-black italic tracking-tighter tabular-nums text-white/80">{s?.open || "08:00"}</span>
                                                        <div className="w-2 h-[1px] bg-white/20" />
                                                        <span className="text-sm font-black italic tracking-tighter tabular-nums text-white/80">{s?.close || "22:00"}</span>
                                                    </div>
                                                )}
                                                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"><ClockIcon className="h-3.5 w-3.5 text-white/20" /></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Edit Modal ── */}
                {isEditing && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[1000] flex items-center justify-center p-4">
                        <div className="bg-[#0D0F16] border border-white/10 rounded-[2.5rem] w-full max-w-[800px] max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 shadow-2xl flex flex-col">
                            <div className="px-8 pt-8 pb-4 flex justify-between items-center sticky top-0 bg-[#0D0F16]/80 backdrop-blur-lg z-10 border-b border-white/5">
                                <div className="flex flex-col">
                                    <h2 className="text-2xl font-black uppercase italic tracking-tight">Editar Centro</h2>
                                    <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/30">Configuración Profesional</span>
                                </div>
                                <button onClick={() => setIsEditing(false)} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all">✕</button>
                            </div>

                            <div className="p-8 flex flex-col gap-10">
                                {/* Galería */}
                                <div className="flex flex-col gap-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-white/30 px-2">Galería de Fotos ({photos.length}/5)</h3>
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={photos.length >= 5}
                                            className="px-4 py-2 bg-indigo-600 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg shadow-indigo-900/40 active:scale-95 transition-all disabled:opacity-30 flex items-center gap-2"
                                        >
                                            <Plus className="h-3 w-3" /> Añadir
                                        </button>
                                        <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} multiple accept="image/*" className="hidden" />
                                    </div>
                                    <div className="grid grid-cols-5 gap-3">
                                        {[...Array(5)].map((_, i) => (
                                            <div key={i} className={`aspect-square rounded-2xl border-2 border-dashed flex items-center justify-center relative overflow-hidden transition-all ${photos[i] ? "border-indigo-500/30" : "border-white/5"}`}>
                                                {photos[i] ? (
                                                    <>
                                                        <img src={photos[i]} className="w-full h-full object-cover" />
                                                        <button onClick={() => handleRemovePhoto(i)} className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-lg flex items-center justify-center text-white shadow-xl">
                                                            <Trash2 className="h-3 w-3" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <Camera className="h-4 w-4 text-white/10" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Form Sections */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="flex flex-col gap-6">
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-white/30 px-2 border-l-2 border-indigo-500">Básico</h3>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase text-white/30 ml-2">Nombre Comercial</label>
                                            <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white text-sm font-bold outline-none focus:border-indigo-500 shadow-inner" />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase text-white/30 ml-2">Descripción</label>
                                            <textarea value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} rows={3} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white text-sm font-bold outline-none focus:border-indigo-500 shadow-inner resize-none" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-2">
                                                <label className="text-[10px] font-black uppercase text-white/30 ml-2">Barrio</label>
                                                <input type="text" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white text-sm font-bold outline-none focus:border-indigo-500" />
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <label className="text-[10px] font-black uppercase text-white/30 ml-2">Canchas</label>
                                                <input type="number" value={formData.courts} onChange={e => setFormData({ ...formData, courts: Number(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white text-sm font-bold outline-none focus:border-indigo-500" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-6">
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-white/30 px-2 border-l-2 border-indigo-500">Legal y Redes</h3>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex flex-col gap-2 mb-2">
                                                <label className="text-[10px] font-black uppercase text-white/30 ml-2">Dirección Completa</label>
                                                <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white text-sm font-bold outline-none focus:border-indigo-500" />
                                            </div>
                                            <div className="flex flex-col gap-2 mb-2">
                                                <label className="text-[10px] font-black uppercase text-white/30 ml-2">Teléfono / WhatsApp</label>
                                                <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white text-sm font-bold outline-none focus:border-indigo-500" />
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <label className="text-[10px] font-black uppercase text-white/30 ml-2">Servicios (coma)</label>
                                                <input type="text" value={formData.amenities} onChange={e => setFormData({ ...formData, amenities: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white text-sm font-bold outline-none focus:border-indigo-500" placeholder="Parking, Bar, WiFi..." />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Horarios */}
                                <div className="flex flex-col gap-4">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-white/30 px-2 border-l-2 border-indigo-500">Horarios de Apertura</h3>
                                    <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden">
                                        {DAYS_OF_WEEK.map(({ key, label }) => (
                                            <div key={key} className="flex items-center justify-between p-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-white/40 min-w-[100px]">{label}</span>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="time"
                                                        disabled={scheduleData[key]?.closed}
                                                        value={scheduleData[key]?.open}
                                                        onChange={e => setScheduleData({ ...scheduleData, [key]: { ...scheduleData[key], open: e.target.value } })}
                                                        className="bg-white/5 border border-white/10 rounded-xl px-2 py-1 text-xs font-bold text-white/80 disabled:opacity-20"
                                                    />
                                                    <span className="text-white/20">-</span>
                                                    <input
                                                        type="time"
                                                        disabled={scheduleData[key]?.closed}
                                                        value={scheduleData[key]?.close}
                                                        onChange={e => setScheduleData({ ...scheduleData, [key]: { ...scheduleData[key], close: e.target.value } })}
                                                        className="bg-white/5 border border-white/10 rounded-xl px-2 py-1 text-xs font-bold text-white/80 disabled:opacity-20"
                                                    />
                                                    <label className="flex items-center gap-2 ml-4 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={scheduleData[key]?.closed}
                                                            onChange={e => setScheduleData({ ...scheduleData, [key]: { ...scheduleData[key], closed: e.target.checked } })}
                                                            className="sr-only peer"
                                                        />
                                                        <div className="w-8 h-4 bg-white/10 peer-checked:bg-red-500/50 rounded-full relative transition-colors after:content-[''] after:absolute after:top-1 after:left-1 after:w-2 after:h-2 after:bg-white after:rounded-full after:transition-all peer-checked:after:left-5"></div>
                                                        <span className="text-[8px] font-black uppercase tracking-widest text-white/20 peer-checked:text-red-500">Cerrado</span>
                                                    </label>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mt-6">
                                    <button onClick={() => setIsEditing(false)} className="bg-white/5 text-white/60 border border-white/10 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Descartar</button>
                                    <button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 text-white py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-900/40 disabled:opacity-50">
                                        {saving ? "Publicando..." : "Guardar Cambios"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
