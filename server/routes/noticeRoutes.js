import express from 'express';
import db from '../config/db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Middleware to check if user is Admin or Operator
const isAdminOrOperator = (req, res, next) => {
    const role = req.user.role;
    if (role === 'Admin' || role === 'Operator') {
        next();
    } else {
        res.status(403).json({ error: 'Access denied. Admin or Operator only.' });
    }
};

// GET all notices (Admin/Operator only)
router.get('/', authenticateToken, isAdminOrOperator, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM notices ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching notices:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET active notices for Dashboard (All users)
router.get('/active', authenticateToken, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const [rows] = await db.query(
            'SELECT * FROM notices WHERE start_date <= ? AND end_date >= ? ORDER BY created_at DESC',
            [today, today]
        );
        res.json(rows);
    } catch (err) {
        console.error('Error fetching active notices:', err);
        res.status(500).json({ error: err.message });
    }
});

// CREATE notice (Admin/Operator only)
router.post('/', authenticateToken, isAdminOrOperator, async (req, res) => {
    try {
        const { title, content, start_date, end_date } = req.body;
        if (!title || !content || !start_date || !end_date) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const [result] = await db.query(
            'INSERT INTO notices (title, content, start_date, end_date) VALUES (?, ?, ?, ?)',
            [title, content, start_date, end_date]
        );
        res.status(201).json({ id: result.insertId, title, content, start_date, end_date });
    } catch (err) {
        console.error('Error creating notice:', err);
        res.status(500).json({ error: err.message });
    }
});

// UPDATE notice (Admin/Operator only)
router.put('/:id', authenticateToken, isAdminOrOperator, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, start_date, end_date } = req.body;

        await db.query(
            'UPDATE notices SET title = ?, content = ?, start_date = ?, end_date = ? WHERE id = ?',
            [title, content, start_date, end_date, id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Error updating notice:', err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE notice (Admin/Operator only)
router.delete('/:id', authenticateToken, isAdminOrOperator, async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM notices WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting notice:', err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
