import express from 'express';
import db from '../config/db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Middleware to check if user is Admin
const isAdmin = (req, res, next) => {
    if (req.user.role === 'Admin') {
        next();
    } else {
        res.status(403).json({ error: 'Access denied. Admin only.' });
    }
};

// GET all WhatsApp templates
router.get('/', authenticateToken, isAdmin, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM whatsapp_templates');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE a WhatsApp template
router.put('/:key', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { key } = req.params;
        const { body_template } = req.body;
        
        if (!body_template) {
            return res.status(400).json({ error: 'Body template is required' });
        }

        await db.query(
            'UPDATE whatsapp_templates SET body_template = ? WHERE template_key = ?',
            [body_template, key]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
