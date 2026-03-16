import { db } from "./src/db";
import { tournaments, clubs, users } from "./src/db/schema";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

async function seed() {
    console.log("Seeding tournaments...");
    
    const [u] = await db.select().from(users).limit(1);
    const [c] = await db.select().from(clubs).limit(1);

    if (!u || !c) {
        console.error("No users or clubs found to link tournaments.");
        process.exit(1);
    }

    const months = [
        { name: "Abril 2026", date: "2026-04-10" },
        { name: "Mayo 2026", date: "2026-05-15" },
        { name: "Junio 2026", date: "2026-06-20" },
        { name: "Julio 2026", date: "2026-07-25" },
        { name: "Agosto 2026", date: "2026-08-05" },
    ];

    for (const m of months) {
        const id = crypto.randomUUID();
        await db.insert(tournaments).values({
            id,
            name: `Torneo Mensual - ${m.name}`,
            description: `Torneo de prueba para el mes de ${m.name}`,
            startDate: m.date,
            endDate: m.date,
            createdByUserId: u.id,
            clubId: c.id,
            status: "published",
            categories: JSON.stringify(["C", "D"]),
            modalidad: JSON.stringify({ participacion: "parejas", genero: "hombre" }),
            openDateGeneral: "2026-03-01",
        });
        console.log(`Created tournament for ${m.name}`);
    }

    console.log("Finished seeding!");
    process.exit(0);
}

seed().catch(err => {
    console.error(err);
    process.exit(1);
});
