import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const checkColumns = async () => {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'dimensi_suara_db'
        });

        console.log('Connected. Fetching columns for releases table...');
        const [rows] = await connection.query("SHOW COLUMNS FROM releases");
        console.log(rows.map(r => r.Field));
        
        await connection.end();
    } catch (err) {
        console.error(err);
    }
};

checkColumns();
