import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("🚀 Empezando migración manual...");
    try {
        await db.execute(sql`ALTER TABLE tournaments ADD COLUMN registration_fee INT NULL DEFAULT NULL`);
        console.log("✅ Columna 'registration_fee' añadida con éxito a la tabla 'tournaments'.");
    } catch (error: any) {
        if (error.message && error.message.includes("Duplicate column name")) {
            console.log("ℹ️ La columna ya existe.");
        } else {
            console.error("❌ Error al ejecutar la migración:", error);
        }
    }
    process.exit(0);
}

main();
