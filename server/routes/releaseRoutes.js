import express from 'express';
import db from '../config/db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET ALL RELEASES
router.get('/', authenticateToken, async (req, res) => {
    try {
        // In real app, filter by user if not admin
        const [rows] = await db.query('SELECT * FROM releases ORDER BY created_at DESC');
        // Parse JSON fields
        const releases = rows.map(r => ({
            ...r,
            primary_artists: typeof r.primary_artists === 'string' ? JSON.parse(r.primary_artists) : r.primary_artists
        }));
        res.json(releases);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CREATE RELEASE
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { title, upc, primary_artists, ...otherData } = req.body;
        const userId = req.user.id;

        const [result] = await db.query(
            `INSERT INTO releases 
            (user_id, title, upc, primary_artists, status, submission_date) 
            VALUES (?, ?, ?, ?, 'Pending', NOW())`,
            [userId, title, upc, JSON.stringify(primary_artists || [])]
        );
        
        // Note: For full implementation, we need to handle all fields and Tracks insertion.
        // This is a simplified example.
        
        res.status(201).json({ message: 'Release created', id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
