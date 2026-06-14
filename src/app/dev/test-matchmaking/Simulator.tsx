"use client";

// ─────────────────────────────────────────────────────────────────────────────
// SIMULADOR DE EVENTOS — 100% configurable.
//
// El admin arma un evento (tipo, género, jugadores, clubes, lados, individual/
// parejas), corre el generador REAL (@/lib/matchmaking) y obtiene:
//   - el armado (equipos / rondas / grupos / llave + campeón)
//   - un diagnóstico contextual que explica si cada criterio se cumplió y,
//     cuando no, POR QUÉ (restricción inevitable vs problema real).
// No toca la base de datos.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import {
    pickOcMatch, type OcCompletedMatch, type OcMode,
    generateAmericanoMatches,
    distributeIntoGroups,
    computeGroupStandings, type StMatch,
    computeFirstRoundPairs,
} from "@/lib/matchmaking";

type Side = "drive" | "reves" | "ambos";
type Gender = "masculino" | "femenino";
type EventType = "cancha_abierta" | "americano" | "round_robin";

type SimPlayer = { id: string; name: string; club: string; side: Side; gender: Gender };

type Diag = { status: "pass" | "warn" | "fail"; text: string; detail?: string };

const CLUBS = ["Águilas", "Pumas", "Tigres", "Lobos", "Halcones", "Cóndores"];
const NAMES = ["Martín", "Lucas", "Diego", "Pablo", "Javier", "Nico", "Tomás", "Andrés", "Seba", "Bruno", "Gonza", "Fede", "Ana", "Sofi", "Caro", "Vale", "Lu", "Pao", "Meli", "Romi", "Joa", "Mati", "Igna", "Tian"];

// RNG determinista (mulberry32) para que un mismo "sorteo" sea reproducible
function makeRng(seed: number) {
    return () => {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const nextPow2 = (n: number) => { let p = 1; while (p < n) p *= 2; return Math.max(2, p); };

type SideCounts = { drive: number; reves: number; ambos: number };
const sideTotal = (s: SideCounts) => Math.max(0, s.drive) + Math.max(0, s.reves) + Math.max(0, s.ambos);

function buildRoster(opts: {
    numClubs: number; pctWomen: number; sideCounts: SideCounts; isPairs: boolean; seed: number;
}): SimPlayer[] {
    const rng = makeRng(opts.seed);
    const clubs = CLUBS.slice(0, Math.max(1, opts.numClubs));

    // El roster se arma con las cantidades exactas de cada lado.
    const { drive, reves, ambos } = opts.sideCounts;
    const sides: Side[] = [
        ...Array(Math.max(0, drive)).fill("drive" as Side),
        ...Array(Math.max(0, reves)).fill("reves" as Side),
        ...Array(Math.max(0, ambos)).fill("ambos" as Side),
    ];
    // Mezclar para que no queden todos los drives juntos al principio
    for (let i = sides.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [sides[i], sides[j]] = [sides[j], sides[i]]; }

    return sides.map((side, i) => ({
        id: `s${i}`,
        name: opts.isPairs ? `${NAMES[(i * 2) % NAMES.length]}/${NAMES[(i * 2 + 1) % NAMES.length]}` : (NAMES[i % NAMES.length] + (i >= NAMES.length ? ` ${Math.floor(i / NAMES.length) + 1}` : "")),
        club: clubs[i % clubs.length],
        side,
        gender: (rng() < opts.pctWomen / 100 ? "femenino" : "masculino") as Gender,
    }));
}

// ── Diagnóstico contextual por tipo de evento ──
function diagnose(eventType: EventType, roster: SimPlayer[], result: SimResult): Diag[] {
    const d: Diag[] = [];
    const clubCounts = new Map<string, number>();
    roster.forEach(p => clubCounts.set(p.club, (clubCounts.get(p.club) || 0) + 1));
    const maxClub = Math.max(0, ...clubCounts.values());

    if (eventType === "cancha_abierta" && result.kind === "cancha") {
        const teams = result.matches.flatMap(m => [m.team1, m.team2]);
        const ideal = teams.filter(t => {
            const s = [t[0].side, t[1].side];
            return (s.includes("drive") && s.includes("reves"));
        }).length;
        const dobleDrive = teams.filter(t => t[0].side === "drive" && t[1].side === "drive").length;
        d.push({
            status: dobleDrive === 0 ? "pass" : "warn",
            text: `Lados: ${ideal}/${teams.length} equipos quedaron drive+revés`,
            detail: dobleDrive > 0 ? `${dobleDrive} equipo(s) con dos drives — pasa cuando no hay revés disponible entre los 4 elegidos.` : "Ningún equipo con dos drives.",
        });
        if (result.mode === "mixto") {
            const okMix = teams.every(t => t[0].gender !== t[1].gender);
            d.push({ status: okMix ? "pass" : "fail", text: `Modo mixto: cada equipo con un hombre y una mujer`, detail: okMix ? "Todos los equipos son mixtos." : "Algún equipo no quedó mixto (no había 2+2 disponibles)." });
        } else if (result.mode === "mismo_genero") {
            const okSame = teams.every(t => t[0].gender === t[1].gender);
            d.push({ status: okSame ? "pass" : "fail", text: `Modo mismo género: cada equipo del mismo género`, detail: okSame ? "Todos los equipos son del mismo género." : "Algún equipo quedó mixto." });
        }
        d.push({ status: "pass", text: "Nota: en cancha abierta el club NO se usa para formar equipos", detail: "El club solo influye en Americano y en el armado de grupos. Acá importan lado, repetición y género." });
        if (result.leftover > 0) d.push({ status: "warn", text: `Quedaron ${result.leftover} jugador(es) sin entrar`, detail: "No alcanzaban para otra cancha (se necesitan 4) o el modo no permitía armar pareja." });
    }

    if (eventType === "americano" && result.kind === "americano") {
        const k = result.matchesPerPlayer;
        const counts = new Map<string, number>();
        roster.forEach(p => counts.set(p.id, 0));
        result.rounds.flat().forEach(m => { counts.set(m.t1.id, counts.get(m.t1.id)! + 1); counts.set(m.t2.id, counts.get(m.t2.id)! + 1); });
        const min = Math.min(...counts.values()), max = Math.max(...counts.values());
        d.push({ status: min >= k ? "pass" : "fail", text: `Todos juegan al menos ${k} partido(s)`, detail: `Mínimo ${min}, máximo ${max}. ${max > k ? "Alguien juega 1 de más porque el reparto exacto era imposible (cantidad impar)." : "Reparto exacto."}` });

        const byId = new Map(roster.map(p => [p.id, p]));
        const sameClub = result.rounds.flat().filter(m => { const a = byId.get(m.t1.id)!, b = byId.get(m.t2.id)!; return a.club === b.club; }).length;
        const unavoidable = maxClub * 2 > roster.length;
        d.push({
            status: sameClub === 0 ? "pass" : "warn",
            text: `Parejas del mismo club: ${sameClub}`,
            detail: sameClub === 0 ? "Ninguna pareja comparte club." : unavoidable
                ? `Inevitable: el club más grande tiene ${maxClub} de ${roster.length} jugadores (más de la mitad), así que algunas parejas comparten club a la fuerza.`
                : "Evitar el mismo club es a mejor esfuerzo. En este sorteo quedó alguna pareja igual aunque se podía evitar; probá 'Re-sortear' — casi siempre queda en 0.",
        });

        const dup = result.rounds.some(r => { const ids = r.flatMap(m => [m.t1.id, m.t2.id]); return new Set(ids).size !== ids.length; });
        d.push({ status: dup ? "fail" : "pass", text: "Nadie juega dos veces en la misma ronda", detail: dup ? "Hay repetición dentro de una ronda." : "Cada ronda sin repetidos." });
        const overflow = result.rounds.some(r => r.length > result.numCourts);
        d.push({ status: overflow ? "fail" : "pass", text: `No se superan las ${result.numCourts} canchas por ronda` });
    }

    if (eventType === "round_robin" && result.kind === "round_robin") {
        // Balance de clubes en grupos
        let worst = 0;
        result.groups.forEach(g => {
            const c = new Map<string, number>();
            g.players.forEach(p => c.set(p.club, (c.get(p.club) || 0) + 1));
            worst = Math.max(worst, ...c.values());
        });
        const clubUnavoidable = maxClub > result.groups.length;
        d.push({
            status: worst <= 1 ? "pass" : "warn",
            text: `Balance de clubes: a lo sumo ${worst} del mismo club por grupo`,
            detail: worst <= 1 ? "Cada grupo tiene jugadores de clubes distintos." : clubUnavoidable
                ? `Inevitable: un club tiene ${maxClub} jugadores y hay ${result.groups.length} grupos (no entran de a uno por grupo).`
                : "El reparto es a mejor esfuerzo: en este sorteo quedaron 2 del mismo club juntos aunque se podía evitar. Probá 'Re-sortear' — suele mejorar.",
        });
        // Protección de grupo en primera ronda
        const clash = result.firstRound.some(p => p.q1 && p.q2 && p.q1.groupId === p.q2.groupId);
        d.push({ status: clash ? "fail" : "pass", text: "Protección de grupo: nadie enfrenta a un compañero de grupo en 1ª ronda", detail: clash ? "Hay un cruce de mismo grupo en cuartos." : "Todos los cruces de 1ª ronda son entre grupos distintos." });
        // Tamaño de llave
        d.push({ status: "pass", text: `Llave de ${result.bracketSize} (${result.qualifiers} clasificados)`, detail: result.byes > 0 ? `${result.byes} BYE(s) porque los clasificados no son potencia de 2.` : "Sin BYEs." });
    }

    return d;
}

// ── Tipos de resultado ──
type OcTeam = [SimPlayer, SimPlayer];
type SimResult =
    | { kind: "cancha"; mode: OcMode; matches: { team1: OcTeam; team2: OcTeam }[]; leftover: number }
    | { kind: "americano"; matchesPerPlayer: number; numCourts: number; rounds: { t1: SimPlayer; t2: SimPlayer; court: number }[][] }
    | {
        kind: "round_robin";
        groups: {
            name: string; players: SimPlayer[];
            matches: { id: string; a: SimPlayer; b: SimPlayer; sa: number; sb: number }[];
            rows: { pos: number; p: SimPlayer; won: number; lost: number; diff: number; qual: boolean }[];
        }[];
        firstRound: { seed1: number; seed2: number; q1?: { player: SimPlayer; groupId: string; groupRank: number }; q2?: { player: SimPlayer; groupId: string; groupRank: number } }[];
        bracketRounds: { title: string; matches: { a?: SimPlayer; b?: SimPlayer; sa: number; sb: number }[] }[];
        champion?: SimPlayer; bracketSize: number; qualifiers: number; byes: number;
    }
    | { kind: "error"; message: string };

// ── Motor de simulación ──
function simulate(eventType: EventType, roster: SimPlayer[], cfg: {
    mode: OcMode; matchesPerPlayer: number; numCourts: number; numGroups: number; qualifiersPerGroup: number; seed: number;
}): SimResult {
    const rng = makeRng(cfg.seed);

    if (eventType === "cancha_abierta") {
        if (roster.length < 4) return { kind: "error", message: "Se necesitan al menos 4 jugadores." };
        const available = [...roster];
        const completed: OcCompletedMatch[] = [];
        const matches: { team1: OcTeam; team2: OcTeam }[] = [];
        for (let court = 0; court < cfg.numCourts && available.length >= 4; court++) {
            const r = pickOcMatch(available as any, completed, cfg.mode);
            if (!r.ok || !r.team1 || !r.team2) break;
            const chosen = new Set([r.team1[0].id, r.team1[1].id, r.team2[0].id, r.team2[1].id]);
            for (let i = available.length - 1; i >= 0; i--) if (chosen.has(available[i].id)) available.splice(i, 1);
            matches.push({ team1: r.team1 as unknown as OcTeam, team2: r.team2 as unknown as OcTeam });
            completed.push({
                team1Player1Id: (r.team1[0] as SimPlayer).id, team1Player2Id: (r.team1[1] as SimPlayer).id,
                team2Player1Id: (r.team2[0] as SimPlayer).id, team2Player2Id: (r.team2[1] as SimPlayer).id, status: "completed",
            });
        }
        if (matches.length === 0) return { kind: "error", message: cfg.mode === "mixto" ? "No hay 2 hombres y 2 mujeres para un mixto." : cfg.mode === "mismo_genero" ? "No se pueden formar parejas del mismo género." : "No se pudo armar ningún partido." };
        return { kind: "cancha", mode: cfg.mode, matches, leftover: available.length };
    }

    if (eventType === "americano") {
        if (roster.length < 2) return { kind: "error", message: "Se necesitan al menos 2 participantes." };
        const sched = generateAmericanoMatches(roster, cfg.matchesPerPlayer, cfg.numCourts, { rng });
        const byId = new Map(roster.map(p => [p.id, p]));
        const roundsMap = new Map<number, { t1: SimPlayer; t2: SimPlayer; court: number }[]>();
        sched.forEach(m => {
            const arr = roundsMap.get(m.roundIndex) || [];
            arr.push({ t1: byId.get(m.team1.id)!, t2: byId.get(m.team2.id)!, court: m.courtNumber });
            roundsMap.set(m.roundIndex, arr);
        });
        const rounds = Array.from(roundsMap.keys()).sort((a, b) => a - b).map(k => roundsMap.get(k)!);
        return { kind: "americano", matchesPerPlayer: cfg.matchesPerPlayer, numCourts: cfg.numCourts, rounds };
    }

    // round_robin se resuelve en el componente (necesita scores editables)
    return { kind: "error", message: "internal" };
}

// ── Round Robin: estructura, scores y resolución (scores inyectables) ──
type RRGroup = { name: string; players: SimPlayer[] };
type RRFixture = { id: string; group: string; a: SimPlayer; b: SimPlayer };
type RRBuild = { error?: string; groups: RRGroup[]; fixtures: RRFixture[]; strength: Map<string, number> };
type ScoreOf = (fixtureId: string) => { sa: number; sb: number };

function buildRoundRobin(roster: SimPlayer[], numGroups: number, seed: number): RRBuild {
    if (roster.length < numGroups * 2) return { error: `Pocos jugadores para ${numGroups} grupos (mínimo 2 por grupo).`, groups: [], fixtures: [], strength: new Map() };
    const rng = makeRng(seed);
    const playersPerGroup = Math.ceil(roster.length / numGroups);
    const groups: RRGroup[] = distributeIntoGroups(roster, numGroups, playersPerGroup, { rng }).map((g, i) => ({ name: `Grupo ${String.fromCharCode(65 + i)}`, players: g.players }));
    const fixtures: RRFixture[] = [];
    groups.forEach(g => {
        for (let i = 0; i < g.players.length; i++)
            for (let j = i + 1; j < g.players.length; j++)
                fixtures.push({ id: `${g.name}|${g.players[i].id}|${g.players[j].id}`, group: g.name, a: g.players[i], b: g.players[j] });
    });
    const strength = new Map<string, number>();
    roster.forEach(p => strength.set(p.id, rng()));
    return { groups, fixtures, strength };
}

// Scores automáticos a partir de la "fuerza" de cada jugador
function autoScores(rr: RRBuild): Record<string, { sa: number; sb: number }> {
    const sc: Record<string, { sa: number; sb: number }> = {};
    rr.fixtures.forEach(f => {
        const sa = rr.strength.get(f.a.id)!, sb = rr.strength.get(f.b.id)!;
        const aWins = sa >= sb;
        const loser = Math.max(0, Math.min(5, Math.round(6 * (aWins ? sb / sa : sa / sb)) - 1));
        sc[f.id] = aWins ? { sa: 6, sb: loser } : { sa: loser, sb: 6 };
    });
    return sc;
}

// Resuelve grupos → posiciones → llave → campeón, usando los scores dados
function resolveRoundRobin(rr: RRBuild, scoreOf: ScoreOf, qualifiersPerGroup: number): SimResult {
    if (rr.error) return { kind: "error", message: rr.error };

    type Row = { pos: number; p: SimPlayer; won: number; lost: number; diff: number; qual: boolean };
    type Q = { player: SimPlayer; groupId: string; groupRank: number };
    const outGroups: { name: string; players: SimPlayer[]; matches: { id: string; a: SimPlayer; b: SimPlayer; sa: number; sb: number }[]; rows: Row[] }[] = [];
    const quals: Q[] = [];

    rr.groups.forEach(g => {
        const fx = rr.fixtures.filter(f => f.group === g.name);
        const ms: StMatch<SimPlayer>[] = fx.map(f => { const s = scoreOf(f.id); return { team1: f.a, team2: f.b, score1: s.sa, score2: s.sb, confirmed: true }; });
        const table = computeGroupStandings(g.players, ms);
        const rows: Row[] = table.map((s, i) => ({ pos: i + 1, p: s.player as SimPlayer, won: s.won, lost: s.lost, diff: s.points, qual: i < qualifiersPerGroup }));
        outGroups.push({ name: g.name, players: g.players, matches: fx.map(f => { const s = scoreOf(f.id); return { id: f.id, a: f.a, b: f.b, sa: s.sa, sb: s.sb }; }), rows });
        table.slice(0, qualifiersPerGroup).forEach((s, i) => quals.push({ player: s.player as SimPlayer, groupId: g.name, groupRank: i + 1 }));
    });

    const orderedQuals = [...quals].sort((a, b) => a.groupRank - b.groupRank);
    const bracketSize = nextPow2(orderedQuals.length);
    const pairs = computeFirstRoundPairs(orderedQuals, bracketSize);
    const byes = pairs.filter(p => !p.q1 || !p.q2).length;

    // Llave: gana el de mayor fuerza (BYE avanza al presente)
    const playByStrength = (a: SimPlayer, b: SimPlayer) => {
        const sa = rr.strength.get(a.id) ?? 0, sb = rr.strength.get(b.id) ?? 0;
        const aWins = sa >= sb;
        const loser = Math.max(0, Math.min(5, Math.round(6 * (aWins ? sb / sa : sa / sb)) - 1));
        return aWins ? { s1: 6, s2: loser } : { s1: loser, s2: 6 };
    };
    type W = Q | undefined;
    const bracketRounds: { title: string; matches: { a?: SimPlayer; b?: SimPlayer; sa: number; sb: number }[] }[] = [];
    const roundName = (n: number) => n === 1 ? "Final" : n === 2 ? "Semifinales" : n === 4 ? "Cuartos de final" : n === 8 ? "Octavos" : `Ronda de ${n * 2}`;

    let current: W[] = [];
    const r1: { a?: SimPlayer; b?: SimPlayer; sa: number; sb: number }[] = [];
    pairs.forEach(p => {
        const q1 = p.q1 as W, q2 = p.q2 as W;
        let winner: W; let sa = 0, sb = 0;
        if (q1 && q2) { const r = playByStrength(q1.player, q2.player); sa = r.s1; sb = r.s2; winner = r.s1 > r.s2 ? q1 : q2; } else winner = q1 || q2;
        r1.push({ a: q1?.player, b: q2?.player, sa, sb });
        current.push(winner);
    });
    bracketRounds.push({ title: roundName(pairs.length), matches: r1 });
    while (current.length > 1) {
        const next: W[] = [];
        const ms2: { a?: SimPlayer; b?: SimPlayer; sa: number; sb: number }[] = [];
        for (let i = 0; i < current.length; i += 2) {
            const q1 = current[i], q2 = current[i + 1];
            let winner: W; let sa = 0, sb = 0;
            if (q1 && q2) { const r = playByStrength(q1.player, q2.player); sa = r.s1; sb = r.s2; winner = r.s1 > r.s2 ? q1 : q2; } else winner = q1 || q2;
            ms2.push({ a: q1?.player, b: q2?.player, sa, sb });
            next.push(winner);
        }
        bracketRounds.push({ title: roundName(ms2.length), matches: ms2 });
        current = next;
    }

    return {
        kind: "round_robin", groups: outGroups,
        firstRound: pairs.map(p => ({ seed1: p.seed1, seed2: p.seed2, q1: p.q1 as W, q2: p.q2 as W })),
        bracketRounds, champion: current[0]?.player, bracketSize, qualifiers: orderedQuals.length, byes,
    };
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE
// ════════════════════════════════════════════════════════════════════════════
export default function Simulator() {
    const [eventType, setEventType] = useState<EventType>("round_robin");
    const [numClubs, setNumClubs] = useState(4);
    const [pctWomen, setPctWomen] = useState(0);
    const [sideCounts, setSideCounts] = useState<SideCounts>({ drive: 5, reves: 5, ambos: 2 });
    const [isPairs, setIsPairs] = useState(false);
    const [mode, setMode] = useState<OcMode>("libre");
    const [matchesPerPlayer, setMatchesPerPlayer] = useState(3);
    const [numCourts, setNumCourts] = useState(3);
    const [numGroups, setNumGroups] = useState(4);
    const [qualifiersPerGroup, setQualifiersPerGroup] = useState(2);
    const [rosterSeed, setRosterSeed] = useState(1);
    const [simSeed, setSimSeed] = useState(1);
    const [override, setOverride] = useState<SimPlayer[] | null>(null);
    const [resultMode, setResultMode] = useState<"auto" | "manual">("auto");
    const [manualScores, setManualScores] = useState<Record<string, { sa: number; sb: number }>>({});
    const [isResorting, setIsResorting] = useState(false);
    const [isRegen, setIsRegen] = useState(false);

    const total = sideTotal(sideCounts);
    const generatedRoster = useMemo(
        () => buildRoster({ numClubs, pctWomen, sideCounts, isPairs, seed: rosterSeed }),
        [numClubs, pctWomen, sideCounts, isPairs, rosterSeed]
    );
    const roster = override ?? generatedRoster;

    // Al cambiar cualquier perilla de generación, descartar la edición manual
    // para que la nueva config se aplique (la edición a mano es un ajuste fino posterior).
    useEffect(() => { setOverride(null); }, [numClubs, pctWomen, sideCounts, isPairs]);

    const isRR = eventType === "round_robin";

    // Round robin: estructura + scores automáticos. Los manuales (editables)
    // tienen prioridad cuando el modo es "manual".
    const rr = useMemo(() => isRR ? buildRoundRobin(roster, numGroups, simSeed) : null, [isRR, roster, numGroups, simSeed]);
    const auto = useMemo(() => (rr && !rr.error ? autoScores(rr) : {}), [rr]);
    const scoreOf = useMemo<ScoreOf>(
        () => (id) => resultMode === "auto" ? (auto[id] ?? { sa: 0, sb: 0 }) : (manualScores[id] ?? auto[id] ?? { sa: 0, sb: 0 }),
        [resultMode, auto, manualScores]
    );

    // Al re-sortear o cambiar la cantidad de grupos, descartar los resultados manuales.
    useEffect(() => { setManualScores({}); }, [simSeed, numGroups]);

    const setScore = (id: string, sa: number, sb: number) => {
        setResultMode("manual");
        setManualScores(prev => ({ ...prev, [id]: { sa, sb } }));
    };

    const result = useMemo<SimResult>(
        () => isRR
            ? (rr && !rr.error ? resolveRoundRobin(rr, scoreOf, qualifiersPerGroup) : { kind: "error", message: rr?.error ?? "error" })
            : simulate(eventType, roster, { mode, matchesPerPlayer, numCourts, numGroups, qualifiersPerGroup, seed: simSeed }),
        [isRR, rr, scoreOf, qualifiersPerGroup, eventType, roster, mode, matchesPerPlayer, numCourts, numGroups, simSeed]
    );
    const diags = result.kind === "error" ? [] : diagnose(eventType, roster, result);

    const editPlayer = (id: string, patch: Partial<SimPlayer>) => {
        setOverride((roster).map(p => p.id === id ? { ...p, ...patch } : p));
    };
    const addPlayer = () => {
        const newP: SimPlayer = { id: `s_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, name: "Nuevo jugador", club: CLUBS[0], side: "ambos", gender: "masculino" };
        setOverride([...roster, newP]);
    };
    const removePlayer = (id: string) => setOverride(roster.filter(p => p.id !== id));
    const regenRoster = () => {
        if (isRegen) return;
        setIsRegen(true);
        setTimeout(() => { setOverride(null); setRosterSeed(s => s + 1); setIsRegen(false); }, 450);
    };
    const reSim = () => {
        if (isResorting) return;
        setIsResorting(true);
        setTimeout(() => { setSimSeed(s => s + 1); setIsResorting(false); }, 450);
    };

    const applyPreset = (preset: string) => {
        setOverride(null);
        switch (preset) {
            case "mismo_club": setNumClubs(1); setRosterSeed(s => s + 1); break;
            case "impares": setSideCounts({ drive: 5, reves: 5, ambos: 3 }); setRosterSeed(s => s + 1); break; // suma 13 (impar)
            case "todos_drive": setSideCounts(s => ({ drive: sideTotal(s), reves: 0, ambos: 0 })); setEventType("cancha_abierta"); setRosterSeed(s => s + 1); break;
            case "una_mujer": setPctWomen(0); setMode("mixto"); setEventType("cancha_abierta"); setRosterSeed(s => s + 1); break;
        }
    };

    const clubColors: Record<string, string> = {};
    CLUBS.forEach((c, i) => { clubColors[c] = ["text-celeste", "text-rojo", "text-amber-500", "text-emerald-500", "text-purple-500", "text-pink-500"][i]; });

    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
                Armá un evento como quieras y corré el simulador. Abajo vas a ver el armado real y un <strong className="text-foreground">diagnóstico</strong> que explica si cada criterio se cumplió (y por qué, si no).
            </p>

            {/* Presets */}
            <div className="flex flex-wrap gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground self-center">Casos límite:</span>
                {[["mismo_club", "Todos mismo club"], ["impares", "Jugadores impares"], ["todos_drive", "Todos drive (cancha abierta)"], ["una_mujer", "Mixto sin mujeres"]].map(([k, label]) => (
                    <button key={k} onClick={() => applyPreset(k)} className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20">
                        {label}
                    </button>
                ))}
            </div>

            {/* Config */}
            <div className="border border-border/40 rounded-xl p-3 bg-muted/10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
                <Field label="Tipo de evento">
                    <Select value={eventType} onChange={v => setEventType(v as EventType)} options={[["round_robin", "Round Robin (grupos + llave)"], ["americano", "Americano"], ["cancha_abierta", "Cancha Abierta"]]} />
                </Field>
                <Field label={`${isPairs && eventType !== "cancha_abierta" ? "Parejas" : "Jugadores"} (= suma de lados)`}>
                    <div className="px-2 py-1.5 text-xs font-black text-celeste border border-border/50 rounded-lg bg-muted/20">{total}</div>
                </Field>
                <Field label="Clubes">
                    <NumberInput value={numClubs} min={1} max={CLUBS.length} onChange={setNumClubs} />
                </Field>

                {eventType === "cancha_abierta" && (
                    <Field label="Modo (género)">
                        <Select value={mode} onChange={v => setMode(v as OcMode)} options={[["libre", "Libre"], ["mixto", "Mixto (H+M)"], ["mismo_genero", "Mismo género"]]} />
                    </Field>
                )}
                {(mode === "mixto" || mode === "mismo_genero" || pctWomen > 0 || eventType === "cancha_abierta") && (
                    <Field label="% mujeres">
                        <NumberInput value={pctWomen} min={0} max={100} step={10} onChange={setPctWomen} />
                    </Field>
                )}
                <Field label="Drive"><NumberInput value={sideCounts.drive} min={0} max={32} onChange={v => setSideCounts(s => ({ ...s, drive: v }))} /></Field>
                <Field label="Revés"><NumberInput value={sideCounts.reves} min={0} max={32} onChange={v => setSideCounts(s => ({ ...s, reves: v }))} /></Field>
                <Field label="Ambos"><NumberInput value={sideCounts.ambos} min={0} max={32} onChange={v => setSideCounts(s => ({ ...s, ambos: v }))} /></Field>

                {eventType !== "cancha_abierta" && (
                    <Field label="Individual / Parejas">
                        <Select value={isPairs ? "pairs" : "ind"} onChange={v => setIsPairs(v === "pairs")} options={[["ind", "Individual"], ["pairs", "Parejas"]]} />
                    </Field>
                )}
                {eventType === "americano" && (<>
                    <Field label="Partidos por jugador"><NumberInput value={matchesPerPlayer} min={1} max={10} onChange={setMatchesPerPlayer} /></Field>
                    <Field label="Canchas"><NumberInput value={numCourts} min={1} max={10} onChange={setNumCourts} /></Field>
                </>)}
                {eventType === "cancha_abierta" && (
                    <Field label="Canchas"><NumberInput value={numCourts} min={1} max={10} onChange={setNumCourts} /></Field>
                )}
                {eventType === "round_robin" && (<>
                    <Field label="Grupos"><NumberInput value={numGroups} min={1} max={8} onChange={setNumGroups} /></Field>
                    <Field label="Clasifican x grupo"><NumberInput value={qualifiersPerGroup} min={1} max={4} onChange={setQualifiersPerGroup} /></Field>
                </>)}
            </div>

            <div className="flex gap-2 items-center">
                <button onClick={regenRoster} disabled={isRegen}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest bg-celeste text-white hover:opacity-90 disabled:opacity-60 disabled:cursor-wait">
                    {isRegen && <Spinner />}{isRegen ? "Regenerando…" : "Regenerar jugadores"}
                </button>
                <button onClick={reSim} disabled={isResorting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest bg-muted/40 border border-border/40 hover:bg-muted/60 disabled:opacity-60 disabled:cursor-wait">
                    {isResorting && <Spinner />}{isResorting ? "Resorteando…" : "Re-sortear"}
                </button>
                {(isResorting || isRegen) && <span className="text-[10px] text-celeste font-black uppercase tracking-widest animate-pulse">● en proceso</span>}
                {override && !isRegen && <span className="text-[10px] text-amber-500 self-center font-bold uppercase">Roster editado a mano</span>}
            </div>

            {/* Dos columnas: izquierda controles+roster+diagnóstico · derecha resultado */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            <div className="lg:col-span-1 space-y-4">

            {/* Roster editable */}
            <div className="border border-border/40 rounded-xl bg-muted/10 p-3">
                <div className="flex items-center justify-between mb-2">
                    <div className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                        Roster ({roster.length}) — editá a mano: nombre, club, lado, género
                    </div>
                    <button onClick={addPlayer} className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-celeste/10 text-celeste border border-celeste/30 hover:bg-celeste/20">
                        + Agregar
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-[11px]">
                        <thead>
                            <tr className="text-[9px] font-black uppercase tracking-wider text-muted-foreground text-left">
                                <th className="py-1 pr-2">{isPairs && eventType !== "cancha_abierta" ? "Pareja" : "Jugador"}</th>
                                <th className="py-1 pr-2">Club</th>
                                {showSidesCol(eventType) && <th className="py-1 pr-2">Lado</th>}
                                <th className="py-1 pr-2">Género</th>
                                <th className="py-1 w-6"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {roster.map(p => (
                                <tr key={p.id} className="border-t border-border/30">
                                    <td className="py-1 pr-2">
                                        <input type="text" value={p.name} onChange={e => editPlayer(p.id, { name: e.target.value })}
                                            className="bg-transparent border border-border/40 rounded px-1 py-0.5 w-full min-w-[7rem] text-foreground/80" />
                                    </td>
                                    <td className="py-1 pr-2">
                                        <select value={p.club} onChange={e => editPlayer(p.id, { club: e.target.value })} className="bg-transparent border border-border/40 rounded px-1 py-0.5">
                                            {CLUBS.slice(0, numClubs).map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </td>
                                    {showSidesCol(eventType) && (
                                        <td className="py-1 pr-2">
                                            <select value={p.side} onChange={e => editPlayer(p.id, { side: e.target.value as Side })} className="bg-transparent border border-border/40 rounded px-1 py-0.5">
                                                {["drive", "reves", "ambos"].map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </td>
                                    )}
                                    <td className="py-1 pr-2">
                                        <select value={p.gender} onChange={e => editPlayer(p.id, { gender: e.target.value as Gender })} className="bg-transparent border border-border/40 rounded px-1 py-0.5">
                                            <option value="masculino">M</option><option value="femenino">F</option>
                                        </select>
                                    </td>
                                    <td className="py-1">
                                        <button onClick={() => removePlayer(p.id)} title="Quitar" className="text-rojo/70 hover:text-rojo font-black px-1">×</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Diagnóstico */}
            {diags.length > 0 && (
                <div className="space-y-1.5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Diagnóstico</div>
                    {diags.map((c, i) => (
                        <div key={i} className={`flex items-start gap-3 p-2.5 rounded-lg border ${c.status === "pass" ? "border-emerald-500/20 bg-emerald-500/5" : c.status === "warn" ? "border-amber-500/30 bg-amber-500/5" : "border-rojo/30 bg-rojo/5"}`}>
                            <span className={`text-sm font-black shrink-0 ${c.status === "pass" ? "text-emerald-500" : c.status === "warn" ? "text-amber-500" : "text-rojo"}`}>{c.status === "pass" ? "✓" : c.status === "warn" ? "⚠" : "✗"}</span>
                            <div className="min-w-0">
                                <div className="text-sm text-foreground/90">{c.text}</div>
                                {c.detail && <div className="text-[11px] text-muted-foreground mt-0.5">{c.detail}</div>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            </div>{/* fin columna izquierda */}

            <div className="lg:col-span-2 space-y-4">
            {/* Resultado */}
            {isRR ? (
                <>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Resultados:</span>
                        {(["auto", "manual"] as const).map(m => (
                            <button key={m} onClick={() => setResultMode(m)}
                                className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${resultMode === m ? "bg-celeste text-white border-celeste" : "bg-muted/30 text-foreground/70 border-border/40 hover:bg-muted/50"}`}>
                                {m === "auto" ? "Automático" : "Manual (editable)"}
                            </button>
                        ))}
                        <span className="text-[10px] text-muted-foreground">
                            {resultMode === "auto" ? "Resultados simulados por nivel. Tocá 'Re-sortear' para otra simulación." : "Editá los games de cada partido; las posiciones se recalculan solas."}
                        </span>
                    </div>
                    <RoundRobinView result={result} editable={resultMode === "manual"} onEdit={setScore} clubColors={clubColors} />
                </>
            ) : (
                <ResultView result={result} clubColors={clubColors} showSides={eventType === "cancha_abierta"} />
            )}
            </div>{/* fin columna derecha */}
            </div>{/* fin grid dos columnas */}
        </div>
    );
}

const showSidesCol = (e: EventType) => e === "cancha_abierta";

// ── Render del resultado ──
function ResultView({ result, clubColors, showSides }: { result: SimResult; clubColors: Record<string, string>; showSides: boolean }) {
    if (result.kind === "error") {
        return <div className="p-4 rounded-xl border border-rojo/30 bg-rojo/5 text-rojo text-sm font-medium">✗ {result.message}</div>;
    }

    const pName = (p: SimPlayer) => (
        <span>{p.name}{showSides && p.side !== "ambos" && <span className="text-muted-foreground text-[9px]"> ·{p.side === "drive" ? "D" : "R"}</span>} <span className={`text-[9px] ${clubColors[p.club] || "text-muted-foreground"}`}>{p.club.slice(0, 3)}</span></span>
    );

    if (result.kind === "cancha") {
        return (
            <Box title={`Partidos armados (${result.matches.length})`}>
                {result.matches.map((m, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 text-[11px] py-1 border-t border-border/20 first:border-0">
                        <span className="flex-1 text-right">{pName(m.team1[0])} <span className="text-muted-foreground">/</span> {pName(m.team1[1])}</span>
                        <span className="text-muted-foreground text-[9px] font-black px-1">vs</span>
                        <span className="flex-1">{pName(m.team2[0])} <span className="text-muted-foreground">/</span> {pName(m.team2[1])}</span>
                    </div>
                ))}
            </Box>
        );
    }

    if (result.kind === "americano") {
        return (
            <Box title={`Americano — ${result.rounds.length} rondas`}>
                {result.rounds.map((r, i) => (
                    <div key={i} className="mb-2">
                        <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Ronda {i + 1}</div>
                        {r.map((m, j) => (
                            <div key={j} className="flex items-center justify-between gap-2 text-[11px] py-0.5">
                                <span className="flex-1 text-right">{pName(m.t1)}</span>
                                <span className="text-muted-foreground text-[9px] px-1">vs</span>
                                <span className="flex-1">{pName(m.t2)}</span>
                                <span className="text-muted-foreground text-[9px]">cancha {m.court}</span>
                            </div>
                        ))}
                    </div>
                ))}
            </Box>
        );
    }

    return null; // round_robin se renderiza con <RoundRobinView/>
}

// Etiqueta de jugador (nombre + lado opcional + club coloreado)
function pLabel(p: SimPlayer, clubColors: Record<string, string>, showSides = false) {
    return (
        <span>{p.name}{showSides && p.side !== "ambos" && <span className="text-muted-foreground text-[9px]"> ·{p.side === "drive" ? "D" : "R"}</span>} <span className={`text-[9px] ${clubColors[p.club] || "text-muted-foreground"}`}>{p.club.slice(0, 3)}</span></span>
    );
}

// ── Vista de Round Robin con resultados editables ──
function RoundRobinView({ result, editable, onEdit, clubColors }: {
    result: SimResult; editable: boolean; onEdit: (id: string, sa: number, sb: number) => void; clubColors: Record<string, string>;
}) {
    if (result.kind === "error") return <div className="p-4 rounded-xl border border-rojo/30 bg-rojo/5 text-rojo text-sm font-medium">✗ {result.message}</div>;
    if (result.kind !== "round_robin") return null;

    return (
        <div className="space-y-3">
            <Box title={`Grupos, partidos y posiciones ${editable ? "(editá los games)" : "(resultados auto-simulados)"}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {result.groups.map(g => (
                        <div key={g.name} className="border border-border/40 rounded-lg p-2">
                            <div className="text-[10px] font-black uppercase tracking-widest text-celeste mb-1">{g.name}</div>
                            {/* Partidos del grupo */}
                            <div className="mb-2 space-y-0.5">
                                {g.matches.map(m => (
                                    <div key={m.id} className="flex items-center justify-between gap-1 text-[11px]">
                                        <span className="flex-1 text-right truncate">{pLabel(m.a, clubColors)}</span>
                                        {editable ? (
                                            <span className="flex items-center gap-0.5 px-1">
                                                <ScoreInput value={m.sa} onChange={v => onEdit(m.id, v, m.sb)} />
                                                <span className="text-muted-foreground">-</span>
                                                <ScoreInput value={m.sb} onChange={v => onEdit(m.id, m.sa, v)} />
                                            </span>
                                        ) : (
                                            <span className="text-foreground/90 font-black px-2 whitespace-nowrap">{m.sa}-{m.sb}</span>
                                        )}
                                        <span className="flex-1 truncate">{pLabel(m.b, clubColors)}</span>
                                    </div>
                                ))}
                            </div>
                            {/* Posiciones */}
                            <div className="border-t border-border/30 pt-1">
                                {g.rows.map(r => (
                                    <div key={r.pos} className={`grid grid-cols-[1.5rem_1fr_2rem_3rem] gap-1 text-[11px] py-0.5 ${r.qual ? "text-emerald-500 font-bold" : "text-foreground/70"}`}>
                                        <span>{r.pos}º{r.qual ? "✓" : ""}</span><span>{pLabel(r.p, clubColors)}</span><span>{r.won}G</span><span>{r.diff > 0 ? "+" : ""}{r.diff}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </Box>
            <Box title="Llave (se arma con las posiciones de arriba)">
                {result.bracketRounds.map((br, i) => (
                    <div key={i} className="mb-2">
                        <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">{br.title}</div>
                        {br.matches.map((m, j) => {
                            const aWins = m.a && (!m.b || m.sa > m.sb);
                            return (
                                <div key={j} className="flex items-center justify-between gap-2 text-[11px] py-0.5">
                                    <span className={`flex-1 text-right ${aWins ? "text-foreground font-bold" : "text-muted-foreground"}`}>{m.a ? pLabel(m.a, clubColors) : "BYE"}</span>
                                    <span className="text-foreground/90 font-black px-2 whitespace-nowrap">{m.a && m.b ? `${m.sa}-${m.sb}` : "—"}</span>
                                    <span className={`flex-1 ${!aWins && m.b ? "text-foreground font-bold" : "text-muted-foreground"}`}>{m.b ? pLabel(m.b, clubColors) : "BYE"}</span>
                                </div>
                            );
                        })}
                    </div>
                ))}
                {result.champion && (
                    <div className="mt-2 p-3 rounded-xl bg-celeste/10 border border-celeste/30 text-center">
                        <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Campeón</div>
                        <div className="text-lg font-black italic text-celeste">🏆 {result.champion.name}</div>
                    </div>
                )}
            </Box>
        </div>
    );
}

function ScoreInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
    return (
        <input type="number" min={0} max={9} value={value}
            onFocus={e => e.target.select()}
            onChange={e => { const n = parseInt(e.target.value, 10); onChange(isNaN(n) ? 0 : Math.max(0, Math.min(9, n))); }}
            className="w-9 bg-background border border-border/50 rounded px-1 py-0.5 text-center text-[11px] text-foreground" />
    );
}

// ── UI atoms ──
function Spinner() {
    return <span className="inline-block w-3 h-3 rounded-full border-2 border-current/30 border-t-current animate-spin" />;
}
function Box({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="border border-border/40 rounded-xl p-3 bg-muted/20">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">{title}</div>
            {children}
        </div>
    );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="flex flex-col gap-1">
            <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">{label}</span>
            {children}
        </label>
    );
}
function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
    return (
        <select value={value} onChange={e => onChange(e.target.value)} className="bg-background border border-border/50 rounded-lg px-2 py-1.5 text-xs text-foreground">
            {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
    );
}
function NumberInput({ value, onChange, min, max, step = 1 }: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number }) {
    // Estado de texto local: permite escribir libremente (incluso vacío o fuera de
    // rango momentáneamente) y solo recorta al rango cuando se sale del campo.
    const [text, setText] = useState(String(value));
    useEffect(() => { setText(String(value)); }, [value]);

    const commit = (raw: string) => {
        const n = parseInt(raw, 10);
        const clamped = isNaN(n) ? value : Math.max(min, Math.min(max, n));
        setText(String(clamped));
        if (clamped !== value) onChange(clamped);
    };

    return (
        <input type="number" value={text} min={min} max={max} step={step}
            onChange={e => {
                setText(e.target.value);
                const n = parseInt(e.target.value, 10);
                // Propagar en vivo solo si ya es un número válido dentro del rango
                if (!isNaN(n) && n >= min && n <= max) onChange(n);
            }}
            onBlur={e => commit(e.target.value)}
            className="bg-background border border-border/50 rounded-lg px-2 py-1.5 text-xs text-foreground w-full" />
    );
}
