import express from 'express';
import db from '../config/db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET ALL PUBLISHING REGISTRATIONS
router.get('/', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM publishing_registrations ORDER BY created_at DESC');
        
        // Parse JSON fields
        const registrations = rows.map(r => ({
            ...r,
            rights_granted: typeof r.rights_granted === 'string' ? JSON.parse(r.rights_granted) : r.rights_granted,
            songwriters: typeof r.songwriters === 'string' ? JSON.parse(r.songwriters) : r.songwriters
        }));
        
        res.json(registrations);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CREATE PUBLISHING REGISTRATION
router.post('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            title, song_code, other_title, sample_link, rights_granted,
            performer, duration, genre, language, region, iswc, isrc,
            lyrics, note, songwriters
        } = req.body;

        const [result] = await db.query(
            `INSERT INTO publishing_registrations 
            (user_id, title, song_code, other_title, sample_link, rights_granted,
            performer, duration, genre, language, region, iswc, isrc,
            lyrics, note, songwriters, status, submission_date) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', NOW())`,
            [
                userId, title, song_code, other_title, sample_link, 
                JSON.stringify(rights_granted),
                performer, duration, genre, language, region, iswc, isrc,
                lyrics, note, JSON.stringify(songwriters)
            ]
        );

        res.status(201).json({ message: 'Registration created', id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
