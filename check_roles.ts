
import dotenv from "dotenv";
dotenv.config();
import { neon } from '@neondatabase/serverless';

async function run() {
    const sql = neon(process.env.DATABASE_URL!);
    const roles = await sql`SELECT role, count(*) FROM users GROUP BY role`;
    console.log("Roles:", roles);
}
run();
