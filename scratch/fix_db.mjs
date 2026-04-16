import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Load .env manually
const env = dotenv.parse(readFileSync('.env'));
const url = env.DATABASE_URL;

async function run() {
    console.log('Connecting to database...');
    const connection = await mysql.createConnection(url);
    try {
        console.log('Adding column is_members_only to tournaments...');
        await connection.execute('ALTER TABLE tournaments ADD COLUMN is_members_only TINYINT(1) DEFAULT 0');
        console.log('Success!');
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log('Column is_members_only already exists.');
        } else {
            console.error('Error:', e);
        }
    } finally {
        await connection.end();
    }
}

run();
