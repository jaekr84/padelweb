export type Player = { 
    id: string; 
    name: string; 
    category?: string | null; 
    club?: string | null; 
    ranking?: number | null; 
    player1?: string; 
    player2?: string;
    userId?: string;
    partnerUserId?: string | null;
};

export type Group = { 
    id: string; 
    name: string; 
    players: Player[]; 
    courtNumber?: string | null 
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
