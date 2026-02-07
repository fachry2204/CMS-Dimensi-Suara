import express from 'express';
import db from '../config/db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Ensure settings table exists (Lazy initialization)
const initSettingsTable = async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS settings (
                setting_key VARCHAR(50) PRIMARY KEY,
                setting_value TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        // Insert default aggregators if not exists
        const [rows] = await db.query('SELECT * FROM settings WHERE setting_key = ?', ['aggregators']);
        if (rows.length === 0) {
            const defaultAggregators = ["LokaMusik", "SoundOn", "Tunecore", "Believe"];
            await db.query('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)', 
                ['aggregators', JSON.stringify(defaultAggregators)]);
        }
    } catch (err) {
        console.error('Error initializing settings table:', err);
    }
};

// Run initialization
initSettingsTable();

// GET Aggregators
router.get('/aggregators', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT setting_value FROM settings WHERE setting_key = ?', ['aggregators']);
        if (rows.length > 0) {
            res.json(JSON.parse(rows[0].setting_value));
        } else {
            // Should not happen due to init, but fallback
            res.json([]);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE Aggregators
router.post('/aggregators', authenticateToken, async (req, res) => {
    try {
        const { aggregators } = req.body;
        if (!Array.isArray(aggregators)) {
            return res.status(400).json({ error: 'Aggregators must be an array' });
        }

        await db.query(
            'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
            ['aggregators', JSON.stringify(aggregators), JSON.stringify(aggregators)]
        );

        res.json({ message: 'Aggregators updated', aggregators });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
