import db from './config/db.js';

async function checkSettings() {
    try {
        const [cols] = await db.query('SHOW COLUMNS FROM settings');
        console.log('Settings columns:', JSON.stringify(cols, null, 2));
    } catch (error) {
        console.error('Error checking settings:', error);
    } finally {
        process.exit();
    }
}

checkSettings();
