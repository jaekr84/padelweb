// Propagación del cuadro de eliminatorias.
//
// Pure core of `computeAdvancedBracket` from useTournamentLogic: recorre el
// cuadro de la primera ronda hacia la final subiendo los ganadores y resolviendo
// los BYEs. Recalcula todo desde cero en cada llamada, así que sirve tanto para
// armar el cuadro como para rehacerlo después de reabrir o intercambiar un
// partido.

export interface BrPlayer {
    id: string;
    name?: string;
    // Un casillero "1º GRUPO A" que todavía no se resolvió: no avanza por BYE.
    isPlaceholder?: boolean;
}

export type BrSlot<P extends BrPlayer> = P | "BYE" | null;

export interface BrMatch<P extends BrPlayer> {
    round: number;
    slot: number;
    team1: BrSlot<P>;
    team2: BrSlot<P>;
    score1?: number;
    score2?: number;
    confirmed: boolean;
    status?: string;
    winnerId?: string;
    winnerName?: string;
}

// BYE contra BYE: pasa cuando un grupo corto deja un clasificado fantasma justo
// enfrente de un seed vacío. El partido se da por jugado pero no tiene ganador,
// así que el casillero siguiente hereda el BYE — si se dejara en null, el rival
// de la ronda siguiente se quedaría esperando "a definir" para siempre.
export function isDoubleBye<P extends BrPlayer>(m: Pick<BrMatch<P>, "team1" | "team2">): boolean {
    return m.team1 === "BYE" && m.team2 === "BYE";
}

// Una pareja de verdad, no un BYE ni un casillero sin resolver.
function isRealPlayer<P extends BrPlayer>(slot: BrSlot<P>): slot is P {
    return !!slot && slot !== "BYE" && !slot.isPlaceholder && !slot.id?.startsWith("TBD");
}

export function advanceBracket<P extends BrPlayer, M extends BrMatch<P>>(
    currentBracket: M[],
    totalRounds: number
): M[] {
    const safeBracket = currentBracket.map((m) => ({ ...m }));

    for (let r = totalRounds - 1; r > 0; r--) {
        const roundMatches = safeBracket.filter((m) => m.round === r);
        roundMatches.forEach((m) => {
            const nextMatch = safeBracket.find(
                (nm) => nm.round === r - 1 && nm.slot === Math.floor(m.slot / 2)
            );
            if (!nextMatch) return;
            const isTeam2 = m.slot % 2 === 1;

            // Resuelve el casillero de la ronda siguiente y, si quedó completo,
            // lo auto-confirma cuando hay un BYE de por medio.
            const advance = (slot: BrSlot<P>) => {
                if (isTeam2) nextMatch.team2 = slot;
                else nextMatch.team1 = slot;

                if (!nextMatch.team1 || !nextMatch.team2) return;
                const isT1Bye = nextMatch.team1 === "BYE";
                const isT2Bye = nextMatch.team2 === "BYE";
                if (nextMatch.status === "in_progress" || (!isT1Bye && !isT2Bye)) return;

                if (isT1Bye && isT2Bye) {
                    // Sigue sin haber nadie: se da por jugado sin ganador y el
                    // BYE vuelve a subir en la próxima vuelta.
                    nextMatch.confirmed = true;
                    nextMatch.winnerId = undefined;
                    nextMatch.winnerName = undefined;
                    nextMatch.status = "completed";
                    return;
                }

                const realTeam = isT1Bye ? nextMatch.team2 : nextMatch.team1;
                if (isRealPlayer(realTeam)) {
                    nextMatch.confirmed = true;
                    nextMatch.winnerId = realTeam.id;
                    nextMatch.winnerName = realTeam.name;
                    nextMatch.status = "completed";
                }
            };

            if (m.confirmed && m.winnerId) {
                let winner = [m.team1, m.team2].find(
                    (t) => t !== null && t !== "BYE" && (t as P).id === m.winnerId
                );
                if (!winner && m.score1 !== undefined && m.score2 !== undefined && m.score1 !== m.score2) {
                    winner = m.score1 > m.score2 ? m.team1 : m.team2;
                }
                advance((winner as P) || null);
            } else if (m.confirmed && isDoubleBye(m)) {
                advance("BYE");
            } else {
                if (isTeam2) nextMatch.team2 = null;
                else nextMatch.team1 = null;
                nextMatch.confirmed = false;
                nextMatch.winnerId = undefined;
                nextMatch.winnerName = undefined;
            }
        });
    }

    return safeBracket;
}
