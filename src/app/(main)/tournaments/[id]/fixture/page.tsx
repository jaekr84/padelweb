import { db } from "@/db";
import { tournaments, registrations, users, categoriesTable, tournamentGroups } from "@/db/schema";
import { eq, inArray, asc } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { sortGroupsByName } from "@/lib/group-order";
import FixtureSetup from "../../fixture/FixtureSetup";
import AmericanoSetup from "../../fixture/AmericanoSetup";


interface Props {
    params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function TournamentFixturePage({ params }: Props) {
    const { id } = await params;

    const [tournament] = await db
        .select({
            id: tournaments.id,
            name: tournaments.name,
            status: tournaments.status,
            createdByUserId: tournaments.createdByUserId,
            modalidad: tournaments.modalidad,
            type: tournaments.type,
            presentPlayerIds: tournaments.presentPlayerIds,
            paidPlayerIds: tournaments.paidPlayerIds,
        })
        .from(tournaments)
        .where(eq(tournaments.id, id))
        .limit(1);

    if (!tournament) notFound();
    
    // Authorization check
    const session = await getSession();
    const isSuperAdmin = session?.role === 'superadmin';
    const isAdmin = session?.role === 'admin';
    const isClub = session?.role === 'club';
    const isOwner = tournament.createdByUserId === session?.userId;
    const isActivePlayer = session?.role === 'jugador';

    const canManage = isSuperAdmin || isAdmin || isClub || isOwner;

    if (!canManage || (isActivePlayer && !isOwner)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-6">
                <div className="bg-card border border-border p-8 rounded-3xl text-center shadow-xl">
                    <h1 className="text-2xl font-black uppercase text-red-500 mb-4">No autorizado</h1>
                    <p className="text-foreground/60">No tenés permisos para configurar este torneo.</p>
                </div>
            </div>
        );
    }

    // Fetch registered players
    const dbRegistrations = await db
        .select({
            id: registrations.id,
            userId: registrations.userId,
            partnerUserId: registrations.partnerUserId,
            partnerName: registrations.partnerName,
            category: registrations.category,
        })
        .from(registrations)
        .where(eq(registrations.tournamentId, id));

    // Also fetch the names of the registrants and partners to build the "Team Name"
    const allUserIds = [...new Set([
        ...dbRegistrations.map(r => r.userId),
        ...dbRegistrations.map(r => r.partnerUserId).filter(Boolean) as string[]
    ])];

    const dbUsers = allUserIds.length > 0 
        ? await db
            .select({ 
                id: users.id, 
                email: users.email, 
                firstName: users.firstName, 
                lastName: users.lastName, 
                gender: users.gender, 
                clubId: users.clubId,
                imageUrl: users.imageUrl
            })
            .from(users)
            .where(inArray(users.id, allUserIds))
        : [];

    // Safely parse tournament modalidad
    let mod: any = tournament.modalidad;
    try {
        if (typeof tournament.modalidad === 'string' && tournament.modalidad.trim().startsWith('{')) {
            mod = JSON.parse(tournament.modalidad);
        }
    } catch (e) {
        console.error("Error parsing modalidad:", e);
    }

    const isIndividual = mod?.participacion === "individual";

    const initialPlayers = dbRegistrations.map(reg => {
        const user = dbUsers.find(u => u.id === reg.userId);
        const namePart1 = user 
            ? ([user.firstName, user.lastName].filter(Boolean).join(" ") || user.email.split("@")[0])
            : "Jugador";
        
        if (isIndividual) {
            return {
                id: reg.id,
                name: namePart1,
                player1: namePart1,
                player2: undefined,
                category: reg.category || undefined,
                email: user?.email || undefined,
                gender: user?.gender || undefined,
                userId: reg.userId,
                partnerUserId: undefined,
                image: user?.imageUrl || null,
            };
        }

        // For doubles, resolve partner name from DB or registrations field
        let namePart2 = reg.partnerName;
        if (reg.partnerUserId) {
            const partnerUser = dbUsers.find(u => u.id === reg.partnerUserId);
            if (partnerUser) {
                namePart2 = [partnerUser.firstName, partnerUser.lastName].filter(Boolean).join(" ");
            }
        }
        
        if (!namePart2) namePart2 = "Invitado";

        return {
            id: reg.id,
            name: `${namePart1} / ${namePart2}`,
            player1: namePart1,
            player2: namePart2,
            category: reg.category || undefined,
            email: user?.email || undefined,
            gender: user?.gender || undefined,
            club: user?.clubId || null,
            image: user?.imageUrl || null,
            partnerImage: (reg.partnerUserId ? dbUsers.find(u => u.id === reg.partnerUserId)?.imageUrl : null) || null,
        };
    });

    const allCategories = await db
        .select()
        .from(categoriesTable)
        .where(eq(categoriesTable.isActive, true))
        .orderBy(asc(categoriesTable.categoryOrder));

    const parseJsonArray = (data: any): string[] => {
        if (!data) return [];
        if (typeof data === 'string') {
            try {
                const parsed = JSON.parse(data);
                return Array.isArray(parsed) ? parsed : [];
            } catch {
                return [];
            }
        }
        return Array.isArray(data) ? data : [];
    };

    // Fetch existing groups if any
    const dbGroups = await db.select().from(tournamentGroups).where(eq(tournamentGroups.tournamentId, id));
    const initialGroups = sortGroupsByName(dbGroups.map(g => {
        const groupPlayers = (typeof g.players === 'string' ? JSON.parse(g.players) : (g.players || [])) as any[];
        return {
            id: g.id,
            name: g.name,
            players: groupPlayers.map(gp => {
                const fullPlayer = initialPlayers.find(p => p.id === gp.id);
                return fullPlayer || gp;
            }),
            courtNumber: g.courtNumber ?? null,
        };
    }));

    if (tournament.type === 'americano') {
        return (
            <AmericanoSetup
                tournamentId={tournament.id}
                tournamentName={tournament.name}
                initialStatus={tournament.status}
                initialPlayers={initialPlayers}
                initialPresent={parseJsonArray(tournament.presentPlayerIds)}
                initialPaid={parseJsonArray(tournament.paidPlayerIds)}
                categories={allCategories.map(c => c.name)}
                isIndividual={isIndividual}
            />
        );
    }

    return (
        <FixtureSetup
            tournamentId={tournament.id}
            tournamentName={tournament.name}
            initialStatus={tournament.status}
            initialPlayers={initialPlayers}
            initialGroups={initialGroups}
            initialPresent={parseJsonArray(tournament.presentPlayerIds)}
            initialPaid={parseJsonArray(tournament.paidPlayerIds)}
            categories={allCategories.map(c => c.name)}
            isIndividual={isIndividual}
        />
    );
}
