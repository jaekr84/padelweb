
const mysql = require('mysql2/promise');
require('dotenv').config();

async function test() {
    console.log("Testing connection to:", process.env.DATABASE_URL);
    try {
        const connection = await mysql.createConnection(process.env.DATABASE_URL);
        console.log("CONNECTED SUCCESSFULLY!");
        await connection.end();
    } catch (err) {
        console.error("CONNECTION FAILED:");
        console.error(err);
    }
}

test();
