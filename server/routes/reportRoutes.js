import express from 'express';
import db from '../config/db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET REPORTS
router.get('/', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM reports ORDER BY period DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// IMPORT REPORTS (Batch Insert)
router.post('/import', authenticateToken, async (req, res) => {
    try {
        const { data } = req.body; // Array of report objects
        if (!Array.isArray(data) || data.length === 0) {
            return res.status(400).json({ error: 'No data provided' });
        }

        // Prepare bulk insert
        // Columns: period, upc, isrc, title, artist, platform, country, quantity, revenue, original_file_name
        const values = data.map(row => [
            row.period, row.upc, row.isrc, row.title, row.artist, 
            row.platform, row.country, row.quantity, row.revenue, row.originalFileName
        ]);

        const sql = `INSERT INTO reports 
            (period, upc, isrc, title, artist, platform, country, quantity, revenue, original_file_name) 
            VALUES ?`;

        const [result] = await db.query(sql, [values]);

        res.json({ message: `Successfully imported ${result.affectedRows} rows` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
