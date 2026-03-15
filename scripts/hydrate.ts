import { db } from "../src/db";
import { users, tournaments, registrations, bracketMatches, clubs, tournamentGroups, groupMatches } from "../src/db/schema";
import { faker } from "@faker-js/faker";
import crypto from "crypto";

async function seed() {
    console.log("🚀 Iniciando hidratación completa...");
    const start = Date.now();

    const allUsers = [];
    const allClubs = [];
    const allTournaments = [];
    const allRegistrations = [];
    const allGroups = [];
    const allGroupMatches = [];
    const allBracketMatches = [];

    // 1. Generar 7 Clubs
    const clubsIds = [];
    for (let i = 0; i < 7; i++) {
        const userId = crypto.randomUUID();
        const clubId = crypto.randomUUID();
        const name = faker.company.name() + " Padel Club";
        
        allUsers.push({
            id: userId,
            email: faker.internet.email().toLowerCase(),
            firstName: name,
            lastName: "",
            role: "club",
            points: 0,
            category: "D",
            gender: "masculino",
        });

        allClubs.push({
            id: clubId,
            ownerId: userId,
            name: name,
            type: "club",
            location: faker.location.city(),
            address: faker.location.streetAddress(),
            courts: faker.number.int({ min: 2, max: 10 }),
            verified: true,
            rating: faker.number.float({ min: 4, max: 5, precision: 0.1 }).toString(),
        });

        clubsIds.push({ userId, clubId });
    }

    // 2. Generar Jugadores
    const playersInMem = [];
    for (const club of clubsIds) {
        const playerCount = faker.number.int({ min: 10, max: 15 });
        for (let i = 0; i < playerCount; i++) {
            const player = {
                id: crypto.randomUUID(),
                email: faker.internet.email().toLowerCase(),
                firstName: faker.person.firstName(),
                lastName: faker.person.lastName(),
                role: "jugador",
                points: faker.number.int({ min: 0, max: 1500 }),
                category: faker.helpers.arrayElement(["D", "C", "B", "A", "A+"]),
                gender: faker.helpers.arrayElement(["masculino", "femenino"]),
            };
            allUsers.push(player);
            playersInMem.push(player);
        }
    }

    // 3. Generar Torneos
    for (const club of clubsIds) {
        const tId = crypto.randomUUID();
        const category = faker.helpers.arrayElement(["D", "C", "B"]);

        allTournaments.push({
            id: tId,
            name: "Copa " + faker.commerce.productAdjective() + " " + category,
            description: faker.lorem.sentence(),
            status: "finished",
            createdByUserId: club.userId,
            clubId: club.clubId,
            pointsConfig: { winner: 200, finalist: 120, semi: 80, quarter: 40 },
            categories: [category],
            modalidad: { mode: "categorias", participacion: "pareja", genero: "mixto" }
        });

        // 6 jugadores para 2 grupos de 3
        const participants = faker.helpers.arrayElements(playersInMem, 6);
        const teamRefs = [];

        for (let i = 0; i < 6; i += 2) {
            const p1 = participants[i];
            const p2 = participants[i + 1];
            const rId = crypto.randomUUID();

            allRegistrations.push({
                id: rId,
                tournamentId: tId,
                userId: p1.id,
                partnerUserId: p2.id,
                partnerName: `${p2.firstName} ${p2.lastName}`,
                category: category,
                status: "confirmed",
            });

            teamRefs.push({
                id: rId,
                name: `${p1.firstName} / ${p2.firstName}`
            });
        }

        // Crear 2 Grupos
        const groupAId = crypto.randomUUID();
        const groupBId = crypto.randomUUID();
        
        const groupPlayersA = [teamRefs[0], teamRefs[1], { id: "p3", name: "Invitado A" }];
        const groupPlayersB = [teamRefs[2], { id: "p4", name: "Invitado B" }, { id: "p5", name: "Invitado C" }];

        allGroups.push({
            id: groupAId,
            tournamentId: tId,
            name: "Grupo A",
            players: groupPlayersA
        });
        allGroups.push({
            id: groupBId,
            tournamentId: tId,
            name: "Grupo B",
            players: groupPlayersB
        });

        // Partidos de Grupo (simplificado: 1 partido por grupo)
        allGroupMatches.push({
            id: crypto.randomUUID(),
            tournamentId: tId,
            groupId: groupAId,
            team1Name: teamRefs[0].name,
            team2Name: teamRefs[1].name,
            score1: 6, score2: 4, confirmed: true
        });
        allGroupMatches.push({
            id: crypto.randomUUID(),
            tournamentId: tId,
            groupId: groupBId,
            team1Name: teamRefs[2].name,
            team2Name: "Pareja Invitada",
            score1: 6, score2: 2, confirmed: true
        });

        // Semis
        const sem1Id = teamRefs[0];
        const sem2Id = teamRefs[2];

        allBracketMatches.push({
            id: crypto.randomUUID(),
            tournamentId: tId,
            round: 1,
            slot: 0,
            team1Name: sem1Id.name,
            team2Name: "Segundo Grupo B",
            score1: 6, score2: 1, confirmed: true,
            winnerId: sem1Id.id, winnerName: sem1Id.name
        });

        allBracketMatches.push({
            id: crypto.randomUUID(),
            tournamentId: tId,
            round: 1,
            slot: 1,
            team1Name: sem2Id.name,
            team2Name: "Segundo Grupo A",
            score1: 6, score2: 4, confirmed: true,
            winnerId: sem2Id.id, winnerName: sem2Id.name
        });

        // Final
        allBracketMatches.push({
            id: crypto.randomUUID(),
            tournamentId: tId,
            round: 0,
            slot: 0,
            team1Name: sem1Id.name,
            team2Name: sem2Id.name,
            score1: 6, score2: 3, confirmed: true,
            winnerId: sem1Id.id, winnerName: sem1Id.name
        });
    }

    console.log("📊 RESUMEN DE DATOS:");
    console.log(`- Usuarios: ${allUsers.length}`);
    console.log(`- Clubes: ${allClubs.length}`);
    console.log(`- Torneos: ${allTournaments.length}`);
    console.log(`- Inscripciones: ${allRegistrations.length}`);
    console.log(`- Grupos: ${allGroups.length}`);
    console.log(`- Partidos Grupo: ${allGroupMatches.length}`);
    console.log(`- Partidos Cuadro: ${allBracketMatches.length}`);

    console.log("📦 Insertando en DB...");
    await db.insert(users).values(allUsers);
    await db.insert(clubs).values(allClubs);
    await db.insert(tournaments).values(allTournaments);
    await db.insert(registrations).values(allRegistrations);
    await db.insert(tournamentGroups).values(allGroups);
    await db.insert(groupMatches).values(allGroupMatches);
    await db.insert(bracketMatches).values(allBracketMatches);

    const end = Date.now();
    console.log(`✅ Seed completado en ${(end - start) / 1000}s`);
    process.exit(0);
}

seed().catch(err => {
    console.error("❌ Error en el seed:", err);
    process.exit(1);
});

