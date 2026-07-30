// Load .env BEFORE importing the db (db/index.ts reads DATABASE_URL at import time).
import "dotenv/config";
import { db } from "../src/db";
import { sql } from "drizzle-orm";

// Módulo Desafío — Etapa 1: tablas.
// Spec: docs/desafio-specs.md
//
//   npx tsx scripts/add-desafio.ts
//
// Idempotente: se puede correr las veces que haga falta.
//
// COLLATE explícito en todas: el resto de la base usa utf8mb4_unicode_ci y
// MariaDB, si no se lo decís, aplica su default (utf8mb4_uca1400_ai_ci). Los
// JOIN contra `users` revientan con "Illegal mix of collations" (errno 1267).

const COLLATE = "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

async function run(label: string, statement: string) {
    try {
        await db.execute(sql.raw(statement));
        console.log(`✅ ${label}`);
    } catch (error: any) {
        // Drizzle envuelve el error real del driver en `.cause`.
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

const TABLES: [string, string][] = [
    ["challenges", `
        CREATE TABLE IF NOT EXISTS \`challenges\` (
            \`id\` VARCHAR(36) NOT NULL,
            \`name\` VARCHAR(256) NOT NULL,
            \`description\` TEXT,
            \`status\` VARCHAR(20) NOT NULL DEFAULT 'borrador',
            \`category_id\` VARCHAR(36) NOT NULL,
            \`participation_points\` INT NOT NULL DEFAULT 1,
            \`win_points\` INT NOT NULL DEFAULT 3,
            \`loss_points\` INT NOT NULL DEFAULT 0,
            \`start_date\` VARCHAR(50),
            \`end_date\` VARCHAR(50),
            \`location\` VARCHAR(256),
            \`time\` VARCHAR(50),
            \`registration_fee\` INT,
            \`max_slots\` INT NOT NULL DEFAULT 0,
            \`created_by_user_id\` VARCHAR(256) NOT NULL,
            \`opened_at\` TIMESTAMP NULL,
            \`closed_at\` TIMESTAMP NULL,
            \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (\`id\`)
        ) ${COLLATE}
    `],
    ["challenge_courts", `
        CREATE TABLE IF NOT EXISTS \`challenge_courts\` (
            \`id\` VARCHAR(36) NOT NULL,
            \`challenge_id\` VARCHAR(36) NOT NULL,
            \`number\` INT NOT NULL,
            \`name\` VARCHAR(100),
            \`status\` VARCHAR(20) NOT NULL DEFAULT 'libre',
            \`current_match_id\` VARCHAR(36),
            \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (\`id\`)
        ) ${COLLATE}
    `],
    ["challenge_registrations", `
        CREATE TABLE IF NOT EXISTS \`challenge_registrations\` (
            \`id\` VARCHAR(36) NOT NULL,
            \`challenge_id\` VARCHAR(36) NOT NULL,
            \`user_id\` VARCHAR(256) NOT NULL,
            \`side\` VARCHAR(20) NOT NULL,
            \`category_name\` VARCHAR(50),
            \`status\` VARCHAR(20) NOT NULL DEFAULT 'disponible',
            \`is_exception\` BOOLEAN NOT NULL DEFAULT FALSE,
            \`registered_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (\`id\`)
        ) ${COLLATE}
    `],
    ["challenge_pairs", `
        CREATE TABLE IF NOT EXISTS \`challenge_pairs\` (
            \`id\` VARCHAR(36) NOT NULL,
            \`challenge_id\` VARCHAR(36) NOT NULL,
            \`player_a_id\` VARCHAR(256) NOT NULL,
            \`player_b_id\` VARCHAR(256) NOT NULL,
            \`active\` BOOLEAN NOT NULL DEFAULT TRUE,
            \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            \`dissolved_at\` TIMESTAMP NULL,
            PRIMARY KEY (\`id\`)
        ) ${COLLATE}
    `],
    ["challenge_matches", `
        CREATE TABLE IF NOT EXISTS \`challenge_matches\` (
            \`id\` VARCHAR(36) NOT NULL,
            \`challenge_id\` VARCHAR(36) NOT NULL,
            \`court_id\` VARCHAR(36) NOT NULL,
            \`t1_p1_id\` VARCHAR(256) NOT NULL,
            \`t1_p2_id\` VARCHAR(256) NOT NULL,
            \`t2_p1_id\` VARCHAR(256) NOT NULL,
            \`t2_p2_id\` VARCHAR(256) NOT NULL,
            \`pair1_id\` VARCHAR(36),
            \`pair2_id\` VARCHAR(36),
            \`status\` VARCHAR(25) NOT NULL DEFAULT 'en_curso',
            \`sets\` JSON,
            \`games_team1\` SMALLINT,
            \`games_team2\` SMALLINT,
            \`winner_team\` SMALLINT,
            \`reported_by_user_id\` VARCHAR(256),
            \`confirmed_by_user_id\` VARCHAR(256),
            \`rejection_reason\` TEXT,
            \`started_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            \`reported_at\` TIMESTAMP NULL,
            \`confirmed_at\` TIMESTAMP NULL,
            PRIMARY KEY (\`id\`)
        ) ${COLLATE}
    `],
    ["challenge_queue", `
        CREATE TABLE IF NOT EXISTS \`challenge_queue\` (
            \`id\` VARCHAR(36) NOT NULL,
            \`challenge_id\` VARCHAR(36) NOT NULL,
            \`pair_id\` VARCHAR(36) NOT NULL,
            \`rival_pair_id\` VARCHAR(36),
            \`position\` INT NOT NULL,
            \`status\` VARCHAR(20) NOT NULL DEFAULT 'esperando',
            \`entered_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            \`assigned_at\` TIMESTAMP NULL,
            PRIMARY KEY (\`id\`)
        ) ${COLLATE}
    `],
    ["challenge_points", `
        CREATE TABLE IF NOT EXISTS \`challenge_points\` (
            \`id\` VARCHAR(36) NOT NULL,
            \`challenge_id\` VARCHAR(36) NOT NULL,
            \`user_id\` VARCHAR(256) NOT NULL,
            \`type\` VARCHAR(20) NOT NULL,
            \`points\` INT NOT NULL,
            \`match_id\` VARCHAR(36) NOT NULL DEFAULT '',
            \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (\`id\`)
        ) ${COLLATE}
    `],
];

const INDEXES: [string, string][] = [
    ["challenges_status_category_idx", "CREATE INDEX `challenges_status_category_idx` ON `challenges` (`status`, `category_id`)"],
    ["challenges_created_by_idx", "CREATE INDEX `challenges_created_by_idx` ON `challenges` (`created_by_user_id`)"],

    ["challenge_courts_challenge_idx", "CREATE INDEX `challenge_courts_challenge_idx` ON `challenge_courts` (`challenge_id`)"],
    ["challenge_courts_challenge_number_uniq", "CREATE UNIQUE INDEX `challenge_courts_challenge_number_uniq` ON `challenge_courts` (`challenge_id`, `number`)"],
    // El candado de concurrencia de la spec.
    ["challenge_courts_current_match_uniq", "CREATE UNIQUE INDEX `challenge_courts_current_match_uniq` ON `challenge_courts` (`current_match_id`)"],

    ["challenge_registrations_challenge_user_uniq", "CREATE UNIQUE INDEX `challenge_registrations_challenge_user_uniq` ON `challenge_registrations` (`challenge_id`, `user_id`)"],
    ["challenge_registrations_challenge_status_idx", "CREATE INDEX `challenge_registrations_challenge_status_idx` ON `challenge_registrations` (`challenge_id`, `status`)"],
    ["challenge_registrations_user_idx", "CREATE INDEX `challenge_registrations_user_idx` ON `challenge_registrations` (`user_id`)"],

    ["challenge_pairs_challenge_active_idx", "CREATE INDEX `challenge_pairs_challenge_active_idx` ON `challenge_pairs` (`challenge_id`, `active`)"],
    ["challenge_pairs_player_a_idx", "CREATE INDEX `challenge_pairs_player_a_idx` ON `challenge_pairs` (`player_a_id`)"],
    ["challenge_pairs_player_b_idx", "CREATE INDEX `challenge_pairs_player_b_idx` ON `challenge_pairs` (`player_b_id`)"],

    ["challenge_matches_challenge_status_idx", "CREATE INDEX `challenge_matches_challenge_status_idx` ON `challenge_matches` (`challenge_id`, `status`)"],
    ["challenge_matches_court_idx", "CREATE INDEX `challenge_matches_court_idx` ON `challenge_matches` (`court_id`)"],

    ["challenge_queue_challenge_status_position_idx", "CREATE INDEX `challenge_queue_challenge_status_position_idx` ON `challenge_queue` (`challenge_id`, `status`, `position`)"],
    ["challenge_queue_pair_idx", "CREATE INDEX `challenge_queue_pair_idx` ON `challenge_queue` (`pair_id`)"],

    // Hace idempotente la escritura de puntos: confirmar dos veces no duplica.
    ["challenge_points_ledger_uniq", "CREATE UNIQUE INDEX `challenge_points_ledger_uniq` ON `challenge_points` (`challenge_id`, `user_id`, `type`, `match_id`)"],
    ["challenge_points_challenge_user_idx", "CREATE INDEX `challenge_points_challenge_user_idx` ON `challenge_points` (`challenge_id`, `user_id`)"],
    ["challenge_points_match_idx", "CREATE INDEX `challenge_points_match_idx` ON `challenge_points` (`match_id`)"],
];

async function main() {
    console.log("🚀 Migración: módulo Desafío (Etapa 1)\n");

    console.log("── Tablas ──");
    for (const [label, statement] of TABLES) await run(`tabla ${label}`, statement);

    console.log("\n── Índices ──");
    for (const [label, statement] of INDEXES) await run(label, statement);

    console.log("\n🏁 Listo.");
    process.exit(0);
}

main();
