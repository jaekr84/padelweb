import { Player } from "./types";

// Per-member attendance/payment keys for pair teams.
// A pair team stores one key per member ("teamId::1" / "teamId::2").
// A plain team id in the set is legacy data and means "both members checked".

export const pairNames = (p: Player) =>
    p.name.split(/[\/\+]/).map(n => n.trim()).filter(Boolean);

export const isPairPlayer = (p: Player) => pairNames(p).length > 1;

export const memberKey = (teamId: string, slot: 1 | 2) => `${teamId}::${slot}`;

export const isMemberChecked = (set: Set<string>, teamId: string, slot: 1 | 2) =>
    set.has(teamId) || set.has(memberKey(teamId, slot));

// A pair only counts as checked (e.g. available to play) when both members are.
export const isTeamChecked = (set: Set<string>, p: Player) =>
    isPairPlayer(p)
        ? isMemberChecked(set, p.id, 1) && isMemberChecked(set, p.id, 2)
        : set.has(p.id);

export const checkKeysFor = (p: Player): string[] =>
    isPairPlayer(p) ? [memberKey(p.id, 1), memberKey(p.id, 2)] : [p.id];

// Toggle a key, expanding a legacy plain team id into member keys first.
export const toggleCheckKey = (set: Set<string>, key: string): Set<string> => {
    const next = new Set(set);
    const [teamId, slot] = key.split("::");
    if (slot && teamId && next.has(teamId)) {
        next.delete(teamId);
        next.add(memberKey(teamId, 1));
        next.add(memberKey(teamId, 2));
    }
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
};

// Move every key variant (plain, ::1, ::2) from one team id to another.
export const remapCheckKeys = (set: Set<string>, oldId: string, newId: string): Set<string> => {
    const next = new Set(set);
    const variants: [string, string][] = [
        [oldId, newId],
        [memberKey(oldId, 1), memberKey(newId, 1)],
        [memberKey(oldId, 2), memberKey(newId, 2)],
    ];
    variants.forEach(([oldKey, newKey]) => {
        if (next.has(oldKey)) {
            next.delete(oldKey);
            next.add(newKey);
        }
    });
    return next;
};

export const removeCheckKeys = (set: Set<string>, teamId: string): Set<string> => {
    const next = new Set(set);
    next.delete(teamId);
    next.delete(memberKey(teamId, 1));
    next.delete(memberKey(teamId, 2));
    return next;
};
