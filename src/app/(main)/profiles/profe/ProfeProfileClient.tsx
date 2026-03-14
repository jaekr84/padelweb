"use client";

import { useState } from "react";
import { updateProfeProfile } from "./actions";
import { switchRole } from "@/app/(main)/profile/actions";
import Link from "next/link";
import {
    Edit2,
    GraduationCap,
    MapPin,
    Star,
    CheckCircle2,
    BookOpen,
    Users,
    Clock,
    Plus,
    X,
    Calendar,
    MessageCircle,
    Instagram,
    Smartphone,
    Trophy,
    Award,
    Target,
    ChevronRight,
    Play,
    Zap,
    LayoutDashboard
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

const DAYS = ["L", "M", "X", "J", "V", "S", "D"];
const SLOT_LABELS = ["Mañana", "Tarde", "Noche"];

interface ProfeProfileClientProps {
    profe: any;
    isOwner: boolean;
    embedded?: boolean;
}

export default function ProfeProfileClient({ profe, isOwner, embedded = false }: ProfeProfileClientProps) {
    const [activeTab, setActiveTab] = useState<"info" | "pricing" | "academy" | "availability">("info");
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [localAvail, setLocalAvail] = useState<number[][]>(profe?.availability || [[0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0]]);
    const [isEditingSchedule, setIsEditingSchedule] = useState(false);

    const [isEditingPricing, setIsEditingPricing] = useState(false);
    const defaultPricing = [
        { tipo: "Clase Particular (1-a-1)", dur: "60 min de entrenamiento intenso", precio: "$12.000", icon: "👤", desc: "Mejora tu técnica específica" },
        { tipo: "Clase en Pareja", dur: "60 min con tu compañero", precio: "$8.000 c/u", icon: "👥", desc: "Táctica y posicionamiento" },
        { tipo: "Clase Grupal", dur: "90 min (3–4 pers.)", precio: "$6.000 c/u", icon: "👨‍👩‍👧", desc: "Dinámica y ritmo de partido" },
    ];
    const [localPricing, setLocalPricing] = useState<{ tipo: string, dur: string, precio: string, icon: string, desc: string }[]>(
        profe?.pricing || defaultPricing
    );

    const [formData, setFormData] = useState({
        name: profe?.name || "",
        bio: profe?.bio || "",
        location: profe?.location || "",
        level: profe?.level || "PROFE Nacional",
        experience: profe?.experience || "5 años",
        phone: profe?.phone || "",
        whatsapp: profe?.whatsapp || "",
        instagram: profe?.instagram || "",
        workingZones: profe?.workingZones?.join(", ") || "",
        specialities: profe?.specialities?.join(", ") || "",
    });

    if (!profe) return (
        <div className="flex flex-col items-center justify-center py-20 min-h-[60vh] text-center gap-4">
            <GraduationCap className="h-12 w-12 text-foreground/5 opacity-50" />
            <div className="text-muted-foreground/60 font-black uppercase tracking-[0.5em] animate-pulse">Instructor no encontrado</div>
        </div>
    );

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateProfeProfile({
                ...formData,
                workingZones: formData.workingZones.split(",").map((s: string) => s.trim()).filter(Boolean),
                specialities: formData.specialities.split(",").map((s: string) => s.trim()).filter(Boolean),
            });
            setIsEditing(false);
            toast.success("Perfil de profesor actualizado");
            window.location.reload();
        } catch (error) {
            toast.error("Error al actualizar");
        }
        setSaving(false);
    };

    const handleToggleSlot = (ri: number, di: number) => {
        if (!isOwner || !isEditingSchedule) return;
        const newAvail = localAvail.map((row, rIdx) =>
            row.map((val, dIdx) => (rIdx === ri && dIdx === di ? (val ? 0 : 1) : val))
        );
        setLocalAvail(newAvail);
    };

    const handleSaveSchedule = async () => {
        setSaving(true);
        try {
            await updateProfeProfile({
                name: profe.name,
                bio: profe.bio || "",
                location: profe.location || "",
                level: profe.level || "",
                experience: profe.experience || "",
                phone: profe.phone || "",
                whatsapp: profe.whatsapp || "",
                instagram: profe.instagram || "",
                workingZones: profe.workingZones || [],
                specialities: profe.specialities || [],
                availability: localAvail,
                pricing: localPricing,
            });
            setIsEditingSchedule(false);
            toast.success("Disponibilidad guardada");
        } catch (error) {
            toast.error("Error al guardar");
        }
        setSaving(false);
    };

    return (
        <div className={`flex flex-col gap-6 animate-in fade-in duration-700 ${embedded ? "" : "min-h-screen bg-background text-foreground pb-20 pt-4 px-4"}`}>
            <div className={`max-w-4xl mx-auto w-full flex flex-col gap-6`}>

                {/* ── Hero Section (Unificado) ── */}
                <div className="bg-card backdrop-blur-3xl border border-border rounded-[2rem] overflow-hidden shadow-2xl relative">
                    <div className="h-32 md:h-48 bg-gradient-to-br from-indigo-900/40 via-blue-900/30 to-slate-900/50 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(99,102,241,0.1),transparent)]" />
                    </div>

                    <div className="absolute top-4 right-4 z-10">
                        {isOwner && (
                            <button
                                className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md border border-white/20 text-white px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all hover:bg-white/20 active:scale-95 shadow-lg"
                                onClick={() => setIsEditing(true)}
                            >
                                <Edit2 className="h-3.5 w-3.5" /> Editar Perfil
                            </button>
                        )}
                    </div>

                    <div className="px-6 pb-8 -mt-12 md:-mt-16 relative flex flex-col md:flex-row items-center md:items-end gap-6">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-full blur opacity-25 group-hover:opacity-40 transition-opacity" />
                            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-background overflow-hidden bg-muted shadow-2xl relative flex items-center justify-center">
                                {profe?.avatarUrl ? (
                                    <Image
                                        src={profe.avatarUrl}
                                        alt={profe.name}
                                        fill
                                        className="object-cover"
                                        priority
                                    />
                                ) : (
                                    <GraduationCap className="h-10 w-10 text-muted-foreground/60" />
                                )}
                            </div>
                        </div>

                        <div className="flex-1 text-center md:text-left pt-2 pb-1">
                            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2 justify-center md:justify-start">
                                <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tight">{profe?.name}</h1>
                                <div className="flex self-center md:self-auto px-3 py-1 bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/20 dark:border-indigo-500/30 rounded-full">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-600 dark:text-indigo-400">Head Coach</span>
                                </div>
                            </div>
                            <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-2 text-muted-foreground text-[10px] font-black uppercase tracking-widest">
                                <div className="flex items-center gap-2">
                                    <Award className="h-3.5 w-3.5" /> {profe.experience} de experiencia
                                </div>
                                <div className="flex items-center gap-2">
                                    <Star className="h-3.5 w-3.5 text-yellow-500/50" /> Certified Coach
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-3.5 w-3.5 text-indigo-500/50" /> {profe.location}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Content Navigation ── */}
                <div className="flex items-center gap-2 bg-card p-1.5 rounded-[1.5rem] border border-border overflow-x-auto no-scrollbar shadow-inner">
                    <button
                        className={`flex-1 min-w-[100px] px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "info" ? "bg-indigo-600 text-white shadow-xl shadow-indigo-900/40" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                        onClick={() => setActiveTab("info")}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <BookOpen className="h-3.5 w-3.5" /> Método
                        </div>
                    </button>
                    <button
                        className={`flex-1 min-w-[100px] px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "pricing" ? "bg-indigo-600 text-white shadow-xl shadow-indigo-900/40" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                        onClick={() => setActiveTab("pricing")}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Zap className="h-3.5 w-3.5" /> Tarifas
                        </div>
                    </button>
                    <button
                        className={`flex-1 min-w-[100px] px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "academy" ? "bg-indigo-600 text-white shadow-xl shadow-indigo-900/40" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                        onClick={() => setActiveTab("academy")}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <GraduationCap className="h-3.5 w-3.5" /> PROFE
                        </div>
                    </button>
                    <button
                        className={`flex-1 min-w-[100px] px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "availability" ? "bg-indigo-600 text-white shadow-xl shadow-indigo-900/40" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                        onClick={() => setActiveTab("availability")}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Calendar className="h-3.5 w-3.5" /> Agenda
                        </div>
                    </button>
                </div>

                {/* ── Active Content ── */}
                <div className="animate-in slide-in-from-bottom-4 duration-500">
                    {activeTab === "info" && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2 flex flex-col gap-6">
                                <div className="bg-card border border-border p-8 rounded-[2rem] shadow-xl">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">Filosofía</h3>
                                    <p className="text-foreground/80 text-sm leading-relaxed font-medium">
                                        {profe?.bio || "Enfocado en llevar tu juego al siguiente nivel mediante táctica avanzada y acondicionamiento físico."}
                                    </p>
                                </div>
                                <div className="bg-card border border-border p-8 rounded-[2rem] shadow-xl">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">Especialidades</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {profe?.specialities?.map((s: string, i: number) => (
                                            <span key={i} className="px-4 py-2 bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/20 dark:border-indigo-500/30 rounded-full text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-600 dark:text-indigo-400">
                                                {s}
                                            </span>
                                        )) || <span className="text-muted-foreground/60 text-xs">Sin especialidades</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col gap-6">
                                <div className="bg-card border border-border p-8 rounded-[2rem] shadow-xl flex flex-col gap-6">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Zonas de Trabajo</h3>
                                    <div className="flex flex-col gap-3">
                                        {profe?.workingZones?.map((z: string, i: number) => (
                                            <div key={i} className="flex items-center gap-3 text-foreground/80">
                                                <MapPin className="h-3.5 w-3.5 text-indigo-500/50" />
                                                <span className="text-xs font-bold">{z}</span>
                                            </div>
                                        )) || <span className="text-muted-foreground/60 text-xs">No especificadas</span>}
                                    </div>
                                </div>
                                <div className="bg-card border border-border p-8 rounded-[2rem] shadow-xl flex flex-col gap-6">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Nivel Oficial</h3>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-lg shadow-indigo-900/20">
                                            <GraduationCap className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <span className="text-[11px] font-black uppercase tracking-widest text-foreground/80">{profe.level}</span>
                                    </div>
                                </div>
                                {(profe?.whatsapp || profe?.phone) && (
                                    <button
                                        onClick={() => {
                                            const phone = profe.whatsapp || profe.phone;
                                            window.open(`https://wa.me/${phone?.replace(/\D/g, '')}`, '_blank');
                                        }}
                                        className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/40 active:scale-95"
                                    >
                                        <MessageCircle className="h-4 w-4 fill-current" /> Contactar por WhatsApp
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === "pricing" && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {localPricing.map((p, i) => (
                                <div key={i} className="bg-card border border-border p-8 rounded-[2rem] shadow-xl flex flex-col gap-6 hover:border-indigo-500/30 transition-all group">
                                    <div className="flex justify-between items-start">
                                        <span className="text-4xl grayscale group-hover:grayscale-0 transition-all duration-500">{p.icon}</span>
                                        <span className="px-3 py-1 bg-muted rounded-full text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">{p.precio}</span>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <h3 className="text-sm font-black uppercase italic tracking-tight text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-600 dark:text-indigo-400 transition-colors">{p.tipo}</h3>
                                        <p className="text-[10px] font-medium text-muted-foreground leading-relaxed">{p.desc}</p>
                                    </div>
                                    <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                                        <Clock className="h-3 w-3" /> {p.dur}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === "academy" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-card border border-border p-8 rounded-[2rem] shadow-xl flex flex-col gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                                        <Trophy className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black uppercase italic tracking-tight">Programas de Entrenamiento</h3>
                                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Metodología de Alto Rendimiento</p>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-4 mt-2">
                                    <div className="p-4 bg-card rounded-2xl border border-border/50 hover:border-indigo-500/30 transition-all">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Clínicas de Técnica</span>
                                            <span className="text-[10px] font-bold text-muted-foreground/60 italic">Todos los Niveles</span>
                                        </div>
                                        <p className="text-xs text-foreground/80 leading-relaxed">Sesiones intensivas enfocadas en golpes específicos: bandeja, víbora y defensa de pared.</p>
                                    </div>
                                    <div className="p-4 bg-card rounded-2xl border border-border/50 hover:border-indigo-500/30 transition-all">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Pre-Competitivo</span>
                                            <span className="text-[10px] font-bold text-muted-foreground/60 italic">Avanzado</span>
                                        </div>
                                        <p className="text-xs text-foreground/80 leading-relaxed">Preparación física y táctica para torneos oficiales A.C.A.P. y categorías federadas.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-card border border-border p-8 rounded-[2rem] shadow-xl flex flex-col gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                                        <Target className="h-6 w-6 text-red-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black uppercase italic tracking-tight">Objetivos por Nivel</h3>
                                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Planificación Personalizada</p>
                                    </div>
                                </div>
                                <div className="space-y-4 mt-2">
                                    <div className="flex items-start gap-4 p-4 hover:bg-muted rounded-2xl transition-all">
                                        <div className="text-indigo-600 dark:text-indigo-400 font-black text-xl italic">01.</div>
                                        <div>
                                            <h4 className="text-[10px] font-black uppercase tracking-widest mb-1">Iniciación</h4>
                                            <p className="text-xs text-foreground/50 leading-relaxed">Dominio de empuñaduras, desplazamientos básicos y reglas del juego.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4 p-4 hover:bg-muted rounded-2xl transition-all">
                                        <div className="text-indigo-600 dark:text-indigo-400 font-black text-xl italic">02.</div>
                                        <div>
                                            <h4 className="text-[10px] font-black uppercase tracking-widest mb-1">Intermedio</h4>
                                            <p className="text-xs text-foreground/50 leading-relaxed">Uso de paredes, voleas con profundidad y manejo de los tiempos del punto.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "availability" && (
                        <div className="bg-card border border-border rounded-[2rem] p-8 shadow-xl">
                            <div className="flex justify-between items-center mb-10">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Disponibilidad Semanal</h3>
                                {isOwner && (
                                    <button
                                        onClick={() => isEditingSchedule ? handleSaveSchedule() : setIsEditingSchedule(true)}
                                        className={`text-[10px] font-black uppercase tracking-widest px-6 py-2.5 rounded-full transition-all ${isEditingSchedule ? 'bg-indigo-600 text-white' : 'bg-card text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'}`}
                                    >
                                        {isEditingSchedule ? "Guardar Agenda" : "Editar Agenda"}
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-8 gap-3">
                                <div />
                                {DAYS.map(d => <div key={d} className="text-center text-[10px] font-black text-muted-foreground">{d}</div>)}

                                {SLOT_LABELS.map((label, rIdx) => (
                                    <div key={label} className="contents">
                                        <div className="text-[9px] font-black uppercase text-muted-foreground/60 flex items-center justify-end pr-3 italic">{label}</div>
                                        {localAvail[rIdx].map((val, dIdx) => (
                                            <button
                                                key={`${rIdx}-${dIdx}`}
                                                disabled={!isEditingSchedule}
                                                onClick={() => handleToggleSlot(rIdx, dIdx)}
                                                className={`aspect-square rounded-xl border transition-all ${val ? "bg-indigo-600 border-indigo-400 shadow-lg shadow-indigo-900/40" : "bg-card border-border/50"
                                                    } ${isEditingSchedule ? "cursor-pointer hover:scale-110 active:scale-95 border-dashed" : "cursor-default"}`}
                                            />
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Edit Modal Unificado ── */}
                {isEditing && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[1000] flex items-center justify-center p-4">
                        <div className="bg-card border border-border rounded-[2.5rem] w-full max-w-[650px] max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 shadow-2xl">
                            <div className="px-8 pt-8 pb-4 flex justify-between items-center sticky top-0 bg-background/80 backdrop-blur-lg z-10 border-b border-border">
                                <h2 className="text-2xl font-black uppercase italic tracking-tight">Editar Perfil Profe</h2>
                                <button onClick={() => setIsEditing(false)} className="w-10 h-10 rounded-full bg-card hover:bg-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all">✕</button>
                            </div>
                            <form onSubmit={handleSave} className="p-8 flex flex-col gap-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Nombre Coach</label>
                                        <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-card border border-border rounded-2xl py-4 px-5 text-foreground text-sm font-bold outline-none focus:border-indigo-500 shadow-inner" />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Título / Nivel</label>
                                        <input type="text" value={formData.level} onChange={e => setFormData({ ...formData, level: e.target.value })} className="w-full bg-card border border-border rounded-2xl py-4 px-5 text-foreground text-sm font-bold outline-none focus:border-indigo-500 shadow-inner" />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Bio / Filosofía</label>
                                    <textarea value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} rows={4} className="w-full bg-card border border-border rounded-2xl py-4 px-5 text-foreground text-sm font-bold outline-none focus:border-indigo-500 resize-none shadow-inner" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Experiencia</label>
                                        <input type="text" value={formData.experience} onChange={e => setFormData({ ...formData, experience: e.target.value })} className="w-full bg-card border border-border rounded-2xl py-4 px-5 text-foreground text-sm font-bold outline-none focus:border-indigo-500 shadow-inner" />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Ubicación principal</label>
                                        <input type="text" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} className="w-full bg-card border border-border rounded-2xl py-4 px-5 text-foreground text-sm font-bold outline-none focus:border-indigo-500 shadow-inner" />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Zonas (separadas por coma)</label>
                                    <input type="text" value={formData.workingZones} onChange={e => setFormData({ ...formData, workingZones: e.target.value })} className="w-full bg-card border border-border rounded-2xl py-4 px-5 text-foreground text-sm font-bold outline-none focus:border-indigo-500 shadow-inner" />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Especialidades (separadas por coma)</label>
                                    <input type="text" value={formData.specialities} onChange={e => setFormData({ ...formData, specialities: e.target.value })} className="w-full bg-card border border-border rounded-2xl py-4 px-5 text-foreground text-sm font-bold outline-none focus:border-indigo-500 shadow-inner" />
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-6">
                                    <button type="button" onClick={() => setIsEditing(false)} className="bg-card text-foreground/80 border border-border py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Cancelar</button>
                                    <button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 text-foreground py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-900/40 disabled:opacity-50">
                                        {saving ? "Guardando..." : "Guardar Cambios"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
