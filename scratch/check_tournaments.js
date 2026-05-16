const mysql = require('mysql2/promise');
require('dotenv').config();

const getConnectionString = () => {
    let url = process.env.DATABASE_URL;
    if (!url) return 'mysql://root@localhost/padelweb';
    return url;
};

async function main() {
    let connection;
    try {
        console.log("Connecting...");
        connection = await mysql.createConnection(getConnectionString());
        console.log("Connected.");
        
        const [rows] = await connection.query('SELECT id, name, status FROM tournaments LIMIT 10');
        console.log('Recent tournaments:');
        rows.forEach(t => {
            console.log(`- ID: ${t.id} | Name: ${t.name} | Status: ${t.status}`);
        });

    } catch(e) {
        console.error('Error detail:', e);
    } finally {
        if (connection) await connection.end();
        process.exit(0);
    }
}

main();
