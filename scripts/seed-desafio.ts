// Load .env BEFORE importing the db (db/index.ts reads DATABASE_URL at import time).
import "dotenv/config";
import { db } from "../src/db";
import {
    categoriesTable, challengeCourts, challengeMatches, challengePairs, challengePoints,
    challengeQueue, challengeRegistrations, challenges, users,
} from "../src/db/schema";
import { asc, eq, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { entradaParticipacion, normalizarLado } from "../src/lib/desafio";

// Datos de prueba del módulo Desafío.
//
//   npx tsx scripts/seed-desafio.ts            → crea jugadores + un desafío listo para jugar
//   npx tsx scripts/seed-desafio.ts --delete   → borra todo lo que creó
//
// Idempotente: se puede correr las veces que haga falta.

const DESAFIO_ID = "seed-desafio-demo";
const PASSWORD = "test1234";

const JUGADORES = [
    { email: "desafio01@test.com", firstName: "Martín", lastName: "Álvarez", category: "A", side: "drive", gender: "masculino" },
    { email: "desafio02@test.com", firstName: "Lucas", lastName: "Benítez", category: "A", side: "reves", gender: "masculino" },
    { email: "desafio03@test.com", firstName: "Sofía", lastName: "Cabrera", category: "A", side: "ambos", gender: "femenino" },
    { email: "desafio04@test.com", firstName: "Diego", lastName: "Domínguez", category: "A", side: "drive", gender: "masculino" },
    { email: "desafio05@test.com", firstName: "Valentina", lastName: "Esposito", category: "A", side: "reves", gender: "femenino" },
    { email: "desafio06@test.com", firstName: "Nicolás", lastName: "Ferreyra", category: "A", side: "drive", gender: "masculino" },
    { email: "desafio07@test.com", firstName: "Camila", lastName: "Gutiérrez", category: "A", side: "reves", gender: "femenino" },
    { email: "desafio08@test.com", firstName: "Julián", lastName: "Herrera", category: "A", side: "ambos", gender: "masculino" },
    // Fuera de la categoría del desafío: sirven para probar el bloqueo y la excepción.
    { email: "desafio09@test.com", firstName: "Rocío", lastName: "Ibáñez", category: "B", side: "drive", gender: "femenino" },
    { email: "desafio10@test.com", firstName: "Tomás", lastName: "Juárez", category: "C", side: "reves", gender: "masculino" },
];

const EMAILS = JUGADORES.map((j) => j.email);

async function borrar() {
    for (const t of [challengePoints, challengeQueue, challengeMatches, challengePairs, challengeRegistrations, challengeCourts]) {
        await db.delete(t).where(eq((t as any).challengeId, DESAFIO_ID));
    }
    await db.delete(challenges).where(eq(challenges.id, DESAFIO_ID));
    console.log("🗑️  desafío de prueba eliminado");

    const existentes = await db.select({ id: users.id }).from(users).where(inArray(users.email, EMAILS));
    if (existentes.length) {
        await db.delete(users).where(inArray(users.email, EMAILS));
        console.log(`🗑️  ${existentes.length} jugadores de prueba eliminados`);
    }
}

async function sembrar() {
    // 1. Jugadores
    const hash = await bcrypt.hash(PASSWORD, 10);
    for (const j of JUGADORES) {
        const [existe] = await db.select({ id: users.id }).from(users).where(eq(users.email, j.email)).limit(1);
        const datos = {
            passwordHash: hash, role: "jugador", firstName: j.firstName, lastName: j.lastName,
            category: j.category, side: j.side, gender: j.gender, isActive: true, approvalStatus: "approved",
        };
        if (existe) await db.update(users).set(datos).where(eq(users.id, existe.id));
        else await db.insert(users).values({ id: crypto.randomUUID(), email: j.email, points: 0, ...datos });
    }
    console.log(`✅ ${JUGADORES.length} jugadores (contraseña: ${PASSWORD})`);

    // 2. Categoría A y un admin que figure como creador
    const [catA] = await db.select({ id: categoriesTable.id, name: categoriesTable.name })
        .from(categoriesTable).where(eq(categoriesTable.name, "A")).limit(1);
    if (!catA) {
        console.error('❌ No existe la categoría "A". Creala en Admin → Categorías.');
        process.exit(1);
    }
    const [admin] = await db.select({ id: users.id }).from(users)
        .where(inArray(users.role, ["superadmin", "admin"])).limit(1);

    // 3. El desafío, abierto y listo
    await db.delete(challenges).where(eq(challenges.id, DESAFIO_ID));
    await db.insert(challenges).values({
        id: DESAFIO_ID,
        name: "Desafío de Prueba",
        description: "Datos de prueba para el panel. Se borra con --delete.",
        status: "abierto",
        categoryId: catA.id,
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
        time: "19:00",
        location: "Club de prueba",
        registrationFee: 5000,
        maxSlots: 0,
        createdByUserId: admin?.id ?? "seed-admin",
    });
    console.log(`✅ desafío "Desafío de Prueba" abierto en categoría ${catA.name}`);

    // 4. Tres canchas
    await db.insert(challengeCourts).values(
        [1, 2, 3].map((n) => ({ id: crypto.randomUUID(), challengeId: DESAFIO_ID, number: n, status: "libre" as const }))
    );
    console.log("✅ 3 canchas libres");

    // 5. Inscribir a los 8 de categoría A, con su punto de participación
    const deA = JUGADORES.filter((j) => j.category === "A");
    const filas = await db.select({ id: users.id, email: users.email, side: users.side, category: users.category })
        .from(users).where(inArray(users.email, deA.map((j) => j.email))).orderBy(asc(users.email));

    for (const u of filas) {
        await db.insert(challengeRegistrations).values({
            id: crypto.randomUUID(), challengeId: DESAFIO_ID, userId: u.id,
            side: normalizarLado(u.side), categoryName: u.category, status: "disponible",
        });
        const punto = entradaParticipacion(u.id);
        await db.insert(challengePoints).values({
            id: crypto.randomUUID(), challengeId: DESAFIO_ID, userId: u.id,
            type: punto.tipo, points: punto.puntos, matchId: punto.matchId,
        });
    }
    console.log(`✅ ${filas.length} inscriptos con su punto de participación`);

    // 6. Dos parejas armadas, y cuatro jugadores sueltos para probar el pool
    const parejas = [[filas[0], filas[1]], [filas[2], filas[3]]];
    for (const [a, b] of parejas) {
        await db.insert(challengePairs).values({
            id: crypto.randomUUID(), challengeId: DESAFIO_ID, playerAId: a.id, playerBId: b.id, active: true,
        });
        await db.update(challengeRegistrations).set({ status: "emparejado" })
            .where(inArray(challengeRegistrations.userId, [a.id, b.id]));
    }
    console.log("✅ 2 parejas armadas, 4 jugadores sin pareja");

    console.log(`\n🏁 Listo. Panel: /gestionDesafio/${DESAFIO_ID}`);
}

async function main() {
    const borrando = process.argv.includes("--delete");
    console.log(borrando ? "🗑️  Borrando datos de prueba del Desafío...\n" : "🚀 Sembrando datos de prueba del Desafío...\n");
    if (borrando) await borrar();
    else await sembrar();
    process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
