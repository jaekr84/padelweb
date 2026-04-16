import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

const env = dotenv.parse(readFileSync('.env'));
const url = env.DATABASE_URL;

async function run() {
    console.log('Connecting to database...');
    const connection = await mysql.createConnection(url);
    try {
        console.log('Checking for system_settings table...');
        const [tables] = await connection.execute("SHOW TABLES LIKE 'system_settings'");
        if (tables.length === 0) {
            console.log('Creating system_settings table...');
            await connection.execute(`
                CREATE TABLE system_settings (
                    id VARCHAR(36) PRIMARY KEY,
                    \`key\` VARCHAR(255) NOT NULL UNIQUE,
                    value TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_NOW
                )
            `.replace('CURRENT_NOW', 'CURRENT_TIMESTAMP'));
            console.log('Table system_settings created.');
        } else {
            console.log('Table system_settings already exists.');
        }
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await connection.end();
    }
}

run();
