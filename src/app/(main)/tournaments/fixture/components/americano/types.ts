export interface Player {
    id: string;
    name: string;
    category?: string | null;
    clubId?: string | null;
    club?: string | null;
    userId?: string;
    partnerUserId?: string | null;
    image?: string | null;
    partnerImage?: string | null;
    ranking?: number | null;
    player1?: string | null;
    player2?: string | null;
}

export interface Group {
    id: string;
    name: string;
    players: Player[];
}

export interface Match {
    id: string;
    groupId: string;
    team1: Player;
    team2: Player;
    score1?: number;
    score2?: number;
    played: boolean;
    confirmed: boolean;
    roundIndex?: number;
    courtNumber?: number;
}

export type BracketSlot = Player | "BYE" | null;

export interface BracketMatch {
    id: string;
    round: number;
    slot: number;
    team1: BracketSlot;
    team2: BracketSlot;
    score1?: number;
    score2?: number;
    confirmed: boolean;
    status?: string; // 'pending' | 'live' | 'finished'
    winnerId?: string;
    winnerName?: string;
}

export interface Standing {
    playerId: string;
    player: Player;
    points: number;
    matchesPlayed: number;
    won: number;
    lost: number;
    gamesWon: number;
    gamesLost: number;
}
