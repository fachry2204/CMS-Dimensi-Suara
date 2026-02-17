import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { backupIfNewDatabase, writeLastDbName } from './utils/db-backup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });
console.log('DEBUG: DB_HOST from env:', process.env.DB_HOST);
console.log('DEBUG: CWD:', process.cwd());

const initDb = async () => {
    try {
        console.log('Connecting to host:', process.env.DB_HOST);
        // Create connection without database selected
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            multipleStatements: true,
            connectTimeout: 60000
        });

        console.log('🔌 Connected to MySQL server');

        const dbName = process.env.DB_NAME || 'dimensi_suara_db';

        // Optional auto backup when DB name changes or on first run with different DB
        try {
            await backupIfNewDatabase({
                host: process.env.DB_HOST || 'localhost',
                user: process.env.DB_USER || 'root',
                password: process.env.DB_PASSWORD || '',
                port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
                dbName
            });
        } catch (e) {
            console.warn('DB auto-backup skipped/warn:', e.message);
        }
        
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

        // --- MIGRATIONS (Fix missing columns in existing tables) ---
        console.log('🔄 Checking for schema updates...');

        // 1. Check 'profile_picture' in 'users'
        try {
            await connection.query('SELECT profile_picture FROM users LIMIT 1');
        } catch (err) {
            if (err.code === 'ER_BAD_FIELD_ERROR') {
                console.log('⚠️ Adding missing column: profile_picture to users table');
                await connection.query('ALTER TABLE users ADD COLUMN profile_picture VARCHAR(255)');
            }
        }

        // 2. Ensure extended status enum in 'users'
        try {
            const [rows] = await connection.query("SHOW COLUMNS FROM users LIKE 'status'");
            if (rows.length > 0) {
                const type = String(rows[0].Type || '').toLowerCase();
                const needsUpdate =
                    !type.includes('pending') ||
                    !type.includes('review') ||
                    !type.includes('approved') ||
                    !type.includes('rejected') ||
                    !type.includes('inactive') ||
                    !type.includes('active');
                if (needsUpdate) {
                    console.log('⚠️ Updating users.status enum to support registration workflow');
                    await connection.query(
                        "ALTER TABLE users MODIFY COLUMN status ENUM('Pending','Review','Approved','Rejected','Active','Inactive') DEFAULT 'Pending'"
                    );
                }
            }
        } catch (err) {
            console.warn('Warning checking/updating users.status enum:', err.message);
        }

        // 3. Ensure extended registration columns in 'users'
        const userProfileColumns = [
            { name: 'account_type', type: "ENUM('PERSONAL','COMPANY') DEFAULT 'PERSONAL'" },
            { name: 'company_name', type: "VARCHAR(255)" },
            { name: 'nik', type: "VARCHAR(32)" },
            { name: 'full_name', type: "VARCHAR(255)" },
            { name: 'address', type: "TEXT" },
            { name: 'country', type: "VARCHAR(100)" },
            { name: 'province', type: "VARCHAR(100)" },
            { name: 'city', type: "VARCHAR(100)" },
            { name: 'district', type: "VARCHAR(100)" },
            { name: 'subdistrict', type: "VARCHAR(100)" },
            { name: 'postal_code', type: "VARCHAR(20)" },
            { name: 'phone', type: "VARCHAR(50)" },
            { name: 'pic_name', type: "VARCHAR(255)" },
            { name: 'pic_position', type: "VARCHAR(255)" },
            { name: 'pic_phone', type: "VARCHAR(50)" },
            { name: 'nib_doc_path', type: "VARCHAR(255)" },
            { name: 'kemenkumham_doc_path', type: "VARCHAR(255)" },
            { name: 'ktp_doc_path', type: "VARCHAR(255)" },
            { name: 'npwp_doc_path', type: "VARCHAR(255)" }
        ];

        for (const col of userProfileColumns) {
            try {
                await connection.query(`SELECT \`${col.name}\` FROM users LIMIT 1`);
            } catch (err) {
                if (err.code === 'ER_BAD_FIELD_ERROR') {
                    console.log(`⚠️ Adding missing column: ${col.name} to users table`);
                    await connection.query(`ALTER TABLE users ADD COLUMN \`${col.name}\` ${col.type}`);
                }
            }
        }

        // 3b. Ensure rejection_reason column in 'users'
        try {
            await connection.query('SELECT rejection_reason FROM users LIMIT 1');
        } catch (err) {
            if (err.code === 'ER_BAD_FIELD_ERROR') {
                console.log('⚠️ Adding missing column: rejection_reason to users table');
                await connection.query('ALTER TABLE users ADD COLUMN rejection_reason TEXT');
            }
        }

        // 3c. Ensure registered_at and rejected_date, and make joined_date nullable
        try {
            await connection.query('SELECT registered_at FROM users LIMIT 1');
        } catch (err) {
            if (err.code === 'ER_BAD_FIELD_ERROR') {
                console.log('⚠️ Adding missing column: registered_at to users table');
                await connection.query('ALTER TABLE users ADD COLUMN registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
            }
        }
        try {
            await connection.query('SELECT rejected_date FROM users LIMIT 1');
        } catch (err) {
            if (err.code === 'ER_BAD_FIELD_ERROR') {
                console.log('⚠️ Adding missing column: rejected_date to users table');
                await connection.query('ALTER TABLE users ADD COLUMN rejected_date DATETIME NULL DEFAULT NULL');
            }
        }
        try {
            console.log('🔧 Making joined_date nullable for approval date');
            await connection.query('ALTER TABLE users MODIFY COLUMN joined_date DATETIME NULL DEFAULT NULL');
        } catch (err) {
            console.warn('Joined_date alteration warning:', err.message);
        }

        // 4. Check 'cover_art' in 'releases'
        try {
            await connection.query('SELECT cover_art FROM releases LIMIT 1');
        } catch (err) {
            if (err.code === 'ER_BAD_FIELD_ERROR') {
                console.log('⚠️ Adding missing column: cover_art to releases table');
                await connection.query('ALTER TABLE releases ADD COLUMN cover_art VARCHAR(255)');
            }
        }

        // 5. Check 'primary_artists' in 'releases'
        try {
            await connection.query('SELECT primary_artists FROM releases LIMIT 1');
        } catch (err) {
            if (err.code === 'ER_BAD_FIELD_ERROR') {
                console.log('⚠️ Adding missing column: primary_artists to releases table');
                await connection.query('ALTER TABLE releases ADD COLUMN primary_artists JSON');
            }
        }

        // 6. Check other missing columns in 'releases'
        const releaseColumns = [
            { name: 'release_type', type: "ENUM('SINGLE', 'ALBUM')" },
            { name: 'version', type: "VARCHAR(50)" },
            { name: 'is_new_release', type: "BOOLEAN" },
            { name: 'original_release_date', type: "DATE" },
            { name: 'planned_release_date', type: "DATE" },
            { name: 'genre', type: "VARCHAR(100)" },
            { name: 'p_line', type: "VARCHAR(255)" },
            { name: 'c_line', type: "VARCHAR(255)" },
            { name: 'language', type: "VARCHAR(50)" },
            { name: 'label', type: "VARCHAR(100)" },
            { name: 'upc', type: "VARCHAR(50)" },
            { name: 'aggregator', type: "VARCHAR(50)" }
        ];

        for (const col of releaseColumns) {
            try {
                await connection.query(`SELECT \`${col.name}\` FROM releases LIMIT 1`);
            } catch (err) {
                if (err.code === 'ER_BAD_FIELD_ERROR') {
                    console.log(`⚠️ Adding missing column: ${col.name} to releases table`);
                    await connection.query(`ALTER TABLE releases ADD COLUMN \`${col.name}\` ${col.type}`);
                }
            }
        }

        // 7. Check 'profile_json' in 'users' for extended registration data
        try {
            await connection.query('SELECT profile_json FROM users LIMIT 1');
        } catch (err) {
            if (err.code === 'ER_BAD_FIELD_ERROR') {
                console.log('⚠️ Adding missing column: profile_json to users table');
                await connection.query('ALTER TABLE users ADD COLUMN profile_json JSON');
            }
        }

        // 8. Check missing columns in 'tracks'
        const trackColumns = [
            { name: 'track_number', type: "VARCHAR(10)" },
            { name: 'duration', type: "VARCHAR(20)" },
            { name: 'genre', type: "VARCHAR(100)" },
            { name: 'lyrics', type: "TEXT" },
            { name: 'contributors', type: "JSON" },
            { name: 'version', type: "VARCHAR(100)" },
            { name: 'isrc', type: "VARCHAR(50)" },
            { name: 'explicit', type: "BOOLEAN" },
            { name: 'primary_artists', type: "JSON" },
            { name: 'writer', type: "JSON" },
            { name: 'composer', type: "JSON" },
            { name: 'producer', type: "JSON" }
        ];

        for (const col of trackColumns) {
             try {
                await connection.query(`SELECT \`${col.name}\` FROM tracks LIMIT 1`);
            } catch (err) {
                if (err.code === 'ER_BAD_FIELD_ERROR') {
                    console.log(`⚠️ Adding missing column: ${col.name} to tracks table`);
                    await connection.query(`ALTER TABLE tracks ADD COLUMN \`${col.name}\` ${col.type}`);
                }
            }
        }
        
        // Remove publishing/songwriter related table if present
        try {
            await connection.query('DROP TABLE IF EXISTS songwriters');
            console.log('🧹 Dropped legacy table: songwriters');
        } catch (err) {
            console.warn('Warning dropping songwriters table:', err.message);
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

        // Ensure 'fachry' Admin exists
        const [fachryRows] = await connection.query("SELECT id FROM users WHERE username = ? OR email = ?", ['fachry', 'fachry@dimensisuara.com']);
        if (fachryRows.length === 0) {
            console.log("Creating admin user: fachry");
            const bcrypt = (await import('bcryptjs')).default;
            const salt2 = await bcrypt.genSalt(10);
            const seedPass = process.env.SEED_FACHRY_PASSWORD || 'bangbens';
            const hash2 = await bcrypt.hash(seedPass, salt2);
            await connection.query(
                "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)",
                ['fachry', 'fachry@dimensisuara.com', hash2, 'Admin']
            );
            console.log("Admin 'fachry' created with role Admin.");
        }

        console.log('✅ Database initialized successfully!');
        try {
            await writeLastDbName(dbName);
        } catch (e) {
            console.warn('Failed to write last DB name record:', e.message);
        }
        
        await connection.end();
    } catch (err) {
        console.error('❌ Error initializing database:', err);
        // Don't exit process if imported
        if (process.argv[1] === fileURLToPath(import.meta.url)) {
            process.exit(1);
        }
    }
};

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    initDb();
}

export { initDb };
