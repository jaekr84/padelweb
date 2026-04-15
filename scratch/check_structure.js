const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    try {
        const [rows] = await connection.execute("DESCRIBE tournaments;");
        console.log('Table structure:', JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error('Error fetching structure:', err);
    } finally {
        await connection.end();
    }
}

run();
