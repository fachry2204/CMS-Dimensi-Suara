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
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Initialize Users Table & Default Admin
const initUserTable = async () => {
    try {
        // Add profile_picture column if not exists
        try {
            await db.query('SELECT profile_picture FROM users LIMIT 1');
        } catch (e) {
            await db.query('ALTER TABLE users ADD COLUMN profile_picture VARCHAR(255)');
            console.log('Added profile_picture column to users table');
        }

        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role ENUM('Admin', 'Operator', 'User') DEFAULT 'User',
                status ENUM('Active', 'Inactive') DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                profile_picture VARCHAR(255)
            )
        `);

        // Check if any admin exists
        const [rows] = await db.query("SELECT * FROM users WHERE role = 'Admin'");
        if (rows.length === 0) {
            console.log("Creating default admin user...");
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash('admin123', salt); // Default password
            
            await db.query(
                "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)",
                ['Admin', 'admin@dimensisuara.com', hash, 'Admin']
            );
        }
    } catch (err) {
        console.error('Error initializing users table:', err);
    }
};

initUserTable();

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
        const [rows] = await db.query('SELECT id, username as name, email, role, status, DATE_FORMAT(created_at, "%Y-%m-%d") as joinedDate FROM users ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CREATE USER (Admin/Operator)
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const [result] = await db.query(
            'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
            [name, email, hash, role || 'User']
        );

        res.status(201).json({ 
            message: 'User created successfully', 
            user: {
                id: result.insertId,
                name,
                email,
                role: role || 'User',
                status: 'Active',
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

export default router;
