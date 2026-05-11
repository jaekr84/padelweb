
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    try {
        console.log('Adding has_points column to tournaments table...');
        await connection.query('ALTER TABLE tournaments ADD COLUMN has_points TINYINT(1) DEFAULT 1');
        console.log('Success!');
    } catch (err) {
        if (err.code === 'ER_DUP_COLUMN_NAME') {
            console.log('Column has_points already exists.');
        } else {
            console.error('Error:', err);
        }
    } finally {
        await connection.end();
    }
}

run();
