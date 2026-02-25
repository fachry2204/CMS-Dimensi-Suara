
import db from './server/config/db.js';

async function checkAndAddColumns() {
    try {
        const [rows] = await db.query("SHOW COLUMNS FROM users");
        const columns = rows.map(r => r.Field);
        
        if (!columns.includes('aggregator_percentage')) {
            console.log('Adding aggregator_percentage column...');
            await db.query("ALTER TABLE users ADD COLUMN aggregator_percentage DECIMAL(5,2) DEFAULT 0");
        } else {
            console.log('aggregator_percentage column exists.');
        }

        if (!columns.includes('publishing_percentage')) {
            console.log('Adding publishing_percentage column...');
            await db.query("ALTER TABLE users ADD COLUMN publishing_percentage DECIMAL(5,2) DEFAULT 0");
        } else {
            console.log('publishing_percentage column exists.');
        }

        console.log('Done.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkAndAddColumns();
