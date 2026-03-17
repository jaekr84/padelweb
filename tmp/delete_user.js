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
    const email = "ross_goodwin-crist@yahoo.com";
    let connection;
    try {
        console.log("Connecting...");
        connection = await mysql.createConnection(getConnectionString());
        console.log("Connected.");
        
        // Find user
        const [users] = await connection.query('SELECT id FROM users WHERE email = ?', [email]);
        
        if (users.length === 0) {
            console.log("Usuario no encontrado.");
            return;
        }
        
        const userId = users[0].id;
        console.log(`Usuario encontrado con ID: ${userId}. Eliminando dependencias...`);

        // Order of deletion to satisfy potential constraints (though MySQL/PlanetScale usually don't have hard FKs)
        await connection.query('DELETE FROM post_comments WHERE user_id = ?', [userId]);
        await connection.query('DELETE FROM posts WHERE user_id = ?', [userId]);
        await connection.query('DELETE FROM marketplace_items WHERE user_id = ?', [userId]);
        await connection.query('DELETE FROM registrations WHERE user_id = ? OR partner_user_id = ?', [userId, userId]);
        await connection.query('DELETE FROM club_requests WHERE user_id = ?', [userId]);
        
        // If they own a club
        const [ownedClubs] = await connection.query('SELECT id FROM clubs WHERE owner_id = ?', [userId]);
        for (const club of ownedClubs) {
            console.log(`Eliminando club ${club.id} y sus torneos...`);
            await connection.query('DELETE FROM tournaments WHERE club_id = ?', [club.id]);
            await connection.query('DELETE FROM clubs WHERE id = ?', [club.id]);
        }

        await connection.query('DELETE FROM users WHERE id = ?', [userId]);
        console.log("Usuario eliminado exitosamente.");

    } catch(e) {
        console.error('Error:', e);
    } finally {
        if (connection) await connection.end();
        process.exit(0);
    }
}

main();
