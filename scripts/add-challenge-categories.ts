// Load .env BEFORE importing the db (db/index.ts reads DATABASE_URL at import time).
import "dotenv/config";
import { db } from "../src/db";
import { sql } from "drizzle-orm";

// Módulo Desafío — categorías múltiples.
//
//   npx tsx scripts/add-challenge-categories.ts
//
// Crea `challenge_categories` y hace el backfill: cada desafío que ya existe
// queda con su `category_id` actual como única categoría admitida, así que el
// comportamiento no cambia hasta que el admin edite el desafío.
//
// Idempotente: se puede correr las veces que haga falta.
//
// COLLATE explícito, igual que en add-desafio.ts: si no, MariaDB aplica su
// default y los JOIN contra `categories` fallan con "Illegal mix of collations".

const COLLATE = "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

async function run(label: string, statement: string) {
    try {
        await db.execute(sql.raw(statement));
        console.log(`✅ ${label}`);
    } catch (error: any) {
        const cause = error?.cause ?? error;
        const code = cause?.code || cause?.errno;
        const msg = cause?.sqlMessage || cause?.message || String(cause);
        if (
            code === "ER_TABLE_EXISTS_ERROR" ||
            code === "ER_DUP_KEYNAME" ||
            code === "ER_DUP_FIELDNAME" ||
            /already exists|duplicate key name/i.test(msg)
        ) {
            console.log(`ℹ️ ${label} — ya existía`);
        } else {
            console.error(`❌ ${label} → [${code}] ${msg}`);
        }
    }
}

async function main() {
    console.log("🚀 Migración: categorías múltiples por desafío\n");

    await run("tabla challenge_categories", `
        CREATE TABLE IF NOT EXISTS \`challenge_categories\` (
            \`challenge_id\` VARCHAR(36) NOT NULL,
            \`category_id\` VARCHAR(36) NOT NULL,
            PRIMARY KEY (\`challenge_id\`, \`category_id\`)
        ) ${COLLATE}
    `);

    await run(
        "challenge_categories_category_idx",
        "CREATE INDEX `challenge_categories_category_idx` ON `challenge_categories` (`category_id`)"
    );

    // Backfill. El INSERT IGNORE + la PK compuesta lo hacen idempotente y no
    // pisan lo que el admin ya haya editado a mano.
    await run("backfill desde challenges.category_id", `
        INSERT IGNORE INTO \`challenge_categories\` (\`challenge_id\`, \`category_id\`)
        SELECT \`id\`, \`category_id\` FROM \`challenges\` WHERE \`category_id\` <> ''
    `);

    const [filas] = (await db.execute(
        sql.raw("SELECT COUNT(*) AS n FROM `challenge_categories`")
    )) as any;
    console.log(`\n📊 ${filas?.[0]?.n ?? "?"} vínculos desafío↔categoría en la tabla.`);

    console.log("\n🏁 Listo.");
    process.exit(0);
}

main();
