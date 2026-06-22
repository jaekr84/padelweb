"use client";

// TEMP interactive harness for AmericanoBracketMirror — delete after review.
import { useState } from "react";
import { AmericanoBracketMirror } from "../../(main)/tournaments/fixture/components/americano/AmericanoBracketMirror";
import type { BracketMatch, Player } from "../../(main)/tournaments/fixture/shared-types";

const p = (name: string): Player => ({ id: name, name, category: "4" });
const team = (a: string, b: string) => p(`${a} / ${b}`);

function build8(): BracketMatch[] {
    const m = (round: number, slot: number, t1: Player | "BYE" | null, t2: Player | "BYE" | null): BracketMatch =>
        ({ id: `r${round}s${slot}`, round, slot, team1: t1, team2: t2, confirmed: false });
    return [
        m(2, 0, team("Pérez", "Gómez"), team("Díaz", "Ruiz")),
        m(2, 1, team("López", "Sosa"), team("Vega", "Mora")),
        m(2, 2, team("Castro", "Ríos"), team("Bravo", "Luna")),
        m(2, 3, team("Ortiz", "Páez"), team("Silva", "Romero")),
        m(1, 0, null, null),
        m(1, 1, null, null),
        m(0, 0, null, null),
    ];
}

function build16(): BracketMatch[] {
    const t = (i: number) => team(`Eq${i}A`, `Eq${i}B`);
    const out: BracketMatch[] = [];
    for (let s = 0; s < 8; s++) out.push({ id: `o${s}`, round: 3, slot: s, team1: t(s * 2), team2: t(s * 2 + 1), confirmed: false });
    for (let s = 0; s < 4; s++) out.push({ id: `q${s}`, round: 2, slot: s, team1: null, team2: null, confirmed: false });
    for (let s = 0; s < 2; s++) out.push({ id: `s${s}`, round: 1, slot: s, team1: null, team2: null, confirmed: false });
    out.push({ id: "f", round: 0, slot: 0, team1: null, team2: null, confirmed: false });
    return out;
}

function useBracket(initial: () => BracketMatch[]) {
    const [bracket, setBracket] = useState<BracketMatch[]>(initial);

    const setM = (id: string, patch: Partial<BracketMatch>) =>
        setBracket(prev => prev.map(m => (m.id === id ? { ...m, ...patch } : m)));

    const handleBracketStart = (id: string) => setM(id, { status: "live", score1: 0, score2: 0 });
    const handleBracketScore = (id: string, s1: string, s2: string) =>
        setM(id, { score1: Number(s1), score2: Number(s2) });

    const handleBracketConfirm = (id: string) =>
        setBracket(prev => {
            const m = prev.find(x => x.id === id);
            if (!m) return prev;
            const winner = (m.score1 ?? 0) > (m.score2 ?? 0) ? m.team1 : m.team2;
            const winnerName = winner && typeof winner !== "string" ? winner.name : "";
            const next = prev.map(x => (x.id === id ? { ...x, confirmed: true, status: undefined, winnerName } : x));
            // advance winner into the parent slot
            const parentSlot = Math.floor(m.slot / 2);
            return next.map(x => {
                if (x.round !== m.round - 1 || x.slot !== parentSlot) return x;
                return m.slot % 2 === 0 ? { ...x, team1: winner } : { ...x, team2: winner };
            });
        });

    const handleBracketEdit = (id: string) =>
        setBracket(prev => {
            const m = prev.find(x => x.id === id);
            if (!m) return prev;
            const next = prev.map(x => (x.id === id ? { ...x, confirmed: false, status: "live" as const, winnerName: undefined } : x));
            const parentSlot = Math.floor(m.slot / 2);
            return next.map(x => {
                if (x.round !== m.round - 1 || x.slot !== parentSlot) return x;
                return m.slot % 2 === 0 ? { ...x, team1: null } : { ...x, team2: null };
            });
        });

    return { bracket, handlers: { saving: false, handleBracketStart, handleBracketScore, handleBracketConfirm, handleBracketEdit } };
}

export default function Page() {
    const eight = useBracket(build8);
    const sixteen = useBracket(build16);
    return (
        <div className="min-h-screen bg-background text-foreground p-6 space-y-16 max-w-7xl mx-auto">
            <div>
                <h1 className="text-sm font-black uppercase mb-2">8 equipos — gestionable (click en un card listo)</h1>
                <AmericanoBracketMirror bracket={eight.bracket} {...eight.handlers} />
            </div>
            <div>
                <h1 className="text-sm font-black uppercase mb-2">16 equipos</h1>
                <AmericanoBracketMirror bracket={sixteen.bracket} {...sixteen.handlers} />
            </div>
        </div>
    );
}
