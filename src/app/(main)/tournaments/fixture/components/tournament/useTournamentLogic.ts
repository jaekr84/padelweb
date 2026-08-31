"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { getAllPlayers } from "@/app/actions/players";
import { saveTournamentFixture, resetTournamentStatus, updateTournamentMetadata, updateGroupCourt } from "../../actions";
import {
    Player, Group, Match, BracketSlot, BracketMatch, Standing
} from "./types";
import {
    getSeedingOrder, buildSeedMap, computeGroupStandings,
    orderQualifiers, isByeQualifier, countRealQualifiers, toSeedInput,
    advanceBracket, isDoubleBye,
    type StMatch
} from "@/lib/matchmaking";

interface UseTournamentLogicProps {
    tournamentId: string;
    tournamentName: string;
    initialGroups: Group[];
    initialMatches: Match[];
    initialBracket: BracketMatch[];
    initialStatus: string;
    initialPresent: string[];
    initialPaid: string[];
    initialUpdatedAt?: string;
    readOnly: boolean;
    modality: any;
}

// Slot de cuadro todavía sin definir: "TBD_<groupId>_<puesto 0-based>".
const TBD_SLOT_RE = /^TBD_(.+)_(\d+)$/;

export function useTournamentLogic({
    tournamentId,
    tournamentName,
    initialGroups,
    initialMatches,
    initialBracket,
    initialStatus,
    initialPresent,
    initialPaid,
    initialUpdatedAt,
    readOnly,
    modality
}: UseTournamentLogicProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    // Safely parse modality inside the hook if it is passed as a string
    const parsedModality = useMemo(() => {
        if (typeof modality === "string") {
            try {
                return JSON.parse(modality);
            } catch (e) {
                console.error("Error parsing modality inside useTournamentLogic:", e);
                return null;
            }
        }
        return modality;
    }, [modality]);

    const isIndividual = parsedModality?.participacion === "individual" || parsedModality?.isIndividual || false;

    const step: "setup" | "done" | "qual" | "elim" = useMemo(() => {
        const s = searchParams.get("step");
        if (s === "done" || s === "elim" || s === "setup" || s === "qual") return s as any;
        
        // El cuadro tiene que existir para abrir en llaves: si el estado quedó en
        // eliminatorias pero no hay bracket (fixture rearmado desde el armado),
        // abrir ahí mostraría una pantalla vacía y saltearía la fase de grupos.
        const hasBracket = initialBracket.length > 0;
        return (initialStatus === "setup" || (initialGroups.length === 0 && !readOnly))
            ? "setup" :
            ((initialStatus === "en_eliminatorias" || initialStatus === "finalizado") && hasBracket) ? "elim" : "done";
    }, [searchParams, initialStatus, initialGroups.length, initialBracket.length, readOnly]);

    const setStep = useCallback((newStep: "setup" | "done" | "qual" | "elim") => {
        const current = new URLSearchParams(Array.from(searchParams.entries()));
        if (current.get("step") !== newStep) {
            current.set("step", newStep);
            router.replace(`${window.location.pathname}?${current.toString()}`, { scroll: false });
        }
    }, [searchParams, router]);
    const [groups, setGroups] = useState<Group[]>(initialGroups);
    const [matches, setMatches] = useState<Match[]>(() =>
        initialMatches.map(m => ({
            ...m,
            score1: m.score1 ?? 0,
            score2: m.score2 ?? 0
        }))
    );
    const [bracket, setBracket] = useState<BracketMatch[]>(() =>
        initialBracket.map(m => ({
            ...m,
            score1: m.score1 ?? 0,
            score2: m.score2 ?? 0
        }))
    );
    const ensureArray = (val: any) => {
        if (typeof val === 'string') {
            try { return JSON.parse(val); } catch { return []; }
        }
        return Array.isArray(val) ? val : [];
    };

    const [present, setPresent] = useState<Set<string>>(new Set(ensureArray(initialPresent)));
    const [paid, setPaid] = useState<Set<string>>(new Set(ensureArray(initialPaid)));
    const [isPlayersModalOpen, setIsPlayersModalOpen] = useState(false);
    const [playerSearchQuery, setPlayerSearchQuery] = useState("");
    const [replacingPlayer, setReplacingPlayer] = useState<Player | null>(null);
    const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
    const [allPotentialPlayers, setAllPotentialPlayers] = useState<Player[]>([]);
    const [isFetchLoading, setIsFetchLoading] = useState(false);
    const [guestName, setGuestName] = useState("");
    const [guestName2, setGuestName2] = useState("");
    const [replaceSlot, setReplaceSlot] = useState<1 | 2>(1);
    const [isRefreshing, startRefreshTransition] = useTransition();
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [qualLimit, setQualLimit] = useState<number>(() => {
        const activeGroups = initialGroups.filter(g => (g.players || []).length > 0);
        return activeGroups.length * 2; // Default to 2 per group
    });
    const [swappingPlayer, setSwappingPlayer] = useState<{ matchId: string, teamSlot: 1 | 2 } | null>(null);
    const lastSavedState = useRef({ present: new Set(initialPresent), paid: new Set(initialPaid) });
    const fixtureVersionRef = useRef<string | undefined>(initialUpdatedAt);
    // Serialize saves so concurrent calls (e.g. starting several matches quickly)
    // don't race: each save reads the version only after the previous one finished
    // and updated it, avoiding false "another admin modified" conflicts.
    const saveChainRef = useRef<Promise<any>>(Promise.resolve());

    const saveFixture = useCallback((input: Omit<Parameters<typeof saveTournamentFixture>[0], 'lastKnownUpdatedAt'>) => {
        const run = saveChainRef.current.then(async () => {
            const res = await saveTournamentFixture({ ...input, lastKnownUpdatedAt: fixtureVersionRef.current });
            if (res.ok && res.newUpdatedAt) {
                fixtureVersionRef.current = res.newUpdatedAt;
            }
            if (!res.ok && res.conflictError) {
                toast.error("Otro administrador guardó cambios en este torneo. Recargá la página para ver los últimos datos.", {
                    duration: 10000,
                    action: { label: "Recargar", onClick: () => window.location.reload() }
                });
            }
            return res;
        });
        // Keep the chain alive even if a save throws/rejects.
        saveChainRef.current = run.catch(() => { });
        return run;
    }, []);

    /**
     * Guarda la cancha de un grupo con su propio botón (no pasa por el autosave).
     * Devuelve si pudo guardar para que el botón muestre el estado de carga.
     */
    const saveGroupCourt = useCallback(async (groupId: string, courtNumber: string): Promise<boolean> => {
        try {
            const res = await updateGroupCourt({ tournamentId, groupId, courtNumber });
            if (!res.ok) {
                toast.error(res.error || "No se pudo guardar la cancha");
                return false;
            }
            setGroups(prev => prev.map(g => g.id === groupId ? { ...g, courtNumber: res.courtNumber ?? null } : g));
            toast.success("Cancha guardada");
            return true;
        } catch (err) {
            console.error("[saveGroupCourt]", err);
            toast.error("No se pudo guardar la cancha");
            return false;
        }
    }, [tournamentId]);

    const [confirmModal, setConfirmModal] = useState<{
        open: boolean;
        title: string;
        description: string;
        onConfirm: () => void;
        variant?: 'danger' | 'primary';
    }>({
        open: false,
        title: "",
        description: "",
        onConfirm: () => { },
    });

    // ── Memos ──
    const allPlayers = useMemo(() => {
        const playersMap = new Map<string, Player>();
        groups.forEach(g => {
            g.players.forEach(p => {
                playersMap.set(p.id, p);
            });
        });
        return Array.from(playersMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [groups]);

    const filteredPlayers = useMemo(() => {
        if (!playerSearchQuery) return allPlayers;
        return allPlayers.filter(p =>
            p.name.toLowerCase().includes(playerSearchQuery.toLowerCase())
        );
    }, [allPlayers, playerSearchQuery]);

    const isGroupStageFinished = useMemo(() => {
        return matches.length > 0 && matches.every(m => m.confirmed);
    }, [matches]);

    const totalGroupMatches = matches.length;
    const confirmedGroupMatches = matches.filter(m => m.confirmed).length;
    const progressPercent = totalGroupMatches > 0
        ? Math.round((confirmedGroupMatches / totalGroupMatches) * 100)
        : 0;

    // ── Handlers ──
    const handleRefresh = () => {
        startRefreshTransition(() => {
            router.refresh();
        });
    };

    const bulkUpdateStatus = async (type: 'present' | 'paid', ids: string[]) => {
        if (readOnly) return;
        const next = new Set(ids);
        if (type === 'present') {
            setPresent(next);
            lastSavedState.current.present = next;
        } else {
            setPaid(next);
            lastSavedState.current.paid = next;
        }

        try {
            await updateTournamentMetadata({
                tournamentId,
                presentPlayerIds: type === 'present' ? ids : Array.from(present),
                paidPlayerIds: type === 'paid' ? ids : Array.from(paid),
            });
            toast.success(type === 'present' ? "Asistencia actualizada" : "Pagos actualizados");
        } catch (e) {
            toast.error("Error al guardar cambios");
        }
    };

    // ── Attendance (per-member: "pairId_0"/"pairId_1") + dynamic match start ──
    // A pair counts as present/paid when both members are checked (or a legacy
    // plain pair-id is set). Individuals use the plain id.
    const isEntryPresent = useCallback((id: string) =>
        isIndividual ? present.has(id) : (present.has(id) || (present.has(`${id}_0`) && present.has(`${id}_1`))),
        [present, isIndividual]);
    const isEntryPaid = useCallback((id: string) =>
        isIndividual ? paid.has(id) : (paid.has(id) || (paid.has(`${id}_0`) && paid.has(`${id}_1`))),
        [paid, isIndividual]);

    // One member of a pair (slot 0 = primer nombre, slot 1 = segundo).
    const memberCheckKey = (pairId: string, slot: 0 | 1) => `${pairId}_${slot}`;

    const isMemberPresent = useCallback((pairId: string, slot: 0 | 1) =>
        isIndividual ? present.has(pairId) : (present.has(pairId) || present.has(`${pairId}_${slot}`)),
        [present, isIndividual]);
    const isMemberPaid = useCallback((pairId: string, slot: 0 | 1) =>
        isIndividual ? paid.has(pairId) : (paid.has(pairId) || paid.has(`${pairId}_${slot}`)),
        [paid, isIndividual]);

    // Check in / charge a single player from the standings table. A legacy plain
    // pair id in the set means "both members checked": it gets expanded into the
    // two member keys before toggling, so one member can be turned off alone.
    const toggleMemberChecked = (
        set: Set<string>,
        setSet: (s: Set<string>) => void,
        saveKind: 'present' | 'paid',
        pairId: string,
        slot: 0 | 1,
    ) => {
        if (readOnly) return;
        const next = new Set(set);
        if (isIndividual) {
            if (next.has(pairId)) next.delete(pairId); else next.add(pairId);
        } else {
            if (next.has(pairId)) {
                next.delete(pairId);
                next.add(memberCheckKey(pairId, 0));
                next.add(memberCheckKey(pairId, 1));
            }
            const key = memberCheckKey(pairId, slot);
            if (next.has(key)) next.delete(key); else next.add(key);
        }
        setSet(next);
        if (saveKind === 'present') lastSavedState.current.present = next;
        else lastSavedState.current.paid = next;
        updateTournamentMetadata({
            tournamentId,
            presentPlayerIds: Array.from(saveKind === 'present' ? next : present),
            paidPlayerIds: Array.from(saveKind === 'paid' ? next : paid),
        }).catch(e => console.error("Failed to save attendance", e));
    };
    const toggleMemberPresent = (pairId: string, slot: 0 | 1) =>
        toggleMemberChecked(present, setPresent, 'present', pairId, slot);
    const toggleMemberPaid = (pairId: string, slot: 0 | 1) =>
        toggleMemberChecked(paid, setPaid, 'paid', pairId, slot);

    // Todas las marcas de un grupo (los dos integrantes de cada pareja).
    const groupCheckKeys = useCallback((groupId: string): string[] => {
        const g = groups.find(x => x.id === groupId);
        if (!g) return [];
        return g.players.flatMap(p =>
            isIndividual ? [p.id] : [memberCheckKey(p.id, 0), memberCheckKey(p.id, 1)]
        );
    }, [groups, isIndividual]);

    const isGroupChecked = useCallback((kind: 'present' | 'paid', groupId: string) => {
        const keys = groupCheckKeys(groupId);
        if (keys.length === 0) return false;
        const set = kind === 'present' ? present : paid;
        // Un id de pareja "pelado" (legacy) vale por sus dos integrantes.
        return keys.every(k => set.has(k) || set.has(k.replace(/_[01]$/, "")));
    }, [groupCheckKeys, present, paid]);

    // Marca/desmarca la columna entera (OK o $$) de un grupo: cuando llega la tanda
    // completa, hacerlo fila por fila es incómodo.
    const toggleGroupChecked = (kind: 'present' | 'paid', groupId: string) => {
        if (readOnly) return;
        const g = groups.find(x => x.id === groupId);
        if (!g || g.players.length === 0) return;

        const keys = groupCheckKeys(groupId);
        const current = kind === 'present' ? present : paid;
        const next = new Set(current);

        // Expandimos los ids "pelados" a sus dos integrantes antes de togglear.
        if (!isIndividual) {
            g.players.forEach(p => {
                if (next.has(p.id)) {
                    next.delete(p.id);
                    next.add(memberCheckKey(p.id, 0));
                    next.add(memberCheckKey(p.id, 1));
                }
            });
        }

        const allChecked = keys.every(k => next.has(k));
        keys.forEach(k => { if (allChecked) next.delete(k); else next.add(k); });

        if (kind === 'present') {
            setPresent(next);
            lastSavedState.current.present = next;
        } else {
            setPaid(next);
            lastSavedState.current.paid = next;
        }

        updateTournamentMetadata({
            tournamentId,
            presentPlayerIds: Array.from(kind === 'present' ? next : present),
            paidPlayerIds: Array.from(kind === 'paid' ? next : paid),
        }).catch(e => console.error("Failed to save attendance", e));
    };

    const isMatchDone = (m: Match) => m.confirmed || m.status === 'finished' || m.status === 'completed';

    // Una pareja no puede estar en dos canchas a la vez. En el Robin todas las
    // parejas del grupo se cruzan entre sí, así que varios partidos del mismo
    // grupo pueden convivir, pero no si comparten una pareja.
    const busyEntryIds = useMemo(() => new Set(
        matches
            .filter(m => m.status === 'in_progress' && !m.confirmed)
            .flatMap(m => [m.team1.id, m.team2.id])
    ), [matches]);

    const isEntryBusy = useCallback((id: string) => busyEntryIds.has(id), [busyEntryIds]);

    /**
     * Partidos del grupo que se pueden mandar a cancha ahora: pendientes, con las
     * dos parejas presentes y sin ninguna pareja ya jugando. Va reservando las
     * parejas para que la propia tanda tampoco se pise a sí misma.
     */
    const startableGroupMatches = useCallback((groupId: string) => {
        const pending = matches
            .filter(m => m.groupId === groupId && !isMatchDone(m) && m.status !== 'in_progress')
            .filter(m => isEntryPresent(m.team1.id) && isEntryPresent(m.team2.id))
            .sort((a, b) => (a.roundIndex ?? Number.MAX_SAFE_INTEGER) - (b.roundIndex ?? Number.MAX_SAFE_INTEGER));

        const reserved = new Set(busyEntryIds);
        const startable: Match[] = [];
        for (const m of pending) {
            if (reserved.has(m.team1.id) || reserved.has(m.team2.id)) continue;
            startable.push(m);
            reserved.add(m.team1.id);
            reserved.add(m.team2.id);
        }
        return startable;
    }, [matches, isEntryPresent, busyEntryIds]);

    // How many matches a group can still start now, and how many remain pending.
    const groupNextInfo = useCallback((groupId: string) => {
        const pending = matches.filter(m => m.groupId === groupId && !isMatchDone(m) && m.status !== 'in_progress');
        return { pendingCount: pending.length, availableCount: startableGroupMatches(groupId).length };
    }, [matches, startableGroupMatches]);

    // Start one specific match, chosen by the admin from the full fixture. No
    // presence check: the order on court rarely matches the listed order, so the
    // admin decides (the row already shows whether both pairs are checked in).
    const startGroupMatch = async (matchId: string) => {
        if (readOnly) return;
        const chosen = matches.find(m => m.id === matchId);
        if (!chosen || isMatchDone(chosen) || chosen.status === 'in_progress') return;

        // Una pareja jugando dos partidos a la vez rompe el resultado de los dos.
        const ocupada = [chosen.team1, chosen.team2].find(t => isEntryBusy(t.id));
        if (ocupada) {
            toast.error(`${ocupada.name.split(/[\/\+]/)[0].trim()} ya está jugando otro partido`);
            return;
        }

        const newMatches = matches.map(m => m.id === matchId ? { ...m, status: 'in_progress' } : m);
        setMatches(newMatches);

        try {
            const res = await saveFixture({
                tournamentId,
                phase: "grupos",
                groups: groups.map(g => ({ id: g.id, name: g.name, players: g.players, courtNumber: g.courtNumber ?? null })),
                matches: newMatches,
                bracket,
                presentPlayerIds: Array.from(present),
                paidPlayerIds: Array.from(paid),
                skipRevalidation: true,
            });
            if (res.ok) {
                toast.success(`Partido iniciado: ${chosen.team1.name.split("/")[0].trim()} vs ${chosen.team2.name.split("/")[0].trim()}`);
            } else {
                toast.error("Error al iniciar partido: " + res.error);
                setMatches(matches); // rollback
            }
        } catch (e) {
            console.error(e);
            toast.error("Error al iniciar el partido");
            setMatches(matches); // rollback
        }
    };

    /** Parejas del grupo, para los selectores de cada lado del partido. */
    const groupEntries = useCallback((groupId: string) =>
        groups.find(g => g.id === groupId)?.players ?? [], [groups]);

    /**
     * Guarda una nueva lista de partidos con rollback si el guardado falla.
     * Lo usan la edición de parejas y el reordenamiento del fixture.
     */
    const persistMatches = async (newMatches: Match[], errorMsg: string) => {
        const prev = matches;
        setMatches(newMatches);
        try {
            const res = await saveFixture({
                tournamentId,
                phase: "grupos",
                groups: groups.map(g => ({ id: g.id, name: g.name, players: g.players, courtNumber: g.courtNumber ?? null })),
                matches: newMatches,
                bracket,
                presentPlayerIds: Array.from(present),
                paidPlayerIds: Array.from(paid),
                skipRevalidation: true,
            });
            if (!res.ok) {
                setMatches(prev);
                toast.error(`${errorMsg}: ${res.error}`);
                return false;
            }
            return true;
        } catch (e) {
            console.error(e);
            setMatches(prev);
            toast.error(errorMsg);
            return false;
        }
    };

    /**
     * Cambia una de las parejas de un partido pendiente. Se permite elegir
     * cualquier pareja del grupo: puede romper el todos-contra-todos (cruces
     * repetidos o sin jugar), y de eso avisa `groupFixtureIssues`.
     */
    const updateMatchTeam = async (matchId: string, slot: 1 | 2, newTeamId: string) => {
        if (readOnly) return;
        const target = matches.find(x => x.id === matchId);
        if (!target) return;
        if (isMatchDone(target) || target.status === 'in_progress') {
            toast.error("No se pueden cambiar las parejas de un partido en juego o terminado");
            return;
        }
        const entry = groupEntries(target.groupId).find(p => p.id === newTeamId);
        if (!entry) return;

        const rival = slot === 1 ? target.team2 : target.team1;
        if (rival.id === entry.id) {
            toast.error("Una pareja no puede jugar contra sí misma");
            return;
        }

        const newMatches = matches.map(x => x.id === matchId
            ? { ...x, ...(slot === 1 ? { team1: entry } : { team2: entry }) }
            : x);
        await persistMatches(newMatches, "No se pudo cambiar la pareja");
    };

    /** Sube o baja un partido en el orden del fixture de su grupo. */
    const moveMatchOrder = async (matchId: string, dir: -1 | 1) => {
        if (readOnly) return;
        const target = matches.find(x => x.id === matchId);
        if (!target) return;

        const ordered = matches
            .filter(x => x.groupId === target.groupId)
            .sort((a, b) => (a.roundIndex ?? Number.MAX_SAFE_INTEGER) - (b.roundIndex ?? Number.MAX_SAFE_INTEGER)
                || a.id.localeCompare(b.id));

        // Se normaliza todo el grupo: los fixtures viejos tienen roundIndex en null
        // y sin eso no habría con qué ordenar.
        const posById = new Map(ordered.map((x, idx) => [x.id, idx]));

        // Sólo se reordena entre pendientes: los jugados ya pasaron y los que
        // están en cancha no se mueven de lugar.
        const pending = ordered.filter(x => !isMatchDone(x) && x.status !== 'in_progress');
        const i = pending.findIndex(x => x.id === matchId);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= pending.length) return;

        const a = pending[i];
        const b = pending[j];
        const posA = posById.get(a.id)!;
        posById.set(a.id, posById.get(b.id)!);
        posById.set(b.id, posA);

        const newMatches = matches.map(x => posById.has(x.id)
            ? { ...x, roundIndex: posById.get(x.id)! }
            : x);
        await persistMatches(newMatches, "No se pudo reordenar el fixture");
    };

    /**
     * Manda un partido pendiente al frente de la cola del grupo ("jugar primero").
     * Los pendientes conservan las posiciones que ya ocupaban en el fixture: sólo
     * se reparte quién va en cada una, así los jugados y los que están en cancha
     * no se mueven de lugar.
     */
    const moveMatchFirst = async (matchId: string) => {
        if (readOnly) return;
        const target = matches.find(x => x.id === matchId);
        if (!target) return;

        const ordered = matches
            .filter(x => x.groupId === target.groupId)
            .sort((a, b) => (a.roundIndex ?? Number.MAX_SAFE_INTEGER) - (b.roundIndex ?? Number.MAX_SAFE_INTEGER)
                || a.id.localeCompare(b.id));

        const posById = new Map(ordered.map((x, idx) => [x.id, idx]));
        const pending = ordered.filter(x => !isMatchDone(x) && x.status !== 'in_progress');
        if (pending.findIndex(x => x.id === matchId) <= 0) return;

        const slots = pending.map(x => posById.get(x.id)!);
        const reordenados = [target, ...pending.filter(x => x.id !== matchId)];
        reordenados.forEach((x, k) => posById.set(x.id, slots[k]));

        const newMatches = matches.map(x => posById.has(x.id)
            ? { ...x, roundIndex: posById.get(x.id)! }
            : x);
        await persistMatches(newMatches, "No se pudo reordenar el fixture");
    };

    /**
     * Cruces repetidos o sin jugar de un grupo. El fixture nace como un
     * todos-contra-todos perfecto; editar parejas a mano puede romperlo, así que
     * la vista muestra el aviso en vez de impedirlo.
     */
    const groupFixtureIssues = useCallback((groupId: string) => {
        const key = (a: string, b: string) => [a, b].sort().join("|");
        const gm = matches.filter(m => m.groupId === groupId);

        const count = new Map<string, number>();
        gm.forEach(m => {
            const k = key(m.team1.id, m.team2.id);
            count.set(k, (count.get(k) ?? 0) + 1);
        });

        const repeated = [...count.values()].filter(n => n > 1).length;
        const players = groupEntries(groupId);
        let missing = 0;
        for (let i = 0; i < players.length; i++) {
            for (let j = i + 1; j < players.length; j++) {
                if (!count.has(key(players[i].id, players[j].id))) missing++;
            }
        }
        return { repeated, missing };
    }, [matches, groupEntries]);

    // Start every pending match of a group whose pairs are present, in one save.
    // Asks first: starting a whole group at once is the opposite of the on-demand
    // flow, and an accidental click used to leave every match live.
    const startAllGroupMatches = (groupId: string) => {
        if (readOnly) return;
        const { availableCount } = groupNextInfo(groupId);
        if (availableCount === 0) {
            toast.error("No hay partidos disponibles: revisá que las parejas estén presentes y que no estén jugando.");
            return;
        }
        const groupName = groups.find(g => g.id === groupId)?.name || "el grupo";
        setConfirmModal({
            open: true,
            title: `Iniciar todos (${availableCount})`,
            description: `Se van a iniciar los ${availableCount} partidos disponibles de ${groupName} al mismo tiempo. Si querés jugarlos de a uno, usá "Comenzar siguiente".`,
            variant: 'primary',
            onConfirm: () => {
                setConfirmModal(prev => ({ ...prev, open: false }));
                void runStartAllGroupMatches(groupId);
            }
        });
    };

    const runStartAllGroupMatches = async (groupId: string) => {
        if (readOnly) return;
        const toStart = startableGroupMatches(groupId);
        if (toStart.length === 0) {
            toast.error("No hay partidos disponibles: revisá que las parejas estén presentes y que no estén jugando.");
            return;
        }
        const ids = new Set(toStart.map(m => m.id));
        const newMatches = matches.map(m => ids.has(m.id) ? { ...m, status: 'in_progress' } : m);
        setMatches(newMatches);
        try {
            const res = await saveFixture({
                tournamentId,
                phase: "grupos",
                groups: groups.map(g => ({ id: g.id, name: g.name, players: g.players, courtNumber: g.courtNumber ?? null })),
                matches: newMatches,
                bracket,
                presentPlayerIds: Array.from(present),
                paidPlayerIds: Array.from(paid),
                skipRevalidation: true,
            });
            if (res.ok) {
                toast.success(`${toStart.length} partido${toStart.length === 1 ? "" : "s"} iniciado${toStart.length === 1 ? "" : "s"}`);
            } else {
                toast.error("Error al iniciar partidos: " + res.error);
                setMatches(matches); // rollback
            }
        } catch (e) {
            console.error(e);
            toast.error("Error al iniciar los partidos");
            setMatches(matches); // rollback
        }
    };

    // ── Undo an accidental start ──────────────────────────────────────────────
    // A live match with no points loaded can go back to 'pending': it disappears
    // from the fixture again and vuelve a la cola de "Comenzar siguiente".
    const isMatchCancellable = (m: Match) =>
        m.status === 'in_progress' && !isMatchDone(m) && !m.score1 && !m.score2;

    const groupLiveInfo = useCallback((groupId: string) => {
        const cancellable = matches.filter(m => m.groupId === groupId && isMatchCancellable(m));
        return { cancellableCount: cancellable.length };
    }, [matches]);

    const persistCancelled = async (ids: Set<string>, label: string) => {
        const newMatches = matches.map(m =>
            ids.has(m.id) ? { ...m, status: 'pending', played: false, score1: 0, score2: 0 } : m
        );
        setMatches(newMatches);
        try {
            const res = await saveFixture({
                tournamentId,
                phase: "grupos",
                groups: groups.map(g => ({ id: g.id, name: g.name, players: g.players, courtNumber: g.courtNumber ?? null })),
                matches: newMatches,
                bracket,
                presentPlayerIds: Array.from(present),
                paidPlayerIds: Array.from(paid),
                skipRevalidation: true,
            });
            if (res.ok) {
                toast.success(label);
            } else {
                toast.error("Error al deshacer: " + res.error);
                setMatches(matches); // rollback
            }
        } catch (e) {
            console.error(e);
            toast.error("Error al deshacer el inicio");
            setMatches(matches); // rollback
        }
    };

    const cancelGroupMatch = async (matchId: string) => {
        if (readOnly) return;
        const match = matches.find(m => m.id === matchId);
        if (!match || !isMatchCancellable(match)) return;
        await persistCancelled(new Set([matchId]), "Partido devuelto a pendiente");
    };

    const cancelAllGroupMatches = (groupId: string) => {
        if (readOnly) return;
        const toCancel = matches.filter(m => m.groupId === groupId && isMatchCancellable(m));
        if (toCancel.length === 0) return;
        const groupName = groups.find(g => g.id === groupId)?.name || "el grupo";
        setConfirmModal({
            open: true,
            title: `Deshacer inicio (${toCancel.length})`,
            description: `Se van a devolver a pendiente los ${toCancel.length} partidos iniciados sin puntos de ${groupName}. Vuelven a la cola de "Comenzar siguiente".`,
            variant: 'primary',
            onConfirm: () => {
                setConfirmModal(prev => ({ ...prev, open: false }));
                void persistCancelled(new Set(toCancel.map(m => m.id)), `${toCancel.length} partidos devueltos a pendiente`);
            }
        });
    };

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
            team1: (bm.team1 && typeof bm.team1 !== "string" && (bm.team1 as Player).id === oldPlayerId) ? { ...newPlayer } as BracketSlot : bm.team1,
            team2: (bm.team2 && typeof bm.team2 !== "string" && (bm.team2 as Player).id === oldPlayerId) ? { ...newPlayer } as BracketSlot : bm.team2,
        }));

        setGroups(updatedGroups);
        setMatches(updatedMatches);
        setBracket(updatedBracket);

        const updatedPresent = new Set(present);
        if (updatedPresent.has(oldPlayerId)) {
            updatedPresent.delete(oldPlayerId);
            updatedPresent.add(newPlayer.id);
        }
        const updatedPaid = new Set(paid);
        if (updatedPaid.has(oldPlayerId)) {
            updatedPaid.delete(oldPlayerId);
            updatedPaid.add(newPlayer.id);
        }
        setPresent(updatedPresent);
        lastSavedState.current.present = updatedPresent;
        setPaid(updatedPaid);
        lastSavedState.current.paid = updatedPaid;

        setReplacingPlayer(null);
        setGuestName("");
        setGuestName2("");
        setReplaceSlot(1);

        if (step !== "setup") {
            const loadingToast = toast.loading("Actualizando participantes...");
            try {
                const res = await saveFixture({
                    tournamentId,
                    phase: step === "elim" ? "eliminatorias" : "grupos",
                    groups: updatedGroups.map(g => ({ id: g.id, name: g.name, players: g.players, courtNumber: g.courtNumber ?? null })),
                    matches: updatedMatches,
                    bracket: updatedBracket,
                    presentPlayerIds: Array.from(updatedPresent),
                    paidPlayerIds: Array.from(updatedPaid)
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
        } else {
            toast.success("Participante reemplazado");
        }
    };

    const handleReplaceOneInPair = async (oldPlayer: Player, newPlayerName: string, slot: 1 | 2) => {
        const names = oldPlayer.name.split("/").map(n => n.trim());
        let p1 = names[0] || oldPlayer.player1 || "Jugador 1";
        let p2 = names[1] || oldPlayer.player2 || "Jugador 2";

        if (slot === 1) p1 = newPlayerName;
        else p2 = newPlayerName;

        const updatedPlayer: Player = {
            ...oldPlayer,
            name: `${p1} / ${p2}`,
            player1: p1,
            player2: p2,
        };

        await handleReplacePlayer(oldPlayer.id, updatedPlayer);
    };

    const handleReplaceWithGuest = async (oldPlayerId: string) => {
        if (!isIndividual) {
            const oldPlayer = groups.flatMap(g => g.players).find(p => p.id === oldPlayerId);
            if (!oldPlayer) return;
            const names = oldPlayer.name.split("/").map(n => n.trim());
            let g1 = guestName.trim() || names[0] || "Jugador 1";
            let g2 = guestName2.trim() || names[1] || "Jugador 2";
            const guestPlayer: Player = {
                id: oldPlayerId,
                name: `${g1} / ${g2}`,
                player1: g1,
                player2: g2,
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

    const handleDeletePlayer = async (playerId: string) => {
        const updatedGroups = groups.map(group => ({
            ...group,
            players: group.players.filter(p => p.id !== playerId)
        }));
        const updatedMatches = matches.filter(m =>
            m.team1.id !== playerId && m.team2.id !== playerId
        );
        const updatedPresent = new Set(present);
        updatedPresent.delete(playerId);
        const updatedPaid = new Set(paid);
        updatedPaid.delete(playerId);

        setGroups(updatedGroups);
        setMatches(updatedMatches);
        setPresent(updatedPresent);
        lastSavedState.current.present = updatedPresent;
        setPaid(updatedPaid);
        lastSavedState.current.paid = updatedPaid;
        setPlayerToDelete(null);
        toast.success("Participante eliminado");

        if (step !== "setup") {
            setSaving(true);
            try {
                const res = await saveFixture({
                    tournamentId,
                    phase: step === "elim" ? "eliminatorias" : "grupos",
                    groups: updatedGroups.map(g => ({ id: g.id, name: g.name, players: g.players, courtNumber: g.courtNumber ?? null })),
                    matches: updatedMatches,
                    bracket,
                    presentPlayerIds: Array.from(updatedPresent),
                    paidPlayerIds: Array.from(updatedPaid),
                });
                if (!res.ok) toast.error("Error al guardar cambios: " + res.error);
            } finally {
                setSaving(false);
            }
        }
    };

    const computeStandings = useCallback((groupId: string) => {
        const group = groups.find(g => g.id === groupId);
        if (!group) return [];
        const groupMatches = matches.filter(m => m.groupId === groupId && m.confirmed);
        const parsedPlayers = Array.isArray(group.players)
            ? group.players
            : typeof group.players === 'string'
                ? (() => { try { return JSON.parse(group.players as string); } catch { return []; } })()
                : [];
        const playersArray: Player[] = Array.isArray(parsedPlayers) ? parsedPlayers : [];

        // Núcleo extraído a @/lib/matchmaking (probado en /dev/test-matchmaking).
        return computeGroupStandings(playersArray, groupMatches as unknown as StMatch<Player>[]);
    }, [groups, matches]);

    const isGroupFinished = useCallback((groupId: string) => {
        const groupMatches = matches.filter(m => m.groupId === groupId);
        return groupMatches.length > 0 && groupMatches.every(m => m.confirmed);
    }, [matches]);

    const handleScoreChange = (matchId: string, s1: string, s2: string) => {
        setMatches(prev => prev.map(m => {
            if (m.id !== matchId) return m;
            return {
                ...m,
                score1: s1 === "" ? undefined : parseInt(s1, 10),
                score2: s2 === "" ? undefined : parseInt(s2, 10),
                played: s1 !== "" && s2 !== "",
            };
        }));
    };

    const handleConfirmScore = async (matchIdOrIds: string | string[]) => {
        const matchIds = Array.isArray(matchIdOrIds) ? matchIdOrIds : [matchIdOrIds];
        const matchesToConfirm = matches.filter(m => matchIds.includes(m.id));
        if (matchesToConfirm.length === 0) return;

        let hasTies = false;
        for (const match of matchesToConfirm) {
            const s1 = (match.score1 === undefined || match.score1 === null) ? 0 : match.score1;
            const s2 = (match.score2 === undefined || match.score2 === null) ? 0 : match.score2;
            if (s1 === s2) {
                toast.error(`Empate no permitido: ${match.team1?.name.split("/")[0]} vs ${match.team2?.name.split("/")[0]}`);
                hasTies = true;
            }
        }

        if (hasTies) return; // Abort if any ties are found
        
        const updatedMatches = matches.map(m => {
            if (matchIds.includes(m.id)) {
                const s1 = (m.score1 === undefined || m.score1 === null) ? 0 : m.score1;
                const s2 = (m.score2 === undefined || m.score2 === null) ? 0 : m.score2;
                return { ...m, score1: s1, score2: s2, confirmed: true, status: 'completed' };
            }
            return m;
        });

        const loadingToast = toast.loading(matchIds.length > 1 ? "Guardando resultados..." : "Guardando resultado...");
        setSaving(true);
        try {
            const res = await saveFixture({
                tournamentId,
                phase: "grupos",
                groups: groups.map(g => ({ id: g.id, name: g.name, players: g.players, courtNumber: g.courtNumber ?? null })),
                matches: updatedMatches,
                bracket: bracket,
                presentPlayerIds: Array.from(present),
                paidPlayerIds: Array.from(paid),
                skipRevalidation: true
            });
            toast.dismiss(loadingToast);
            if (res.ok) {
                setMatches(updatedMatches);
                toast.success(matchIds.length > 1 ? "Marcadores guardados" : "Marcador guardado");
            } else {
                toast.error("Error al guardar: " + res.error);
            }
        } catch (err) {
            toast.dismiss(loadingToast);
            toast.error("Error inesperado al guardar marcador");
        } finally {
            setSaving(false);
        }
    };

    const handleReopenMatch = async (id: string) => {
        setConfirmModal({
            open: true,
            title: "Reabrir Partido",
            description: "¿Estás seguro de que deseas reabrir este partido? Se quitará el estado de finalizado y podrás volver a iniciarlo o editar los puntos.",
            variant: 'primary',
            onConfirm: async () => {
                const isBracketMatch = bracket.some(m => m.id === id);
                let newMatches = [...matches];
                let newBracket = [...bracket];

                if (isBracketMatch) {
                    // We set status to 'in_progress' to avoid immediate auto-confirmation if it's a BYE match
                    newBracket = bracket.map(m => m.id === id ? { ...m, status: 'in_progress', confirmed: false, winnerId: undefined, winnerName: undefined, score1: 0, score2: 0 } : m);
                    const totalRounds = newBracket.length > 0 ? Math.max(...newBracket.map(m => m.round)) + 1 : 0;
                    newBracket = computeAdvancedBracket(newBracket, totalRounds);
                    setBracket(newBracket);
                } else {
                    newMatches = matches.map(m => m.id === id ? { ...m, status: 'in_progress', confirmed: false, score1: 0, score2: 0 } : m);
                    setMatches(newMatches);
                }
                
                setConfirmModal(prev => ({ ...prev, open: false }));

                try {
                    const res = await saveFixture({
                        tournamentId,
                        phase: step === "elim" ? "eliminatorias" : "grupos",
                        groups: groups.map(g => ({ id: g.id, name: g.name, players: g.players, courtNumber: g.courtNumber ?? null })),
                        matches: newMatches,
                        bracket: newBracket,
                        presentPlayerIds: Array.from(present),
                        paidPlayerIds: Array.from(paid),
                        skipRevalidation: true
                    });
                    if (res.ok) {
                        toast.success("Partido reabierto correctamente");
                    } else {
                        toast.error("Error al reabrir partido: " + res.error);
                    }
                } catch (err) {
                    console.error(err);
                    toast.error("Error al guardar en el servidor");
                }
            }
        });
    };

    const handleSimulateResults = async () => {
        const newMatches = matches.map(m => {
            if (m.confirmed) return m;
            let s1 = Math.floor(Math.random() * 8);
            let s2 = Math.floor(Math.random() * 8);
            if (s1 === s2) s2 = s1 === 7 ? 6 : s1 + 1;
            return { ...m, score1: s1, score2: s2, played: true, confirmed: true, status: 'completed' };
        });
        setMatches(newMatches);
        setSaving(true);
        try {
            const res = await saveFixture({
                tournamentId,
                phase: "grupos",
                groups: groups.map(g => ({ id: g.id, name: g.name, players: g.players, courtNumber: g.courtNumber ?? null })),
                matches: newMatches,
                bracket,
                presentPlayerIds: Array.from(present),
                paidPlayerIds: Array.from(paid),
                skipRevalidation: true
            });
            if (res.ok) {
                toast.success("Resultados simulados y guardados");
            } else {
                toast.error("Error al guardar resultados simulados: " + res.error);
            }
        } finally {
            setSaving(false);
        }
    };

    const finalQualifiers = useMemo(() => {
        const quals: any[] = [];
        // Only consider groups that have players
        const activeGroups = groups.filter(g => {
            const players = Array.isArray(g.players) ? g.players : [];
            return players.length > 0;
        });

        activeGroups.forEach((g, groupIdx) => {
            const finished = isGroupFinished(g.id) || isGroupStageFinished;
            const groupStandings = computeStandings(g.id);
            // Sanitize group name for placeholders (avoid UUIDs)
            const displayGroupName = (g.name && g.name.length < 10) ? g.name.toUpperCase() : String.fromCharCode(65 + groupIdx);
            const groupLabel = displayGroupName.includes('GRUPO') ? displayGroupName : `GRUPO ${displayGroupName}`;

            const maxPlayersInAnyGroup = Math.max(...activeGroups.map(g => g.players.length), 0);
            for (let i = 0; i < maxPlayersInAnyGroup; i++) {
                if (finished) {
                    if (groupStandings[i]) {
                        const s = groupStandings[i];
                        quals.push({ 
                            playerId: s.playerId,
                            player: s.player,
                            name: s.player.name,
                            groupName: groupLabel,
                            groupId: g.id, 
                            groupRank: i + 1, 
                            isPlaceholder: false,
                            matchesPlayed: s.matchesPlayed || 0,
                            won: s.won || 0,
                            lost: s.lost || 0,
                            points: s.points || 0,
                            gamesWon: s.gamesWon || 0,
                            gamesLost: s.gamesLost || 0
                        });
                    } else {
                        quals.push({ 
                            playerId: `BYE_${g.id}_${i}`, 
                            name: 'BYE', 
                            groupName: groupLabel,
                            isPlaceholder: false, 
                            isBye: true, 
                            groupRank: i + 1, 
                            groupId: g.id,
                            matchesPlayed: 0, won: 0, lost: 0, points: 0
                        });
                    }
                } else {
                    quals.push({
                        playerId: `TBD_${g.id}_${i}`,
                        player: { id: `TBD_${g.id}_${i}`, name: `${i + 1}º ${groupLabel}`, category: '' },
                        name: `${i + 1}º ${groupLabel}`,
                        groupName: groupLabel,
                        displayGroupName: displayGroupName,
                        groupId: g.id,
                        groupRank: i + 1,
                        isPlaceholder: true,
                        matchesPlayed: 0, won: 0, lost: 0, points: 0
                    });
                }
            }
        });
        // Orden de siembra extraído a @/lib/matchmaking (probado en /dev/test-matchmaking).
        return orderQualifiers(quals);
    }, [groups, matches, computeStandings, isGroupFinished, isGroupStageFinished]);

    // Tope real de clasificados: los fantasmas de los grupos cortos no son
    // parejas, así que subir el cupo por encima de este número sólo agrega BYEs
    // al cuadro.
    const maxQualLimit = useMemo(
        () => Math.max(2, countRealQualifiers(finalQualifiers)),
        [finalQualifiers]
    );

    // Cuando terminan los grupos aparecen los fantasmas y el tope baja: si el
    // cupo quedó por encima, se recorta. Sólo baja, nunca sube solo, para no
    // pisar lo que haya elegido el admin.
    useEffect(() => {
        setQualLimit(prev => Math.min(prev, maxQualLimit));
    }, [maxQualLimit]);

    // Map bracket seed placeholders ("1º GRUPO A") to the real pair that finished
    // in that group position, so the playoffs show actual names instead of labels.
    const seedNameMap = useMemo(() => {
        const map = new Map<string, string>();
        const activeGroups = groups.filter(g => (Array.isArray(g.players) ? g.players : []).length > 0);
        activeGroups.forEach((g, idx) => {
            const displayGroupName = (g.name && g.name.length < 10) ? g.name.toUpperCase() : String.fromCharCode(65 + idx);
            const groupLabel = displayGroupName.includes('GRUPO') ? displayGroupName : `GRUPO ${displayGroupName}`;
            // Sólo los grupos cerrados: mostrar al puntero de un grupo en curso
            // como si ya estuviera clasificado es información falsa.
            if (!isGroupFinished(g.id)) return;
            computeStandings(g.id).forEach((s, i) => map.set(`${groupLabel}|${i + 1}`, s.player.name));
        });
        return map;
    }, [groups, computeStandings, isGroupFinished]);

    const resolveSeedName = useCallback((name: string | null | undefined): string | null => {
        if (!name) return name ?? null;
        const mt = /^(\d+)\s*º?\s*(GRUPO\s+.+)$/i.exec(name.trim());
        if (!mt) return name;
        const real = seedNameMap.get(`${mt[2].toUpperCase().replace(/\s+/g, ' ').trim()}|${parseInt(mt[1], 10)}`);
        return real || name;
    }, [seedNameMap]);

    // Bracket for DISPLAY: same ids/structure but placeholder names resolved to
    // the real pairs. Handlers keep using the real `bracket` (keyed by id).
    const resolvedBracket = useMemo(() => bracket.map(m => {
        const fixSlot = (slot: any) =>
            (slot && typeof slot !== 'string' && slot.name) ? { ...slot, name: resolveSeedName(slot.name) } : slot;
        return { ...m, team1: fixSlot(m.team1), team2: fixSlot(m.team2), winnerName: resolveSeedName(m.winnerName) ?? undefined };
    }), [bracket, resolveSeedName]);

    // Propagación de ganadores y BYEs extraída a @/lib/matchmaking.
    function computeAdvancedBracket(currentBracket: BracketMatch[], totalRounds: number): BracketMatch[] {
        return advanceBracket(currentBracket as any, totalRounds) as BracketMatch[];
    }

    /**
     * Un cuadro armado antes de que cierren los grupos guarda slots con id
     * "TBD_<grupo>_<puesto>". Cuando ese grupo termina hay que reemplazarlos por
     * la pareja real: si quedaran, el cuadro mostraría nombres provisorios y el
     * ganador se guardaría con un id que no corresponde a ninguna inscripción
     * (y el reparto de puntos de ranking no lo encontraría).
     */
    const resolveBracketSlot = useCallback((slot: BracketSlot): BracketSlot => {
        if (!slot || slot === "BYE") return slot;
        const mt = TBD_SLOT_RE.exec((slot as Player).id ?? "");
        if (!mt) return slot;
        const [, groupId, rankStr] = mt;
        if (!isGroupFinished(groupId)) return slot;
        // El grupo cerró con menos parejas que el más grande: ese puesto era un hueco.
        const standing = computeStandings(groupId)[Number(rankStr)];
        return standing ? (standing.player as BracketSlot) : "BYE";
    }, [isGroupFinished, computeStandings]);

    /** Clasificados del cuadro que todavía dependen de un grupo en curso. */
    const bracketHasPending = useCallback((m: BracketMatch) =>
        [m.team1, m.team2].some(t => t && t !== "BYE" && TBD_SLOT_RE.test((t as Player).id ?? "")),
        []);

    // A medida que cierra cada grupo, sus clasificados entran solos al cuadro.
    // Es lo que permite mandar llaves a cancha sin esperar a que termine la fase.
    const resolvingBracketRef = useRef(false);
    useEffect(() => {
        if (readOnly || bracket.length === 0 || resolvingBracketRef.current) return;

        let changed = false;
        const next = bracket.map(m => {
            const team1 = resolveBracketSlot(m.team1);
            const team2 = resolveBracketSlot(m.team2);
            if (team1 === m.team1 && team2 === m.team2) return m;
            changed = true;
            return { ...m, team1, team2 };
        });
        if (!changed) return;

        resolvingBracketRef.current = true;
        const totalRounds = Math.max(...next.map(m => m.round)) + 1;
        const finalBracket = computeAdvancedBracket(next, totalRounds);
        setBracket(finalBracket);
        void saveFixture({
            tournamentId,
            phase: "eliminatorias",
            groups,
            matches,
            bracket: finalBracket,
            presentPlayerIds: Array.from(present),
            paidPlayerIds: Array.from(paid),
            skipRevalidation: true,
        })
            .then(res => { if (res.ok) toast.success("Clasificados actualizados en las llaves"); })
            .finally(() => { resolvingBracketRef.current = false; });
        // `matches`/`groups` van al saveFixture pero no disparan el efecto: lo que
        // importa es que cambie el bracket o el estado de los grupos.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bracket, resolveBracketSlot, readOnly]);

    /** Arma el cuadro desde cero con los clasificados actuales. */
    const runGenerateBracket = async () => {
        const actualQualifiers = finalQualifiers.slice(0, qualLimit);
        const totalQuals = actualQualifiers.length;
        if (totalQuals < 2) {
            toast.error("Se necesitan al menos 2 clasificados para generar las llaves");
            return;
        }

        const numRounds = Math.ceil(Math.log2(totalQuals));
        const bracketSize = Math.pow(2, numRounds);
        setSaving(true);

        try {
            let newBracket: BracketMatch[] = [];
            for (let r = 0; r < numRounds; r++) {
                for (let s = 0; s < Math.pow(2, r); s++) {
                    newBracket.push({ id: `b_${r}_${s}`, round: r, slot: s, team1: null, team2: null, confirmed: false });
                }
            }

            // ── Group Protection Seeding ──
            // Orden de seeds + protección de grupo extraídos a @/lib/matchmaking.
            const seedPositions = getSeedingOrder(bracketSize);
            const seedMap = buildSeedMap(toSeedInput(actualQualifiers));

            const firstRoundIdx = numRounds - 1;
            const firstRoundMatches = newBracket.filter(m => m.round === firstRoundIdx);

            firstRoundMatches.forEach((m, idx) => {
                const s1 = seedPositions[idx * 2];
                const s2 = seedPositions[idx * 2 + 1];
                const q1 = seedMap.get(s1);
                const q2 = seedMap.get(s2);
                const t1 = isByeQualifier(q1) ? "BYE" : q1!.player;
                const t2 = isByeQualifier(q2) ? "BYE" : q2!.player;

                m.team1 = t1 as BracketSlot;
                m.team2 = t2 as BracketSlot;

                if (m.team1 === "BYE" || m.team2 === "BYE") {
                    m.confirmed = true;
                    const winner = m.team1 === "BYE" ? m.team2 : m.team1;
                    if (winner && winner !== "BYE") {
                        m.winnerId = (winner as Player).id;
                        m.winnerName = (winner as Player).name;
                    }
                }
            });

            const finalBracket = computeAdvancedBracket(newBracket, numRounds);
            const res = await saveFixture({
                tournamentId, phase: "eliminatorias", groups, matches, bracket: finalBracket, 
                presentPlayerIds: Array.from(present),
                paidPlayerIds: Array.from(paid)
            });

            if (res.ok) {
                setBracket(finalBracket);
                setStep("elim");
                toast.success("Cuadro generado correctamente");
            } else {
                toast.error("Error al guardar: " + res.error);
            }
        } catch (e) {
            console.error(e);
            toast.error("Error al generar cuadro");
        } finally {
            setSaving(false);
        }
    };

    /**
     * Rearmar el cuadro borra los resultados de las llaves ya jugadas, así que
     * pide confirmación — pero sólo cuando hay algo que perder. La primera vez no
     * hay cuadro y el aviso no tenía sentido.
     *
     * Ojo: NO hace falta rearmar para que entren los clasificados de un grupo que
     * recién cerró; eso se resuelve solo. Rearmar es para cambiar el cupo de
     * clasificados o rehacer un sorteo mal armado.
     */
    const handleGenerateBracket = async () => {
        if (bracket.length === 0) {
            await runGenerateBracket();
            return;
        }

        const jugadas = bracket.filter(m => m.confirmed || m.status === 'finished' || m.status === 'completed').length;
        setConfirmModal({
            open: true,
            title: "Rearmar el cuadro",
            description: jugadas > 0
                ? `Se va a armar un cuadro nuevo con los clasificados actuales y se pierden los resultados de ${jugadas} llave${jugadas === 1 ? "" : "s"} ya jugada${jugadas === 1 ? "" : "s"}. Para que entren los clasificados de un grupo que recién terminó no hace falta rearmar: se actualizan solos.`
                : "Se va a armar un cuadro nuevo con los clasificados actuales. Para que entren los clasificados de un grupo que recién terminó no hace falta rearmar: se actualizan solos.",
            variant: jugadas > 0 ? 'danger' : 'primary',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, open: false }));
                await runGenerateBracket();
            }
        });
    };

    const handleSwapPlayers = async (matchId: string, teamSlot: 1 | 2) => {
        if (readOnly) return;
        
        if (!swappingPlayer) {
            setSwappingPlayer({ matchId, teamSlot });
            toast.info("Seleccionado para intercambiar. Haz clic en otro jugador para completar el cambio.");
            return;
        }

        if (swappingPlayer.matchId === matchId && swappingPlayer.teamSlot === teamSlot) {
            setSwappingPlayer(null);
            toast.info("Intercambio cancelado");
            return;
        }

        const matchA = bracket.find(m => m.id === swappingPlayer.matchId);
        const matchB = bracket.find(m => m.id === matchId);

        if (!matchA || !matchB) {
            setSwappingPlayer(null);
            return;
        }

        const playerA = swappingPlayer.teamSlot === 1 ? matchA.team1 : matchA.team2;
        const playerB = teamSlot === 1 ? matchB.team1 : matchB.team2;

        const newBracket = bracket.map(m => {
            let nm = { ...m };
            if (m.id === swappingPlayer.matchId) {
                if (swappingPlayer.teamSlot === 1) nm.team1 = playerB;
                else nm.team2 = playerB;
            }
            if (m.id === matchId) {
                if (teamSlot === 1) nm.team1 = playerA;
                else nm.team2 = playerA;
            }
            return nm;
        });

        // Recompute all rounds to handle propagation
        const totalRounds = newBracket.length > 0 ? Math.max(...newBracket.map(m => m.round)) + 1 : 0;
        const finalBracket = computeAdvancedBracket(newBracket, totalRounds);

        setBracket(finalBracket);
        setSwappingPlayer(null);

        const loadingToast = toast.loading("Guardando cambios de posición...");
        setSaving(true);
        try {
            const res = await saveFixture({
                tournamentId,
                phase: "eliminatorias",
                groups,
                matches,
                bracket: finalBracket,
                presentPlayerIds: Array.from(present),
                paidPlayerIds: Array.from(paid),
            });
            toast.dismiss(loadingToast);
            if (res.ok) {
                toast.success("Posiciones intercambiadas");
            } else {
                toast.error("Error al guardar cambios: " + res.error);
            }
        } catch (err) {
            toast.dismiss(loadingToast);
            toast.error("Error al guardar cambios en el servidor");
        } finally {
            setSaving(false);
        }
    };

    const handleBracketStart = async (matchId: string) => {
        const target = bracket.find(m => m.id === matchId);
        if (target && bracketHasPending(target)) {
            toast.error("Falta definir un clasificado: ese grupo todavía no terminó");
            return;
        }
        const updated = bracket.map(m => m.id === matchId ? { ...m, status: 'in_progress' } : m);
        setBracket(updated);
        setSaving(true);
        try {
            const res = await saveFixture({
                tournamentId,
                phase: "eliminatorias",
                groups, matches, bracket: updated,
                presentPlayerIds: Array.from(present),
                paidPlayerIds: Array.from(paid),
                skipRevalidation: true
            });
            if (!res.ok) {
                setBracket(bracket);
                toast.error("Error al iniciar partido: " + res.error);
            }
        } finally {
            setSaving(false);
        }
    };

    const handleBracketScore = (matchId: string, s1: string, s2: string) => {
        if (readOnly) return;
        setBracket(prev => prev.map(m => {
            if (m.id !== matchId || m.confirmed) return m;
            return {
                ...m,
                score1: s1 === "" ? 0 : parseInt(s1, 10),
                score2: s2 === "" ? 0 : parseInt(s2, 10),
            };
        }));
    };

    const handleBracketConfirm = async (matchId: string) => {
        const targetMatch = bracket.find(m => m.id === matchId);
        if (!targetMatch) return;

        if (targetMatch.score1 == null || targetMatch.score2 == null) {
            toast.error("Debes ingresar ambos puntajes para finalizar el partido");
            return;
        }

        if (targetMatch.score1 === targetMatch.score2) {
            toast.error("No se permiten empates en llaves de eliminación");
            return;
        }
        const updated = bracket.map(m => {
            if (m.id !== matchId) return m; // Return exactly the same object to preserve status
            const winner = m.score1! > m.score2! ? m.team1 : m.team2;
            const winnerId = (winner as Player)?.id;
            const winnerName = (winner as Player)?.name;
            return { ...m, confirmed: true, winnerId, winnerName, status: 'completed' };
        });

        const totalRounds = updated.length > 0 ? Math.max(...updated.map(m => m.round)) + 1 : 0;
        const finalBracket = computeAdvancedBracket(updated, totalRounds);
        
        // Ensure we preserve the 'in_progress' status of any match that was already started
        const preservedBracket = finalBracket.map(m => {
            const original = bracket.find(ob => ob.id === m.id);
            if (original?.status === 'in_progress' && !m.confirmed) {
                return { ...m, status: 'in_progress' };
            }
            return m;
        });

        setBracket(preservedBracket);
        setSaving(true);
        const match = finalBracket.find(m => m.id === matchId);
        const isFinal = match?.round === 0;
        const championName = isFinal ? (match?.winnerName || "Campeón") : undefined;
        try {
            const res = await saveFixture({
                tournamentId,
                phase: "eliminatorias",
                groups, matches, bracket: preservedBracket, championName, 
                presentPlayerIds: Array.from(present),
                paidPlayerIds: Array.from(paid),
                skipRevalidation: true // Keep it on the dashboard without automatic redirects
            });
            if (res.ok) {
                toast.success("Resultado guardado");
            } else {
                toast.error("Error al guardar: " + res.error);
            }
        } catch (err) { 
            console.error(err);
            toast.error("Error al guardar"); 
        } finally { 
            setSaving(false); 
        }
    };

    const roundsArr = useMemo(() => {
        const rounds = bracket.map(m => m.round);
        return Array.from(new Set(rounds)).sort((a, b) => b - a);
    }, [bracket]);

    const roundLabel = (r: number) => {
        if (r === 0) return "Final 🏆";
        if (r === 1) return "Semifinal";
        if (r === 2) return "Cuartos";
        if (r === 3) return "Octavos";
        return `Ronda ${roundsArr.length - r}`;
    };

    const fetchPlayers = useCallback(async () => {
        setIsFetchLoading(true);
        const players = await getAllPlayers();
        setAllPotentialPlayers(players);
        setIsFetchLoading(false);
    }, []);

    useEffect(() => {
        if (replacingPlayer) {
            fetchPlayers();
            const names = replacingPlayer.name.split("/").map(n => n.trim());
            setGuestName(names[0] || "");
            setGuestName2(names[1] || "");
            setPlayerSearchQuery("");
        }
    }, [replacingPlayer, fetchPlayers]);

    useEffect(() => {
        setGroups(initialGroups);
        
        // Intelligent sync for Group matches
        setMatches(prev => {
            return initialMatches.map(newM => {
                const localM = prev.find(pm => pm.id === newM.id);
                if (localM?.status === 'in_progress' && !newM.confirmed) {
                    return { ...newM, status: 'in_progress' };
                }
                return newM;
            });
        });
        
        // Intelligent sync: preserve 'in_progress' status for matches currently active in UI
        setBracket(prev => {
            return initialBracket.map(newM => {
                const localM = prev.find(pm => pm.id === newM.id);
                // If local match is in_progress but server says it's pending/other (not confirmed), keep in_progress
                if (localM?.status === 'in_progress' && !newM.confirmed) {
                    return { ...newM, status: 'in_progress' };
                }
                return newM;
            });
        });
        
        // Only update present/paid if they differ from our last intended state
        const safePresent = ensureArray(initialPresent);
        const pArray = Array.from(lastSavedState.current.present);
        const hasPresentChanged = JSON.stringify(pArray.sort()) !== JSON.stringify([...safePresent].sort());
        if (hasPresentChanged) {
            setPresent(new Set(safePresent));
            lastSavedState.current.present = new Set(safePresent);
        }

        const safePaid = ensureArray(initialPaid);
        const paidArray = Array.from(lastSavedState.current.paid);
        const hasPaidChanged = JSON.stringify(paidArray.sort()) !== JSON.stringify([...safePaid].sort());
        if (hasPaidChanged) {
            setPaid(new Set(safePaid));
            lastSavedState.current.paid = new Set(safePaid);
        }
    }, [initialGroups, initialMatches, initialBracket, initialPresent, initialPaid]);

    const autoSaveTimeout = useRef<NodeJS.Timeout | null>(null);
    const lastAutoSaveHash = useRef("");

    useEffect(() => {
        if (readOnly || step === "setup") return;
        const currentHash = JSON.stringify({
            m: matches.map(m=>[m.id, m.score1, m.score2, m.status, m.confirmed]),
            b: bracket.map(b=>[b.id, b.score1, b.score2, b.status, b.confirmed]),
            // La cancha del grupo ya no entra acá: se guarda con su propio botón
            // (saveGroupCourt) y no tiene sentido disparar un guardado completo.
        });
        if (lastAutoSaveHash.current === currentHash) return;
        
        // Skip auto-save on the very first render if we just mapped initial data
        if (!lastAutoSaveHash.current) {
            lastAutoSaveHash.current = currentHash;
            return;
        }

        if (autoSaveTimeout.current) clearTimeout(autoSaveTimeout.current);
        autoSaveTimeout.current = setTimeout(async () => {
            try {
                lastAutoSaveHash.current = currentHash;
                await saveFixture({
                    tournamentId,
                    phase: step !== "elim" ? "grupos" : "eliminatorias",
                    groups, matches, bracket,
                    presentPlayerIds: Array.from(present),
                    paidPlayerIds: Array.from(paid),
                    skipRevalidation: true
                });
            } catch (e) { console.error("Auto-save failed", e); }
        }, 1500);
    }, [matches, bracket, tournamentId, step, groups, present, paid, readOnly]);

    useEffect(() => {
        if (readOnly || step === "setup" || step === "elim") return;
        if (finalQualifiers.length < 2) return;
        // Improved check to stop syncing if the bracket has started or if it was manually modified
        const bracketHasStarted = bracket.some(m => 
            (m.confirmed && m.team1 !== "BYE" && m.team2 !== "BYE") || 
            m.status === 'in_progress' ||
            ((m.score1 !== undefined && m.score1 !== 0) || (m.score2 !== undefined && m.score2 !== 0))
        );
        if (bracketHasStarted) return;
        
        const actualQuals = finalQualifiers.slice(0, qualLimit);
        const totalQuals = actualQuals.length;
        if (totalQuals < 2) return;

        const numRounds = Math.ceil(Math.log2(totalQuals));
        const bracketSize = Math.pow(2, numRounds);

        setBracket(prev => {
            let newBracket: BracketMatch[] = [];
            const existingRounds = new Set(prev.map(m => m.round));
            // Force recreation if size changes or if it was empty
            const needsRecreation = prev.length === 0 || (existingRounds.size > 0 && existingRounds.size !== numRounds);

            if (needsRecreation) {
                for (let r = 0; r < numRounds; r++) {
                    for (let s = 0; s < Math.pow(2, r); s++) {
                        newBracket.push({ id: `b_${r}_${s}`, round: r, slot: s, team1: null, team2: null, confirmed: false });
                    }
                }
            } else {
                newBracket = prev.map(m => ({ ...m }));
            }

            const seedPositions = getSeedingOrder(bracketSize);
            const firstRoundIdx = numRounds - 1;
            const firstRoundMatches = newBracket.filter(m => m.round === firstRoundIdx);

            // Protección de grupo extraída a @/lib/matchmaking.
            const seedMap = buildSeedMap(toSeedInput(actualQuals));

            for (let i = 0; i < seedPositions.length; i += 2) {
                const mIdx = i / 2;
                const s1 = seedPositions[i];
                const s2 = seedPositions[i + 1];

                const q1 = seedMap.get(s1);
                const q2 = seedMap.get(s2);

                const t1 = isByeQualifier(q1) ? "BYE" : q1!.player;
                const t2 = isByeQualifier(q2) ? "BYE" : q2!.player;

                const m = firstRoundMatches.find(x => x.slot === mIdx);
                if (m) {
                    m.team1 = t1 as BracketSlot;
                    m.team2 = t2 as BracketSlot;
                    
                    // Reset or Set confirmation based on BYEs
                    if (m.team1 === "BYE" || m.team2 === "BYE") {
                        const realTeam = m.team1 === "BYE" ? m.team2 : m.team1;
                        const isRealPlayer = !isDoubleBye(m) && realTeam
                            && !(realTeam as any).isPlaceholder && !(realTeam as any).id?.startsWith('TBD');

                        if (isDoubleBye(m)) {
                            // Se da por jugado sin ganador; computeAdvancedBracket
                            // sube el BYE a la ronda siguiente.
                            m.confirmed = true;
                            m.winnerId = undefined;
                            m.winnerName = undefined;
                        } else if (isRealPlayer) {
                            m.confirmed = true;
                            m.winnerId = (realTeam as Player).id;
                            m.winnerName = (realTeam as Player).name;
                        } else {
                            m.confirmed = false;
                            m.winnerId = undefined;
                            m.winnerName = undefined;
                        }
                    } else {
                        m.confirmed = false;
                        m.winnerId = undefined;
                        m.winnerName = undefined;
                    }
                }
            }
            return computeAdvancedBracket(newBracket, numRounds);
        });
    }, [finalQualifiers, qualLimit, readOnly, step]);

    return {
        // State
        step, setStep,
        groups, setGroups, saveGroupCourt,
        matches, setMatches,
        bracket, setBracket,
        resolvedBracket,
        bracketHasPending,
        present, setPresent,
        paid, setPaid,
        isPlayersModalOpen, setIsPlayersModalOpen,
        playerSearchQuery, setPlayerSearchQuery,
        replacingPlayer, setReplacingPlayer,
        playerToDelete, setPlayerToDelete,
        allPotentialPlayers,
        isFetchLoading,
        guestName, setGuestName,
        guestName2, setGuestName2,
        replaceSlot, setReplaceSlot,
        isRefreshing,
        showSuccessModal, setShowSuccessModal,
        saving,
        searchQuery, setSearchQuery,
        confirmModal, setConfirmModal,
        qualLimit, setQualLimit, maxQualLimit,
        finalQualifiers,
        
        // Memos
        allPlayers,
        filteredPlayers,
        isGroupStageFinished,
        progressPercent,
        confirmedGroupMatches,
        totalGroupMatches,
        roundsArr,
        
        // Handlers
        handleRefresh,
        handleReplacePlayer,
        handleReplaceOneInPair,
        handleReplaceWithGuest,
        handleDeletePlayer,
        computeStandings,
        handleScoreChange,
        handleConfirmScore,
        handleReopenMatch,
        handleSimulateResults,
        handleGenerateBracket,
        handleBracketStart,
        handleBracketScore,
        handleBracketConfirm,
        handleSwapPlayers,
        swappingPlayer,
        roundLabel,
        isIndividual,
        bulkUpdateStatus,
        isEntryPresent,
        isEntryBusy,
        groupEntries,
        updateMatchTeam,
        moveMatchOrder,
        moveMatchFirst,
        groupFixtureIssues,
        isEntryPaid,
        isMemberPresent,
        isMemberPaid,
        toggleMemberPresent,
        toggleMemberPaid,
        isGroupChecked,
        toggleGroupChecked,
        groupNextInfo,
        startGroupMatch,
        startAllGroupMatches,
        groupLiveInfo,
        cancelGroupMatch,
        cancelAllGroupMatches
    };
}
