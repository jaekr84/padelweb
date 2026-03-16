
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

async function migrate() {
    const url = process.env.DATABASE_URL;
    if (!url) {
        console.error("DATABASE_URL not found");
        process.exit(1);
    }
    
    let finalUrl = url;
    if (url.startsWith("postgres") || url.includes("sslmode=")) {
        finalUrl = url.replace("postgres://", "mysql://").replace("postgresql://", "mysql://").split("?")[0];
    }

    const connection = await mysql.createConnection(finalUrl);
    
    console.log("Adding columns to group_matches...");
    try {
        await connection.execute("ALTER TABLE group_matches ADD COLUMN team1_id VARCHAR(36) AFTER group_id");
        await connection.execute("ALTER TABLE group_matches ADD COLUMN team2_id VARCHAR(36) AFTER team1_id");
    } catch (e) {
        console.log("Columns might already exist in group_matches");
    }

    console.log("Adding columns to bracket_matches...");
    try {
        await connection.execute("ALTER TABLE bracket_matches ADD COLUMN team1_id VARCHAR(36) AFTER slot");
        await connection.execute("ALTER TABLE bracket_matches ADD COLUMN team2_id VARCHAR(36) AFTER team1_id");
    } catch (e) {
        console.log("Columns might already exist in bracket_matches");
    }

    await connection.end();
    console.log("Done.");
}

migrate();
