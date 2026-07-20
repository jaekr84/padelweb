// Crea la tabla `invitations` (links de invitación de un solo uso).
// Ejecutar una vez con:  npx tsx scripts/add-invitations-table.ts
//
// Cargar .env ANTES de importar la db: src/db/index.ts lee DATABASE_URL al
// importarse y, sin esto, cae al fallback localhost y da ECONNREFUSED.
import "dotenv/config";
import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Creando tabla `invitations`...");

    await db.execute(sql.raw(`
        CREATE TABLE IF NOT EXISTS \`invitations\` (
            \`id\` varchar(36) NOT NULL,
            \`role\` varchar(50) NOT NULL,
            \`club_id\` varchar(256),
            \`email\` varchar(256),
            \`created_by\` varchar(256) NOT NULL,
            \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            \`expires_at\` timestamp NOT NULL,
            \`used_at\` timestamp NULL,
            \`used_by_user_id\` varchar(256),
            \`revoked_at\` timestamp NULL,
            CONSTRAINT \`invitations_id\` PRIMARY KEY(\`id\`)
        )
    `));

    // Índices aparte: MySQL no soporta IF NOT EXISTS en CREATE INDEX.
    for (const [name, column] of [
        ["invitations_created_by_idx", "created_by"],
        ["invitations_expires_at_idx", "expires_at"],
    ]) {
        try {
            await db.execute(sql.raw(`CREATE INDEX \`${name}\` ON \`invitations\` (\`${column}\`)`));
            console.log(`  ✓ índice ${name}`);
        } catch (e: any) {
            // Drizzle envuelve el error de MySQL: el código real viene en `cause`.
            const code = e?.cause?.code ?? e?.code;
            if (code === "ER_DUP_KEYNAME") console.log(`  · índice ${name} ya existía`);
            else throw e;
        }
    }

    // Columna agregada después de la creación inicial: se suma acá para que el
    // script siga sirviendo tanto en bases nuevas como en las que ya migraron.
    try {
        await db.execute(sql.raw("ALTER TABLE `invitations` ADD COLUMN `label` varchar(256)"));
        console.log("  ✓ columna label");
    } catch (e: any) {
        const code = e?.cause?.code ?? e?.code;
        if (code === "ER_DUP_FIELDNAME") console.log("  · columna label ya existía");
        else throw e;
    }

    const [check] = await db.execute(sql.raw("SHOW TABLES LIKE 'invitations'")) as any;
    console.log(check.length ? "✓ Tabla `invitations` lista." : "✗ No se pudo verificar la tabla.");
    process.exit(0);
}

main().catch((e) => {
    console.error("Error:", e);
    process.exit(1);
});
