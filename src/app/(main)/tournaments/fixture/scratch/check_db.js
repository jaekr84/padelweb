
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function checkDb() {
    const tournamentId = 'f70d26b3-7ab4-4081-a590-48cce3f00d66';
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    
    try {
        console.log('--- DIAGNÓSTICO DE TORNEO ---');
        
        const [tournaments] = await connection.execute('SELECT id, name, status FROM tournaments WHERE id = ?', [tournamentId]);
        console.log('Torneo:', tournaments);
        
        const [groups] = await connection.execute('SELECT id, name FROM tournament_groups WHERE tournament_id = ?', [tournamentId]);
        console.log('Grupos encontrados:', groups.length);
        if (groups.length > 0) console.log('Ejemplo grupo:', groups[0]);
        
        const [matches] = await connection.execute('SELECT id, team1_name, team2_name, confirmed FROM group_matches WHERE tournament_id = ?', [tournamentId]);
        console.log('Partidos encontrados:', matches.length);
        const confirmed = matches.filter(m => m.confirmed).length;
        console.log('Partidos confirmados:', confirmed);
        
        const [bracket] = await connection.execute('SELECT id, round, slot FROM bracket_matches WHERE tournament_id = ?', [tournamentId]);
        console.log('Partidos de bracket:', bracket.length);
        
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await connection.end();
    }
}

checkDb();
