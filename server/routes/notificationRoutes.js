import express from 'express';
import db from '../config/db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Initialize Notifications Table
const initTable = async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                type VARCHAR(50),
                message TEXT,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('Notifications table initialized');
    } catch (err) {
        console.error('Error initializing notifications table:', err);
    }
};

initTable();

// GET Notifications for Current User
router.get('/', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', 
            [req.user.id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// MARK AS READ
router.post('/mark-read', authenticateToken, async (req, res) => {
    try {
        const { id } = req.body;
        
        if (id) {
            // Mark specific notification
            await db.query(
                'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
                [id, req.user.id]
            );
        } else {
            // Mark all for user
            await db.query(
                'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
                [req.user.id]
            );
        }
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
