import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from '../config/db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { exec } from 'child_process';
import util from 'util';
import { initDb } from '../init-db.js';
import { checkDbIntegrity, checkSystemUpdate, logSystemCheck, performSystemUpdate } from '../utils/systemCheck.js';

const execPromise = util.promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Ensure settings upload directory exists
const UPLOADS_ROOT = path.join(__dirname, '../../uploads');
const SETTINGS_DIR = path.join(UPLOADS_ROOT, 'settings');
const PROJECT_ROOT = path.resolve(__dirname, '../../');

try {
    if (!fs.existsSync(SETTINGS_DIR)) {
        fs.mkdirSync(SETTINGS_DIR, { recursive: true });
    }
} catch (err) {
    console.error('Failed to create settings upload directory:', err);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, SETTINGS_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// --- AGGREGATORS ---

router.get('/aggregators', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT setting_value FROM settings WHERE setting_key = ?', ['aggregators']);
        if (rows.length === 0 || !rows[0].setting_value) {
            return res.json([]);
        }
        res.json(JSON.parse(rows[0].setting_value));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/aggregators', authenticateToken, async (req, res) => {
    try {
        const { aggregators } = req.body;
        await db.query(
            'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
            ['aggregators', JSON.stringify(aggregators), JSON.stringify(aggregators)]
        );
        res.json({ message: 'Aggregators updated', aggregators });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- SYSTEM CHECK ---

// Check DB Integrity
router.get('/system/check-db', authenticateToken, async (req, res) => {
    try {
        const result = await checkDbIntegrity();
        await logSystemCheck('DB_INTEGRITY_CHECK', result);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Fix DB Integrity
router.post('/system/fix-db', authenticateToken, async (req, res) => {
    try {
        console.log('Starting manual DB fix...');
        await initDb();
        res.json({ message: 'Database structure repaired successfully.' });
    } catch (err) {
        console.error('DB Fix failed:', err);
        res.status(500).json({ error: 'Failed to repair database: ' + err.message });
    }
});

// Check Update
router.get('/system/check-update', authenticateToken, async (req, res) => {
    try {
        const result = await checkSystemUpdate();
        await logSystemCheck('UPDATE_CHECK', result);
        res.json(result);
    } catch (err) {
        console.error('Git check failed:', err);
        res.status(500).json({ error: 'Failed to check updates: ' + err.message });
    }
});

// Get System Logs
router.get('/system/logs', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM system_logs ORDER BY created_at DESC LIMIT 50');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Perform Update
router.post('/system/update', authenticateToken, async (req, res) => {
    try {
        const result = await performSystemUpdate(PROJECT_ROOT);
        res.json(result);
        
        // Restart Server (Exit process so PM2/Nodemon restarts it)
        setTimeout(() => {
            console.log('Restarting server...');
            process.exit(0);
        }, 2000);
    } catch (err) {
        console.error('Update failed:', err);
        res.status(500).json({ error: 'Update failed: ' + err.message });
    }
});

// --- SECURITY LOGS ---

router.get('/security/logs', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM security_logs ORDER BY created_at DESC LIMIT 100');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// BRANDING ROUTES
router.get('/branding', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT setting_key, setting_value FROM settings WHERE setting_key IN (?, ?)', ['logo', 'login_background']);
        const settings = {
            logo: null,
            login_background: null
        };
        
        rows.forEach(row => {
            if (row.setting_key === 'logo') settings.logo = row.setting_value;
            if (row.setting_key === 'login_background') settings.login_background = row.setting_value;
        });
        
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/branding', authenticateToken, upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'login_background', maxCount: 1 }]), async (req, res) => {
    try {
        const updates = [];
        const files = req.files;
        const baseUrl = '/uploads/settings/';

        if (files['logo']) {
            const logoPath = baseUrl + files['logo'][0].filename;
            updates.push(db.query(
                'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
                ['logo', logoPath, logoPath]
            ));
        }

        if (files['login_background']) {
            const bgPath = baseUrl + files['login_background'][0].filename;
            updates.push(db.query(
                'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
                ['login_background', bgPath, bgPath]
            ));
        }

        await Promise.all(updates);
        
        // Fetch updated
        const [rows] = await db.query('SELECT setting_key, setting_value FROM settings WHERE setting_key IN (?, ?)', ['logo', 'login_background']);
        const settings = {
            logo: null,
            login_background: null
        };
        rows.forEach(row => {
            if (row.setting_key === 'logo') settings.logo = row.setting_value;
            if (row.setting_key === 'login_background') settings.login_background = row.setting_value;
        });

        res.json({ message: 'Branding updated', branding: settings });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
