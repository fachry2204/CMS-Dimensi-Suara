import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config(); // Load from root .env if running from root, or ensure path is correct

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dimensi_suara_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

console.log('🔌 Connected to MySQL Database Pool');

export default pool;
