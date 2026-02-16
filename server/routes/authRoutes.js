import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

// REGISTER (Public: creates basic User with Pending status and optional extended profile)
router.post('/register', async (req, res) => {
    try {
        const {
            username: rawUsername,
            email,
            password,
            accountType,
            companyName,
            nik,
            fullName,
            address,
            country,
            province,
            city,
            district,
            subdistrict,
            postalCode,
            phone,
            picName,
            picPosition,
            picPhone,
            nibDocPath,
            kemenkumhamDocPath,
            ktpDocPath,
            npwpDocPath
        } = req.body;

        const username = rawUsername || email;
        
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }

        const [cols] = await db.query('SHOW COLUMNS FROM users');
        const colNames = cols.map(c => c.Field);
        const hasRole = colNames.includes('role');
        const hasStatus = colNames.includes('status');

        const duplicateReasons = [];

        const [emailRows] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (emailRows.length > 0) duplicateReasons.push('EMAIL');

        if (phone) {
            const [phoneRows] = await db.query('SELECT id FROM users WHERE phone = ?', [phone]);
            if (phoneRows.length > 0) duplicateReasons.push('PHONE');
        }

        if (accountType === 'COMPANY' && companyName) {
            const [companyRows] = await db.query('SELECT id FROM users WHERE company_name = ?', [companyName]);
            if (companyRows.length > 0) duplicateReasons.push('COMPANY');
        }

        if (duplicateReasons.length > 0) {
            return res.status(400).json({
                error: 'Data sudah terdaftar. Mohon gunakan email, nomor WhatsApp, atau nama perusahaan lain.',
                duplicate: duplicateReasons
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        let sql = '';
        let params = [];

        if (hasRole && hasStatus) {
            sql = 'INSERT INTO users (username, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)';
            params = [username, email, hash, 'User', 'Pending'];
        } else if (hasRole) {
            sql = 'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)';
            params = [username, email, hash, 'User'];
        } else {
            sql = 'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)';
            params = [username, email, hash];
        }

        const [result] = await db.query(sql, params);

        try {
            await db.query(
                `UPDATE users SET
                    account_type = ?,
                    company_name = ?,
                    nik = ?,
                    full_name = ?,
                    address = ?,
                    country = ?,
                    province = ?,
                    city = ?,
                    district = ?,
                    subdistrict = ?,
                    postal_code = ?,
                    phone = ?,
                    pic_name = ?,
                    pic_position = ?,
                    pic_phone = ?,
                    nib_doc_path = ?,
                    kemenkumham_doc_path = ?,
                    ktp_doc_path = ?,
                    npwp_doc_path = ?
                 WHERE id = ?`,
                [
                    accountType || 'PERSONAL',
                    accountType === 'COMPANY' ? (companyName || '') : '',
                    nik || '',
                    fullName || '',
                    address || '',
                    country || '',
                    province || '',
                    city || '',
                    district || '',
                    subdistrict || '',
                    postalCode || '',
                    phone || '',
                    picName || '',
                    picPosition || '',
                    picPhone || '',
                    nibDocPath || '',
                    kemenkumhamDocPath || '',
                    ktpDocPath || '',
                    npwpDocPath || '',
                    result.insertId
                ]
            );
        } catch (e) {
        }

        res.status(201).json({ 
            message: 'User registered successfully', 
            userId: result.insertId,
            status: hasStatus ? 'Pending' : undefined
        });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Username or email already exists' });
        }
        res.status(500).json({ error: err.message });
    }
});

// LOGIN
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) return res.status(400).json({ error: 'User not found' });

        const user = users[0];

        // Check password
        const validPass = await bcrypt.compare(password, user.password_hash);
        if (!validPass) return res.status(400).json({ error: 'Invalid password' });

        // Create Token (1h) and set sliding session cookie
        const payload = { id: user.id, role: user.role };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

        const secure = req.secure || (req.headers['x-forwarded-proto'] === 'https');
        res.cookie('auth_token', token, {
            httpOnly: true,
            sameSite: 'lax',
            secure,
            maxAge: 60 * 60 * 1000 // 1 hour
        });

        res.json({ 
            token, 
            user: { 
                id: user.id, 
                username: user.username, 
                role: user.role,
                status: user.status,
                profile_picture: user.profile_picture 
            } 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// LOGOUT - clear session cookie
router.post('/logout', (req, res) => {
    res.clearCookie('auth_token', { httpOnly: true, sameSite: 'lax' });
    res.json({ message: 'Logged out' });
});

export default router;
