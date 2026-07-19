"use client";

import { useState, useEffect, useRef } from "react";
import { 
    X, Search, Users2, Zap, Dice5, ChevronDown, UserCheck, 
    Plus, Trophy, Check, AlertCircle, RefreshCw, Star, MapPin
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { registerManualPlayer, quickInscribePlayer } from "./actions";
import { usePlayers } from "@/hooks/use-players";
import { useClubs } from "@/hooks/use-clubs";
import { useQueryClient } from "@tanstack/react-query";
import { 
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/Select";

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
    const { players: allPlayers, isLoading: isLoadingAvailable, refetch, isFetching } = usePlayers({ includeManual: true });
    const { clubs } = useClubs();
    const queryClient = useQueryClient();

    // Form State
    const [manualName, setManualName] = useState("");
    const [manualName2, setManualName2] = useState("");
    const [selectedPlayer1, setSelectedPlayer1] = useState<any | null>(null);
    const [selectedPlayer2, setSelectedPlayer2] = useState<any | null>(null);
    const [manualCategory, setManualCategory] = useState("");
    const [manualGender, setManualGender] = useState("masculino");
    const [manualSide1, setManualSide1] = useState("");
    const [manualClub1, setManualClub1] = useState("");
    const [manualSide2, setManualSide2] = useState("");
    const [manualClub2, setManualClub2] = useState("");
    const [manualCategory1, setManualCategory1] = useState("");
    const [manualGender1, setManualGender1] = useState("masculino");
    const [manualCategory2, setManualCategory2] = useState("");
    const [manualGender2, setManualGender2] = useState("masculino");
    const [isCreatingManual, setIsCreatingManual] = useState(false);

    // "search" inscribes registered players (with guest fallback); "guest" skips the
    // user search entirely and always creates guest players with their own config
    const [registerMode, setRegisterMode] = useState<"search" | "guest">("search");

    const switchRegisterMode = (mode: "search" | "guest") => {
        if (mode === registerMode) return;
        setRegisterMode(mode);
        // Drop any selected registered players; keep typed names and config
        setSelectedPlayer1(null);
        setSelectedPlayer2(null);
        setShowResults1(false);
        setShowResults2(false);
    };

    // Auto Fill State
    const [autoFillCount, setAutoFillCount] = useState<number | "">("");
    const [autoFillMode, setAutoFillMode] = useState<"individual" | "pareja">(
        isIndividual ? "individual" : "pareja"
    );
    const [isAutoFilling, setIsAutoFilling] = useState(false);

    useEffect(() => {
        setAutoFillMode(isIndividual ? "individual" : "pareja");
    }, [isIndividual]);

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
        // In guest mode never use a selected registered player
        const player1Sel = registerMode === "guest" ? null : selectedPlayer1;
        const player2Sel = registerMode === "guest" ? null : selectedPlayer2;

        if (!manualName.trim() && !player1Sel) {
            toast.error("El nombre del primer jugador es obligatorio");
            return;
        }
        if (!isIndividual && !manualName2.trim() && !player2Sel) {
            toast.error("El nombre del segundo jugador es obligatorio");
            return;
        }

        if (!isIndividual) {
            const p1 = player1Sel?.id || manualName.trim();
            const p2 = player2Sel?.id || manualName2.trim();
            if (p1 === p2) {
                toast.error("La pareja no puede estar integrada por la misma persona");
                return;
            }
        }

        setIsCreatingManual(true);

        const p1Data = player1Sel
            ? { userId: player1Sel.id, side: manualSide1 || undefined, clubId: manualClub1 || undefined, category: manualCategory1 || undefined, gender: manualGender1 || undefined }
            : { name: manualName, category: manualCategory1 || (categories[0] || "D"), gender: manualGender1, side: manualSide1 || undefined, clubId: manualClub1 || undefined };

        const p2Data = !isIndividual
            ? (player2Sel
                ? { userId: player2Sel.id, side: manualSide2 || undefined, clubId: manualClub2 || undefined, category: manualCategory2 || undefined, gender: manualGender2 || undefined }
                : { name: manualName2, category: manualCategory2 || (categories[0] || "D"), gender: manualGender2, side: manualSide2 || undefined, clubId: manualClub2 || undefined })
            : undefined;

        const res = await registerManualPlayer(tournamentId, p1Data, p2Data);

        if (res.ok && res.player) {
            onSuccess(res.player);

            // Clean up
            setManualName("");
            setManualName2("");
            setSelectedPlayer1(null);
            setSelectedPlayer2(null);
            setManualSide1("");
            setManualClub1("");
            setManualSide2("");
            setManualClub2("");
            setManualCategory1("");
            setManualGender1("masculino");
            setManualCategory2("");
            setManualGender2("masculino");
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
        
        // Obtener jugadores disponibles (no registrados)
        const availablePool = allPlayers.filter(p => !existingPlayerIds.has(p.id));
        
        if (availablePool.length === 0) {
            toast.error("No hay más jugadores disponibles en la base de datos");
            return;
        }

        setIsAutoFilling(true);
        const cat = manualCategory || undefined;

        if (autoFillMode === "individual") {
            const toInscribe = availablePool
                .sort(() => Math.random() - 0.5)
                .slice(0, Math.min(count, availablePool.length));

            toast.loading(`Inscribiendo ${toInscribe.length} jugadores...`, { id: 'autofill' });
            
            const promises = toInscribe.map(p => quickInscribePlayer(tournamentId, p.id, (cat || p.category) ?? undefined));

            try {
                const results = await Promise.all(promises);
                let successCount = 0;
                for (let r of results) {
                    if (r.ok && r.player) {
                        onSuccess(r.player);
                        successCount++;
                    }
                }
                
                toast.success(`Se inscribieron ${successCount} jugadores existentes`, { id: 'autofill' });
                setAutoFillCount("");
                queryClient.invalidateQueries({ queryKey: ["players"] });
            } catch (err) {
                console.error(err);
                toast.error("Error en la inscripción masiva", { id: 'autofill' });
            }
        } else {
            // Modo Parejas
            const neededCount = count * 2;
            const shuffled = availablePool.sort(() => Math.random() - 0.5);
            const actualCount = Math.min(neededCount, shuffled.length);
            const evenCount = Math.floor(actualCount / 2) * 2;
            
            if (evenCount < 2) {
                toast.error("No hay suficientes jugadores disponibles para armar al menos una pareja", { id: 'autofill' });
                setIsAutoFilling(false);
                return;
            }

            const toInscribe = shuffled.slice(0, evenCount);
            const couplesCount = evenCount / 2;

            toast.loading(`Inscribiendo ${couplesCount} parejas (${evenCount} jugadores)...`, { id: 'autofill' });

            const promises = [];
            for (let i = 0; i < toInscribe.length; i += 2) {
                const p1 = toInscribe[i];
                const p2 = toInscribe[i + 1];
                const cat1 = cat || p1.category || "D";
                const cat2 = cat || p2.category || "D";

                promises.push(
                    registerManualPlayer(
                        tournamentId,
                        { userId: p1.id, category: cat1 },
                        { userId: p2.id, category: cat2 }
                    )
                );
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
                
                toast.success(`Se inscribieron ${successCount} parejas correctamente`, { id: 'autofill' });
                setAutoFillCount("");
                queryClient.invalidateQueries({ queryKey: ["players"] });
            } catch (err) {
                console.error(err);
                toast.error("Error en la inscripción masiva", { id: 'autofill' });
            }
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

    // Search-as-you-type matches for the manual Jugador 1 / Jugador 2 inputs
    const player1Matches = (manualName.length > 1 && !selectedPlayer1)
        ? allPlayers
            .filter(p => p.name.toLowerCase().includes(manualName.toLowerCase()))
            .filter(p => !selectedPlayer2 || p.id !== selectedPlayer2.id)
            .filter(p => !existingPlayerIds.has(p.id))
            .slice(0, 5)
        : [];

    const player2Matches = (manualName2.length > 1 && !selectedPlayer2)
        ? allPlayers
            .filter(p => p.name.toLowerCase().includes(manualName2.toLowerCase()))
            .filter(p => !selectedPlayer1 || p.id !== selectedPlayer1.id)
            .filter(p => !existingPlayerIds.has(p.id))
            .slice(0, 5)
        : [];

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
                <div className="p-4 md:p-5 border-b border-border/50 flex items-center justify-between bg-card">
                    <div>
                        <h3 className="text-lg font-black uppercase italic tracking-tighter flex items-center gap-3">
                            <Plus className="w-5 h-5 text-azul-primary" />
                            Gestión de Inscripciones
                        </h3>
                        <p className="text-[9px] font-black uppercase tracking-widest text-foreground/40 mt-0.5">
                            Terminal de alta densidad para administración de jugadores
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-10 h-10 rounded-2xl hover:bg-rojo/10 hover:text-rojo transition-all flex items-center justify-center border border-transparent hover:border-rojo/20 active:scale-95"
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

                            {/* Registered vs Guest toggle */}
                            <div className="flex rounded-lg border border-border/60 p-0.5 bg-card shadow-sm text-[8px] font-black uppercase italic">
                                <button
                                    type="button"
                                    onClick={() => switchRegisterMode("search")}
                                    className={`flex-1 py-1.5 px-2 rounded-md transition-all ${registerMode === "search" ? "bg-azul-primary text-white shadow-sm font-black" : "text-foreground/40 hover:text-foreground/80 font-bold"}`}
                                >
                                    Jugadores Registrados
                                </button>
                                <button
                                    type="button"
                                    onClick={() => switchRegisterMode("guest")}
                                    className={`flex-1 py-1.5 px-2 rounded-md transition-all ${registerMode === "guest" ? "bg-azul-primary text-white shadow-sm font-black" : "text-foreground/40 hover:text-foreground/80 font-bold"}`}
                                >
                                    Invitados
                                </button>
                            </div>

                            {registerMode === "guest" && (
                                <p className="text-[8px] font-bold uppercase tracking-wider text-foreground/40 leading-relaxed -mt-3">
                                    Inscribí personas sin cuenta. Configurá lado, género, club y categoría de cada invitado.
                                </p>
                            )}

                            <div className="space-y-4">
                                {/* Player 1 Input */}
                                <div className="relative" ref={containerRef1}>
                                    <div className="text-[8px] font-black uppercase text-foreground/70 mb-1 ml-1">
                                        {registerMode === "guest"
                                            ? (isIndividual ? "Invitado" : "Invitado 1")
                                            : (isIndividual ? "Jugador" : "Jugador 1")}
                                    </div>
                                    <input
                                        type="text"
                                        placeholder={registerMode === "guest" ? "Nombre del invitado..." : "Nombre o buscar..."}
                                        value={selectedPlayer1 ? selectedPlayer1.name : manualName}
                                        onChange={(e) => {
                                            if (selectedPlayer1) {
                                                // Clear pre-loaded data from the previously selected player
                                                setManualSide1("");
                                                setManualClub1("");
                                                setManualCategory1("");
                                                setManualGender1("masculino");
                                            }
                                            setSelectedPlayer1(null);
                                            setManualName(e.target.value);
                                            setShowResults1(registerMode === "search");
                                        }}
                                        onFocus={() => setShowResults1(registerMode === "search")}
                                        className="w-full bg-muted/40 border border-border/60 rounded-lg py-2 px-3 text-xs font-bold placeholder:text-foreground/25 outline-none focus:border-azul-primary transition-all text-foreground"
                                    />
                                    {registerMode === "search" && manualName.length > 1 && !selectedPlayer1 && showResults1 && (
                                        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border border-border rounded-xl shadow-2xl max-h-40 overflow-y-auto overflow-x-hidden custom-scrollbar">
                                            {player1Matches.length > 0 ? player1Matches.map(p => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => {
                                                        setSelectedPlayer1(p);
                                                        setManualName(p.name);
                                                        // Pre-load the player's existing side/club/category/gender so the admin can review or adjust them
                                                        setManualSide1(p.side || "");
                                                        setManualClub1(p.clubId || "");
                                                        setManualCategory1(p.category || "");
                                                        setManualGender1(p.gender || "masculino");
                                                        setShowResults1(false);
                                                    }}
                                                    className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-azul-primary hover:text-white transition-colors border-b border-border/50 last:border-0"
                                                >
                                                    {p.name} <span className="text-[8px] opacity-60">({p.category})</span>
                                                </button>
                                            )) : (
                                                <div className="px-4 py-2.5 text-[9px] font-bold uppercase tracking-wide text-foreground/40 text-center">
                                                    Sin coincidencias — se registrará como jugador nuevo
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        <Select
                                            value={manualSide1}
                                            onValueChange={(val) => setManualSide1(val)}
                                        >
                                            <SelectTrigger className="w-full bg-muted/50 border-border/60 rounded-lg h-8 text-[9px] font-black uppercase italic shadow-sm">
                                                <SelectValue placeholder="Lado..." />
                                            </SelectTrigger>
                                            <SelectContent className="z-[9999]">
                                                <SelectItem value="drive">Drive</SelectItem>
                                                <SelectItem value="reves">Revés</SelectItem>
                                                <SelectItem value="ambos">Ambidextro</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Select
                                            value={manualClub1}
                                            onValueChange={(val) => setManualClub1(val)}
                                        >
                                            <SelectTrigger className="w-full bg-muted/50 border-border/60 rounded-lg h-8 text-[9px] font-black uppercase italic shadow-sm">
                                                <SelectValue placeholder="Club..." />
                                            </SelectTrigger>
                                            <SelectContent className="z-[9999]">
                                                {clubs.map(c => (
                                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        <Select
                                            value={manualCategory1}
                                            onValueChange={(val) => setManualCategory1(val)}
                                        >
                                            <SelectTrigger className="w-full bg-muted/50 border-border/60 rounded-lg h-8 text-[9px] font-black uppercase italic shadow-sm">
                                                <SelectValue placeholder="Categoría..." />
                                            </SelectTrigger>
                                            <SelectContent className="z-[9999]">
                                                {categories.map(cat => (
                                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Select
                                            value={manualGender1}
                                            onValueChange={(val) => setManualGender1(val)}
                                        >
                                            <SelectTrigger className="w-full bg-muted/50 border-border/60 rounded-lg h-8 text-[9px] font-black uppercase italic shadow-sm">
                                                <SelectValue placeholder="Género..." />
                                            </SelectTrigger>
                                            <SelectContent className="z-[9999]">
                                                <SelectItem value="masculino">Masculino</SelectItem>
                                                <SelectItem value="femenino">Femenino</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Player 2 Input (if doubles) */}
                                {!isIndividual && (
                                    <div className="relative" ref={containerRef2}>
                                        <div className="text-[8px] font-black uppercase text-foreground/70 mb-1 ml-1">{registerMode === "guest" ? "Invitado 2" : "Jugador 2"}</div>
                                        <input
                                            type="text"
                                            placeholder={registerMode === "guest" ? "Nombre del invitado..." : "Nombre o buscar..."}
                                            value={selectedPlayer2 ? selectedPlayer2.name : manualName2}
                                            onChange={(e) => {
                                                if (selectedPlayer2) {
                                                    // Clear pre-loaded data from the previously selected player
                                                    setManualSide2("");
                                                    setManualClub2("");
                                                    setManualCategory2("");
                                                    setManualGender2("masculino");
                                                }
                                                setSelectedPlayer2(null);
                                                setManualName2(e.target.value);
                                                setShowResults2(registerMode === "search");
                                            }}
                                            onFocus={() => setShowResults2(registerMode === "search")}
                                            className="w-full bg-muted/40 border border-border/60 rounded-lg py-2 px-3 text-xs font-bold placeholder:text-foreground/25 outline-none focus:border-azul-primary transition-all text-foreground"
                                        />
                                        {registerMode === "search" && manualName2.length > 1 && !selectedPlayer2 && showResults2 && (
                                            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border border-border rounded-xl shadow-2xl max-h-40 overflow-y-auto overflow-x-hidden custom-scrollbar">
                                                {player2Matches.length > 0 ? player2Matches.map(p => (
                                                    <button
                                                        key={p.id}
                                                        onClick={() => {
                                                            setSelectedPlayer2(p);
                                                            setManualName2(p.name);
                                                            // Pre-load the player's existing side/club/category/gender so the admin can review or adjust them
                                                            setManualSide2(p.side || "");
                                                            setManualClub2(p.clubId || "");
                                                            setManualCategory2(p.category || "");
                                                            setManualGender2(p.gender || "masculino");
                                                            setShowResults2(false);
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-azul-primary hover:text-white transition-colors border-b border-border/50 last:border-0"
                                                    >
                                                        {p.name} <span className="text-[8px] opacity-60">({p.category})</span>
                                                    </button>
                                                )) : (
                                                    <div className="px-4 py-2.5 text-[9px] font-bold uppercase tracking-wide text-foreground/40 text-center">
                                                        Sin coincidencias — se registrará como jugador nuevo
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                            <Select
                                                value={manualSide2}
                                                onValueChange={(val) => setManualSide2(val)}
                                            >
                                                <SelectTrigger className="w-full bg-muted/50 border-border/60 rounded-lg h-8 text-[9px] font-black uppercase italic shadow-sm">
                                                    <SelectValue placeholder="Lado..." />
                                                </SelectTrigger>
                                                <SelectContent className="z-[9999]">
                                                    <SelectItem value="drive">Drive</SelectItem>
                                                    <SelectItem value="reves">Revés</SelectItem>
                                                    <SelectItem value="ambos">Ambidextro</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Select
                                                value={manualClub2}
                                                onValueChange={(val) => setManualClub2(val)}
                                            >
                                                <SelectTrigger className="w-full bg-muted/50 border-border/60 rounded-lg h-8 text-[9px] font-black uppercase italic shadow-sm">
                                                    <SelectValue placeholder="Club..." />
                                                </SelectTrigger>
                                                <SelectContent className="z-[9999]">
                                                    {clubs.map(c => (
                                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                            <Select
                                                value={manualCategory2}
                                                onValueChange={(val) => setManualCategory2(val)}
                                            >
                                                <SelectTrigger className="w-full bg-muted/50 border-border/60 rounded-lg h-8 text-[9px] font-black uppercase italic shadow-sm">
                                                    <SelectValue placeholder="Categoría..." />
                                                </SelectTrigger>
                                                <SelectContent className="z-[9999]">
                                                    {categories.map(cat => (
                                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Select
                                                value={manualGender2}
                                                onValueChange={(val) => setManualGender2(val)}
                                            >
                                                <SelectTrigger className="w-full bg-muted/50 border-border/60 rounded-lg h-8 text-[9px] font-black uppercase italic shadow-sm">
                                                    <SelectValue placeholder="Género..." />
                                                </SelectTrigger>
                                                <SelectContent className="z-[9999]">
                                                    <SelectItem value="masculino">Masculino</SelectItem>
                                                    <SelectItem value="femenino">Femenino</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={handleManualRegister}
                                    disabled={isCreatingManual || (!manualName.trim() && !selectedPlayer1)}
                                    className="w-full bg-azul-primary hover:bg-azul-dark text-white rounded-lg px-4 text-[9px] font-black uppercase italic transition-all disabled:opacity-50 shadow-md shadow-azul-primary/20 active:scale-95 flex items-center justify-center h-9"
                                >
                                    {isCreatingManual ? (
                                        <RefreshCw className="w-3 h-3 animate-spin" />
                                    ) : registerMode === "guest"
                                        ? (isIndividual ? "Inscribir Invitado" : "Inscribir Pareja Invitada")
                                        : (isIndividual ? "Inscribir" : "Inscribir Pareja")}
                                </button>
                            </div>
                        </div>

                        <div className="p-4 bg-muted/50 border border-border/60 rounded-2xl space-y-3">
                            <div className="text-[9px] font-black uppercase text-foreground/40 tracking-[0.2em] flex items-center gap-2 mb-1">
                                <Users2 className="w-3 h-3" />
                                Inscripción Masiva (Base de Datos)
                            </div>
                            
                            {/* Toggle Switch */}
                            <div className="flex rounded-lg border border-border/60 p-0.5 bg-card shadow-sm text-[8px] font-black uppercase italic">
                                <button
                                    type="button"
                                    onClick={() => setAutoFillMode("individual")}
                                    className={`flex-1 py-1 px-2 rounded-md transition-all ${autoFillMode === "individual" ? "bg-azul-primary text-white shadow-sm font-black" : "text-foreground/40 hover:text-foreground/80 font-bold"}`}
                                >
                                    Individual
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAutoFillMode("pareja")}
                                    className={`flex-1 py-1 px-2 rounded-md transition-all ${autoFillMode === "pareja" ? "bg-azul-primary text-white shadow-sm font-black" : "text-foreground/40 hover:text-foreground/80 font-bold"}`}
                                >
                                    En Parejas
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <Select
                                    value={manualCategory}
                                    onValueChange={(val) => setManualCategory(val)}
                                >
                                    <SelectTrigger className="w-full bg-card border-border/60 rounded-lg h-8 text-[9px] font-black uppercase italic shadow-sm">
                                        <SelectValue placeholder="Categoría (Opcional)..." />
                                    </SelectTrigger>
                                    <SelectContent className="z-[9999]">
                                        {categories.map(cat => (
                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select
                                    value={manualGender}
                                    onValueChange={(val) => setManualGender(val)}
                                >
                                    <SelectTrigger className="w-full bg-card border-border/60 rounded-lg h-8 text-[9px] font-black uppercase italic shadow-sm">
                                        <SelectValue placeholder="Género (Opcional)..." />
                                    </SelectTrigger>
                                    <SelectContent className="z-[9999]">
                                        <SelectItem value="masculino">Masculino</SelectItem>
                                        <SelectItem value="femenino">Femenino</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex gap-1.5">
                                <input 
                                    type="number"
                                    min="1"
                                    placeholder={autoFillMode === "individual" ? "Jugadores" : "Parejas"}
                                    value={autoFillCount}
                                    onChange={(e) => setAutoFillCount(e.target.value === "" ? "" : parseInt(e.target.value) || "")}
                                    className="w-16 bg-card border border-border/60 rounded-lg py-1.5 px-2 text-[10px] font-bold placeholder:text-foreground/25 outline-none focus:border-azul-primary transition-all text-center"
                                />
                                <button 
                                    onClick={handleAutoFill}
                                    disabled={isAutoFilling || !autoFillCount}
                                    className="flex-1 bg-slate-800 hover:bg-slate-900 text-white rounded-lg py-1.5 px-3 text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50 shadow-sm active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {isAutoFilling ? (
                                        <RefreshCw className="w-3 h-3 animate-spin" />
                                    ) : (
                                        <>
                                            <Zap className="w-3 h-3 fill-current text-celeste" />
                                            Carga Aleatoria
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Search Section */}
                    <div className="md:col-span-7 bg-muted/10 p-4 md:p-6 flex flex-col min-h-0 space-y-5">
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
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/40 group-focus-within:text-azul-primary transition-colors" />
                                <input 
                                    type="text"
                                    placeholder="Nombre, ID o email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-card border border-border/60 rounded-xl py-2.5 pl-9 pr-4 text-xs font-bold placeholder:text-foreground/25 outline-none focus:border-azul-primary/50 transition-all shadow-sm"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <Select 
                                    value={categoryFilter}
                                    onValueChange={(val) => setCategoryFilter(val)}
                                >
                                    <SelectTrigger className="bg-card border-border/60 rounded-lg h-8 text-[9px] font-black uppercase italic shadow-sm">
                                        <SelectValue placeholder="Cat. (Todas)" />
                                    </SelectTrigger>
                                    <SelectContent className="z-[9999]">
                                        <SelectItem value="all">Todas las Categorías</SelectItem>
                                        {categories.map(cat => (
                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select 
                                    value={genderFilter}
                                    onValueChange={(val) => setGenderFilter(val)}
                                >
                                    <SelectTrigger className="bg-card border-border/60 rounded-lg h-8 text-[9px] font-black uppercase italic shadow-sm">
                                        <SelectValue placeholder="Género (Todos)" />
                                    </SelectTrigger>
                                    <SelectContent className="z-[9999]">
                                        <SelectItem value="all">Todos los Géneros</SelectItem>
                                        <SelectItem value="masculino">Masculino</SelectItem>
                                        <SelectItem value="femenino">Femenino</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Results List */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 space-y-2 pr-1">
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
                                        className="group flex items-center justify-between px-3 py-1 bg-card hover:bg-muted/40 border border-border/40 hover:border-azul-primary/20 rounded-lg transition-all duration-200"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-black uppercase italic tracking-tighter text-foreground">{p.name}</span>
                                            <div className="flex gap-1">
                                                <span className="text-[7px] font-black uppercase tracking-widest text-azul-primary bg-azul-primary/5 px-1 rounded border border-azul-primary/10">
                                                    {p.category || "D"}
                                                </span>
                                                <span className="text-[7px] font-black uppercase tracking-widest text-foreground/40 bg-muted px-1 rounded border border-border/60">
                                                    {p.gender?.charAt(0) || "M"}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleQuickInscribe(p.id)}
                                            className="px-2 py-0.5 bg-azul-primary text-white rounded-md text-[8px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 hover:bg-azul-dark transition-all shadow-sm active:scale-95 flex items-center gap-1"
                                        >
                                            <Plus className="w-2.5 h-2.5" />
                                            Añadir
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
