import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const initDb = async () => {
    try {
        // Create connection without database selected
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            multipleStatements: true
        });

        console.log('🔌 Connected to MySQL server');

        // Read schema.sql
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        // Execute schema
        console.log('🚀 Running schema.sql...');
        await connection.query(schemaSql);
        
        console.log('✅ Database initialized successfully!');
        
        await connection.end();
    } catch (err) {
        console.error('❌ Error initializing database:', err);
        process.exit(1);
    }
};

initDb();
