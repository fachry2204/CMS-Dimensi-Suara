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
        if (fs.existsSync(schemaPath)) {
            const schemaSql = fs.readFileSync(schemaPath, 'utf8');

            // Execute schema
            console.log('🚀 Running schema.sql...');
            const statements = schemaSql.split(';').filter(stmt => stmt.trim());
            for (const statement of statements) {
                if (statement.trim()) {
                    await connection.query(statement);
                }
            }
        } else {
            console.log('⚠️ schema.sql not found, skipping initial schema creation.');
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
            { name: 'npwp_doc_path', type: "VARCHAR(255)" },
            { name: 'signature_doc_path', type: "VARCHAR(255)" },
            { name: 'bank_name', type: "VARCHAR(100)" },
            { name: 'bank_account_number', type: "VARCHAR(50)" },
            { name: 'bank_account_name', type: "VARCHAR(100)" },
            { name: 'contract_doc_path', type: "VARCHAR(255)" }
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
                await connection.query('ALTER TABLE users ADD COLUMN registered_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP');
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

        // 3d. Backfill registered_at for existing rows and enforce NOT NULL
        try {
            const [cols] = await connection.query('SHOW COLUMNS FROM users');
            const colNames = cols.map(c => c.Field);
            const hasCreatedAt = colNames.includes('created_at');
            if (hasCreatedAt) {
                console.log('🔧 Backfilling registered_at from created_at where NULL');
                await connection.query('UPDATE users SET registered_at = created_at WHERE registered_at IS NULL');
            } else {
                console.log('🔧 Backfilling registered_at with NOW() where NULL');
                await connection.query('UPDATE users SET registered_at = NOW() WHERE registered_at IS NULL');
            }
            console.log('🔧 Enforcing registered_at NOT NULL');
            await connection.query('ALTER TABLE users MODIFY COLUMN registered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP');
        } catch (err) {
            console.warn('Registered_at backfill/constraint warning:', err.message);
        }

        // 3e. Rename 'password' to 'password_hash' if needed
        try {
            const [rows] = await connection.query("SHOW COLUMNS FROM users LIKE 'password'");
            if (rows.length > 0) {
                console.log("⚠️ Renaming column: password -> password_hash in users table");
                await connection.query("ALTER TABLE users CHANGE COLUMN password password_hash VARCHAR(255) NOT NULL");
            } else {
                 // Check if password_hash exists
                 const [hashRows] = await connection.query("SHOW COLUMNS FROM users LIKE 'password_hash'");
                 if (hashRows.length === 0) {
                     console.log("⚠️ Adding missing column: password_hash to users table");
                     await connection.query("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NOT NULL");
                 }
            }
        } catch (err) {
            console.warn('Password column migration warning:', err.message);
        }

        // 3f. Ensure percentage columns in 'users'
        const percentageCols = [
            { name: 'aggregator_percentage', type: "DECIMAL(5,2) DEFAULT 0.00" },
            { name: 'publishing_percentage', type: "DECIMAL(5,2) DEFAULT 0.00" }
        ];
        for (const col of percentageCols) {
            try {
                await connection.query(`SELECT \`${col.name}\` FROM users LIMIT 1`);
            } catch (err) {
                if (err.code === 'ER_BAD_FIELD_ERROR') {
                    console.log(`⚠️ Adding missing column: ${col.name} to users table`);
                    await connection.query(`ALTER TABLE users ADD COLUMN \`${col.name}\` ${col.type}`);
                }
            }
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
            { name: 'submission_date', type: "DATE" },
            { name: 'release_type', type: "ENUM('SINGLE', 'ALBUM')" },
            { name: 'version', type: "VARCHAR(50)" },
            { name: 'is_new_release', type: "BOOLEAN" },
            { name: 'original_release_date', type: "DATE" },
            { name: 'planned_release_date', type: "DATE" },
            { name: 'genre', type: "VARCHAR(100)" },
            { name: 'sub_genre', type: "VARCHAR(100)" },
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

        try {
            const [rows] = await connection.query("SHOW COLUMNS FROM releases LIKE 'status'");
            if (rows.length === 0) {
                console.log('⚠️ Adding missing column: status to releases table');
                await connection.query("ALTER TABLE releases ADD COLUMN status VARCHAR(50) DEFAULT 'Pending'");
            } else {
                const type = String(rows[0].Type || '').toLowerCase();
                const isEnum = type.startsWith('enum(');
                const enumOk = !isEnum ? true : (
                    type.includes("'pending'") &&
                    type.includes("'processing'") &&
                    type.includes("'live'") &&
                    type.includes("'rejected'") &&
                    type.includes("'request edit'")
                );
                const isVarcharLike = type.includes('varchar');
                if ((isEnum && !enumOk) || (!isVarcharLike && !isEnum)) {
                    console.log('🔧 Normalizing releases.status to VARCHAR(50)');
                    await connection.query("ALTER TABLE releases MODIFY COLUMN status VARCHAR(50) DEFAULT 'Pending'");
                }
            }
        } catch (e) {
            console.warn('status column alteration warning:', e.message);
        }

        try {
            const [rows] = await connection.query("SHOW COLUMNS FROM releases LIKE 'planned_release_date'");
            if (rows.length > 0) {
                const nullable = String(rows[0].Null || '').toUpperCase() === 'YES';
                if (!nullable) {
                    console.log('🔧 Making planned_release_date nullable');
                    await connection.query('ALTER TABLE releases MODIFY COLUMN planned_release_date DATE NULL DEFAULT NULL');
                }
            }
        } catch (e) {
            console.warn('planned_release_date alteration warning:', e.message);
        }
        try {
            const [rows] = await connection.query("SHOW COLUMNS FROM releases LIKE 'original_release_date'");
            if (rows.length > 0) {
                const nullable = String(rows[0].Null || '').toUpperCase() === 'YES';
                if (!nullable) {
                    console.log('🔧 Making original_release_date nullable');
                    await connection.query('ALTER TABLE releases MODIFY COLUMN original_release_date DATE NULL DEFAULT NULL');
                }
            }
        } catch (e) {
            console.warn('original_release_date alteration warning:', e.message);
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

        // 8. Check missing columns in 'tracks' using SHOW COLUMNS for reliability
        const trackColumns = [
            { name: 'track_number', type: "VARCHAR(10)" },
            { name: 'title', type: "VARCHAR(255)" },
            { name: 'audio_file', type: "VARCHAR(1024)" },
            { name: 'audio_clip', type: "VARCHAR(1024)" },
            { name: 'ipl_file', type: "VARCHAR(1024)" },
            { name: 'is_instrumental', type: "TINYINT(1) DEFAULT 0" },
            { name: 'duration', type: "VARCHAR(20)" },
            { name: 'genre', type: "VARCHAR(100)" },
            { name: 'sub_genre', type: "VARCHAR(100)" },
            { name: 'lyrics', type: "TEXT" },
            { name: 'contributors', type: "JSON" },
            { name: 'version', type: "VARCHAR(100)" },
            { name: 'isrc', type: "VARCHAR(50)" },
            { name: 'explicit', type: "BOOLEAN" },
            { name: 'explicit_lyrics', type: "BOOLEAN" },
            { name: 'primary_artists', type: "JSON" },
            { name: 'featured_artists', type: "JSON" },
            { name: 'writer', type: "JSON" },
            { name: 'composer', type: "JSON" },
            { name: 'lyricist', type: "JSON" },
            { name: 'producer', type: "JSON" },
            { name: 'preview_start', type: "INT DEFAULT 0" }
        ];

        try {
            const [existingTrackCols] = await connection.query("SHOW COLUMNS FROM tracks");
            const existingTrackColNames = existingTrackCols.map(c => c.Field);

            for (const col of trackColumns) {
                if (!existingTrackColNames.includes(col.name)) {
                    console.log(`⚠️ Adding missing column: ${col.name} to tracks table`);
                    try {
                        await connection.query(`ALTER TABLE tracks ADD COLUMN \`${col.name}\` ${col.type}`);
                    } catch (alterErr) {
                        console.error(`Failed to add column ${col.name}:`, alterErr.message);
                    }
                }
            }
        } catch (err) {
            console.error('Error checking tracks columns:', err);
        }

        // 9. Check missing columns in 'songs'
        try {
            await connection.query('SELECT song_id FROM songs LIMIT 1');
        } catch (err) {
            if (err.code === 'ER_BAD_FIELD_ERROR') {
                console.log('⚠️ Adding missing column: song_id to songs table');
                await connection.query('ALTER TABLE songs ADD COLUMN song_id VARCHAR(100)');
            }
        }

        
        // 10. Check 'reports' table
        try {
            await connection.query('SELECT 1 FROM reports LIMIT 1');
        } catch (err) {
            if (err.code === 'ER_NO_SUCH_TABLE') {
                console.log('🔨 Creating table: reports');
                await connection.query(`
                    CREATE TABLE reports (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        period DATE NOT NULL,
                        upc VARCHAR(50),
                        isrc VARCHAR(50),
                        title VARCHAR(255),
                        artist VARCHAR(255),
                        platform VARCHAR(100),
                        country VARCHAR(100),
                        quantity INT DEFAULT 0,
                        revenue DECIMAL(15, 2) DEFAULT 0.00,
                        original_file_name VARCHAR(255),
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                `);
            }
        }
        
        // 11. Check missing columns in 'reports' (if table exists but old schema)
        const reportColumns = [
            { name: 'period', type: "DATE" },
            { name: 'upc', type: "VARCHAR(50)" },
            { name: 'isrc', type: "VARCHAR(50)" },
            { name: 'title', type: "VARCHAR(255)" },
            { name: 'artist', type: "VARCHAR(255)" },
            { name: 'platform', type: "VARCHAR(100)" },
            { name: 'country', type: "VARCHAR(100)" },
            { name: 'quantity', type: "INT DEFAULT 0" },
            { name: 'revenue', type: "DECIMAL(15, 2) DEFAULT 0.00" },
            { name: 'original_file_name', type: "VARCHAR(255)" }
        ];

        for (const col of reportColumns) {
            try {
                await connection.query(`SELECT \`${col.name}\` FROM reports LIMIT 1`);
            } catch (err) {
                if (err.code === 'ER_BAD_FIELD_ERROR') {
                    console.log(`⚠️ Adding missing column: ${col.name} to reports table`);
                    await connection.query(`ALTER TABLE reports ADD COLUMN \`${col.name}\` ${col.type}`);
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

        // 12. Ensure track_contributors table exists
        try {
            await connection.query('SELECT 1 FROM track_contributors LIMIT 1');
        } catch (err) {
            if (err.code === 'ER_NO_SUCH_TABLE') {
                console.log('🔨 Creating table: track_contributors');
                await connection.query(`
                    CREATE TABLE track_contributors (
                        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                        track_id INT NOT NULL,
                        name VARCHAR(255) NOT NULL,
                        type VARCHAR(100) NULL,
                        role VARCHAR(100) NULL,
                        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                        PRIMARY KEY (id),
                        INDEX idx_track_contributors_track_id (track_id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                `);
            }
        }

        // 13. Ensure security_logs table exists
        try {
            await connection.query('SELECT 1 FROM security_logs LIMIT 1');
        } catch (err) {
            if (err.code === 'ER_NO_SUCH_TABLE') {
                console.log('🔨 Creating table: security_logs');
                await connection.query(`
                    CREATE TABLE security_logs (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        user_identifier VARCHAR(255),
                        ip_address VARCHAR(100),
                        country VARCHAR(100),
                        attack_type VARCHAR(50),
                        details TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                `);
            }
        }

        // 12. Check 'system_logs' table
        try {
            await connection.query('SELECT 1 FROM system_logs LIMIT 1');
        } catch (err) {
            if (err.code === 'ER_NO_SUCH_TABLE') {
                console.log('🔨 Creating table: system_logs');
                await connection.query(`
                    CREATE TABLE system_logs (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        check_type ENUM('UPDATE_CHECK', 'DB_INTEGRITY_CHECK') NOT NULL,
                        status VARCHAR(50) NOT NULL,
                        details TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                `);
            }
        }

        // 13. Check 'login_settings' table (Special Structure requested by user)
        try {
            await connection.query('SELECT 1 FROM login_settings LIMIT 1');
        } catch (err) {
            if (err.code === 'ER_NO_SUCH_TABLE') {
                console.log('🔨 Creating table: login_settings');
                await connection.query(`
                    CREATE TABLE login_settings (
                        id INT PRIMARY KEY,
                        logo VARCHAR(255),
                        login_background VARCHAR(255),
                        login_title VARCHAR(255) DEFAULT 'Agregator & Publishing Musik',
                        login_footer TEXT,
                        login_button_color VARCHAR(100) DEFAULT 'linear-gradient(to right, #2563eb, #0891b2)',
                        login_form_bg_color VARCHAR(100) DEFAULT 'rgba(255, 255, 255, 0.9)',
                        enable_registration ENUM('true', 'false') DEFAULT 'true',
                        login_form_bg_opacity INT DEFAULT 90,
                        login_bg_opacity INT DEFAULT 100,
                        login_glass_effect ENUM('true', 'false') DEFAULT 'false',
                        login_form_text_color VARCHAR(20) DEFAULT '#334155',
                        login_title_color VARCHAR(20) DEFAULT '#1e293b',
                        login_footer_color VARCHAR(20) DEFAULT '#94a3b8',
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                `);
                
                // Insert default row
                console.log('🔨 Seeding default login_settings...');
                await connection.query(`
                    INSERT INTO login_settings (id, login_title, login_footer, login_button_color, login_form_bg_color, enable_registration, login_form_text_color)
                    VALUES (1, 'Agregator & Publishing Musik', 'Protected CMS Area. Authorized personnel only.', 'linear-gradient(to right, #2563eb, #0891b2)', 'rgba(255, 255, 255, 0.9)', 'true', '#334155')
                `);
            }
        }

        // 13b. Check for new columns in existing login_settings (Always run this check)
        const loginSettingsCols = [
            { name: 'login_title_color', type: "VARCHAR(20) DEFAULT '#1e293b'" }, // slate-800
            { name: 'login_footer_color', type: "VARCHAR(20) DEFAULT '#94a3b8'" }, // slate-400
            { name: 'login_form_bg_opacity', type: "INT DEFAULT 90" }, // 0-100
            { name: 'login_bg_opacity', type: "INT DEFAULT 100" }, // 0-100 (Background image opacity)
            { name: 'login_glass_effect', type: "ENUM('true', 'false') DEFAULT 'false'" },
            { name: 'login_form_text_color', type: "VARCHAR(20) DEFAULT '#334155'" }, // slate-700
            { name: 'favicon_url', type: "VARCHAR(255) DEFAULT NULL" }
        ];

        for (const col of loginSettingsCols) {
            try {
                await connection.query(`SELECT \`${col.name}\` FROM login_settings LIMIT 1`);
            } catch (err) {
                if (err.code === 'ER_BAD_FIELD_ERROR') {
                    console.log(`⚠️ Adding missing column: ${col.name} to login_settings table`);
                    await connection.query(`ALTER TABLE login_settings ADD COLUMN \`${col.name}\` ${col.type}`);
                }
            }
        }

        // 13c. Ensure email_logs table exists (for monitoring email delivery)
        try {
            await connection.query('SELECT 1 FROM email_logs LIMIT 1');
        } catch (err) {
            if (err.code === 'ER_NO_SUCH_TABLE') {
                console.log('🔨 Creating table: email_logs');
                await connection.query(`
                    CREATE TABLE email_logs (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        user_id INT NULL,
                        related_type VARCHAR(50) NULL,
                        related_id INT NULL,
                        to_email VARCHAR(255) NOT NULL,
                        subject VARCHAR(255) NOT NULL,
                        status ENUM('PENDING','SENT','FAILED') DEFAULT 'PENDING',
                        error_message TEXT NULL,
                        server_response VARCHAR(500) NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        sent_at TIMESTAMP NULL,
                        INDEX idx_email_logs_type (related_type),
                        INDEX idx_email_logs_user (user_id),
                        INDEX idx_email_logs_status (status)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                `);
            }
        }
        // 13d. Ensure server_response column exists in email_logs
        try {
            await connection.query('SELECT server_response FROM email_logs LIMIT 1');
        } catch (err) {
            if (err.code === 'ER_BAD_FIELD_ERROR') {
                console.log('⚠️ Adding missing column: server_response to email_logs');
                await connection.query('ALTER TABLE email_logs ADD COLUMN server_response VARCHAR(500) NULL');
            }
        }
        // 13e. Ensure email_templates table exists
        try {
            await connection.query('SELECT 1 FROM email_templates LIMIT 1');
        } catch (err) {
            if (err.code === 'ER_NO_SUCH_TABLE') {
                console.log('🔨 Creating table: email_templates');
                await connection.query(`
                    CREATE TABLE email_templates (
                        template_key VARCHAR(100) PRIMARY KEY,
                        subject_template VARCHAR(255) NOT NULL,
                        body_template TEXT NOT NULL,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                `);
            }
        }
        try {
            const defaults = [
                {
                    key: 'release_status.Pending',
                    subject: 'Update Status Rilisan: {{title}} → {{status}}',
                    body: `<!doctype html><html lang="id"><meta charset="utf-8" />
<body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
  <tr>
    <td style="padding:20px;background:linear-gradient(90deg,#1e40af,#2563eb);color:#fff">
      <div style="font-weight:700;font-size:18px">Dimensi Suara</div>
      <div style="font-size:12px;opacity:.9">Music Distribution Update</div>
    </td>
  </tr>
  <tr>
    <td style="padding:24px">
      <div style="font-size:14px;color:#0f172a;margin-bottom:12px">Halo {{fullName}},</div>
      <div style="font-size:14px;color:#334155;line-height:1.6">Status rilisan Anda telah diperbarui.</div>
      <div style="margin:16px 0;padding:16px;border:1px solid #e2e8f0;border-radius:10px;background:#f9fafb">
        <div style="font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;margin-bottom:8px">Detail Rilisan</div>
        <div style="font-size:14px;color:#0f172a"><strong>Judul:</strong> {{title}}</div>
        <div style="font-size:14px;color:#0f172a"><strong>Status Baru:</strong> {{status}}</div>
        {{upc ?}}<div style="font-size:14px;color:#0f172a"><strong>UPC:</strong> {{upc}}</div>{{/upc ?}}
        {{isrcBlock}}
      </div>
      <div style="margin-top:20px;font-size:12px;color:#94a3b8">© ${new Date().getFullYear()} Dimensi Suara</div>
    </td>
  </tr>
</table>
</body></html>`
                },
                {
                    key: 'release_status.Request Edit',
                    subject: 'Update Status Rilisan: {{title}} → {{status}}',
                    body: `<!doctype html><html lang="id"><meta charset="utf-8" />
<body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
  <tr><td style="padding:20px;background:linear-gradient(90deg,#1e40af,#2563eb);color:#fff"><div style="font-weight:700;font-size:18px">Dimensi Suara</div><div style="font-size:12px;opacity:.9">Music Distribution Update</div></td></tr>
  <tr><td style="padding:24px">
    <div style="font-size:14px;color:#0f172a;margin-bottom:12px">Halo {{fullName}},</div>
    <div style="font-size:14px;color:#334155;line-height:1.6">Status rilisan Anda telah diperbarui.</div>
    <div style="margin:16px 0;padding:16px;border:1px solid #e2e8f0;border-radius:10px;background:#f9fafb">
      <div style="font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;margin-bottom:8px">Detail Rilisan</div>
      <div style="font-size:14px;color:#0f172a"><strong>Judul:</strong> {{title}}</div>
      <div style="font-size:14px;color:#0f172a"><strong>Status Baru:</strong> {{status}}</div>
      {{upc ?}}<div style="font-size:14px;color:#0f172a"><strong>UPC:</strong> {{upc}}</div>{{/upc ?}}
      {{isrcBlock}}
    </div>
    <div style="margin-top:20px;font-size:12px;color:#94a3b8">© ${new Date().getFullYear()} Dimensi Suara</div>
  </td></tr>
</table></body></html>`
                },
                {
                    key: 'release_status.Processing',
                    subject: 'Update Status Rilisan: {{title}} → {{status}}',
                    body: `<!doctype html><html lang="id"><meta charset="utf-8" />
<body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
  <tr><td style="padding:20px;background:linear-gradient(90deg,#1e40af,#2563eb);color:#fff"><div style="font-weight:700;font-size:18px">Dimensi Suara</div><div style="font-size:12px;opacity:.9">Music Distribution Update</div></td></tr>
  <tr><td style="padding:24px">
    <div style="font-size:14px;color:#0f172a;margin-bottom:12px">Halo {{fullName}},</div>
    <div style="font-size:14px;color:#334155;line-height:1.6">Status rilisan Anda telah diperbarui.</div>
    <div style="margin:16px 0;padding:16px;border:1px solid #e2e8f0;border-radius:10px;background:#f9fafb">
      <div style="font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;margin-bottom:8px">Detail Rilisan</div>
      <div style="font-size:14px;color:#0f172a"><strong>Judul:</strong> {{title}}</div>
      <div style="font-size:14px;color:#0f172a"><strong>Status Baru:</strong> {{status}}</div>
      {{upc ?}}<div style="font-size:14px;color:#0f172a"><strong>UPC:</strong> {{upc}}</div>{{/upc ?}}
      {{isrcBlock}}
    </div>
    <div style="margin-top:20px;font-size:12px;color:#94a3b8">© ${new Date().getFullYear()} Dimensi Suara</div>
  </td></tr>
</table></body></html>`
                },
                {
                    key: 'release_status.Live',
                    subject: 'Update Status Rilisan: {{title}} → {{status}}',
                    body: `<!doctype html><html lang="id"><meta charset="utf-8" />
<body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
  <tr><td style="padding:20px;background:linear-gradient(90deg,#1e40af,#2563eb);color:#fff"><div style="font-weight:700;font-size:18px">Dimensi Suara</div><div style="font-size:12px;opacity:.9">Music Distribution Update</div></td></tr>
  <tr><td style="padding:24px">
    <div style="font-size:14px;color:#0f172a;margin-bottom:12px">Halo {{fullName}},</div>
    <div style="font-size:14px;color:#334155;line-height:1.6">Status rilisan Anda telah diperbarui.</div>
    <div style="margin:16px 0;padding:16px;border:1px solid #e2e8f0;border-radius:10px;background:#f9fafb">
      <div style="font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;margin-bottom:8px">Detail Rilisan</div>
      <div style="font-size:14px;color:#0f172a"><strong>Judul:</strong> {{title}}</div>
      <div style="font-size:14px;color:#0f172a"><strong>Status Baru:</strong> {{status}}</div>
      {{upc ?}}<div style="font-size:14px;color:#0f172a"><strong>UPC:</strong> {{upc}}</div>{{/upc ?}}
      {{isrcBlock}}
    </div>
    <div style="margin-top:20px;font-size:12px;color:#94a3b8">© ${new Date().getFullYear()} Dimensi Suara</div>
  </td></tr>
</table></body></html>`
                },
                {
                    key: 'release_status.Rejected',
                    subject: 'Update Status Rilisan: {{title}} → {{status}}',
                    body: `<!doctype html><html lang="id"><meta charset="utf-8" />
<body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
  <tr><td style="padding:20px;background:linear-gradient(90deg,#1e40af,#2563eb);color:#fff"><div style="font-weight:700;font-size:18px">Dimensi Suara</div><div style="font-size:12px;opacity:.9">Music Distribution Update</div></td></tr>
  <tr><td style="padding:24px">
    <div style="font-size:14px;color:#0f172a;margin-bottom:12px">Halo {{fullName}},</div>
    <div style="font-size:14px;color:#334155;line-height:1.6">Status rilisan Anda telah diperbarui.</div>
    <div style="margin:16px 0;padding:16px;border:1px solid #e2e8f0;border-radius:10px;background:#f9fafb">
      <div style="font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;margin-bottom:8px">Detail Rilisan</div>
      <div style="font-size:14px;color:#0f172a"><strong>Judul:</strong> {{title}}</div>
      <div style="font-size:14px;color:#0f172a"><strong>Status Baru:</strong> {{status}}</div>
      {{upc ?}}<div style="font-size:14px;color:#0f172a"><strong>UPC:</strong> {{upc}}</div>{{/upc ?}}
      {{isrcBlock}}
    </div>
    <div style="margin-top:12px;padding:16px;border:1px dashed #fecaca;border-radius:10px;background:#fff1f2">
      <div style="font-size:12px;color:#b91c1c;text-transform:uppercase;font-weight:700;margin-bottom:8px">Alasan Penolakan</div>
      <div style="font-size:14px;color:#7f1d1d"><strong>Ringkas:</strong> {{reason}}</div>
      <div style="font-size:14px;color:#7f1d1d;white-space:pre-wrap;margin-top:8px"><strong>Detail:</strong> {{description}}</div>
    </div>
    <div style="margin-top:20px;font-size:12px;color:#94a3b8">© ${new Date().getFullYear()} Dimensi Suara</div>
  </td></tr>
</table></body></html>`
                },
                {
                    key: 'user_register',
                    subject: 'Registrasi Berhasil - Dimensi Suara',
                    body: `<!doctype html><html lang="id"><meta charset="utf-8" />
<body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
  <tr><td style="padding:20px;background:linear-gradient(90deg,#1e40af,#2563eb);color:#fff"><div style="font-weight:700;font-size:18px">Dimensi Suara</div><div style="font-size:12px;opacity:.9">Registrasi Akun</div></td></tr>
  <tr><td style="padding:24px">
    <div style="font-size:14px;color:#0f172a;margin-bottom:12px">Halo {{fullName}}</div>
    <div style="font-size:14px;color:#334155;line-height:1.6">Terima kasih telah mendaftar. Akun Anda tercatat dan menunggu verifikasi.</div>
    <div style="margin-top:20px;font-size:12px;color:#94a3b8">© ${new Date().getFullYear()} Dimensi Suara</div>
  </td></tr>
</table></body></html>`
                },
                {
                    key: 'user_register_status.Pending',
                    subject: 'Status Pendaftaran: {{status}} - Dimensi Suara',
                    body: `<div>Halo {{fullName}}, status pendaftaran Anda: {{status}}.</div>`
                },
                {
                    key: 'user_register_status.Approved',
                    subject: 'Status Pendaftaran: {{status}} - Dimensi Suara',
                    body: `<div>Halo {{fullName}}, pendaftaran Anda telah {{status}}. Selamat bergabung.</div>`
                },
                {
                    key: 'user_register_status.Rejected',
                    subject: 'Status Pendaftaran: {{status}} - Dimensi Suara',
                    body: `<div>Halo {{fullName}}, pendaftaran Anda {{status}}. Alasan: {{reason}}</div>`
                }
            ];
            for (const t of defaults) {
                await connection.query(
                    'INSERT IGNORE INTO email_templates (template_key, subject_template, body_template) VALUES (?, ?, ?)',
                    [t.key, t.subject, t.body]
                );
            }
        } catch (err) {
            console.warn('Email template seed warning:', err.message);
        }

        try {
            await connection.query('SELECT 1 FROM password_reset_tokens LIMIT 1');
        } catch (err) {
            if (err.code === 'ER_NO_SUCH_TABLE') {
                console.log('🔨 Creating table: password_reset_tokens');
                await connection.query(`
                    CREATE TABLE password_reset_tokens (
                        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                        user_id INT NOT NULL,
                        token_hash CHAR(64) NOT NULL,
                        expires_at DATETIME NOT NULL,
                        used_at DATETIME NULL DEFAULT NULL,
                        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                        PRIMARY KEY (id),
                        UNIQUE KEY uq_password_reset_token_hash (token_hash),
                        INDEX idx_password_reset_user (user_id),
                        INDEX idx_password_reset_expires (expires_at)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                `);
            }
        }

        // 14. Check missing columns in 'writers' (for contract management)
        const writerContractCols = [
            { name: 'contract_status', type: "ENUM('Not Generated','On Review','Done') DEFAULT 'Not Generated'" },
            { name: 'contract_doc_path', type: "VARCHAR(255) DEFAULT NULL" }
        ];

        for (const col of writerContractCols) {
            try {
                await connection.query(`SELECT \`${col.name}\` FROM writers LIMIT 1`);
            } catch (err) {
                if (err.code === 'ER_BAD_FIELD_ERROR') {
                    console.log(`⚠️ Adding missing column: ${col.name} to writers table`);
                    await connection.query(`ALTER TABLE writers ADD COLUMN \`${col.name}\` ${col.type}`);
                }
            }
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
