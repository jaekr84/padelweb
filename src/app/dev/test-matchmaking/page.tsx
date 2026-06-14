"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Página de verificación de criterios de armado de partidos y llaves.
//
// Corre tests sobre el MISMO código que usa la app en producción
// (importado desde @/lib/matchmaking), generando jugadores sintéticos.
// No toca la base de datos. Ruta: /dev/test-matchmaking
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from "react";
import {
    pickBestOcCombo, pickOcMatch, positionalPenalty, ocSide, ocId,
    type OcPlayer, type OcCompletedMatch, type OcMode,
    generateAmericanoMatches, type AmPlayer,
    distributeIntoGroups, type GrPlayer,
    getSeedingOrder, buildSeedMap, computeFirstRoundPairs,
    computeGroupStandings, type StMatch,
} from "@/lib/matchmaking";
import Simulator from "./Simulator";

// ── Tipos del runner ──
type Severity = "pass" | "fail" | "warn";
type Check = { name: string; status: Severity; detail?: string };
type Suite = { checks: Check[]; sample?: React.ReactNode };

const ok = (name: string, pass: boolean, detail?: string): Check => ({ name, status: pass ? "pass" : "fail", detail });

// ── Helpers de generación sintética ──
let _id = 0;
const nid = (p = "p") => `${p}_${++_id}`;

function ocPlayer(side: string, gender?: string, id?: string): OcPlayer & { name: string } {
    return { id: id ?? nid("oc"), name: id ?? `J${_id}`, sidePreference: side, gender };
}

// ============================================================================
// 1. CANCHA ABIERTA
// ============================================================================
function runOpenCourt(): Suite {
    const checks: Check[] = [];

    // 1a. Drive + Revés ideal: 2 drives + 2 revés → cada equipo queda mixto drive/revés
    {
        const A = ocPlayer("drive", undefined, "A");
        const B = ocPlayer("drive", undefined, "B");
        const C = ocPlayer("reves", undefined, "C");
        const D = ocPlayer("reves", undefined, "D");
        const r = pickBestOcCombo([A, B, C, D], [], "libre");
        const team1Sides = [ocSide(r.team1![0]), ocSide(r.team1![1])].sort();
        const team2Sides = [ocSide(r.team2![0]), ocSide(r.team2![1])].sort();
        const balanced =
            team1Sides.join() === ["drive", "reves"].join() &&
            team2Sides.join() === ["drive", "reves"].join();
        checks.push(ok(
            "Drive+Revés: empareja cada drive con un revés",
            balanced,
            `Equipo1=${team1Sides.join("+")}, Equipo2=${team2Sides.join("+")} · penalidad=${r.penalty}`
        ));
        checks.push(ok(
            "La combinación ideal tiene penalidad negativa (bonus)",
            (r.penalty ?? 0) < 0,
            `penalidad=${r.penalty}`
        ));
    }

    // 1b. Penalidad posicional cruda
    {
        const drive = ocPlayer("drive");
        const reves = ocPlayer("reves");
        const ambos = ocPlayer("ambos");
        checks.push(ok("drive+drive penaliza +150", positionalPenalty(drive, ocPlayer("drive")) === 150));
        checks.push(ok("revés+revés penaliza +80", positionalPenalty(reves, ocPlayer("reves")) === 80));
        checks.push(ok("drive+revés bonifica -100", positionalPenalty(drive, reves) === -100));
        checks.push(ok("'ambos' es neutral (0)", positionalPenalty(ambos, drive) === 0));
    }

    // 1c. Evita repetir la misma pareja
    {
        const A = ocPlayer("ambos", undefined, "A");
        const B = ocPlayer("ambos", undefined, "B");
        const C = ocPlayer("ambos", undefined, "C");
        const D = ocPlayer("ambos", undefined, "D");
        // Historial: A y B ya jugaron juntos
        const history: OcCompletedMatch[] = [{
            team1Player1Id: "A", team1Player2Id: "B",
            team2Player1Id: "X", team2Player2Id: "Y",
            status: "completed",
        }];
        const r = pickBestOcCombo([A, B, C, D], history, "libre");
        const sameTeam = (x: string, t: [OcPlayer, OcPlayer]) => t.some(p => ocId(p) === x);
        const abTogether = sameTeam("A", r.team1!) && sameTeam("B", r.team1!) ||
            sameTeam("A", r.team2!) && sameTeam("B", r.team2!);
        checks.push(ok("Evita re-emparejar a quienes ya jugaron juntos (A+B)", !abTogether,
            `A con ${r.team1!.some(p => ocId(p) === "A") ? "equipo1" : "equipo2"}`));
    }

    // 1d. Evita repetir rivales
    {
        const A = ocPlayer("ambos", undefined, "A");
        const B = ocPlayer("ambos", undefined, "B");
        const C = ocPlayer("ambos", undefined, "C");
        const D = ocPlayer("ambos", undefined, "D");
        // A y C ya fueron rivales
        const history: OcCompletedMatch[] = [{
            team1Player1Id: "A", team1Player2Id: "B2",
            team2Player1Id: "C", team2Player2Id: "D2",
            status: "completed",
        }];
        const r = pickBestOcCombo([A, B, C, D], history, "libre");
        const team = (x: string) => r.team1!.some(p => ocId(p) === x) ? 1 : 2;
        const acRivals = team("A") !== team("C");
        checks.push(ok("Evita repetir rivales (A vs C) → los pone en el mismo equipo", !acRivals,
            `A=eq${team("A")}, C=eq${team("C")}`));
    }

    // 1e. Modo mixto: ambos equipos quedan mixtos
    {
        const players = [
            ocPlayer("ambos", "masculino", "H1"),
            ocPlayer("ambos", "masculino", "H2"),
            ocPlayer("ambos", "femenino", "M1"),
            ocPlayer("ambos", "femenino", "M2"),
        ];
        const r = pickOcMatch(players, [], "mixto");
        const genderOf = (p: OcPlayer) => p.gender;
        const t1Mixed = genderOf(r.team1![0]) !== genderOf(r.team1![1]);
        const t2Mixed = genderOf(r.team2![0]) !== genderOf(r.team2![1]);
        checks.push(ok("Modo MIXTO: cada equipo tiene un hombre y una mujer", r.ok && t1Mixed && t2Mixed,
            `penalidad=${r.penalty}`));
    }

    // 1f. Modo mismo género: ambos equipos del mismo género
    {
        const players = [
            ocPlayer("ambos", "masculino", "H1"),
            ocPlayer("ambos", "masculino", "H2"),
            ocPlayer("ambos", "femenino", "M1"),
            ocPlayer("ambos", "femenino", "M2"),
        ];
        const r = pickOcMatch(players, [], "mismo_genero");
        const same = (a: OcPlayer, b: OcPlayer) => a.gender === b.gender;
        const okBoth = r.ok && same(r.team1![0], r.team1![1]) && same(r.team2![0], r.team2![1]);
        checks.push(ok("Modo MISMO GÉNERO: cada equipo es del mismo género", okBoth, `penalidad=${r.penalty}`));
    }

    // 1g. Menos de 4 jugadores → error controlado
    {
        const r = pickOcMatch([ocPlayer("ambos"), ocPlayer("ambos"), ocPlayer("ambos")], [], "libre");
        checks.push(ok("Con <4 jugadores devuelve error (no arma partido)", !r.ok, r.error));
    }

    // Visualización de muestra
    const sampleA = ocPlayer("drive", "masculino", "Ana(drive)");
    const sampleB = ocPlayer("reves", "femenino", "Beto(revés)");
    const sampleC = ocPlayer("drive", "masculino", "Caro(drive)");
    const sampleD = ocPlayer("reves", "femenino", "Dani(revés)");
    const sample = pickBestOcCombo([sampleA, sampleB, sampleC, sampleD], [], "libre");

    return {
        checks,
        sample: (
            <SampleBox title="Ejemplo de armado (4 ambos modos drive/revés)">
                <MatchRow
                    t1={sample.team1!.map(p => (p as { name: string }).name)}
                    t2={sample.team2!.map(p => (p as { name: string }).name)}
                    meta={`penalidad ${sample.penalty}`}
                />
            </SampleBox>
        ),
    };
}

// ============================================================================
// 2. AMERICANO
// ============================================================================
function amPlayer(club: string | null, id?: string): AmPlayer & { name: string } {
    const realId = id ?? nid("am");
    return { id: realId, name: realId, clubId: club };
}

function runAmericano(): Suite {
    const checks: Check[] = [];
    const ITER = 30;

    // 2a. Completitud: nadie queda con menos partidos que los configurados.
    {
        const N_ITER = 500;
        let nadieCorto = true;
        let minCount = Infinity;
        let maxCount = 0;
        // Caso par (n·k par) → exacto; caso impar → a lo sumo 1 jugador con N+1
        for (const [n, k] of [[8, 3], [9, 2], [12, 4], [7, 3]] as [number, number][]) {
            for (let it = 0; it < N_ITER; it++) {
                const players = Array.from({ length: n }, (_, i) => amPlayer(null, `J${i}`));
                const sched = generateAmericanoMatches(players, k, 3);
                const count = new Map<string, number>();
                players.forEach(p => count.set(p.id, 0));
                sched.forEach(m => {
                    count.set(m.team1.id, (count.get(m.team1.id) || 0) + 1);
                    count.set(m.team2.id, (count.get(m.team2.id) || 0) + 1);
                });
                const counts = [...count.values()];
                minCount = Math.min(minCount, ...counts.map(c => c - k)); // déficit relativo
                maxCount = Math.max(maxCount, ...counts.map(c => c - k)); // exceso relativo
                if (Math.min(...counts) < k) nadieCorto = false;
            }
        }
        checks.push(ok(
            `Completitud: nadie juega menos partidos que los configurados (varios tamaños · ${N_ITER} sorteos c/u)`,
            nadieCorto,
            `Diferencia respecto a N: mín ${minCount}, máx +${maxCount} (con n impar a lo sumo alguien juega +1, nunca menos)`
        ));
    }

    // 2b. Evita parejas del mismo club cuando hay alternativa
    {
        let totalSameClub = 0;
        for (let it = 0; it < ITER; it++) {
            // 4 de clubA, 4 de clubB → siempre hay cruce posible
            const players = [
                ...Array.from({ length: 4 }, (_, i) => amPlayer("clubA", `A${i}`)),
                ...Array.from({ length: 4 }, (_, i) => amPlayer("clubB", `B${i}`)),
            ];
            const sched = generateAmericanoMatches(players, 2, 2);
            const byId = new Map(players.map(p => [p.id, p]));
            sched.forEach(m => {
                const c1 = byId.get(m.team1.id)!.clubId;
                const c2 = byId.get(m.team2.id)!.clubId;
                if (c1 && c2 && c1 === c2) totalSameClub++;
            });
        }
        checks.push(ok(`Prioriza parejas de distinto club (0 parejas mismo club en ${ITER} sorteos)`,
            totalSameClub === 0, `parejas mismo club: ${totalSameClub}`));
    }

    // 2c. Anti-bottleneck: nadie juega dos veces en la misma ronda
    {
        let dup = false;
        let detail = "";
        for (let it = 0; it < ITER; it++) {
            const players = Array.from({ length: 10 }, (_, i) => amPlayer(null, `J${i}`));
            const sched = generateAmericanoMatches(players, 3, 3);
            const byRound = new Map<number, string[]>();
            sched.forEach(m => {
                const arr = byRound.get(m.roundIndex) || [];
                arr.push(m.team1.id, m.team2.id);
                byRound.set(m.roundIndex, arr);
            });
            for (const [round, ids] of byRound) {
                if (new Set(ids).size !== ids.length) { dup = true; detail = `ronda ${round} repite jugador`; }
            }
        }
        checks.push(ok(`Anti-bottleneck: nadie juega 2 veces en la misma ronda (${ITER} sorteos)`, !dup, detail || "✓"));
    }

    // 2d. No se superan las canchas disponibles por ronda
    {
        let overflow = false;
        for (let it = 0; it < ITER; it++) {
            const players = Array.from({ length: 12 }, (_, i) => amPlayer(null, `J${i}`));
            const maxCourts = 3;
            const sched = generateAmericanoMatches(players, 4, maxCourts);
            const perRound = new Map<number, number>();
            sched.forEach(m => perRound.set(m.roundIndex, (perRound.get(m.roundIndex) || 0) + 1));
            for (const c of perRound.values()) if (c > maxCourts) overflow = true;
        }
        checks.push(ok(`Nunca supera las canchas disponibles por ronda (máx 3, ${ITER} sorteos)`, !overflow));
    }

    // Muestra
    const players = Array.from({ length: 6 }, (_, i) => amPlayer(i < 3 ? "clubA" : "clubB", `J${i + 1}`));
    const sched = generateAmericanoMatches(players, 2, 2);
    const rounds = Array.from(new Set(sched.map(m => m.roundIndex))).sort((a, b) => a - b);

    return {
        checks,
        sample: (
            <SampleBox title="Ejemplo: 6 jugadores · 2 partidos c/u · 2 canchas">
                {rounds.map(r => (
                    <div key={r} className="mb-2">
                        <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Ronda {r + 1}</div>
                        {sched.filter(m => m.roundIndex === r).map(m => (
                            <MatchRow key={m.id} t1={[m.team1.id]} t2={[m.team2.id]} meta={`cancha ${m.courtNumber}`} />
                        ))}
                    </div>
                ))}
            </SampleBox>
        ),
    };
}

// ============================================================================
// 3. DISTRIBUCIÓN EN GRUPOS
// ============================================================================
function grPlayer(club: string, id?: string): GrPlayer & { name: string } {
    const realId = id ?? nid("gr");
    return { id: realId, name: realId, clubId: club };
}

function runGroups(): Suite {
    const checks: Check[] = [];
    const ITER = 30;

    // 3a. Tamaños de grupo parejos
    {
        let balanced = true;
        for (let it = 0; it < ITER; it++) {
            const players = Array.from({ length: 16 }, (_, i) => grPlayer(`club${i % 4}`, `P${i}`));
            const groups = distributeIntoGroups(players, 4, 4);
            const sizes = groups.map(g => g.players.length);
            if (Math.max(...sizes) - Math.min(...sizes) > 1) balanced = false;
        }
        checks.push(ok(`Grupos parejos en tamaño (16 jug · 4 grupos · ${ITER} sorteos)`, balanced));
    }

    // 3b. Balanceo de clubes (4 clubes de 4 → 1 por grupo)
    {
        let wellSpread = true;
        let worst = "";
        for (let it = 0; it < ITER; it++) {
            const players = [
                ...Array.from({ length: 4 }, (_, i) => grPlayer("clubA", `A${i}`)),
                ...Array.from({ length: 4 }, (_, i) => grPlayer("clubB", `B${i}`)),
                ...Array.from({ length: 4 }, (_, i) => grPlayer("clubC", `C${i}`)),
                ...Array.from({ length: 4 }, (_, i) => grPlayer("clubD", `D${i}`)),
            ];
            const groups = distributeIntoGroups(players, 4, 4);
            for (const g of groups) {
                const counts = new Map<string, number>();
                g.players.forEach(p => counts.set(p.clubId!, (counts.get(p.clubId!) || 0) + 1));
                const maxSame = Math.max(...counts.values());
                if (maxSame > 1) { wellSpread = false; worst = `un grupo tiene ${maxSame} del mismo club`; }
            }
        }
        checks.push(ok(`Reparte clubes: ningún grupo junta 2 del mismo club cuando se puede evitar (${ITER} sorteos)`,
            wellSpread, worst || "✓ 1 de cada club por grupo"));
    }

    // 3c. Todos los presentes quedan asignados
    {
        const players = Array.from({ length: 12 }, (_, i) => grPlayer(`club${i % 3}`, `P${i}`));
        const groups = distributeIntoGroups(players, 3, 4);
        const assigned = groups.reduce((s, g) => s + g.players.length, 0);
        checks.push(ok("Todos los jugadores quedan asignados (12 → 3 grupos de 4)", assigned === 12, `asignados ${assigned}/12`));
    }

    // Muestra
    const players = [
        ...Array.from({ length: 4 }, (_, i) => grPlayer("Águilas", `Águila${i + 1}`)),
        ...Array.from({ length: 4 }, (_, i) => grPlayer("Pumas", `Puma${i + 1}`)),
        ...Array.from({ length: 4 }, (_, i) => grPlayer("Tigres", `Tigre${i + 1}`)),
        ...Array.from({ length: 4 }, (_, i) => grPlayer("Lobos", `Lobo${i + 1}`)),
    ];
    const groups = distributeIntoGroups(players, 4, 4);

    return {
        checks,
        sample: (
            <SampleBox title="Ejemplo: 4 clubes × 4 jugadores → 4 grupos">
                <div className="grid grid-cols-2 gap-2">
                    {groups.map(g => (
                        <div key={g.id} className="border border-border/50 rounded-lg p-2">
                            <div className="text-[10px] font-black uppercase tracking-widest text-celeste mb-1">{g.name}</div>
                            {g.players.map(p => (
                                <div key={p.id} className="text-[11px] text-foreground/80 flex justify-between">
                                    <span>{(p as { name: string }).name}</span>
                                    <span className="text-muted-foreground">{p.clubId}</span>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </SampleBox>
        ),
    };
}

// ============================================================================
// 4. SIEMBRA DE LLAVES
// ============================================================================
type Qual = { groupRank: number; groupId: string; player: { id: string; name: string } };

function runSeeding(): Suite {
    const checks: Check[] = [];

    // 4a. getSeedingOrder genera una permutación válida y pares que suman size+1
    {
        for (const size of [4, 8, 16]) {
            const order = getSeedingOrder(size);
            const isPerm = order.length === size &&
                new Set(order).size === size &&
                Math.min(...order) === 1 && Math.max(...order) === size;
            let pairsOk = true;
            for (let i = 0; i < order.length; i += 2) {
                if (order[i] + order[i + 1] !== size + 1) pairsOk = false;
            }
            checks.push(ok(`Seeds(${size}): permutación válida 1..${size}`, isPerm, `[${order.join(", ")}]`));
            checks.push(ok(`Seeds(${size}): cada cruce de 1ª ronda suma ${size + 1} (1 vs ${size}, 2 vs ${size - 1}…)`, pairsOk));
        }
    }

    // 4b. Protección de grupo: 1ros toman los primeros seeds
    {
        const quals: Qual[] = [
            { groupRank: 1, groupId: "A", player: { id: "1A", name: "1ºA" } },
            { groupRank: 1, groupId: "B", player: { id: "1B", name: "1ºB" } },
            { groupRank: 2, groupId: "A", player: { id: "2A", name: "2ºA" } },
            { groupRank: 2, groupId: "B", player: { id: "2B", name: "2ºB" } },
        ];
        const seedMap = buildSeedMap(quals);
        const firstsTop = seedMap.get(1)!.groupRank === 1 && seedMap.get(2)!.groupRank === 1;
        checks.push(ok("Los 1ros de grupo reciben los mejores seeds (1 y 2)", firstsTop));
    }

    // 4c. Protección de grupo: en 1ª ronda no se cruzan compañeros de grupo
    {
        // 4 grupos → 8 clasificados (1ros y 2dos), bracket de 8
        const quals: Qual[] = [];
        for (const g of ["A", "B", "C", "D"]) {
            quals.push({ groupRank: 1, groupId: g, player: { id: `1${g}`, name: `1º${g}` } });
        }
        for (const g of ["A", "B", "C", "D"]) {
            quals.push({ groupRank: 2, groupId: g, player: { id: `2${g}`, name: `2º${g}` } });
        }
        const pairs = computeFirstRoundPairs(quals, 8);
        const noGroupClash = pairs.every(p => !p.q1 || !p.q2 || p.q1.groupId !== p.q2.groupId);
        checks.push(ok("Protección de grupo: nadie enfrenta a su compañero de grupo en 1ª ronda", noGroupClash,
            pairs.map(p => `${p.q1?.player.name}vs${p.q2?.player.name}`).join("  ")));
    }

    // Muestra
    const quals: Qual[] = [];
    for (const g of ["A", "B", "C", "D"]) quals.push({ groupRank: 1, groupId: g, player: { id: `1${g}`, name: `1º ${g}` } });
    for (const g of ["A", "B", "C", "D"]) quals.push({ groupRank: 2, groupId: g, player: { id: `2${g}`, name: `2º ${g}` } });
    const pairs = computeFirstRoundPairs(quals, 8);

    return {
        checks,
        sample: (
            <SampleBox title="Ejemplo: 8 clasificados (4 grupos) → cuadro de 8">
                {pairs.map(p => (
                    <MatchRow
                        key={p.matchIndex}
                        t1={[p.q1?.player.name ?? "BYE"]}
                        t2={[p.q2?.player.name ?? "BYE"]}
                        meta={`seeds ${p.seed1} vs ${p.seed2}`}
                    />
                ))}
            </SampleBox>
        ),
    };
}

// ============================================================================
// 5. TABLA DE POSICIONES
// ============================================================================
type SP = { id: string; name: string };
function stMatch(a: SP, b: SP, sa: number, sb: number): StMatch<SP> {
    return { team1: a, team2: b, score1: sa, score2: sb, confirmed: true };
}

function runStandings(): Suite {
    const checks: Check[] = [];

    // 5a. Ordena por partidos ganados
    {
        const A = { id: "A", name: "A" }, B = { id: "B", name: "B" }, C = { id: "C", name: "C" };
        // A gana 2, B gana 1, C gana 0
        const matches = [
            stMatch(A, B, 6, 3),
            stMatch(A, C, 6, 2),
            stMatch(B, C, 6, 4),
        ];
        const table = computeGroupStandings([A, B, C], matches);
        const order = table.map(s => s.playerId).join("");
        checks.push(ok("Ordena por partidos ganados (A>B>C)", order === "ABC", `orden=${order}`));
    }

    // 5b. Desempate por enfrentamiento directo (head-to-head)
    // El H2H solo decide cuando quedan EXACTAMENTE dos empatados. Armamos un
    // grupo de 4 donde A y B quedan solos con 1 victoria (C y D con 2), así el
    // único criterio entre A y B es que A le ganó a B.
    {
        const A = { id: "A", name: "A" }, B = { id: "B", name: "B" };
        const C = { id: "C", name: "C" }, D = { id: "D", name: "D" };
        const matches = [
            stMatch(A, B, 6, 4), // A le gana a B (head-to-head)
            stMatch(C, A, 6, 2), // A pierde con C
            stMatch(D, A, 6, 4), // A pierde con D  → A: 1W
            stMatch(B, C, 6, 3), // B le gana a C
            stMatch(D, B, 6, 4), // B pierde con D  → B: 1W
            stMatch(C, D, 6, 2), // C y D quedan con 2W cada uno
        ];
        const table = computeGroupStandings([A, B, C, D], matches);
        const posA = table.findIndex(s => s.playerId === "A");
        const posB = table.findIndex(s => s.playerId === "B");
        const aw = table.find(s => s.playerId === "A")!.won;
        const bw = table.find(s => s.playerId === "B")!.won;
        checks.push(ok("Desempate head-to-head: A y B empatan en 1 victoria, A le ganó a B → A por encima",
            aw === 1 && bw === 1 && posA < posB,
            `A: ${aw}W pos${posA + 1}º · B: ${bw}W pos${posB + 1}º`));
    }

    // 5c. Desempate por diferencia de games (puntos)
    {
        const A = { id: "A", name: "A" }, B = { id: "B", name: "B" }, C = { id: "C", name: "C" };
        // A y B ganan 1, pero A con mejor diferencia de games. No jugaron entre sí.
        const matches = [
            stMatch(A, C, 6, 0), // A: +6, 1W
            stMatch(B, C, 6, 5), // B: +1, 1W
        ];
        const table = computeGroupStandings([A, B, C], matches);
        const posA = table.findIndex(s => s.playerId === "A");
        const posB = table.findIndex(s => s.playerId === "B");
        checks.push(ok("Desempate por diferencia de games: A (+6) por encima de B (+1)", posA < posB,
            `A pos${posA} (pts ${table[posA].points}) · B pos${posB} (pts ${table[posB].points})`));
    }

    // Muestra
    const A = { id: "A", name: "Ana" }, B = { id: "B", name: "Beto" }, C = { id: "C", name: "Caro" };
    const matches = [stMatch(A, B, 6, 3), stMatch(A, C, 6, 2), stMatch(B, C, 6, 4)];
    const table = computeGroupStandings([A, B, C], matches);

    return {
        checks,
        sample: (
            <SampleBox title="Ejemplo: tabla de un grupo de 3">
                <div className="text-[11px]">
                    <div className="grid grid-cols-5 gap-1 font-black uppercase tracking-wider text-muted-foreground text-[9px] mb-1">
                        <span>Pos</span><span>Jugador</span><span>PG</span><span>PP</span><span>Dif</span>
                    </div>
                    {table.map((s, i) => (
                        <div key={s.playerId} className="grid grid-cols-5 gap-1 text-foreground/80 py-0.5">
                            <span>{i + 1}º</span><span>{(s.player as SP).name}</span>
                            <span>{s.won}</span><span>{s.lost}</span><span>{s.points > 0 ? "+" : ""}{s.points}</span>
                        </div>
                    ))}
                </div>
            </SampleBox>
        ),
    };
}

// ============================================================================
// EJEMPLO GUIADO — torneo completo de 12 jugadores, paso a paso
// Pensado para que un admin no-técnico pueda comparar "con estos resultados,
// el sistema debería producir esto". Todo se calcula con las funciones reales.
// ============================================================================
type GP = { id: string; name: string; club: string };

const GUIDED_GROUPS: { name: string; players: GP[] }[] = [
    {
        name: "Grupo A", players: [
            { id: "martin", name: "Martín", club: "Águilas" },
            { id: "pablo", name: "Pablo", club: "Pumas" },
            { id: "tomas", name: "Tomás", club: "Tigres" },
        ]
    },
    {
        name: "Grupo B", players: [
            { id: "lucas", name: "Lucas", club: "Águilas" },
            { id: "javier", name: "Javier", club: "Pumas" },
            { id: "bruno", name: "Bruno", club: "Lobos" },
        ]
    },
    {
        name: "Grupo C", players: [
            { id: "diego", name: "Diego", club: "Águilas" },
            { id: "andres", name: "Andrés", club: "Tigres" },
            { id: "gonza", name: "Gonza", club: "Lobos" },
        ]
    },
    {
        name: "Grupo D", players: [
            { id: "nico", name: "Nico", club: "Pumas" },
            { id: "seba", name: "Seba", club: "Tigres" },
            { id: "fede", name: "Fede", club: "Lobos" },
        ]
    },
];

// Resultados fijos por grupo: [jugadorLocal, jugadorVisita, gamesLocal, gamesVisita]
const GUIDED_RESULTS: Record<string, [string, string, number, number][]> = {
    "Grupo A": [ // empate triple a propósito → desempate por games y head-to-head
        ["martin", "pablo", 6, 4],
        ["pablo", "tomas", 6, 2],
        ["tomas", "martin", 6, 3],
    ],
    "Grupo B": [
        ["lucas", "javier", 6, 1],
        ["lucas", "bruno", 6, 2],
        ["javier", "bruno", 6, 3],
    ],
    "Grupo C": [
        ["diego", "andres", 6, 2],
        ["diego", "gonza", 6, 4],
        ["andres", "gonza", 6, 3],
    ],
    "Grupo D": [
        ["nico", "seba", 6, 3],
        ["nico", "fede", 6, 2],
        ["seba", "fede", 6, 4],
    ],
};

function GuidedExample() {
    const byId = new Map<string, GP>();
    GUIDED_GROUPS.forEach(g => g.players.forEach(p => byId.set(p.id, p)));

    // Tabla de cada grupo con la función REAL
    const groupTables = GUIDED_GROUPS.map(g => {
        const matches: StMatch<GP>[] = GUIDED_RESULTS[g.name].map(([a, b, sa, sb]) => ({
            team1: byId.get(a)!, team2: byId.get(b)!, score1: sa, score2: sb, confirmed: true,
        }));
        const table = computeGroupStandings(g.players, matches);
        return { group: g, matches, table };
    });

    // Clasificados: 1º y 2º de cada grupo
    const quals: { groupRank: number; groupId: string; player: GP }[] = [];
    groupTables.forEach(({ group, table }) => {
        quals.push({ groupRank: 1, groupId: group.name, player: table[0].player });
        quals.push({ groupRank: 2, groupId: group.name, player: table[1].player });
    });
    // Ordenar como espera la siembra: primero todos los 1ros, luego los 2dos
    const orderedQuals = [...quals.filter(q => q.groupRank === 1), ...quals.filter(q => q.groupRank === 2)];

    // Siembra con la función REAL (protección de grupo)
    const pairs = computeFirstRoundPairs(orderedQuals, 8);

    // Simulación del cuadro: "gana el mejor sembrado (menor número de seed)"
    type BMatch = { p1: { player: GP; seed: number }; p2: { player: GP; seed: number }; s1: number; s2: number };
    const qf: BMatch[] = pairs.map((p, i) => {
        const scores: [number, number][] = [[6, 2], [7, 5], [6, 4], [6, 1]];
        const [s1, s2] = scores[i];
        return {
            p1: { player: p.q1!.player, seed: p.seed1 },
            p2: { player: p.q2!.player, seed: p.seed2 },
            s1, s2, // el de menor seed gana → ya ordenamos para que p1 (mejor seed) gane si seed1<seed2
        };
    }).map(m => {
        // Aseguramos que el ganador (menor seed) tenga el score mayor
        const p1Wins = m.p1.seed < m.p2.seed;
        return { ...m, s1: p1Wins ? Math.max(m.s1, m.s2) : Math.min(m.s1, m.s2), s2: p1Wins ? Math.min(m.s1, m.s2) : Math.max(m.s1, m.s2) };
    });
    const winnerOf = (m: BMatch) => (m.s1 > m.s2 ? m.p1 : m.p2);

    const qfW = qf.map(winnerOf);
    const sf: BMatch[] = [
        { p1: qfW[0], p2: qfW[1], s1: 6, s2: 3 },
        { p1: qfW[2], p2: qfW[3], s1: 6, s2: 4 },
    ].map(m => { const p1Wins = m.p1.seed < m.p2.seed; return { ...m, s1: p1Wins ? 6 : 4, s2: p1Wins ? 4 : 6 }; });
    const sfW = sf.map(winnerOf);
    const final: BMatch = (() => {
        const m = { p1: sfW[0], p2: sfW[1], s1: 7, s2: 6 };
        const p1Wins = m.p1.seed < m.p2.seed;
        return { ...m, s1: p1Wins ? 7 : 6, s2: p1Wins ? 6 : 7 };
    })();
    const champion = winnerOf(final).player;

    return (
        <div className="space-y-5">
            <div className="text-sm text-muted-foreground">
                Torneo de ejemplo: <strong className="text-foreground">12 jugadores · 4 grupos de 3 · clasifican los 2 primeros de cada grupo · llave de 8</strong>.
                Con los resultados de abajo, el sistema <strong className="text-foreground">debería</strong> producir exactamente lo que se muestra. Si en un torneo real ves algo distinto con estos mismos resultados, ahí sí hay un problema.
            </div>

            {/* Paso 1: grupos */}
            <GuidedStep n={1} title="Armado de grupos (balanceando clubes)">
                <p className="text-xs text-muted-foreground mb-2">Cada grupo tiene 3 jugadores de <strong>clubes distintos</strong> (criterio: no juntar gente del mismo club).</p>
                <div className="grid grid-cols-2 gap-2">
                    {GUIDED_GROUPS.map(g => (
                        <div key={g.name} className="border border-border/50 rounded-lg p-2">
                            <div className="text-[10px] font-black uppercase tracking-widest text-celeste mb-1">{g.name}</div>
                            {g.players.map(p => (
                                <div key={p.id} className="text-[11px] text-foreground/80 flex justify-between">
                                    <span>{p.name}</span><span className="text-muted-foreground">{p.club}</span>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </GuidedStep>

            {/* Paso 2: resultados + tabla */}
            <GuidedStep n={2} title="Resultados de cada grupo → tabla de posiciones">
                <p className="text-xs text-muted-foreground mb-2">
                    Orden: 1º por <strong>partidos ganados</strong>, luego <strong>diferencia de games</strong>, y si dos quedan iguales, <strong>quién le ganó a quién</strong>.
                </p>
                <div className="space-y-3">
                    {groupTables.map(({ group, matches, table }) => (
                        <div key={group.name} className="border border-border/50 rounded-lg p-2.5">
                            <div className="text-[10px] font-black uppercase tracking-widest text-celeste mb-1.5">{group.name}</div>
                            <div className="mb-2">
                                {matches.map((m, i) => (
                                    <MatchRow key={i} t1={[(m.team1 as GP).name]} t2={[(m.team2 as GP).name]} meta={`${m.score1}-${m.score2}`} />
                                ))}
                            </div>
                            <StandingsTable rows={table.map((s, i) => ({
                                pos: i + 1, name: (s.player as GP).name, won: s.won, lost: s.lost, diff: s.points,
                                qualifies: i < 2,
                            }))} />
                            {group.name === "Grupo A" && (
                                <p className="text-[10px] text-amber-500 mt-1.5">
                                    ⚠ Acá los 3 ganaron 1 partido (empate triple). Desempata la diferencia de games (Pablo 1º), y entre los dos restantes, el head-to-head: Tomás le ganó a Martín, así que Tomás es 2º.
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            </GuidedStep>

            {/* Paso 3: siembra */}
            <GuidedStep n={3} title="Siembra de la llave (protección de grupo)">
                <p className="text-xs text-muted-foreground mb-2">
                    Los 1ros de grupo entran como mejores cabezas de serie. El cruce se arma para que <strong>nadie enfrente a un compañero de su mismo grupo en la primera ronda</strong>.
                </p>
                <div className="border border-border/50 rounded-lg p-2.5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-celeste mb-1.5">Cuartos de final</div>
                    {pairs.map(p => (
                        <MatchRow
                            key={p.matchIndex}
                            t1={[`${p.q1!.player.name} (${p.q1!.groupId.replace("Grupo ", "")}${orderedQuals.find(q => q.player.id === p.q1!.player.id)!.groupRank}º)`]}
                            t2={[`${p.q2!.player.name} (${p.q2!.groupId.replace("Grupo ", "")}${orderedQuals.find(q => q.player.id === p.q2!.player.id)!.groupRank}º)`]}
                            meta={`seeds ${p.seed1} vs ${p.seed2}`}
                        />
                    ))}
                </div>
            </GuidedStep>

            {/* Paso 4: resolución del cuadro */}
            <GuidedStep n={4} title="Se juega la llave → campeón">
                <p className="text-xs text-muted-foreground mb-2">
                    En este ejemplo asumimos que <strong>siempre gana el mejor sembrado</strong> (menor número de seed), con resultados de muestra, para que puedas seguir la lógica.
                </p>
                <div className="space-y-2">
                    <BracketRound title="Cuartos de final" matches={qf} />
                    <BracketRound title="Semifinales" matches={sf} />
                    <BracketRound title="Final" matches={[final]} />
                </div>
                <div className="mt-3 p-3 rounded-xl bg-celeste/10 border border-celeste/30 text-center">
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Campeón</div>
                    <div className="text-lg font-black italic text-celeste">🏆 {champion.name} <span className="text-xs text-muted-foreground">({champion.club})</span></div>
                </div>
            </GuidedStep>
        </div>
    );
}

function GuidedStep({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
    return (
        <div className="border border-border/40 rounded-xl p-4 bg-muted/10">
            <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-celeste text-white text-xs font-black flex items-center justify-center shrink-0">{n}</span>
                <h3 className="text-sm font-black uppercase tracking-tight">{title}</h3>
            </div>
            {children}
        </div>
    );
}

function StandingsTable({ rows }: { rows: { pos: number; name: string; won: number; lost: number; diff: number; qualifies: boolean }[] }) {
    return (
        <div className="text-[11px]">
            <div className="grid grid-cols-[2rem_1fr_2rem_2rem_3rem] gap-1 font-black uppercase tracking-wider text-muted-foreground text-[9px] mb-0.5">
                <span>Pos</span><span>Jugador</span><span>PG</span><span>PP</span><span>Dif</span>
            </div>
            {rows.map(r => (
                <div key={r.pos} className={`grid grid-cols-[2rem_1fr_2rem_2rem_3rem] gap-1 py-0.5 ${r.qualifies ? "text-emerald-500 font-bold" : "text-foreground/70"}`}>
                    <span>{r.pos}º{r.qualifies ? " ✓" : ""}</span><span>{r.name}</span>
                    <span>{r.won}</span><span>{r.lost}</span><span>{r.diff > 0 ? "+" : ""}{r.diff}</span>
                </div>
            ))}
        </div>
    );
}

function BracketRound({ title, matches }: { title: string; matches: { p1: { player: GP; seed: number }; p2: { player: GP; seed: number }; s1: number; s2: number }[] }) {
    return (
        <div className="border border-border/50 rounded-lg p-2.5">
            <div className="text-[10px] font-black uppercase tracking-widest text-celeste mb-1.5">{title}</div>
            {matches.map((m, i) => {
                const p1Wins = m.s1 > m.s2;
                return (
                    <div key={i} className="flex items-center justify-between gap-2 text-[11px] py-0.5">
                        <span className={`text-right flex-1 ${p1Wins ? "text-foreground font-bold" : "text-muted-foreground"}`}>{m.p1.player.name}</span>
                        <span className="text-foreground/90 font-black px-2 whitespace-nowrap">{m.s1}-{m.s2}</span>
                        <span className={`flex-1 ${!p1Wins ? "text-foreground font-bold" : "text-muted-foreground"}`}>{m.p2.player.name}</span>
                    </div>
                );
            })}
        </div>
    );
}

// ── UI compartida ──
function SampleBox({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="mt-4 border border-border/40 rounded-xl p-3 bg-muted/20">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">{title}</div>
            {children}
        </div>
    );
}

function MatchRow({ t1, t2, meta }: { t1: string[]; t2: string[]; meta?: string }) {
    return (
        <div className="flex items-center justify-between gap-2 text-[11px] py-0.5">
            <span className="text-foreground/90 font-medium text-right flex-1">{t1.join(" / ")}</span>
            <span className="text-muted-foreground text-[9px] font-black px-1">vs</span>
            <span className="text-foreground/90 font-medium flex-1">{t2.join(" / ")}</span>
            {meta && <span className="text-muted-foreground text-[9px] whitespace-nowrap">{meta}</span>}
        </div>
    );
}

const TABS = [
    { id: "open", label: "Cancha Abierta", run: runOpenCourt },
    { id: "americano", label: "Americano", run: runAmericano },
    { id: "groups", label: "Grupos", run: runGroups },
    { id: "seeding", label: "Llaves", run: runSeeding },
    { id: "standings", label: "Posiciones", run: runStandings },
] as const;

type TabId = typeof TABS[number]["id"] | "guided" | "sim";

export default function TestMatchmakingPage() {
    const [active, setActive] = useState<TabId>("sim");
    const [runKey, setRunKey] = useState(0);

    const isGuided = active === "guided";
    const isSim = active === "sim";

    const suite = useMemo<Suite>(() => {
        if (active === "guided" || active === "sim") return { checks: [] };
        _id = 0; // reset id counter for reproducibility within a run
        return TABS.find(t => t.id === active)!.run();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, runKey]);

    const total = suite.checks.length;
    const passed = suite.checks.filter(c => c.status === "pass").length;
    const warns = suite.checks.filter(c => c.status === "warn").length;
    const fails = suite.checks.filter(c => c.status === "fail").length;
    const allPass = fails === 0 && warns === 0;

    return (
        <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
            <div className="max-w-[1700px] mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-black italic uppercase tracking-tighter">Test de criterios de armado</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Verifica la lógica real de <code className="text-celeste">@/lib/matchmaking</code> con jugadores sintéticos. No usa la base de datos.
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {[{ id: "sim" as const, label: "🎮 Simulador" }, { id: "guided" as const, label: "📋 Ejemplo guiado" }, ...TABS].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActive(t.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-colors border ${active === t.id
                                ? "bg-celeste text-white border-celeste"
                                : "bg-muted/30 text-foreground/70 border-border/40 hover:bg-muted/50"
                                }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {isSim ? (
                    <Simulator />
                ) : isGuided ? (
                    <GuidedExample />
                ) : (
                    <>
                        {/* Resumen + re-run */}
                        <div className="flex items-center justify-between mb-3">
                            <div className={`text-sm font-black ${fails > 0 ? "text-rojo" : warns > 0 ? "text-amber-500" : "text-emerald-500"}`}>
                                {passed}/{total} OK
                                {warns > 0 && <span className="text-amber-500"> · {warns} ⚠</span>}
                                {fails > 0 && <span className="text-rojo"> · {fails} ✗</span>}
                                {allPass && " ✓"}
                            </div>
                            <button
                                onClick={() => setRunKey(k => k + 1)}
                                className="px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest bg-muted/30 border border-border/40 hover:bg-muted/50"
                            >
                                Re-ejecutar
                            </button>
                        </div>

                        {/* Checks */}
                        <div className="space-y-1.5">
                            {suite.checks.map((c, i) => (
                                <div
                                    key={i}
                                    className={`flex items-start gap-3 p-2.5 rounded-lg border ${c.status === "pass"
                                        ? "border-emerald-500/20 bg-emerald-500/5"
                                        : c.status === "warn"
                                            ? "border-amber-500/30 bg-amber-500/5"
                                            : "border-rojo/30 bg-rojo/5"
                                        }`}
                                >
                                    <span className={`text-sm font-black shrink-0 ${c.status === "pass" ? "text-emerald-500" : c.status === "warn" ? "text-amber-500" : "text-rojo"}`}>
                                        {c.status === "pass" ? "✓" : c.status === "warn" ? "⚠" : "✗"}
                                    </span>
                                    <div className="min-w-0">
                                        <div className="text-sm text-foreground/90">{c.name}</div>
                                        {c.detail && <div className="text-[11px] text-muted-foreground mt-0.5 break-words font-mono">{c.detail}</div>}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Muestra visual */}
                        {suite.sample}
                    </>
                )}
            </div>
        </div>
    );
}
