import express from 'express';
import db from '../config/db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET ALL SONGWRITERS
router.get('/', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM saved_songwriters ORDER BY name ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CREATE SONGWRITER
router.post('/', authenticateToken, async (req, res) => {
    try {
        const {
            name, first_name, last_name, email, phone, nik, npwp,
            country, province, city, district, village, postal_code,
            address1, address2, bank_name, bank_branch, account_name,
            account_number, publisher, ipi
        } = req.body;

        const [result] = await db.query(
            `INSERT INTO saved_songwriters 
            (name, first_name, last_name, email, phone, nik, npwp,
            country, province, city, district, village, postal_code,
            address1, address2, bank_name, bank_branch, account_name,
            account_number, publisher, ipi) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name, first_name, last_name, email, phone, nik, npwp,
                country, province, city, district, village, postal_code,
                address1, address2, bank_name, bank_branch, account_name,
                account_number, publisher, ipi
            ]
        );

        res.status(201).json({ message: 'Songwriter created', id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
