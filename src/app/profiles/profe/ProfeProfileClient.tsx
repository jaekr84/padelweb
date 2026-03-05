"use client";

import { useState } from "react";
import { UserProfile } from "@clerk/nextjs";
import { updateProfeProfile } from "./actions";
import { switchRole } from "@/app/profile/actions";
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
    Play
} from "lucide-react";
import { toast } from "sonner";

const DAYS = ["L", "M", "X", "J", "V", "S", "D"];
const SLOT_LABELS = ["Mañana", "Tarde", "Noche"];

interface ProfeProfileClientProps {
    profe: any;
    isOwner: boolean;
    embedded?: boolean;
}

export default function ProfeProfileClient({ profe, isOwner, embedded = false }: ProfeProfileClientProps) {
    const [activeTab, setActiveTab] = useState<"info" | "pricing" | "availability">("info");
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
        level: profe?.level || "Profesor Nacional",
        experience: profe?.experience || "5 años",
        phone: profe?.phone || "",
        whatsapp: profe?.whatsapp || "",
        instagram: profe?.instagram || "",
        workingZones: profe?.workingZones?.join(", ") || "",
        specialities: profe?.specialities?.join(", ") || "",
    });

    if (!profe) return <div className="text-center py-20 text-white/20 font-black uppercase tracking-[0.5em]">Instructor No Encontrado</div>;

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

    const handlePricingChange = (index: number, field: string, value: string) => {
        const newPricing = [...localPricing];
        newPricing[index] = { ...newPricing[index], [field]: value };
        setLocalPricing(newPricing);
    };

    return (
        <div className={`flex flex-col gap-6 animate-in fade-in duration-700 ${embedded ? "" : "min-h-screen bg-[#090A0F] text-white pb-20 pt-4 px-4"}`}>
            <div className="max-w-4xl mx-auto w-full flex flex-col gap-6">

                {/* ── Hero ── */}
                <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl relative">
                    <div className="h-32 md:h-48 bg-gradient-to-br from-emerald-900/40 via-blue-900/30 to-slate-900/50 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(16,185,129,0.1),transparent)]" />
                    </div>

                    <div className="absolute top-4 right-4 z-10">
                        {isOwner && (
                            <button
                                className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md border border-white/20 text-white px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all hover:bg-white/20 active:scale-95 shadow-lg"
                                onClick={() => setIsEditing(true)}
                            >
                                <Edit2 className="h-3.5 w-3.5" /> Editar Academy
                            </button>
                        )}
                    </div>

                    <div className="px-6 pb-8 -mt-12 md:-mt-16 relative flex flex-col md:flex-row items-center md:items-end gap-6">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-full blur opacity-25 group-hover:opacity-40 transition-opacity" />
                            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-[#090A0F] overflow-hidden bg-slate-800 shadow-2xl relative flex items-center justify-center">
                                <GraduationCap className="h-10 w-10 text-white/20" />
                            </div>
                        </div>

                        <div className="flex-1 text-center md:text-left pt-2 pb-1">
                            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2 justify-center md:justify-start">
                                <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tight">{profe?.name}</h1>
                                <div className="flex self-center md:self-auto px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Head Coach</span>
                                </div>
                            </div>
                            <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-2 text-white/40 text-[10px] font-black uppercase tracking-widest">
                                <div className="flex items-center gap-2">
                                    <Award className="h-3.5 w-3.5" /> {profe.experience} de exp.
                                </div>
                                <div className="flex items-center gap-2 text-emerald-400/60">
                                    <Star className="h-3.5 w-3.5 fill-current" /> Certified Pro
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Navigation ── */}
                <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-[1.5rem] border border-white/10 overflow-x-auto no-scrollbar shadow-inner">
                    <button
                        className={`flex-1 min-w-[100px] px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "info" ? "bg-emerald-600 text-white shadow-xl shadow-emerald-900/40" : "text-white/40 hover:text-white hover:bg-white/5"}`}
                        onClick={() => setActiveTab("info")}
                    >
                        Método
                    </button>
                    <button
                        className={`flex-1 min-w-[100px] px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "pricing" ? "bg-emerald-600 text-white shadow-xl shadow-emerald-900/40" : "text-white/40 hover:text-white hover:bg-white/5"}`}
                        onClick={() => setActiveTab("pricing")}
                    >
                        Tarifas
                    </button>
                    <button
                        className={`flex-1 min-w-[100px] px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "availability" ? "bg-emerald-600 text-white shadow-xl shadow-emerald-900/40" : "text-white/40 hover:text-white hover:bg-white/5"}`}
                        onClick={() => setActiveTab("availability")}
                    >
                        Agenda
                    </button>
                </div>

                {/* ── Tabs Content ── */}
                <div className="animate-in slide-in-from-bottom-4 duration-500">
                    {activeTab === "info" && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2 flex flex-col gap-6">
                                <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] shadow-xl">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-4 italic">Filosofía de Entrenamiento</h3>
                                    <p className="text-white/70 text-sm leading-relaxed font-medium">
                                        {profe?.bio || "Enfocado en llevar tu juego al siguiente nivel mediante táctica avanzada y acondicionamiento físico."}
                                    </p>
                                </div>
                                <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] shadow-xl">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-4 italic">Especialidades</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {profe?.specialities?.map((s: string, i: number) => (
                                            <span key={i} className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-400 border-dashed">
                                                {s}
                                            </span>
                                        )) || <span className="text-white/20 text-xs">Sin especialidades</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col gap-6">
                                <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] shadow-xl flex flex-col gap-6">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 italic">Zonas de Trabajo</h3>
                                    <div className="flex flex-col gap-3">
                                        {profe?.workingZones?.map((z: string, i: number) => (
                                            <div key={i} className="flex items-center gap-3 text-white/60">
                                                <MapPin className="h-3.5 w-3.5 text-emerald-500/50" />
                                                <span className="text-xs font-bold">{z}</span>
                                            </div>
                                        )) || <span className="text-white/20 text-xs">No especificadas</span>}
                                    </div>
                                </div>
                                <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] shadow-xl flex flex-col gap-6">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 italic">Nivel Oficial</h3>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-lg shadow-emerald-900/20">
                                            <GraduationCap className="h-5 w-5 text-emerald-400" />
                                        </div>
                                        <span className="text-[11px] font-black uppercase tracking-widest text-white/80">{profe.level}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "pricing" && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {localPricing.map((p, i) => (
                                <div key={i} className="bg-white/5 border border-white/10 p-8 rounded-[2rem] shadow-xl flex flex-col gap-6 hover:border-emerald-500/30 transition-all group">
                                    <div className="flex justify-between items-start">
                                        <span className="text-4xl grayscale group-hover:grayscale-0 transition-all duration-500">{p.icon}</span>
                                        <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-black uppercase tracking-widest text-white/30">{p.precio}</span>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <h3 className="text-sm font-black uppercase italic tracking-tight text-white group-hover:text-emerald-400 transition-colors">{p.tipo}</h3>
                                        <p className="text-[10px] font-medium text-white/40 leading-relaxed">{p.desc}</p>
                                    </div>
                                    <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/20">
                                        <Clock className="h-3 w-3" /> {p.dur}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === "availability" && (
                        <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 shadow-xl">
                            <div className="flex justify-between items-center mb-8 px-2">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 italic">Disponibilidad Semanal</h3>
                                {isOwner && (
                                    <button
                                        onClick={() => isEditingSchedule ? handleSaveSchedule() : setIsEditingSchedule(true)}
                                        className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20"
                                    >
                                        {isEditingSchedule ? "Guardar Agenda" : "Editar Slots"}
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-8 gap-2">
                                <div className="transparent" />
                                {DAYS.map(d => <div key={d} className="text-center text-[10px] font-black text-white/30 pb-2">{d}</div>)}

                                {SLOT_LABELS.map((label, rIdx) => (
                                    <>
                                        <div key={label} className="text-[9px] font-black uppercase text-white/20 flex items-center justify-end pr-2">{label}</div>
                                        {localAvail[rIdx].map((val, dIdx) => (
                                            <button
                                                key={`${rIdx}-${dIdx}`}
                                                disabled={!isEditingSchedule}
                                                onClick={() => handleToggleSlot(rIdx, dIdx)}
                                                className={`aspect-square rounded-xl border transition-all ${val ? "bg-emerald-500 border-emerald-400 shadow-lg shadow-emerald-900/40" : "bg-white/5 border-white/5"
                                                    } ${isEditingSchedule ? "cursor-pointer hover:scale-105 active:scale-95" : "cursor-default"}`}
                                            />
                                        ))}
                                    </>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Edit Modal ── */}
                {isEditing && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[1000] flex items-center justify-center p-4">
                        <div className="bg-[#0D0F16] border border-white/10 rounded-[2.5rem] w-full max-w-[600px] max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 shadow-2xl">
                            <div className="px-8 pt-8 pb-4 flex justify-between items-center sticky top-0 bg-[#0D0F16]/80 backdrop-blur-lg z-10 border-b border-white/5">
                                <h2 className="text-2xl font-black uppercase italic tracking-tight">Personal Coach Data</h2>
                                <button onClick={() => setIsEditing(false)} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all">✕</button>
                            </div>
                            <form onSubmit={handleSave} className="p-8 flex flex-col gap-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black uppercase text-white/30 ml-2">Nombre Coach</label>
                                        <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white text-sm font-bold outline-none focus:border-emerald-500 shadow-inner" />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black uppercase text-white/30 ml-2">Título / Nivel</label>
                                        <input type="text" value={formData.level} onChange={e => setFormData({ ...formData, level: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white text-sm font-bold outline-none focus:border-emerald-500" />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black uppercase text-white/30 ml-2">Filosofía (Biografía)</label>
                                    <textarea value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} rows={4} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white text-sm font-bold outline-none focus:border-emerald-500 resize-none shadow-inner" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black uppercase text-white/30 ml-2">Experiencia</label>
                                        <input type="text" value={formData.experience} onChange={e => setFormData({ ...formData, experience: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white text-sm font-bold outline-none focus:border-emerald-500" />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black uppercase text-white/30 ml-2">Ubicación</label>
                                        <input type="text" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white text-sm font-bold outline-none focus:border-emerald-500" />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black uppercase text-white/30 ml-2">Zonas de Trabajo (coma)</label>
                                    <input type="text" value={formData.workingZones} onChange={e => setFormData({ ...formData, workingZones: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white text-sm font-bold outline-none focus:border-emerald-500" />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black uppercase text-white/30 ml-2">Especialidades (coma)</label>
                                    <input type="text" value={formData.specialities} onChange={e => setFormData({ ...formData, specialities: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white text-sm font-bold outline-none focus:border-emerald-500" />
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <button type="button" onClick={() => setIsEditing(false)} className="bg-white/5 text-white/60 border border-white/10 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Cancelar</button>
                                    <button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-500 text-white py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-900/40 disabled:opacity-50">
                                        {saving ? "Publishing..." : "Update Academy"}
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
