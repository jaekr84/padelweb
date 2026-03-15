const mysql = require('mysql2/promise');
require('dotenv').config();

const getConnectionString = () => {
    let url = process.env.DATABASE_URL;
    if (!url) return 'mysql://root@localhost/padelweb';
    if (url.startsWith('postgres') || url.includes('sslmode=')) {
        try {
            const parsed = new URL(url);
            parsed.protocol = 'mysql:';
            parsed.searchParams.delete('sslmode');
            parsed.searchParams.delete('channel_binding');
            return parsed.toString();
        } catch (e) {
            return url.replace('postgres://', 'mysql://').replace('postgresql://', 'mysql://');
        }
    }
    return url;
};

async function main() {
    let connection;
    try {
        console.log("Connecting...");
        connection = await mysql.createConnection(getConnectionString());
        console.log("Connected.");
        
        const [rows] = await connection.query('SELECT count(*) as count FROM marketplace_items');
        console.log('Total items in marketplace_items:', rows[0].count);
        
        const [items] = await connection.query('SELECT id, title, category FROM marketplace_items LIMIT 5');
        console.log('Sample items:', items);

    } catch(e) {
        console.error('Error detail:', e);
    } finally {
        if (connection) await connection.end();
        process.exit(0);
    }
}

main();
