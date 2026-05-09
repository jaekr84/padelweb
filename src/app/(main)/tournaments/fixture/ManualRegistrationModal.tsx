"use client";

import { useState, useEffect, useRef } from "react";
import { 
    X, Search, Users2, Zap, Dice5, ChevronDown, UserCheck, 
    Plus, Trophy, Check, AlertCircle, RefreshCw 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { registerManualPlayer, quickInscribePlayer } from "./actions";
import { usePlayers } from "@/hooks/use-players";
import { useQueryClient } from "@tanstack/react-query";

interface ManualRegistrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    tournamentId: string;
    categories: string[];
    isIndividual: boolean;
    onSuccess: (player: any) => void;
    existingPlayerIds?: Set<string>; // To filter out players already in the list
}

export default function ManualRegistrationModal({
    isOpen,
    onClose,
    tournamentId,
    categories,
    isIndividual,
    onSuccess,
    existingPlayerIds = new Set()
}: ManualRegistrationModalProps) {
    const { players: allPlayers, isLoading: isLoadingAvailable, refetch, isFetching } = usePlayers();
    const queryClient = useQueryClient();

    // Form State
    const [manualName, setManualName] = useState("");
    const [manualName2, setManualName2] = useState("");
    const [selectedPlayer1, setSelectedPlayer1] = useState<any | null>(null);
    const [selectedPlayer2, setSelectedPlayer2] = useState<any | null>(null);
    const [manualCategory, setManualCategory] = useState("");
    const [manualGender, setManualGender] = useState("masculino");
    const [isCreatingManual, setIsCreatingManual] = useState(false);

    // Auto Fill State
    const [autoFillCount, setAutoFillCount] = useState<number | "">("");
    const [isAutoFilling, setIsAutoFilling] = useState(false);

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [genderFilter, setGenderFilter] = useState("all");
    
    const [showResults1, setShowResults1] = useState(false);
    const [showResults2, setShowResults2] = useState(false);
    const containerRef1 = useRef<HTMLDivElement>(null);
    const containerRef2 = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef1.current && !containerRef1.current.contains(event.target as Node)) {
                setShowResults1(false);
            }
            if (containerRef2.current && !containerRef2.current.contains(event.target as Node)) {
                setShowResults2(false);
            }
        };

        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setShowResults1(false);
                setShowResults2(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEsc);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEsc);
        };
    }, []);



    const handleManualRegister = async () => {
        if (!manualName.trim() && !selectedPlayer1) {
            toast.error("El nombre del primer jugador es obligatorio");
            return;
        }
        if (!isIndividual && !manualName2.trim() && !selectedPlayer2) {
            toast.error("El nombre del segundo jugador es obligatorio");
            return;
        }

        if (!isIndividual) {
            const p1 = selectedPlayer1?.id || manualName.trim();
            const p2 = selectedPlayer2?.id || manualName2.trim();
            if (p1 === p2) {
                toast.error("La pareja no puede estar integrada por la misma persona");
                return;
            }
        }

        setIsCreatingManual(true);
        
        const p1Data = selectedPlayer1 
            ? { userId: selectedPlayer1.id }
            : { name: manualName, category: manualCategory || (categories[0] || "D"), gender: manualGender };
        
        const p2Data = !isIndividual 
            ? (selectedPlayer2 
                ? { userId: selectedPlayer2.id }
                : { name: manualName2, category: manualCategory || (categories[0] || "D"), gender: manualGender })
            : undefined;

        const res = await registerManualPlayer(tournamentId, p1Data, p2Data);
        
        if (res.ok && res.player) {
            onSuccess(res.player);
            
            // Clean up
            setManualName("");
            setManualName2("");
            setSelectedPlayer1(null);
            setSelectedPlayer2(null);
            toast.success("Inscripción realizada correctamente");
            
            // Invalidate cache to get the new manual player in future searches
            queryClient.invalidateQueries({ queryKey: ["players"] });
        } else {
            toast.error("Error: " + res.error);
        }
        setIsCreatingManual(false);
    };

    const handleQuickInscribe = async (userId: string) => {
        const player = allPlayers.find(p => p.id === userId);
        const res = await quickInscribePlayer(tournamentId, userId, manualCategory || player?.category || undefined);
        if (res.ok && res.player) {
            onSuccess(res.player);
            toast.success("Jugador inscripto");
            // Invalidate to ensure consistency (though parent update should be enough)
            queryClient.invalidateQueries({ queryKey: ["players"] });
        } else {
            toast.error("Error: " + res.error);
        }
    };

    const handleAutoFill = async () => {
        let count = typeof autoFillCount === 'number' ? autoFillCount : parseInt(autoFillCount as string);
        if (isNaN(count) || count <= 0) {
            toast.error("Ingresá una cantidad válida");
            return;
        }
        
        setIsAutoFilling(true);
        toast.loading(`Generando ${count} jugadores...`, { id: 'autofill' });
        
        const baseName = "Jugador Gen-" + Math.floor(Math.random() * 1000);
        const cat = manualCategory || (categories[0] || "D");
        const promises = [];

        for (let i = 1; i <= count; i++) {
            promises.push(registerManualPlayer(tournamentId, { name: `${baseName} #${i}`, category: cat, gender: "masculino" }));
        }

        try {
            const results = await Promise.all(promises);
            let successCount = 0;
            for (let r of results) {
                if (r.ok && r.player) {
                    onSuccess(r.player);
                    successCount++;
                }
            }
            
            toast.success(`Se generaron e inscribieron ${successCount} jugadores`, { id: 'autofill' });
            setAutoFillCount("");
            queryClient.invalidateQueries({ queryKey: ["players"] });
        } catch (err) {
            console.error(err);
            toast.error("Error en la generación automática", { id: 'autofill' });
        }

        setIsAutoFilling(false);
    };

    const filteredAvailable = allPlayers.filter(p => {
        const matchesSearch = !searchQuery || 
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.id.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
        const matchesGender = genderFilter === "all" || p.gender === genderFilter;
        
        // Excluir si ya está seleccionado en los campos manuales
        const isSelected = (selectedPlayer1 && p.id === selectedPlayer1.id) || 
                           (selectedPlayer2 && p.id === selectedPlayer2.id);
        
        // Excluir si ya está en el torneo
        const isAlreadyRegistered = existingPlayerIds.has(p.id);
        
        return matchesSearch && matchesCategory && matchesGender && !isSelected && !isAlreadyRegistered;
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-5xl bg-card border border-border/50 shadow-2xl rounded-[2.5rem] overflow-hidden flex flex-col max-h-[90vh] md:max-h-[85vh]"
            >
                {/* Header */}
                <div className="p-4 md:p-5 border-b border-border flex items-center justify-between bg-muted/30">
                    <div>
                        <h3 className="text-lg md:text-xl font-black uppercase italic tracking-tight flex items-center gap-3">
                            <Plus className="w-5 h-5 text-azul-primary" />
                            Inscribir Participantes
                        </h3>
                        <p className="text-[9px] font-black uppercase tracking-widest text-foreground/40 mt-1">
                            Buscá en la base de datos o agregalos de forma manual
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl hover:bg-muted transition-all flex items-center justify-center text-foreground/70 hover:text-foreground border border-transparent hover:border-border active:scale-95"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12">
                    {/* Left Column: Manual Form */}
                    <div className="md:col-span-5 p-4 md:p-6 overflow-y-auto space-y-6 bg-card border-r border-border/30">
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 text-azul-primary">
                                <Users2 className="w-4 h-4 stroke-[3]" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Registro Manual</span>
                            </div>
                            
                            <div className="space-y-4">
                                {/* Player 1 Input */}
                                <div className="relative" ref={containerRef1}>
                                    <div className="text-[8px] font-black uppercase text-foreground/70 mb-1 ml-1">
                                        {isIndividual ? "Jugador" : "Jugador 1"}
                                    </div>
                                    <input 
                                        type="text"
                                        placeholder="Nombre o buscar..."
                                        value={selectedPlayer1 ? selectedPlayer1.name : manualName}
                                        onChange={(e) => {
                                            setSelectedPlayer1(null);
                                            setManualName(e.target.value);
                                            setShowResults1(true);
                                        }}
                                        onFocus={() => setShowResults1(true)}
                                        className="w-full bg-muted/30 border border-border rounded-xl py-3 px-5 text-sm font-bold placeholder:text-foreground/20 outline-none focus:border-azul-primary transition-all text-foreground"
                                    />
                                    {manualName.length > 1 && !selectedPlayer1 && showResults1 && (
                                        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border border-border rounded-xl shadow-2xl max-h-40 overflow-y-auto overflow-x-hidden custom-scrollbar">
                                            {allPlayers
                                                .filter(p => p.name.toLowerCase().includes(manualName.toLowerCase()))
                                                .filter(p => !selectedPlayer2 || p.id !== selectedPlayer2.id)
                                                .filter(p => !existingPlayerIds.has(p.id))
                                                .slice(0, 5).map(p => (
                                                <button 
                                                    key={p.id}
                                                    onClick={() => { 
                                                        setSelectedPlayer1(p); 
                                                        setManualName(p.name); 
                                                        setShowResults1(false);
                                                    }}
                                                    className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-azul-primary hover:text-white transition-colors border-b border-border/50 last:border-0"
                                                >
                                                    {p.name} <span className="text-[8px] opacity-60">({p.category})</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Player 2 Input (if doubles) */}
                                {!isIndividual && (
                                    <div className="relative" ref={containerRef2}>
                                        <div className="text-[8px] font-black uppercase text-foreground/70 mb-1 ml-1">Jugador 2</div>
                                        <input 
                                            type="text"
                                            placeholder="Nombre o buscar..."
                                            value={selectedPlayer2 ? selectedPlayer2.name : manualName2}
                                            onChange={(e) => {
                                                setSelectedPlayer2(null);
                                                setManualName2(e.target.value);
                                                setShowResults2(true);
                                            }}
                                            onFocus={() => setShowResults2(true)}
                                            className="w-full bg-muted/30 border border-border rounded-xl py-3 px-5 text-sm font-bold placeholder:text-foreground/20 outline-none focus:border-azul-primary transition-all text-foreground"
                                        />
                                        {manualName2.length > 1 && !selectedPlayer2 && showResults2 && (
                                            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border border-border rounded-xl shadow-2xl max-h-40 overflow-y-auto overflow-x-hidden custom-scrollbar">
                                                {allPlayers
                                                    .filter(p => p.name.toLowerCase().includes(manualName2.toLowerCase()))
                                                    .filter(p => !selectedPlayer1 || p.id !== selectedPlayer1.id)
                                                    .filter(p => !existingPlayerIds.has(p.id))
                                                    .slice(0, 5).map(p => (
                                                    <button 
                                                        key={p.id}
                                                        onClick={() => { 
                                                            setSelectedPlayer2(p); 
                                                            setManualName2(p.name); 
                                                            setShowResults2(false);
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-azul-primary hover:text-white transition-colors border-b border-border/50 last:border-0"
                                                    >
                                                        {p.name} <span className="text-[8px] opacity-60">({p.category})</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <div className="relative flex-1 group">
                                        <select 
                                            value={manualCategory}
                                            onChange={(e) => setManualCategory(e.target.value)}
                                            className="w-full bg-muted/30 border border-border rounded-xl py-3.5 px-5 text-[10px] font-black uppercase italic outline-none focus:border-azul-primary appearance-none cursor-pointer text-foreground pr-10"
                                        >
                                            <option value="">Categoría...</option>
                                            {categories.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/70 group-focus-within:text-azul-primary pointer-events-none transition-colors" />
                                    </div>
                                    <button 
                                        onClick={handleManualRegister}
                                        disabled={isCreatingManual || (!manualName.trim() && !selectedPlayer1)}
                                        className="bg-azul-primary hover:bg-azul-dark text-white rounded-xl py-3.5 px-6 text-[10px] font-black uppercase italic transition-all disabled:opacity-50 shadow-lg shadow-azul-primary/20 active:scale-95 flex items-center justify-center min-w-[120px]"
                                    >
                                        {isCreatingManual ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : isIndividual ? "Inscribir Jugador" : "Inscribir Pareja"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Auto Fill Feature */}
                        <div className="p-6 bg-celeste/5 border border-celeste/20 rounded-3xl space-y-4">
                            <div className="text-[10px] font-black uppercase text-azul-primary tracking-[0.3em] flex items-center gap-2 mb-1">
                                <Dice5 className="w-3.5 h-3.5 stroke-[3]" />
                                Generar Jugadores (Bot)
                            </div>
                            <div className="flex gap-2">
                                <input 
                                    type="number"
                                    min="1"
                                    placeholder="Cantidad..."
                                    value={autoFillCount}
                                    onChange={(e) => setAutoFillCount(e.target.value === "" ? "" : parseInt(e.target.value) || "")}
                                    className="w-24 bg-card border border-border rounded-xl py-3.5 px-5 text-sm font-bold placeholder:text-foreground/60 outline-none focus:border-azul-primary transition-all text-foreground"
                                />
                                <button 
                                    onClick={handleAutoFill}
                                    disabled={isAutoFilling || !autoFillCount}
                                    className="flex-1 bg-azul-primary hover:bg-azul-dark text-white rounded-xl py-3.5 px-6 text-[10px] font-black uppercase italic transition-all disabled:opacity-50 shadow-lg shadow-azul-primary/20 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {isAutoFilling ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Zap className="w-4 h-4 fill-current" />
                                            Carga Automática
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Search Section */}
                    <div className="md:col-span-7 bg-muted/10 p-4 md:p-6 flex flex-col space-y-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-foreground/70">
                                <Search className="w-4 h-4 stroke-[3]" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Base de Datos de Usuarios</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-[9px] font-bold text-azul-primary/60 uppercase">
                                    {allPlayers.length} Jugadores
                                </span>
                                <button 
                                    onClick={() => refetch()}
                                    disabled={isFetching}
                                    className={`p-2 rounded-lg hover:bg-muted transition-all active:scale-95 ${isFetching ? "text-azul-primary" : "text-foreground/20 hover:text-foreground"}`}
                                    title="Sincronizar con base de datos"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/70 group-focus-within:text-azul-primary transition-colors" />
                                <input 
                                    type="text"
                                    placeholder="Nombre, ID o email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-card border border-border rounded-2xl py-4 pl-12 pr-4 text-sm font-bold placeholder:text-foreground/60 outline-none focus:border-azul-primary/50 transition-all text-foreground shadow-sm"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="relative group">
                                    <select 
                                        value={categoryFilter}
                                        onChange={(e) => setCategoryFilter(e.target.value)}
                                        className="w-full bg-card border border-border rounded-xl py-3 px-4 text-[10px] font-black uppercase italic outline-none focus:border-azul-primary appearance-none cursor-pointer text-foreground pr-10"
                                    >
                                        <option value="all">Cat. (Todas)</option>
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/70 group-focus-within:text-azul-primary pointer-events-none transition-colors" />
                                </div>

                                <div className="relative group">
                                    <select 
                                        value={genderFilter}
                                        onChange={(e) => setGenderFilter(e.target.value)}
                                        className="w-full bg-card border border-border rounded-xl py-3 px-4 text-[10px] font-black uppercase italic outline-none focus:border-azul-primary appearance-none cursor-pointer text-foreground pr-10"
                                    >
                                        <option value="all">Género (Todos)</option>
                                        <option value="masculino">Masculino</option>
                                        <option value="femenino">Femenino</option>
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/70 group-focus-within:text-azul-primary pointer-events-none transition-colors" />
                                </div>
                            </div>
                        </div>

                        {/* Results List */}
                        <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pr-1">
                            {isLoadingAvailable ? (
                                <div className="py-20 text-center flex flex-col items-center gap-4">
                                    <div className="w-8 h-8 border-4 border-azul-primary/20 border-t-azul-primary rounded-full animate-spin" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/60 italic">Consultando base de datos...</span>
                                </div>
                            ) : filteredAvailable.length === 0 ? (
                                <div className="py-20 text-center flex flex-col items-center gap-4 border-2 border-dashed border-border/50 rounded-[2.5rem]">
                                    <Users2 className="w-10 h-10 text-foreground/10" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/60 italic">No se encontraron resultados</span>
                                </div>
                            ) : (
                                filteredAvailable.map(p => (
                                    <div
                                        key={p.id}
                                        className="group flex items-center justify-between px-3 py-1.5 bg-card hover:bg-muted/40 border border-border/50 rounded-xl transition-all duration-300"
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black uppercase italic tracking-tight">{p.name}</span>
                                            <div className="flex gap-1.5 mt-0.5">
                                                <span className="text-[7px] font-bold uppercase tracking-widest text-foreground/40 bg-muted px-1 py-0 rounded-md border border-border/50">
                                                    {p.category || "D"}
                                                </span>
                                                <span className="text-[7px] font-bold uppercase tracking-widest text-foreground/40 bg-muted px-1 py-0 rounded-md border border-border/50">
                                                    {p.gender || "masculino"}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleQuickInscribe(p.id)}
                                            className="px-2 py-1 bg-azul-primary/10 text-azul-primary border border-azul-primary/20 rounded-lg text-[8px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 hover:bg-azul-primary hover:text-white transition-all shadow-lg shadow-azul-primary/10 active:scale-95 flex items-center gap-1.5"
                                        >
                                            <Plus className="w-2.5 h-2.5" />
                                            Inscribir
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
