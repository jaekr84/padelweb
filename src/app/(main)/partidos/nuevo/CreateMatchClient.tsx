"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, MapPin, Users, Trophy, ChevronLeft, Zap, Check, User, ExternalLink } from "lucide-react";
import Link from "next/link";
import { createPublicMatch } from "../actions";
import { searchPlayers } from "@/app/actions/players";
import { Search, X as CloseIcon } from "lucide-react";
import Image from "next/image";

interface Category {
    id: string;
    name: string;
}

export default function CreateMatchClient({ categories }: { categories: Category[] }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    // Get current date and time in local format for the inputs
    const now = new Date();
    const defaultDate = now.toISOString().split('T')[0];
    const defaultTime = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });

    const [formData, setFormData] = useState({
        date: defaultDate,
        time: defaultTime,
        location: "",
        city: "",
        category: "D",
        gender: "mixto",
        totalSlots: 4,
        description: ""
    });

    const [selectedPlayers, setSelectedPlayers] = useState<{ id?: string, name: string, imageUrl?: string | null, isGuest?: boolean }[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [guestName, setGuestName] = useState("");

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        const results = await searchPlayers(query);
        setSearchResults(results);
        setIsSearching(false);
    };

    const addPlayer = (player: any) => {
        if (selectedPlayers.length + 1 >= (formData.totalSlots || 4)) {
            alert("No hay más cupos disponibles");
            return;
        }
        if (selectedPlayers.some(p => p.id === player.id)) return;
        setSelectedPlayers([...selectedPlayers, { ...player, isGuest: false }]);
        setSearchQuery("");
        setSearchResults([]);
    };

    const addGuest = () => {
        if (!guestName.trim()) return;
        if (selectedPlayers.length + 1 >= (formData.totalSlots || 4)) {
            alert("No hay más cupos disponibles");
            return;
        }
        setSelectedPlayers([...selectedPlayers, { name: guestName, isGuest: true }]);
        setGuestName("");
    };

    const removePlayer = (index: number) => {
        setSelectedPlayers(selectedPlayers.filter((_, i) => i !== index));
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await createPublicMatch({
                ...formData,
                initialPlayers: selectedPlayers.map(p => ({
                    userId: p.id,
                    guestName: p.isGuest ? p.name : undefined
                }))
            });
            if (res.success) {
                router.push("/partidos");
            }
        } catch (error: any) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    const inputClasses = "w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all";
    const labelClasses = "block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 ml-1";

    return (
        <div className="max-w-[1200px] mx-auto px-6 py-12">
            <Link
                href="/partidos"
                className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors mb-8"
            >
                <ChevronLeft className="w-4 h-4" />
                Volver a Partidos
            </Link>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="bg-slate-900 p-12 text-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
                    </div>
                    <div className="relative z-10 space-y-4">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-blue-300">
                            <Zap className="w-3 h-3 fill-current" />
                            Nuevo Desafío
                        </div>
                        <h1 className="text-4xl font-black uppercase tracking-tighter italic text-white leading-none">
                            Creá tu <span className="text-blue-400">Partido</span>
                        </h1>
                        <p className="text-white/40 text-sm font-medium">Completá los datos y encontrá jugadores para tu próximo game.</p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-8 lg:p-12 space-y-12">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                        {/* Details Column */}
                        <div className="lg:col-span-2 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Fecha y Hora */}
                                <div className="space-y-2">
                                    <label className={labelClasses}>Fecha</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                        <input
                                            type="date"
                                            required
                                            className={`${inputClasses} pl-12 cursor-pointer [color-scheme:light]`}
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            onClick={(e) => e.currentTarget.showPicker?.()}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className={labelClasses}>Hora</label>
                                    <div className="relative">
                                        <Clock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                        <input
                                            type="time"
                                            required
                                            className={`${inputClasses} pl-12 cursor-pointer [color-scheme:light]`}
                                            value={formData.time}
                                            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                            onClick={(e) => e.currentTarget.showPicker?.()}
                                        />
                                    </div>
                                </div>

                                {/* Lugar y Zona */}
                                <div className="space-y-2">
                                    <label className={labelClasses}>Dirección / Club</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                        <input
                                            type="text"
                                            required
                                            placeholder="Nombre del lugar o club..."
                                            className={`${inputClasses} pl-12`}
                                            value={formData.location}
                                            onChange={(e) => setFormData({ ...formData, location: e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1) })}
                                            autoCapitalize="sentences"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className={labelClasses}>Zona / Localidad</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej: Palermo, Rosario..."
                                            className={`${inputClasses} pl-12`}
                                            value={formData.city}
                                            onChange={(e) => setFormData({ ...formData, city: e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1) })}
                                            autoCapitalize="sentences"
                                        />
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <div className="relative w-full aspect-video md:aspect-[21/9] rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-inner bg-slate-50 group/map">
                                        {formData.location || formData.city ? (
                                            <iframe
                                                width="100%"
                                                height="100%"
                                                frameBorder="0"
                                                scrolling="no"
                                                marginHeight={0}
                                                marginWidth={0}
                                                src={`https://maps.google.com/maps?q=${encodeURIComponent(`${formData.location}, ${formData.city}`)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                                                className="transition-opacity duration-700 opacity-90 group-hover/map:opacity-100"
                                            />
                                        ) : (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 gap-4">
                                                <div className="w-16 h-16 rounded-3xl bg-white shadow-sm flex items-center justify-center">
                                                    <MapPin className="w-8 h-8 opacity-20" />
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">Vista Previa del Mapa</p>
                                                    <p className="text-[9px] font-bold opacity-50 uppercase tracking-tighter">Ingresá el club y la zona para previsualizar</p>
                                                </div>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-slate-900/5 rounded-[2.5rem]" />
                                    </div>
                                </div>

                                {/* Categoría y Género */}
                                <div className="space-y-2">
                                    <label className={labelClasses}>Categoría</label>
                                    <div className="relative">
                                        <Trophy className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                        <select
                                            className={`${inputClasses} pl-12 appearance-none`}
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        >
                                            <option value="Libre">Libre</option>
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className={labelClasses}>Género / Modalidad</label>
                                    <div className="relative">
                                        <Users className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                        <select
                                            className={`${inputClasses} pl-12 appearance-none`}
                                            value={formData.gender}
                                            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                        >
                                            <option value="mixto">Mixto</option>
                                            <option value="masculino">Masculino</option>
                                            <option value="femenino">Femenino</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className={labelClasses}>¿Cuántos jugadores en total? (Default: 4)</label>
                                <div className="relative">
                                    <Users className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                    <input
                                        type="number"
                                        min="2"
                                        max="8"
                                        className={`${inputClasses} pl-12`}
                                        value={formData.totalSlots}
                                        onChange={(e) => setFormData({ ...formData, totalSlots: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className={labelClasses}>Descripción (Opcional)</label>
                                <textarea
                                    rows={4}
                                    placeholder="Ej: Solo nivel intermedio, traemos pelotas nuevas..."
                                    className={`${inputClasses} py-4 h-auto min-h-[120px] resize-none font-medium text-slate-600`}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1) })}
                                    autoCapitalize="sentences"
                                />
                            </div>
                        </div>

                        {/* Players Management Column */}
                        <div className="space-y-8 lg:border-l border-slate-100 lg:pl-12">
                            <div className="space-y-1">
                                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 leading-none">Jugadores</h3>
                                <p className="text-xs text-slate-400 font-medium tracking-tight">Gestioná quiénes participan.</p>
                            </div>

                            <div className="space-y-6">
                                {/* Search & Add */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className={labelClasses}>Buscar Jugador</label>
                                        <div className="relative overflow-visible">
                                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                            <input
                                                type="text"
                                                className={`${inputClasses} pl-12`}
                                                placeholder="Nombre o email..."
                                                value={searchQuery}
                                                onChange={(e) => handleSearch(e.target.value)}
                                            />
                                            {/* Search Results */}
                                            <AnimatePresence>
                                                {searchResults.length > 0 && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -10 }}
                                                        className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto"
                                                    >
                                                        {searchResults.map((user) => (
                                                            <button
                                                                key={user.id}
                                                                type="button"
                                                                onClick={() => addPlayer(user)}
                                                                className="w-full p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-0"
                                                            >
                                                                <div className="w-10 h-10 rounded-full overflow-hidden relative border border-slate-100 bg-slate-50 flex items-center justify-center shrink-0">
                                                                    {user.imageUrl ? (
                                                                        <Image src={user.imageUrl} fill alt={user.name} className="object-cover" />
                                                                    ) : (
                                                                        <User className="w-5 h-5 text-slate-300" />
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-black text-slate-900">{user.name}</p>
                                                                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest italic">{user.category || "D"}</p>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className={labelClasses}>O sumar invitado</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                className={inputClasses}
                                                placeholder="Nombre..."
                                                value={guestName}
                                                onChange={(e) => setGuestName(e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1))}
                                                autoCapitalize="words"
                                            />
                                            <button
                                                type="button"
                                                onClick={addGuest}
                                                className="bg-slate-900 text-white px-5 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-600 transition-all shrink-0"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* List */}
                                <div className="space-y-4 pt-4 border-t border-slate-50">
                                    <label className={labelClasses}>Inscriptos ({selectedPlayers.length + 1}/{formData.totalSlots})</label>
                                    <div className="space-y-2">
                                        {/* Organizer */}
                                        <div className="flex items-center justify-between p-3 bg-blue-50/50 rounded-2xl border border-blue-100">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 font-bold text-[10px]">TÚ</div>
                                                <p className="text-xs font-black text-slate-900 italic">Organizador</p>
                                            </div>
                                        </div>

                                        {selectedPlayers.map((player, idx) => (
                                            <motion.div
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                key={idx}
                                                className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-2xl group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full overflow-hidden relative border border-slate-50 bg-slate-50 flex items-center justify-center shrink-0">
                                                        {player.imageUrl ? (
                                                            <Image src={player.imageUrl} fill alt={player.name} className="object-cover" />
                                                        ) : (
                                                            <User className="w-4 h-4 text-slate-300" />
                                                        )}
                                                    </div>
                                                    <p className="text-xs font-black text-slate-900 truncate max-w-[120px]">{player.name}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removePlayer(idx)}
                                                    className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                                                >
                                                    <CloseIcon className="w-4 h-4" />
                                                </button>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-slate-100">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-20 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-2xl shadow-slate-900/20 hover:bg-blue-600 hover:shadow-blue-500/30 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3"
                        >
                            {loading ? (
                                "CREANDO PARTIDO..."
                            ) : (
                                <>
                                    <Check className="w-5 h-5" />
                                    Publicar Partido
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
