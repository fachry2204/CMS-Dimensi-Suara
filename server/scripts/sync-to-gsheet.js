import 'dotenv/config';
import db from '../config/db.js';
import { syncAllUsersToSheet } from '../utils/googleSheets.js';

/**
 * Script untuk memigrasi semua data user dari database ke Google Sheet
 */
async function runMigration() {
    console.log('🚀 Memulai migrasi data user ke Google Sheet...');
    
    try {
        const [users] = await db.query("SELECT * FROM users WHERE status = 'Approved' ORDER BY id ASC");
        console.log(`📊 Ditemukan ${users.length} user dengan status 'Approved'. Memulai sinkronisasi...`);
        
        await syncAllUsersToSheet(users);
        
        console.log('✅ Migrasi selesai successfully!');
    } catch (error) {
        console.error('❌ Terjadi kesalahan saat migrasi:', error);
    } finally {
        process.exit();
    }
}

runMigration();
