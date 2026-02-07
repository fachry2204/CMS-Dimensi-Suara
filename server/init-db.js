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

        const dbName = process.env.DB_NAME || 'dimensi_suara_db';
        
        // Create DB if not exists and Use it
        console.log(`🔨 Creating/Selecting database: ${dbName}...`);
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        await connection.query(`USE \`${dbName}\``);

        // Read schema.sql
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        // Execute schema
        console.log('🚀 Running schema.sql...');
        const statements = schemaSql.split(';').filter(stmt => stmt.trim());
        for (const statement of statements) {
            if (statement.trim()) {
                await connection.query(statement);
            }
        }
        
        // Seed Default Admin
        const [users] = await connection.query("SELECT * FROM users WHERE role = 'Admin'");
        if (users.length === 0) {
            console.log("Creating default admin user...");
            const bcrypt = (await import('bcryptjs')).default;
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash('admin123', salt);
            
            await connection.query(
                "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)",
                ['Admin', 'admin@dimensisuara.com', hash, 'Admin']
            );
            console.log("Default admin created: admin@dimensisuara.com / admin123");
        }

        console.log('✅ Database initialized successfully!');
        
        await connection.end();
    } catch (err) {
        console.error('❌ Error initializing database:', err);
        process.exit(1);
    }
};

initDb();
