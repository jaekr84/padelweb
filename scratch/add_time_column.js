const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    try {
        console.log('Connecting to database...');
        await connection.execute("ALTER TABLE tournaments ADD COLUMN time VARCHAR(50);");
        console.log('Column "time" added successfully!');
    } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('Column "time" already exists.');
        } else {
            console.error('Error adding column:', err);
        }
    } finally {
        await connection.end();
    }
}

run();
