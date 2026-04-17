"use client";

import { useState, useEffect, useMemo } from "react";
import { 
    X, Search, User, Users2, CheckCircle2, 
    AlertCircle, Shield, Plus, Trash2, 
    Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { getMyClubMembers, clubMassInscribe } from "@/app/actions/club-enrollment";
import Image from "next/image";

interface ClubEnrollmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    tournament: any;
}

export default function ClubEnrollmentModal({ isOpen, onClose, tournament }: ClubEnrollmentModalProps) {
    const [mounted, setMounted] = useState(false);
    
    useEffect(() => {
        setMounted(true);
    }, []);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [members, setMembers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Registration state
    const [selectedIndividualIds, setSelectedIndividualIds] = useState<string[]>([]);
    const [pairs, setPairs] = useState<{ p1Id: string; p2Id: string; category: string }[]>([]);

    const parsedModalidad = useMemo(() => {
        let mod = tournament.modalidad;
        if (typeof mod === 'string') {
            try { mod = JSON.parse(mod); } catch (e) { mod = null; }
        }
        return mod;
    }, [tournament]);

    const isDoubles = parsedModalidad?.participacion !== "individual";
    const availableCategories = useMemo(() => {
        let cats = tournament.categories;
        if (typeof cats === 'string') {
            try { cats = JSON.parse(cats); } catch (e) { cats = []; }
        }
        return Array.isArray(cats) ? cats : [];
    }, [tournament]);

    useEffect(() => {
        if (isOpen) {
            fetchMembers();
            if (availableCategories.length > 0) setSelectedCategory(availableCategories[0]);
        }
    }, [isOpen]);

    const fetchMembers = async () => {
        setLoading(true);
        const data = await getMyClubMembers();
        setMembers(data);
        setLoading(false);
    };

    const filteredMembers = members.filter(m => 
        m.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const [pendingP1, setPendingP1] = useState<string | null>(null);

    const toggleIndividual = (id: string) => {
        setSelectedIndividualIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleMemberClick = (id: string) => {
        if (!isDoubles) {
            toggleIndividual(id);
            return;
        }

        // Doubles logic
        if (pendingP1 === id) {
            setPendingP1(null);
            return;
        }

        if (!pendingP1) {
            setPendingP1(id);
        } else {
            addPair(pendingP1, id);
            setPendingP1(null);
        }
    };

    const addPair = (p1Id: string, p2Id: string) => {
        if (pairs.some(p => p.p1Id === p1Id || p.p2Id === p1Id || p.p1Id === p2Id || p.p2Id === p2Id)) {
            setError("Uno de los jugadores ya tiene pareja asignada");
            return;
        }
        setPairs([...pairs, { p1Id, p2Id, category: selectedCategory }]);
        setError(null);
    };

    const removePair = (index: number) => {
        setPairs(pairs.filter((_, i) => i !== index));
    };

    const handleInscribe = async () => {
        setSubmitting(true);
        setError(null);

        let regsToSend: any[] = [];
        if (!isDoubles) {
            regsToSend = selectedIndividualIds.map(id => ({
                userId: id,
                category: selectedCategory
            }));
        } else {
            regsToSend = pairs.map(p => ({
                userId: p.p1Id,
                partnerUserId: p.p2Id,
                category: p.category
            }));
        }

        if (regsToSend.length === 0) {
            setError("Selecciona al menos un participante");
            setSubmitting(false);
            return;
        }

        const res = await clubMassInscribe({
            tournamentId: tournament.id,
            registrations: regsToSend
        });

        if (res.ok) {
            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setSelectedIndividualIds([]);
                setPairs([]);
            }, 2000);
        } else {
            setError(res.error || "Error al inscribir");
        }
        setSubmitting(false);
    };

    if (!mounted) return null;

    return createPortal(
        <>
            <AnimatePresence mode="wait">
                {isOpen && (
                    <div key="club-enrollment-root-container" className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                        <motion.div
                            key="club-enrollment-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                            onClick={onClose}
                        />
                        
                        <motion.div
                            key="club-enrollment-modal-content"
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-4xl bg-card border border-border rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            {/* Header */}
                            <div className="p-8 border-b border-border flex items-start justify-between bg-azul-primary/5">
                                <div>
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-azul-primary mb-2">
                                        <Shield className="w-4 h-4" />
                                        Gestión de Club ACAP
                                    </div>
                                    <h2 className="text-2xl font-black uppercase italic tracking-tight text-foreground leading-tight">
                                        Inscribir mi equipo
                                    </h2>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {tournament.name} • {isDoubles ? "Modalidad en Parejas" : "Modalidad Individual"}
                                    </p>
                                </div>
                                <button 
                                    onClick={onClose}
                                    className="p-2 rounded-full hover:bg-muted transition-colors border border-border"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-x divide-border">
                                {/* Selector Section */}
                                <div className="flex-1 flex flex-col min-w-0">
                                    <div className="p-6 border-b border-border bg-muted/20">
                                        <div className="space-y-4">
                                            <div className="relative group">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-azul-primary transition-colors" />
                                                <input 
                                                    type="text"
                                                    placeholder="Buscar socio por nombre o email..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    className="w-full bg-background border border-border rounded-xl py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-azul-primary transition-all font-medium"
                                                />
                                            </div>
                                            {isDoubles && pendingP1 && (
                                                <div className="bg-azul-primary text-white p-3 rounded-xl flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
                                                    <div className="flex items-center gap-2">
                                                        <Users2 className="w-4 h-4" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">
                                                            Armando pareja: Selecciona el compañero para {members.find(m => m.id === pendingP1)?.displayName}
                                                        </span>
                                                    </div>
                                                    <button 
                                                        onClick={() => setPendingP1(null)}
                                                        className="text-[10px] bg-white/20 px-2 py-1 rounded-lg hover:bg-white/30"
                                                    >
                                                        Cancelar
                                                    </button>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground shrink-0">Inscribir en:</span>
                                                <div className="flex flex-wrap gap-2">
                                                    {availableCategories.map(cat => (
                                                        <button
                                                            key={cat}
                                                            onClick={() => setSelectedCategory(cat)}
                                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${selectedCategory === cat 
                                                                ? "bg-azul-primary border-azul-primary text-white shadow-lg shadow-azul-primary/20" 
                                                                : "bg-background border-border text-muted-foreground hover:border-azul-primary/30"}`}
                                                        >
                                                            {cat}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                        {loading ? (
                                            <div className="h-full flex flex-col items-center justify-center gap-3 py-20">
                                                <Loader2 className="w-8 h-8 text-azul-primary animate-spin" />
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Cargando socios...</p>
                                            </div>
                                        ) : filteredMembers.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center py-20 text-center px-6">
                                                <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mb-6">
                                                    <User className="w-10 h-10 text-muted-foreground/20" />
                                                </div>
                                                <p className="text-sm font-bold text-muted-foreground uppercase italic pb-1">Sin miembros disponibles</p>
                                                <p className="text-[10px] text-muted-foreground/60 uppercase font-medium">Asegúrate de que tus socios estén registrados con tu club</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 gap-2">
                                                {filteredMembers.map(m => {
                                                    const isSelected = isDoubles 
                                                        ? pairs.some(p => p.p1Id === m.id || p.p2Id === m.id)
                                                        : selectedIndividualIds.includes(m.id);
                                                    
                                                    const isPending = pendingP1 === m.id;
                                                    
                                                    return (
                                                        <button
                                                            key={`${m.id}-${isPending}`}
                                                            disabled={(isSelected && !isDoubles) || (isSelected && isDoubles)}
                                                            onClick={() => handleMemberClick(m.id)}
                                                            className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all ${isPending
                                                                ? "bg-azul-primary border-azul-primary text-white"
                                                                : isSelected 
                                                                    ? "bg-azul-primary/5 border-azul-primary/20 opacity-60" 
                                                                    : "border-border hover:border-azul-primary/30 bg-card group"}`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-9 h-9 rounded-full bg-white border overflow-hidden relative shadow-sm ${isPending ? "border-white/50" : "border-border"}`}>
                                                                    {m.imageUrl ? (
                                                                        <Image src={m.imageUrl} alt={m.displayName} fill className="object-cover" />
                                                                    ) : (
                                                                        <div className={`w-full h-full flex items-center justify-center font-black text-xs uppercase italic ${isPending ? "text-white/60" : "text-muted-foreground/70"}`}>
                                                                            {m.displayName.charAt(0)}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="text-left">
                                                                    <div className={`text-[13px] font-black uppercase italic tracking-tighter ${isPending ? "text-white" : "text-foreground"}`}>
                                                                        {m.displayName}
                                                                    </div>
                                                                    <div className={`text-[9px] font-black uppercase tracking-[0.15em] ${isPending ? "text-white/70" : "text-muted-foreground/60"}`}>
                                                                        Cat {m.category} • {m.gender}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            
                                                            {isDoubles ? (
                                                                <div className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${isPending 
                                                                    ? "bg-white text-azul-primary" 
                                                                    : isSelected 
                                                                        ? "text-celeste"
                                                                        : "bg-azul-primary text-white"}`}>
                                                                    {isPending ? "Completar" : isSelected ? "Ya asignado" : "Seleccionar"}
                                                                </div>
                                                            ) : (
                                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? "bg-azul-primary border-azul-primary" : "border-border"}`}>
                                                                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                                                </div>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Summary / Confirmation Section */}
                                <div className="w-full md:w-[320px] bg-muted/10 p-6 flex flex-col gap-6">
                                    <div className="flex-1 flex flex-col min-h-0">
                                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">
                                            Resumen Equipo ({!isDoubles ? selectedIndividualIds.length : pairs.length})
                                        </h3>
                                        
                                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                                            {!isDoubles && selectedIndividualIds.map(id => {
                                                const member = members.find(m => m.id === id);
                                                return (
                                                    <div key={`summary-ind-${id}`} className="flex items-center justify-between p-3 bg-card border border-border rounded-xl shadow-sm">
                                                        <div className="min-w-0 pr-2">
                                                            <div className="text-[11px] font-black uppercase italic truncate">{member?.displayName}</div>
                                                            <div className="text-[9px] text-muted-foreground font-black uppercase">{selectedCategory}</div>
                                                        </div>
                                                        <button 
                                                            onClick={() => toggleIndividual(id)}
                                                            className="p-1.5 rounded-lg hover:bg-rojo/10 text-rojo transition-colors"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                            {isDoubles && pairs.map((pair, index) => {
                                                const p1 = members.find(m => m.id === pair.p1Id);
                                                const p2 = members.find(m => m.id === pair.p2Id);
                                                return (
                                                    <div key={`summary-pair-${index}`} className="flex flex-col gap-2 p-3 bg-card border border-border rounded-xl shadow-sm group relative">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-azul-primary" />
                                                            <div className="text-[10px] font-black uppercase italic truncate">{p1?.displayName}</div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-azul-primary" />
                                                            <div className="text-[10px] font-black uppercase italic truncate">{p2?.displayName}</div>
                                                        </div>
                                                        <div className="mt-1 pt-1 border-t border-border flex items-center justify-between">
                                                            <div className="text-[8px] text-muted-foreground font-black uppercase tracking-widest">{pair.category}</div>
                                                            <button 
                                                                onClick={() => removePair(index)}
                                                                className="p-1 px-2 rounded-lg hover:bg-rojo/10 text-rojo transition-colors text-[8px] font-black uppercase"
                                                            >
                                                                Quitar
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {isDoubles && pairs.length === 0 && (
                                                <div className="h-full flex flex-col items-center justify-center py-10 opacity-40">
                                                    <Users2 className="w-8 h-8 mb-2" />
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-center">Arma las parejas seleccionando socios</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-border space-y-4">
                                        {error && (
                                            <div className="p-3 bg-rojo/5 border border-rojo/20 rounded-xl flex items-center gap-2 text-rojo text-[10px] font-bold">
                                                <AlertCircle className="w-4 h-4 shrink-0" />
                                                {error}
                                            </div>
                                        )}
                                        {success && (
                                            <div className="p-3 bg-celeste/10 border border-celeste/20 rounded-xl flex items-center gap-2 text-celeste text-[10px] font-bold">
                                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                                                ¡Inscripción exitosa!
                                            </div>
                                        )}
                                        <button
                                            onClick={handleInscribe}
                                            disabled={submitting || success}
                                            className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-[0.2em] text-[11px] transition-all shadow-xl ${submitting || success
                                                ? "bg-muted text-muted-foreground shadow-none"
                                                : "bg-azul-primary text-white shadow-azul-primary/20 hover:scale-[1.02] active:scale-95"}`}
                                        >
                                            {submitting ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : success ? (
                                                "Confirmado"
                                            ) : (
                                                "Inscribir Equipo"
                                            )}
                                        </button>
                                        <p className="text-[8px] text-muted-foreground/60 font-medium uppercase tracking-tighter text-center italic">
                                            Se generarán inscripciones individuales confirmadas para cada socio seleccionado.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(0, 157, 224, 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar:hover::-webkit-scrollbar-thumb {
                    background: rgba(0, 157, 224, 0.2);
                }
            `}</style>
        </>,
        document.body
    );
}
