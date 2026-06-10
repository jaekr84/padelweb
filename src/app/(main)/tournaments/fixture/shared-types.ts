// Shared tournament types used by both the Robin (round-robin) and Americano modules.
// Each module's ./types.ts re-exports from here so local imports stay unchanged.

export type Player = {
    id: string;
    name: string;
    category?: string | null;
    club?: string | null;
    clubId?: string | null;
    ranking?: number | null;
    player1?: string | null;
    player2?: string | null;
    userId?: string;
    partnerUserId?: string | null;
    image?: string | null;
    partnerImage?: string | null;
    // Withdrawn from the tournament (injury, left early, never showed up):
    // played matches are kept, but no new matches are generated for them
    withdrawn?: boolean;
};

export type Group = {
    id: string;
    name: string;
    players: Player[];
    courtNumber?: string | number | null;
};

export type Match = {
    id: string;
    groupId: string;
    team1: Player;
    team2: Player;
    score1?: number;
    score2?: number;
    played: boolean;
    confirmed: boolean;
    status?: string;
    roundIndex?: number;
    courtNumber?: number;
};

export type BracketSlot = Player | "BYE" | null;

export type BracketMatch = {
    id: string;
    round: number;
    slot: number;
    team1: BracketSlot;
    team2: BracketSlot;
    score1?: number;
    score2?: number;
    confirmed: boolean;
    status?: string;
    winnerId?: string;
    winnerName?: string;
};

export type Standing = {
    playerId: string;
    player: Player;
    points: number;
    matchesPlayed: number;
    won: number;
    lost: number;
    gamesWon: number;
    gamesLost: number;
};
