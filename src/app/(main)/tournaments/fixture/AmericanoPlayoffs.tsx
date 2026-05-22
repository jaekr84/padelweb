"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
    ArrowLeft, Trophy, RefreshCw, Check, Settings, ShieldAlert, Award
} from "lucide-react";
import { toast } from "sonner";
import { 
    Player, Group, Match, BracketMatch, Standing 
} from "./components/americano/types";
import { AmericanoBracket } from "./components/americano/AmericanoBracket";
import { AmericanoModals } from "./components/americano/AmericanoModals";
import { getAllPlayers } from "@/app/actions/players";
import { saveTournamentFixture, updateTournamentMetadata, finalizeTournament } from "./actions";
import TournamentPublishButton from "@/components/TournamentPublishButton";
import FinalizeTournamentModal from "./components/tournament/FinalizeTournamentModal";

export interface AmericanoPlayoffsProps {
    tournamentId: string;
    tournamentName: string;
    initialGroups: Group[];
    initialMatches: Match[];
    initialBracket: BracketMatch[];
    initialStatus: string;
    initialPresent?: string[];
    initialPaid?: string[];
    readOnly?: boolean;
    isLoggedIn?: boolean;
    modality?: {
        numCourts: number;
        matchesPerTeam: number;
        isIndividual: boolean;
        bracketSize?: number;
    };
}

export default function AmericanoPlayoffs({
    tournamentId,
    tournamentName,
    initialGroups,
    initialMatches,
    initialBracket,
    initialStatus,
    initialPresent = [],
    initialPaid = [],
    readOnly = false,
    isLoggedIn = true,
    modality
}: AmericanoPlayoffsProps) {
    const router = useRouter();
    const [groups, setGroups] = useState<Group[]>(initialGroups);
    const [matches, setMatches] = useState<Match[]>(() => 
        initialMatches.map(m => ({
            ...m,
            score1: m.score1 ?? 0,
            score2: m.score2 ?? 0,
            played: m.played || m.confirmed
        }))
    );
    const [bracket, setBracket] = useState<BracketMatch[]>(() => 
        initialBracket.map(m => ({
            ...m,
            score1: m.score1 ?? 0,
            score2: m.score2 ?? 0
        }))
    );
    const [saving, setSaving] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);

    // Present & Paid players
    const [present, setPresent] = useState<Set<string>>(new Set(initialPresent));
    const [paid, setPaid] = useState<Set<string>>(new Set(initialPaid));

    // Player replacement state
    const [replacingPlayer, setReplacingPlayer] = useState<Player | null>(null);
    const [allPotentialPlayers, setAllPotentialPlayers] = useState<Player[]>([]);
    const [isFetchLoading, setIsFetchLoading] = useState(false);
    const [guestName, setGuestName] = useState("");
    const [guestName2, setGuestName2] = useState("");
    const [playerSearchQuery, setPlayerSearchQuery] = useState("");
    const [replaceSlot, setReplaceSlot] = useState<1 | 2>(1);

    const isIndividual = modality?.isIndividual || false;

    // Computed lists for player search
    const allRegisteredPlayers = useMemo(() => groups.flatMap(g => g.players), [groups]);
    const registeredPlayerNames = useMemo(() => {
        return allRegisteredPlayers.flatMap(p => p.name.split(/[\/\+]/).map(n => n.trim().toLowerCase()));
    }, [allRegisteredPlayers]);
    const registeredPlayerIds = useMemo(() => new Set(allRegisteredPlayers.map(p => p.id)), [allRegisteredPlayers]);

    // Check if bracket final round is confirmed
    const isBracketFinished = useMemo(() => {
        const finalMatch = bracket.find(m => m.round === 0);
        return !!finalMatch?.confirmed;
    }, [bracket]);

    const championName = useMemo(() => {
        const finalMatch = bracket.find(m => m.round === 0);
        if (finalMatch?.confirmed && finalMatch.winnerId) {
            return finalMatch.winnerName || "Campeón";
        }
        return null;
    }, [bracket]);

    const fetchPlayers = useCallback(async () => {
        setIsFetchLoading(true);
        const players = await getAllPlayers();
        setAllPotentialPlayers(players);
        setIsFetchLoading(false);
    }, []);

    useEffect(() => {
        if (replacingPlayer) {
            fetchPlayers();
            if (!isIndividual) {
                const names = replacingPlayer.name.split(/[\/\+]/).map(n => n.trim());
                setGuestName(names[0] || "");
                setGuestName2(names[1] || "");
            } else {
                setGuestName(replacingPlayer.name);
                setGuestName2("");
            }
            setPlayerSearchQuery("");
        }
    }, [replacingPlayer, fetchPlayers, isIndividual]);

    const handleReplacePlayer = async (oldPlayerId: string, newPlayer: Player) => {
        const updatedGroups = groups.map(group => ({
            ...group,
            players: group.players.map(p => p.id === oldPlayerId ? { ...newPlayer } : p)
        }));

        const updatedMatches = matches.map(m => ({
            ...m,
            team1: m.team1.id === oldPlayerId ? { ...newPlayer } : m.team1,
            team2: m.team2.id === oldPlayerId ? { ...newPlayer } : m.team2,
        }));

        const updatedBracket = bracket.map(bm => ({
            ...bm,
            team1: (bm.team1 && typeof bm.team1 !== "string" && (bm.team1 as Player).id === oldPlayerId) ? { ...newPlayer } as any : bm.team1,
            team2: (bm.team2 && typeof bm.team2 !== "string" && (bm.team2 as Player).id === oldPlayerId) ? { ...newPlayer } as any : bm.team2,
        }));

        setGroups(updatedGroups);
        setMatches(updatedMatches);
        setBracket(updatedBracket);

        setPresent(prev => {
            const next = new Set(prev);
            if (next.has(oldPlayerId)) {
                next.delete(oldPlayerId);
                next.add(newPlayer.id);
            }
            return next;
        });
        setPaid(prev => {
            const next = new Set(prev);
            if (next.has(oldPlayerId)) {
                next.delete(oldPlayerId);
                next.add(newPlayer.id);
            }
            return next;
        });

        setReplacingPlayer(null);
        setGuestName("");
        setGuestName2("");
        setReplaceSlot(1);

        const loadingToast = toast.loading("Actualizando participantes...");
        try {
            const res = await saveTournamentFixture({
                tournamentId,
                phase: "eliminatorias",
                groups: updatedGroups,
                matches: updatedMatches,
                bracket: updatedBracket,
                presentPlayerIds: Array.from(present),
                paidPlayerIds: Array.from(paid),
            });
            toast.dismiss(loadingToast);
            if (res.ok) {
                toast.success("Participante reemplazado y cambios guardados");
            } else {
                toast.error("Error al guardar cambios: " + res.error);
            }
        } catch (err) {
            toast.dismiss(loadingToast);
            console.error(err);
            toast.error("Error al guardar cambios en el servidor");
        }
    };

    const handleReplaceOneInPair = async (oldPlayer: Player, newPlayerName: string, slot: 1 | 2) => {
        const names = oldPlayer.name.split(/[\/\+]/).map(n => n.trim());
        let p1 = names[0] || "Jugador 1";
        let p2 = names[1] || "Jugador 2";

        if (slot === 1) p1 = newPlayerName;
        else p2 = newPlayerName;

        const updatedPlayer: Player = {
            ...oldPlayer,
            name: `${p1} / ${p2}`
        };

        await handleReplacePlayer(oldPlayer.id, updatedPlayer);
    };

    const handleReplaceWithGuest = async (oldPlayerId: string) => {
        if (!isIndividual) {
            const oldPlayer = groups.flatMap(g => g.players).find(p => p.id === oldPlayerId);
            if (!oldPlayer) return;

            const names = oldPlayer.name.split(/[\/\+]/).map(n => n.trim());
            let g1 = guestName.trim() || names[0] || "Jugador 1";
            let g2 = guestName2.trim() || names[1] || "Jugador 2";

            const guestPlayer: Player = {
                id: oldPlayerId,
                name: `${g1} / ${g2}`,
                category: oldPlayer.category
            };
            await handleReplacePlayer(oldPlayerId, guestPlayer);
            return;
        }

        if (!guestName.trim()) {
            toast.error("Ingresá un nombre para el invitado");
            return;
        }
        const guestPlayer: Player = {
            id: `guest_${crypto.randomUUID()}`,
            name: guestName.trim() + " (Inv)",
            category: "D"
        };
        await handleReplacePlayer(oldPlayerId, guestPlayer);
    };

    const handleBracketScore = (matchId: string, s1: string, s2: string) => {
        const match = bracket.find(m => m.id === matchId);
        if (match?.confirmed || readOnly) return;

        setBracket(bracket.map(m => m.id === matchId ? {
            ...m,
            score1: s1 === "" ? undefined : parseInt(s1, 10),
            score2: s2 === "" ? undefined : parseInt(s2, 10),
        } : m));
    };

    const handleBracketEdit = async (matchId: string) => {
        const target = bracket.find(m => m.id === matchId);
        if (!target || !target.confirmed || readOnly) return;

        const nextMatch = bracket.find(nm => nm.round === target.round - 1 && nm.slot === Math.floor(target.slot / 2));
        if (nextMatch?.confirmed) {
            toast.error("No se puede editar: el ganador ya jugó la siguiente ronda.");
            return;
        }

        const updated = bracket.map(m => {
            if (m.id === matchId) {
                return { ...m, confirmed: false, winnerId: undefined, winnerName: undefined };
            }
            if (m.round === target.round - 1 && m.slot === Math.floor(target.slot / 2)) {
                if (target.slot % 2 === 0) return { ...m, team1: null };
                else return { ...m, team2: null };
            }
            return m;
        });

        setSaving(true);
        const res = await saveTournamentFixture({
            tournamentId,
            phase: "eliminatorias",
            groups,
            matches,
            bracket: updated,
            presentPlayerIds: Array.from(present),
            paidPlayerIds: Array.from(paid)
        });

        if (res.ok) {
            setBracket(updated);
            toast.success("Partido reabierto para edición");
        } else {
            toast.error("Error al reabrir: " + res.error);
        }
        setSaving(false);
    };

    const handleBracketConfirm = async (matchId: string) => {
        const target = bracket.find(m => m.id === matchId);
        if (!target || target.score1 === undefined || target.score2 === undefined) return;
        if (target.score1 === target.score2) {
            toast.error("No se permiten empates");
            return;
        }

        const winner = target.score1 > target.score2 ? target.team1 : target.team2;
        const updated = bracket.map(m => m.id === matchId ? {
            ...m,
            confirmed: true,
            winnerId: (winner as Player).id,
            winnerName: (winner as Player).name
        } : m);

        // Auto-advance
        const totalRounds = Math.max(...updated.map(m => m.round)) + 1;
        let finalBracket = [...updated];

        for (let r = totalRounds - 1; r > 0; r--) {
            const current = finalBracket.filter(m => m.round === r);
            current.forEach(m => {
                if (m.confirmed && m.winnerId) {
                    let nextMatch;
                    let targetTeamSlot: 'team1' | 'team2' = m.slot % 2 === 0 ? 'team1' : 'team2';

                    nextMatch = finalBracket.find(nm => nm.round === r - 1 && nm.slot === Math.floor(m.slot / 2));

                    if (nextMatch) {
                        const winnerP = [m.team1, m.team2].find(t => t !== null && (t as any) !== "BYE" && (t as Player)?.id === m.winnerId);
                        nextMatch[targetTeamSlot] = winnerP as Player;
                    }
                }
            });
        }

        setSaving(true);
        const isFinal = target.round === 0;
        const res = await saveTournamentFixture({
            tournamentId,
            phase: "eliminatorias",
            groups,
            matches,
            bracket: finalBracket,
            presentPlayerIds: Array.from(present),
            paidPlayerIds: Array.from(paid),
            championName: isFinal ? (winner as Player).name : undefined,
        });

        if (res.ok) {
            setBracket(finalBracket);
            toast.success("Resultado guardado");
        } else {
            toast.error("Error: " + res.error);
        }
        setSaving(false);
    };

    const handleResetBracket = async () => {
        setSaving(true);
        const res = await saveTournamentFixture({
            tournamentId,
            phase: "grupos",
            groups,
            matches,
            bracket: [],
            presentPlayerIds: Array.from(present),
            paidPlayerIds: Array.from(paid),
            championName: undefined
        });

        if (res.ok) {
            await updateTournamentMetadata({
                tournamentId,
                status: "en_curso"
            });
            toast.success("Cuadro de eliminatorias reiniciado");
            router.push(`/tournaments/${tournamentId}/manage`);
        } else {
            toast.error("Error al reiniciar: " + res.error);
        }
        setSaving(false);
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        router.refresh();
        setTimeout(() => setIsRefreshing(false), 1000);
    };

    const handleFinalizeConfirm = async (): Promise<boolean> => {
        const res = await finalizeTournament(tournamentId);
        return res.ok;
    };

    return (
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-[60] bg-background/60 backdrop-blur-3xl border-b border-border/40">
                <div className="w-full px-2 md:px-3 h-10 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push(readOnly ? `/tournaments/${tournamentId}` : `/tournaments/${tournamentId}/manage`)}
                            className="group flex items-center gap-1.5 text-foreground/70 hover:text-foreground transition-all px-2 py-1 hover:bg-muted/50 rounded-lg"
                        >
                            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                            <span className="text-[8px] font-black uppercase tracking-[0.15em] italic">Volver a Grupos</span>
                        </button>

                        <div className="h-5 w-px bg-border/20 hidden md:block" />

                        <div className="hidden md:flex flex-col min-w-0">
                            <span className="text-[6px] font-black uppercase tracking-[0.2em] text-azul-primary leading-none mb-0.5">Torneo</span>
                            <span className="text-[9px] font-black uppercase italic tracking-tight text-foreground/90 leading-none truncate max-w-[120px] lg:max-w-[200px]">
                                {tournamentName}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-azul-primary/5 border border-azul-primary/20 text-azul-primary text-[8px] font-black uppercase tracking-widest">
                            <div className="w-1 h-1 rounded-full bg-azul-primary animate-pulse" />
                            {initialStatus === "finalizado" ? "Finalizado" : "Eliminatorias"}
                        </div>

                        {initialStatus === "finalizado" && (
                            <TournamentPublishButton
                                tournamentId={tournamentId}
                                tournamentName={tournamentName}
                                variant="management"
                            />
                        )}

                        {!readOnly && initialStatus !== "finalizado" && (
                            <button
                                onClick={() => setIsFinalizeModalOpen(true)}
                                disabled={!isBracketFinished}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all text-[8px] font-black uppercase tracking-widest ${
                                    isBracketFinished
                                        ? "bg-rojo/10 border-rojo/20 text-rojo hover:bg-rojo hover:text-white"
                                        : "bg-muted/40 border-border/20 text-foreground/20 cursor-not-allowed"
                                }`}
                                title={isBracketFinished ? "Finalizar Torneo" : "Se debe definir la Final para finalizar el torneo"}
                            >
                                <Check className="w-3 h-3" />
                                <span>Finalizar</span>
                            </button>
                        )}

                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="p-1.5 rounded-lg bg-muted/40 border border-border/40 text-foreground/50 hover:text-foreground hover:bg-muted transition-all disabled:opacity-50"
                        >
                            <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />
                        </button>
                    </div>
                </div>
            </header>

            <div className="w-full px-3 md:px-4 py-6 pb-24">
                <div className="max-w-7xl mx-auto space-y-8">
                    {/* Header Promocional/Visual */}
                    <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br from-card/30 to-card/50 p-6 md:p-8 backdrop-blur-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-azul-primary/10 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-64 h-64 bg-celeste/5 rounded-full blur-3xl pointer-events-none" />
                        
                        <div className="space-y-2 text-center md:text-left z-10">
                            <span className="px-3 py-1 bg-azul-primary/10 border border-azul-primary/20 text-azul-primary rounded-full text-[8px] font-black uppercase tracking-[0.2em]">
                                Fase Final • Playoffs
                            </span>
                            <h2 className="text-xl md:text-2xl font-black text-foreground tracking-tighter uppercase italic leading-none pt-1">
                                Eliminatorias Americano
                            </h2>
                            <p className="text-xs text-foreground/60 max-w-xl">
                                Cuadro de eliminación directa. Los mejores clasificados de la fase de grupos compiten por el campeonato. 
                                {readOnly ? " Sigue los resultados en tiempo real." : " Carga resultados y confirma partidos para avanzar al campeón."}
                            </p>
                        </div>

                        {championName && (
                            <div className="z-10 flex flex-col items-center gap-2 px-6 py-4 rounded-2xl bg-celeste/10 border border-celeste/20 shadow-[0_0_40px_rgba(34,211,238,0.15)] animate-[pulse_3s_infinite]">
                                <Award className="w-8 h-8 text-celeste animate-bounce" />
                                <div className="text-center">
                                    <span className="text-[7px] font-black uppercase tracking-[0.3em] text-celeste leading-none">Campeón del Torneo</span>
                                    <h4 className="text-sm font-black uppercase tracking-tight text-white mt-1 max-w-[180px] truncate">
                                        {championName}
                                    </h4>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bracket Render */}
                    <div className="relative">
                        <AmericanoBracket
                            bracket={bracket}
                            setBracket={setBracket}
                            onResetBracket={!readOnly ? handleResetBracket : undefined}
                            readOnly={readOnly}
                            setReplacingPlayer={setReplacingPlayer}
                            handleBracketScore={handleBracketScore}
                            handleBracketConfirm={handleBracketConfirm}
                            handleBracketEdit={handleBracketEdit}
                            standings={[]}
                        />
                    </div>
                </div>
            </div>

            <AmericanoModals
                noPlayersData={null}
                setNoPlayersData={() => {}}
                showSuccessModal={false}
                setShowSuccessModal={() => {}}
                replacingPlayer={replacingPlayer}
                setReplacingPlayer={setReplacingPlayer}
                isIndividual={isIndividual}
                replaceSlot={replaceSlot}
                setReplaceSlot={setReplaceSlot}
                guestName={guestName}
                setGuestName={setGuestName}
                guestName2={guestName2}
                setGuestName2={setGuestName2}
                handleReplaceWithGuest={handleReplaceWithGuest}
                playerSearchQuery={playerSearchQuery}
                setPlayerSearchQuery={setPlayerSearchQuery}
                isFetchLoading={isFetchLoading}
                allPotentialPlayers={allPotentialPlayers}
                registeredPlayerIds={registeredPlayerIds}
                registeredPlayerNames={registeredPlayerNames}
                handleReplacePlayer={handleReplacePlayer}
                handleReplaceOneInPair={handleReplaceOneInPair}
                playerToDelete={null}
                setPlayerToDelete={() => {}}
                handleDeletePlayer={() => {}}
                editingMatchPlayer={null}
                setEditingMatchPlayer={() => {}}
                groups={groups}
                matches={matches}
                handleUpdateMatchPlayer={() => Promise.resolve({ ok: true })}
            />

            <FinalizeTournamentModal
                isOpen={isFinalizeModalOpen}
                onClose={() => setIsFinalizeModalOpen(false)}
                onConfirm={handleFinalizeConfirm}
                tournamentName={tournamentName}
                onRedirect={() => router.push(readOnly ? `/tournaments/${tournamentId}` : `/tournaments/${tournamentId}/manage`)}
            />
        </div>
    );
}
