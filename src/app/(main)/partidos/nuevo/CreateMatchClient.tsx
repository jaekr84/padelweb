"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, MapPin, Users, Trophy, ChevronLeft, Zap, Check, User } from "lucide-react";
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

    const inputClasses = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white placeholder:text-slate-400/30 focus:outline-none focus:ring-1 focus:ring-azul-primary/45 focus:border-azul-primary transition-all";
    const labelClasses = "block text-[7.5px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1.5 ml-0.5";

    return (
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 relative z-10">
            {/* Ambient background glows */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
                <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-azul-primary/5 rounded-full blur-[120px]" />
                <div className="absolute top-[10%] right-[-15%] w-[400px] h-[400px] bg-celeste/5 rounded-full blur-[100px]" />
            </div>

            <Link
                href="/partidos"
                className="inline-flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
            >
                <ChevronLeft className="w-3.5 h-3.5" />
                Volver a Partidos
            </Link>

            {/* Widescreen Cyber-Sports HUD Header */}
            <div className="relative rounded-2xl overflow-hidden bg-carbon-800 border border-white/10 p-6 lg:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl border border-white/5">
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-azul-primary rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-azul-primary rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />
                </div>

                <div className="relative z-10 space-y-3 max-w-3xl text-center md:text-left">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 border border-white/15 rounded-full text-[8px] font-black uppercase tracking-[0.2em] text-celeste">
                        <Zap className="w-2.5 h-2.5 fill-current" />
                        Nuevo Desafío
                    </div>
                    <h1 className="text-3xl lg:text-4xl font-black uppercase tracking-tighter leading-none italic">
                        Creá tu <span className="text-celeste">Partido</span>
                    </h1>
                    <p className="text-xs text-slate-400 font-bold leading-normal max-w-xl">
                        Completá los datos técnicos del partido, asigná el club, nivel de juego y buscá los jugadores que te faltan.
                    </p>
                </div>
            </div>

            {/* Main Form Dashboard Grid */}
            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Details Form Card Column */}
                <div className="lg:col-span-2 bg-carbon-800 border border-white/10 rounded-2xl p-6 shadow-sm space-y-6">
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-white leading-none">Parámetros del Game</h3>
                        <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-tight">Especificá la fecha, hora y ubicación física.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Fecha y Hora */}
                        <div className="space-y-1.5">
                            <label className={labelClasses}>Fecha del Match</label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                <input
                                    type="date"
                                    required
                                    className={`${inputClasses} pl-10 cursor-pointer [color-scheme:dark]`}
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    onClick={(e) => e.currentTarget.showPicker?.()}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className={labelClasses}>Hora de Inicio</label>
                            <div className="relative">
                                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                <input
                                    type="time"
                                    required
                                    className={`${inputClasses} pl-10 cursor-pointer [color-scheme:dark]`}
                                    value={formData.time}
                                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                    onClick={(e) => e.currentTarget.showPicker?.()}
                                />
                            </div>
                        </div>

                        {/* Lugar y Zona */}
                        <div className="space-y-1.5">
                            <label className={labelClasses}>Dirección / Club</label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                <input
                                    type="text"
                                    required
                                    placeholder="Nombre del lugar o club..."
                                    className={`${inputClasses} pl-10`}
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1) })}
                                    autoCapitalize="sentences"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className={labelClasses}>Zona / Localidad</label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej: Palermo, Rosario..."
                                    className={`${inputClasses} pl-10`}
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1) })}
                                    autoCapitalize="sentences"
                                />
                            </div>
                        </div>

                        {/* Tactical HUD Map Preview */}
                        <div className="md:col-span-2">
                            <div className="relative w-full aspect-[21/9] rounded-xl overflow-hidden border border-white/10 bg-white/5 group/map shadow-inner">
                                {formData.location || formData.city ? (
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        frameBorder="0"
                                        scrolling="no"
                                        marginHeight={0}
                                        marginWidth={0}
                                        src={`https://maps.google.com/maps?q=${encodeURIComponent(`${formData.location}, ${formData.city}`)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                                        className="transition-opacity duration-700 opacity-80 group-hover/map:opacity-100 filter grayscale contrast-125 invert-[0.9] hue-rotate-180"
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400/40 gap-2">
                                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-sm">
                                            <MapPin className="w-5 h-5 opacity-40 text-azul-primary" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[8px] font-black uppercase tracking-[0.2em] leading-none mb-0.5">Vista Previa Radar GPS</p>
                                            <p className="text-[7.5px] font-bold opacity-50 uppercase tracking-widest leading-none">Ingresá club y zona para geolocalizar</p>
                                        </div>
                                    </div>
                                )}
                                <div className="absolute inset-0 pointer-events-none border border-white/5 rounded-xl" />
                            </div>
                        </div>

                        {/* Categoría y Género */}
                        <div className="space-y-1.5">
                            <label className={labelClasses}>Categoría</label>
                            <div className="relative">
                                <Trophy className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                <select
                                    className={`${inputClasses} pl-10 appearance-none pr-8 cursor-pointer font-black text-white bg-white/5`}
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                >
                                    <option value="Libre" className="bg-carbon-800 text-white">Libre</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.name} className="bg-carbon-800 text-white">{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className={labelClasses}>Género / Modalidad</label>
                            <div className="relative">
                                <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                <select
                                    className={`${inputClasses} pl-10 appearance-none pr-8 cursor-pointer font-black text-white bg-white/5`}
                                    value={formData.gender}
                                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                >
                                    <option value="mixto" className="bg-carbon-800 text-white">Mixto</option>
                                    <option value="masculino" className="bg-carbon-800 text-white">Masculino</option>
                                    <option value="femenino" className="bg-carbon-800 text-white">Femenino</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className={labelClasses}>¿Cuántos jugadores en total? (Default: 4)</label>
                        <div className="relative">
                            <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                            <input
                                type="number"
                                min="2"
                                max="8"
                                className={`${inputClasses} pl-10`}
                                value={formData.totalSlots}
                                onChange={(e) => setFormData({ ...formData, totalSlots: parseInt(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className={labelClasses}>Descripción del Partido (Opcional)</label>
                        <textarea
                            rows={3}
                            placeholder="Ej: Solo nivel intermedio, traemos pelotas nuevas..."
                            className={`${inputClasses} py-3.5 h-auto min-h-[90px] resize-none font-bold text-white`}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1) })}
                            autoCapitalize="sentences"
                        />
                    </div>
                </div>

                {/* Players Management Column */}
                <div className="bg-carbon-800 border border-white/10 rounded-2xl p-6 shadow-sm space-y-6">
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-white leading-none">Administrar Roster</h3>
                        <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-tight">Gestioná el listado inicial de inscriptos.</p>
                    </div>

                    <div className="space-y-4">
                        {/* Search & Add */}
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <label className={labelClasses}>Buscar Jugador</label>
                                <div className="relative overflow-visible">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                    <input
                                        type="text"
                                        className={`${inputClasses} pl-10`}
                                        placeholder="Nombre o email..."
                                        value={searchQuery}
                                        onChange={(e) => handleSearch(e.target.value)}
                                    />
                                    {/* Search Results */}
                                    <AnimatePresence>
                                        {searchResults.length > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -5 }}
                                                className="absolute z-50 w-full mt-1.5 bg-popover border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto"
                                            >
                                                {searchResults.map((user) => (
                                                    <button
                                                        key={user.id}
                                                        type="button"
                                                        onClick={() => addPlayer(user)}
                                                        className="w-full p-2.5 flex items-center gap-2.5 hover:bg-primary/10 transition-colors text-left border-b border-white/10 last:border-0"
                                                    >
                                                        <div className="w-8 h-8 rounded-full overflow-hidden relative border border-white/10 bg-white/10 shrink-0 flex items-center justify-center">
                                                            {user.imageUrl ? (
                                                                <Image src={user.imageUrl} fill alt={user.name} className="object-cover" />
                                                            ) : (
                                                                <User className="w-4 h-4 text-slate-500" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black text-white">{user.name}</p>
                                                            <p className="text-[8px] font-black text-celeste uppercase tracking-widest italic">{user.category || "D"}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className={labelClasses}>O sumar invitado</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        className={inputClasses}
                                        placeholder="Nombre del invitado..."
                                        value={guestName}
                                        onChange={(e) => setGuestName(e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1))}
                                        autoCapitalize="words"
                                    />
                                    <button
                                        type="button"
                                        onClick={addGuest}
                                        className="bg-slate-900 border border-white/10 hover:bg-azul-primary text-white px-4 rounded-xl font-black uppercase tracking-widest text-[9px] transition-all shrink-0 h-9 flex items-center justify-center"
                                    >
                                        Sumar
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* List */}
                        <div className="space-y-3 pt-3 border-t border-white/10">
                            <div className="flex items-center justify-between">
                                <label className={labelClasses}>Lista de Inscritos</label>
                                <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-white/10 text-slate-400 tracking-widest">
                                    {selectedPlayers.length + 1} / {formData.totalSlots} Slots
                                </span>
                            </div>
                            
                            <div className="space-y-2">
                                {/* Organizer (TÚ) - highlighted in red border as requested */}
                                <div className="flex items-center justify-between p-2.5 bg-red-500/5 rounded-xl border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.03)]">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20 font-black text-[9px] tracking-wider">TÚ</div>
                                        <div>
                                            <p className="text-[10px] font-black text-red-500 uppercase tracking-wider italic leading-none mb-0.5">Organizador</p>
                                            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none">Creador del Match</p>
                                        </div>
                                    </div>
                                </div>

                                {selectedPlayers.map((player, idx) => (
                                    <motion.div
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        key={idx}
                                        className="flex items-center justify-between p-2 bg-white/5 border border-white/10 rounded-xl group"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full overflow-hidden relative border border-white/10 bg-white/5 flex items-center justify-center shrink-0">
                                                {player.imageUrl ? (
                                                    <Image src={player.imageUrl} fill alt={player.name} className="object-cover" />
                                                ) : (
                                                    <User className="w-3.5 h-3.5 text-slate-500" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black text-white truncate max-w-[100px] leading-none mb-0.5">{player.name}</p>
                                                <p className="text-[7.5px] font-black text-slate-400/50 uppercase tracking-widest leading-none">{player.isGuest ? "Invitado" : "Registrado"}</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removePlayer(idx)}
                                            className="p-1 text-slate-400/40 hover:text-red-500 transition-colors shrink-0"
                                        >
                                            <CloseIcon className="w-4 h-4" />
                                        </button>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Submition Row */}
                <div className="lg:col-span-3 pt-4 border-t border-white/10">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-11 bg-slate-950 hover:bg-azul-primary text-white border border-white/10 hover:border-azul-primary/40 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg hover:shadow-azul-primary/20 active:scale-98 transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            "PUBLICANDO MATCH..."
                        ) : (
                            <>
                                <Check className="w-4 h-4" />
                                Publicar Partido
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
