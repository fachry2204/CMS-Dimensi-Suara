import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../config/db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure Multer for Profile Pictures
const UPLOADS_ROOT = path.join(__dirname, '../../uploads');
const PROFILES_DIR = path.join(UPLOADS_ROOT, 'profiles');

if (!fs.existsSync(PROFILES_DIR)) fs.mkdirSync(PROFILES_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, PROFILES_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const baseType = req.body && req.body.type ? String(req.body.type).toLowerCase() : 'profile';
        cb(null, baseType + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// PUBLIC: Upload registration documents (KTP, NPWP, NIB, Kemenkumham)
router.post('/upload-doc', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const filePath = `/uploads/profiles/${req.file.filename}`;
        res.json({ path: filePath });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET CURRENT USER PROFILE
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, username, email, role, profile_picture FROM users WHERE id = ?', [req.user.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE USER PROFILE
router.put('/profile', authenticateToken, upload.single('profilePicture'), async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const userId = req.user.id;
        
        const updates = [];
        const params = [];

        if (username) {
            updates.push('username = ?');
            params.push(username);
        }
        if (email) {
            updates.push('email = ?');
            params.push(email);
        }
        if (password) {
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(password, salt);
            updates.push('password_hash = ?');
            params.push(hash);
        }

        if (req.file) {
            const profilePath = `/uploads/profiles/${req.file.filename}`;
            updates.push('profile_picture = ?');
            params.push(profilePath);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No updates provided' });
        }

        params.push(userId);
        
        await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

        // Fetch updated user
        const [rows] = await db.query('SELECT id, username, email, role, profile_picture FROM users WHERE id = ?', [userId]);
        
        res.json({ message: 'Profile updated successfully', user: rows[0] });

    } catch (err) {
        console.error(err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Username or email already exists' });
        }
        res.status(500).json({ error: err.message });
    }
});

// GET ALL USERS (Admin/Operator only)
router.get('/', authenticateToken, async (req, res) => {
    try {
        if (req.user.role === 'User') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const [cols] = await db.query('SHOW COLUMNS FROM users');
        const colNames = cols.map(c => c.Field);
        const hasStatus = colNames.includes('status');
        const hasJoinedDate = colNames.includes('joined_date');
        const hasRegisteredAt = colNames.includes('registered_at');
        const hasRejectedDate = colNames.includes('rejected_date');

        const selectParts = [
            'id',
            'username as name',
            'email',
            'role',
            hasStatus ? 'status' : `'Active' as status`,
            hasJoinedDate ? 'DATE_FORMAT(joined_date, "%Y-%m-%d") as joinedDate' : 'NULL as joinedDate',
            hasRegisteredAt ? 'DATE_FORMAT(registered_at, "%Y-%m-%d") as registeredDate' : 'NULL as registeredDate',
            hasRejectedDate ? 'DATE_FORMAT(rejected_date, "%Y-%m-%d") as rejectedDate' : 'NULL as rejectedDate'
        ];

        const orderBy = hasCreatedAt ? 'created_at DESC' : 'id DESC';
        const sql = `SELECT ${selectParts.join(', ')} FROM users ORDER BY ${orderBy}`;

        const [rows] = await db.query(sql);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CREATE USER (Admin/Operator)
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { name, email, password, role, status } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const [cols] = await db.query('SHOW COLUMNS FROM users');
        const colNames = cols.map(c => c.Field);
        const hasStatus = colNames.includes('status');

        let sql = '';
        let params = [];

        if (hasStatus) {
            sql = 'INSERT INTO users (username, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)';
            params = [name, email, hash, role || 'User', status || 'Active'];
        } else {
            sql = 'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)';
            params = [name, email, hash, role || 'User'];
        }

        const [result] = await db.query(sql, params);

        res.status(201).json({ 
            message: 'User created successfully', 
            user: {
                id: result.insertId,
                name,
                email,
                role: role || 'User',
                status: status || 'Active',
                joinedDate: new Date().toISOString().split('T')[0]
            }
        });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Username or email already exists' });
        }
        res.status(500).json({ error: err.message });
    }
});

// DELETE USER
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.params.id;
        
        // Prevent deleting self (optional but recommended)
        if (parseInt(userId) === req.user.id) {
             return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        await db.query('DELETE FROM users WHERE id = ?', [userId]);
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE USER STATUS (Admin/Operator)
router.put('/:id/status', authenticateToken, async (req, res) => {
    try {
        if (req.user.role === 'User') {
            return res.status(403).json({ error: 'Access denied' });
        }
        const userId = req.params.id;
        const { status, reason } = req.body || {};
        const allowed = ['Pending', 'Review', 'Approved', 'Rejected', 'Active', 'Inactive'];
        if (!allowed.includes(String(status))) {
            return res.status(400).json({ error: 'Invalid status value' });
        }
        if (status === 'Rejected' && (!reason || String(reason).trim().length === 0)) {
            return res.status(400).json({ error: 'Rejection reason is required' });
        }
        const [cols] = await db.query('SHOW COLUMNS FROM users');
        const colNames = cols.map(c => c.Field);
        if (!colNames.includes('status')) {
            return res.status(400).json({ error: 'Status column not available' });
        }
        if (status === 'Approved') {
            // Set joined_date now, clear rejection fields
            await db.query('UPDATE users SET status = ?, joined_date = NOW(), rejected_date = NULL, rejection_reason = NULL WHERE id = ?', [status, userId]);
        } else if (status === 'Rejected') {
            // Set rejected_date and reason, clear joined_date
            await db.query('UPDATE users SET status = ?, rejected_date = NOW(), rejection_reason = ?, joined_date = NULL WHERE id = ?', [status, reason || null, userId]);
        } else {
            // Other statuses: clear joined/rejected dates
            await db.query('UPDATE users SET status = ?, joined_date = NULL, rejected_date = NULL WHERE id = ?', [status, userId]);
        }
        const [rows] = await db.query('SELECT id, username as name, email, role, status, DATE_FORMAT(joined_date, "%Y-%m-%d") as joinedDate, rejection_reason FROM users WHERE id = ?', [userId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ message: 'Status updated', user: rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
