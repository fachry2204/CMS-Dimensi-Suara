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
import tls from 'tls';
import net from 'net';

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
        // Use the new login_settings table (Struktur Khusus)
        const [rows] = await db.query('SELECT * FROM login_settings WHERE id = 1');
        
        if (rows.length === 0) {
            return res.json({
                logo: null,
                favicon_url: null,
                login_background: null,
                login_title: 'Agregator & Publishing Musik',
                login_footer: 'Protected CMS Area. Authorized personnel only.',
                login_button_color: 'linear-gradient(to right, #2563eb, #0891b2)',
                login_form_bg_color: 'rgba(255, 255, 255, 0.9)',
                enable_registration: 'true'
            });
        }
        
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/branding', authenticateToken, upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'favicon', maxCount: 1 }, { name: 'login_background', maxCount: 1 }]), async (req, res) => {
    try {
        const files = req.files || {};
        const body = req.body;
        console.log('Branding Update Request:', { body, files }); // DEBUG LOG

        const baseUrl = '/uploads/settings/';
        
        const updateFields = [];
        const updateValues = [];

        // Handle Files
        if (files['logo']) {
            updateFields.push('logo = ?');
            updateValues.push(baseUrl + files['logo'][0].filename);
        }

        if (files['favicon']) {
            updateFields.push('favicon_url = ?');
            updateValues.push(baseUrl + files['favicon'][0].filename);
        }

        if (files['login_background']) {
            updateFields.push('login_background = ?');
            updateValues.push(baseUrl + files['login_background'][0].filename);
        }

        // Handle Text Fields
        const textFields = [
            'login_title', 
            'login_footer', 
            'login_button_color', 
            'login_form_bg_color',
            'enable_registration',
            'login_title_color',
            'login_footer_color',
            'login_form_bg_opacity',
            'login_bg_opacity',
            'login_glass_effect',
            'login_form_text_color'
        ];

        textFields.forEach(field => {
            if (body[field] !== undefined) {
                updateFields.push(`${field} = ?`);
                updateValues.push(body[field]);
            }
        });

        if (updateFields.length > 0) {
            // Ensure row 1 exists
            const [check] = await db.query('SELECT 1 FROM login_settings WHERE id = 1');
            if (check.length === 0) {
                 await db.query(`INSERT INTO login_settings (id) VALUES (1)`);
            }

            const sql = `UPDATE login_settings SET ${updateFields.join(', ')} WHERE id = 1`;
            await db.query(sql, updateValues);
        }
        
        // Fetch updated settings
        const [rows] = await db.query('SELECT * FROM login_settings WHERE id = 1');
        
        res.json({ message: 'Branding updated', branding: rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- GATEWAY SETTINGS (SMTP & MPWA) ---
// Store under generic `settings` table using JSON blobs
router.get('/gateway', authenticateToken, async (req, res) => {
    try {
        const [smtpRows] = await db.query('SELECT setting_value FROM settings WHERE setting_key = ?', ['smtp_settings']);
        const [mpwaRows] = await db.query('SELECT setting_value FROM settings WHERE setting_key = ?', ['mpwa_settings']);
        
        const smtp = (smtpRows.length > 0 && smtpRows[0].setting_value) ? JSON.parse(smtpRows[0].setting_value) : {
            host: '',
            port: 587,
            secure: false,
            user: '',
            pass: '',
            from_email: '',
            from_name: ''
        };
        const mpwa = (mpwaRows.length > 0 && mpwaRows[0].setting_value) ? JSON.parse(mpwaRows[0].setting_value) : {
            base_url: '',
            token: '',
            device_id: ''
        };
        res.json({ smtp, mpwa });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/gateway', authenticateToken, async (req, res) => {
    try {
        const { smtp, mpwa } = req.body || {};
        if (smtp) {
            await db.query(
                'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
                ['smtp_settings', JSON.stringify(smtp), JSON.stringify(smtp)]
            );
        }
        if (mpwa) {
            await db.query(
                'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
                ['mpwa_settings', JSON.stringify(mpwa), JSON.stringify(mpwa)]
            );
        }
        res.json({ message: 'Gateway settings saved', smtp, mpwa });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Simple SMTP client for test email (no external dependency)
const smtpSendTest = ({ host, port, secure, user, pass, from_email, to, subject, body }) => {
    return new Promise((resolve, reject) => {
        const socket = secure ? tls.connect(port, host, { servername: host }, onConnect) : net.connect(port, host, onConnect);
        let buffer = '';
        let closed = false;
        let lastCode = 0;

        function onConnect() {
            // Wait for 220 greeting then start handshake
        }
        function cleanup(err) {
            if (closed) return;
            closed = true;
            try { socket.end(); } catch {}
            if (err) reject(err);
        }
        function expect(code) {
            return new Promise((res, rej) => {
                const onData = (data) => {
                    buffer += data.toString('utf8');
                    // Responses may span multiple lines; take last line code
                    const lines = buffer.split(/\r?\n/).filter(l => l.trim().length > 0);
                    const last = lines[lines.length - 1] || '';
                    const m = last.match(/^(\d{3})/);
                    if (m) {
                        lastCode = parseInt(m[1], 10);
                        if (lastCode === code || (Array.isArray(code) && code.includes(lastCode))) {
                            socket.removeListener('data', onData);
                            buffer = '';
                            res(last);
                        } else if (lastCode >= 400) {
                            socket.removeListener('data', onData);
                            rej(new Error(`SMTP error ${lastCode}: ${last}`));
                        }
                    }
                };
                socket.on('data', onData);
            });
        }
        function send(cmd) {
            return new Promise((res, rej) => {
                try {
                    socket.write(cmd + '\r\n', 'utf8', res);
                } catch (e) {
                    rej(e);
                }
            });
        }
        socket.once('error', (e) => cleanup(e));
        socket.once('close', () => cleanup(new Error('SMTP connection closed')));
        (async () => {
            try {
                await expect(220);
                await send(`EHLO localhost`);
                await expect(250);
                if (user && pass) {
                    await send('AUTH LOGIN');
                    await expect(334);
                    await send(Buffer.from(String(user)).toString('base64'));
                    await expect(334);
                    await send(Buffer.from(String(pass)).toString('base64'));
                    await expect(235);
                }
                await send(`MAIL FROM:<${from_email}>`);
                await expect(250);
                await send(`RCPT TO:<${to}>`);
                await expect([250, 251]);
                await send('DATA');
                await expect(354);
                const msg = [
                    `From: <${from_email}>`,
                    `To: <${to}>`,
                    `Subject: ${subject}`,
                    `Date: ${new Date().toUTCString()}`,
                    `Message-ID: <${Date.now()}.${Math.random().toString(36).slice(2)}@${String(from_email).split('@')[1] || 'localhost'}>`,
                    `Reply-To: ${from_email}`,
                    'X-Mailer: DimensiSuaraCMS/1.0',
                    'MIME-Version: 1.0',
                    'Content-Type: text/plain; charset=utf-8',
                    'Content-Transfer-Encoding: 8bit',
                    '',
                    body || 'Test email dari CMS Dimensi Suara.',
                    ''
                ].join('\r\n');
                await send(msg + '\r\n.');
                await expect(250);
                await send('QUIT');
                // 221 closing connection (ignore errors after QUIT)
                resolve({ ok: true });
                cleanup();
            } catch (err) {
                cleanup(err);
            }
        })();
    });
};

router.post('/gateway/test-email', authenticateToken, async (req, res) => {
    try {
        const { to, subject, body } = req.body || {};
        if (!to) return res.status(400).json({ error: 'Recipient email (to) is required' });
        const [smtpRows] = await db.query('SELECT setting_value FROM settings WHERE setting_key = ?', ['smtp_settings']);
        if (smtpRows.length === 0 || !smtpRows[0].setting_value) {
            return res.status(400).json({ error: 'SMTP settings not configured' });
        }
        const smtp = JSON.parse(smtpRows[0].setting_value);
        if (!smtp.host || !smtp.port || !smtp.user || !smtp.pass || !smtp.from_email) {
            return res.status(400).json({ error: 'Incomplete SMTP settings' });
        }
        await smtpSendTest({
            host: smtp.host,
            port: Number(smtp.port || 587),
            secure: Boolean(smtp.secure),
            user: smtp.user,
            pass: smtp.pass,
            from_email: smtp.from_email,
            to,
            subject: subject || 'Test Email - Dimensi Suara CMS',
            body: body || 'Ini adalah email percobaan dari CMS Dimensi Suara.'
        });
        res.json({ message: 'Email test sent successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to send test email' });
    }
});

router.post('/gateway/test-wa', authenticateToken, async (req, res) => {
    try {
        const { phone, message, endpoint, token, device_id } = req.body || {};
        if (!phone) return res.status(400).json({ error: 'Phone is required' });
        
        const [rows] = await db.query('SELECT setting_value FROM settings WHERE setting_key = ?', ['mpwa_settings']);
        const cfg = (rows.length > 0 && rows[0].setting_value) ? JSON.parse(rows[0].setting_value) : {};
        
        // Use provided values or fallback to DB
        let url = (endpoint && endpoint.trim()) ? endpoint : (cfg.base_url || cfg.endpoint || '');
        const apiKey = (token && token.trim()) ? token : cfg.token;
        const sender = (device_id && device_id.trim()) ? device_id : cfg.device_id;

        if (!url) return res.status(400).json({ error: 'MPWA base URL not configured' });
        if (!apiKey) return res.status(400).json({ error: 'API Token is required' });
        if (!sender) return res.status(400).json({ error: 'Device ID (Sender) is required' });
        
        if (!url.includes('/send-message')) {
            if (!url.endsWith('/')) url += '/';
            url += 'send-message';
        }

        // Clean phone number: digits only
        const cleanPhone = String(phone).replace(/\D/g, '');
        const finalPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;

        // Payload based on MPWA documentation
        const body = { 
            api_key: apiKey,
            sender: sender,
            number: finalPhone, 
            message: message || 'Test message from CMS Dimensi Suara.' 
        };

        console.log(`Sending MPWA test to ${url}...`);
        
        const r = await fetch(url, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(body)
        });
        
        const responseText = await r.text().catch(()=>'');
        let responseJson = {};
        try { responseJson = JSON.parse(responseText); } catch {}

        if (!r.ok) {
            console.error(`MPWA Error ${r.status}:`, responseText);
            throw new Error(`MPWA request failed (${r.status}): ${responseJson.msg || responseJson.error || responseText || r.statusText}`);
        }

        // Check if response has status: false despite 200 OK
        if (responseJson.status === false || responseJson.status === 'false') {
            throw new Error(`MPWA Gateway Error: ${responseJson.msg || 'Unknown error'}`);
        }

        res.json({ message: 'WA test sent successfully', detail: responseJson });
    } catch (err) {
        console.error('Test WA Exception:', err);
        res.status(500).json({ error: err.message || 'Failed to send WA' });
    }
});

// Email Logs Monitoring (Admin/Operator)
router.get('/email/logs', authenticateToken, async (req, res) => {
    try {
        if (!req.user || !['Admin', 'Operator'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const { status, type, page = '1', limit = '50' } = req.query || {};
        const p = Math.max(parseInt(String(page), 10) || 1, 1);
        const l = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 200);
        const offset = (p - 1) * l;
        const conds = [];
        const params = [];
        if (typeof status === 'string' && status.length > 0) {
            conds.push('status = ?');
            params.push(status.toUpperCase());
        }
        if (typeof type === 'string' && type.length > 0) {
            conds.push('related_type = ?');
            params.push(type);
        }
        const where = conds.length > 0 ? `WHERE ${conds.join(' AND ')}` : '';
        const [rows] = await db.query(
            `SELECT id, user_id, related_type, related_id, to_email, subject, status, error_message, created_at, sent_at
             FROM email_logs
             ${where}
             ORDER BY created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, l, offset]
        );
        const [[{ total }]] = await db.query(
            `SELECT COUNT(*) as total FROM email_logs ${where}`,
            params
        );
        res.json({ data: rows, total, page: p, limit: l });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Messaging Templates (Email)
router.get('/messaging/templates', authenticateToken, async (req, res) => {
    try {
        if (!req.user || !['Admin', 'Operator'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const [rows] = await db.query('SELECT * FROM email_templates');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/messaging/template', authenticateToken, async (req, res) => {
    try {
        if (!req.user || !['Admin', 'Operator'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const { key, subject, body } = req.body || {};
        if (!key) return res.status(400).json({ error: 'Key is required' });
        await db.query(
            'INSERT INTO email_templates (template_key, subject_template, body_template) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE subject_template = VALUES(subject_template), body_template = VALUES(body_template)',
            [key, subject || '', body || '']
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Messaging Templates (WhatsApp)
router.get('/messaging/templates/wa', authenticateToken, async (req, res) => {
    try {
        if (!req.user || !['Admin', 'Operator'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const [rows] = await db.query('SELECT * FROM whatsapp_templates');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/messaging/template/wa', authenticateToken, async (req, res) => {
    try {
        if (!req.user || !['Admin', 'Operator'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const { key, body } = req.body || {};
        if (!key) return res.status(400).json({ error: 'Key is required' });
        await db.query(
            'INSERT INTO whatsapp_templates (template_key, body_template) VALUES (?, ?) ON DUPLICATE KEY UPDATE body_template = VALUES(body_template)',
            [key, body || '']
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Broadcast Messaging
router.post('/messaging/broadcast', authenticateToken, async (req, res) => {
    try {
        if (!req.user || !['Admin', 'Operator'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const { channel = 'email', subject, html, message, recipients, delayMs = 1500 } = req.body || {};
        
        // Resolve targets: if recipients provided, use them; otherwise all users
        let targets = [];
        if (Array.isArray(recipients) && recipients.length > 0) {
            targets = recipients;
        } else {
            const [userRows] = await db.query('SELECT email, phone FROM users WHERE (email IS NOT NULL AND email != "") OR (phone IS NOT NULL AND phone != "")');
            targets = userRows.map(u => ({ email: u.email, phone: u.phone }));
        }

        if (targets.length === 0) return res.status(400).json({ error: 'No recipients found' });

        const [smtpRows] = await db.query('SELECT setting_value FROM settings WHERE setting_key = ?', ['smtp_settings']);
        const smtp = (smtpRows.length > 0 && smtpRows[0].setting_value) ? JSON.parse(smtpRows[0].setting_value) : null;
        
        const [waRows] = await db.query('SELECT setting_value FROM settings WHERE setting_key = ?', ['mpwa_settings']);
        const wa = (waRows.length > 0 && waRows[0].setting_value) ? JSON.parse(waRows[0].setting_value) : null;

        // Helper for SMTP
        const sendSmtp = ({ to }) => new Promise((resolve, reject) => {
            try {
                if (!smtp || !smtp.host || !smtp.port || !smtp.user || !smtp.pass || !smtp.from_email) return reject(new Error('SMTP not configured'));
                const secure = Boolean(smtp.secure);
                const socket = secure ? tls.connect(Number(smtp.port || 587), smtp.host, { servername: smtp.host }, onConnect) : net.connect(Number(smtp.port || 587), smtp.host, onConnect);
                let buffer = ''; let closed = false;
                function cleanup(err) { if (closed) return; closed = true; try { socket.end(); } catch {} if (err) reject(err); else resolve({ ok: true }); }
                function expect(code) { return new Promise((res, rej) => {
                    const onData = (data) => {
                        buffer += data.toString('utf8');
                        const lines = buffer.split(/\r?\n/).filter(l => l.trim().length > 0);
                        const last = lines[lines.length - 1] || '';
                        const m = last.match(/^(\d{3})/);
                        if (m) {
                            const lastCode = parseInt(m[1], 10);
                            if (lastCode === code || (Array.isArray(code) && code.includes(lastCode))) { socket.removeListener('data', onData); buffer = ''; res(last); }
                            else if (lastCode >= 400) { socket.removeListener('data', onData); rej(new Error(`SMTP error ${lastCode}: ${last}`)); }
                        }
                    };
                    socket.on('data', onData);
                });}
                function send(cmd) { return new Promise((res, rej) => { try { socket.write(cmd + '\r\n', 'utf8', res); } catch (e) { rej(e); } }); }
                function onConnect() {
                    (async () => {
                        try {
                            await expect(220); await send(`EHLO localhost`); await expect(250);
                            await send('AUTH LOGIN'); await expect(334);
                            await send(Buffer.from(String(smtp.user)).toString('base64')); await expect(334);
                            await send(Buffer.from(String(smtp.pass)).toString('base64')); await expect(235);
                            await send(`MAIL FROM:<${smtp.from_email}>`); await expect(250);
                            await send(`RCPT TO:<${to}>`); await expect([250, 251]);
                            await send('DATA'); await expect(354);
                            const now = new Date();
                            const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@${String(smtp.from_email).split('@')[1] || 'localhost'}>`;
                            const msg = [
                                `From: ${smtp.from_name ? `${smtp.from_name} <${smtp.from_email}>` : `<${smtp.from_email}>`}`,
                                `To: <${to}>`,
                                `Subject: ${subject || 'Broadcast'}`,
                                `Date: ${now.toUTCString()}`,
                                `Message-ID: ${messageId}`,
                                `Reply-To: ${smtp.from_email}`,
                                'X-Mailer: DimensiSuaraCMS/1.0',
                                'MIME-Version: 1.0',
                                'Content-Type: text/html; charset=utf-8',
                                'Content-Transfer-Encoding: 8bit',
                                '',
                                html || message || 'Broadcast',
                                ''
                            ].join('\r\n');
                            await send(msg + '\r\n.'); const accepted = await expect(250); await send('QUIT'); cleanup({ ok: true, accepted });
                        } catch (err) { cleanup(err); }
                    })();
                }
                socket.once('error', (e) => cleanup(e));
                socket.once('close', () => cleanup(new Error('SMTP connection closed')));
            } catch (e) { reject(e); }
        });

        // Helper for WA
        const sendWa = async ({ to }) => {
            if (!wa || (!wa.base_url && !wa.endpoint)) throw new Error('WA not configured');
            let url = wa.base_url || wa.endpoint || '';
            if (!url.includes('/send-message')) {
                if (!url.endsWith('/')) url += '/';
                url += 'send-message';
            }
            // Clean phone number
            const cleanPhone = String(to).replace(/\D/g, '');
            const finalPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;

            const body = { 
                api_key: wa.token,
                sender: wa.device_id,
                number: finalPhone, 
                message: message || subject || '' 
            };

            const r = await fetch(url, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(body)
            });
            
            const responseText = await r.text().catch(()=>'');
            let responseJson = {};
            try { responseJson = JSON.parse(responseText); } catch {}

            if (!r.ok) {
                throw new Error(`WA Gateway error (${r.status}): ${responseJson.msg || responseJson.error || responseText || r.statusText}`);
            }
            if (responseJson.status === false || responseJson.status === 'false') {
                throw new Error(`WA Gateway logic error: ${responseJson.msg || 'Unknown'}`);
            }
            return { ok: true };
        };

        // Async Background Broadcast
        (async () => {
            for (const target of targets) {
                const recipientEmail = typeof target === 'string' ? target : target.email;
                const recipientPhone = typeof target === 'string' ? target : target.phone;

                // Handle Email Channel
                if ((channel === 'email' || channel === 'both') && recipientEmail && recipientEmail.includes('@')) {
                    const [logRes] = await db.query('INSERT INTO broadcast_logs (channel, recipient, subject, message, status) VALUES (?, ?, ?, ?, ?)', 
                        ['email', recipientEmail, subject || 'Broadcast', html || message, 'PENDING']);
                    const logId = logRes?.insertId;
                    try {
                        const sent = await sendSmtp({ to: recipientEmail });
                        await db.query('UPDATE broadcast_logs SET status = ?, sent_at = NOW() WHERE id = ?', ['SENT', logId]);
                    } catch (err) {
                        await db.query('UPDATE broadcast_logs SET status = ?, error_message = ? WHERE id = ?', ['FAILED', err.message, logId]);
                    }
                    await new Promise(r => setTimeout(r, Math.max(Number(delayMs) || 1500, 200)));
                }

                // Handle WA Channel
                if ((channel === 'wa' || channel === 'both') && recipientPhone) {
                    const [logRes] = await db.query('INSERT INTO broadcast_logs (channel, recipient, subject, message, status) VALUES (?, ?, ?, ?, ?)', 
                        ['wa', recipientPhone, subject || 'Broadcast', message || html, 'PENDING']);
                    const logId = logRes?.insertId;
                    try {
                        await sendWa({ to: recipientPhone });
                        await db.query('UPDATE broadcast_logs SET status = ?, sent_at = NOW() WHERE id = ?', ['SENT', logId]);
                    } catch (err) {
                        await db.query('UPDATE broadcast_logs SET status = ?, error_message = ? WHERE id = ?', ['FAILED', err.message, logId]);
                    }
                    await new Promise(r => setTimeout(r, Math.max(Number(delayMs) || 1500, 200)));
                }
            }
        })();

        res.json({ message: 'Broadcast started', total: targets.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET Broadcast Logs
router.get('/messaging/broadcast/logs', authenticateToken, async (req, res) => {
    try {
        if (!req.user || !['Admin', 'Operator'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const [rows] = await db.query('SELECT * FROM broadcast_logs ORDER BY created_at DESC LIMIT 100');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Resend Email Log
router.post('/email/resend/:id', authenticateToken, async (req, res) => {
    try {
        if (!req.user || !['Admin', 'Operator'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const [rows] = await db.query('SELECT * FROM email_logs WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Log not found' });
        const log = rows[0];

        const [smtpRows] = await db.query('SELECT setting_value FROM settings WHERE setting_key = ?', ['smtp_settings']);
        const smtp = (smtpRows.length > 0 && smtpRows[0].setting_value) ? JSON.parse(smtpRows[0].setting_value) : null;
        if (!smtp) return res.status(400).json({ error: 'SMTP not configured' });

        // Helper for SMTP (Reuse existing logic or similar)
        const sendSmtp = ({ to, subject, html }) => new Promise((resolve, reject) => {
            const socket = Boolean(smtp.secure) ? tls.connect(Number(smtp.port || 587), smtp.host, { servername: smtp.host }, onConnect) : net.connect(Number(smtp.port || 587), smtp.host, onConnect);
            let buffer = ''; let closed = false;
            function cleanup(err) { if (closed) return; closed = true; try { socket.end(); } catch {} if (err) reject(err); else resolve({ ok: true }); }
            function expect(code) { return new Promise((res, rej) => {
                const onData = (data) => {
                    buffer += data.toString('utf8');
                    const lines = buffer.split(/\r?\n/).filter(l => l.trim().length > 0);
                    const last = lines[lines.length - 1] || '';
                    const m = last.match(/^(\d{3})/);
                    if (m) {
                        const lastCode = parseInt(m[1], 10);
                        if (lastCode === code || (Array.isArray(code) && code.includes(lastCode))) { socket.removeListener('data', onData); buffer = ''; res(last); }
                        else if (lastCode >= 400) { socket.removeListener('data', onData); rej(new Error(`SMTP error ${lastCode}: ${last}`)); }
                    }
                };
                socket.on('data', onData);
            });}
            function send(cmd) { return new Promise((res, rej) => { try { socket.write(cmd + '\r\n', 'utf8', res); } catch (e) { rej(e); } }); }
            function onConnect() {
                (async () => {
                    try {
                        await expect(220); await send(`EHLO localhost`); await expect(250);
                        await send('AUTH LOGIN'); await expect(334);
                        await send(Buffer.from(String(smtp.user)).toString('base64')); await expect(334);
                        await send(Buffer.from(String(smtp.pass)).toString('base64')); await expect(235);
                        await send(`MAIL FROM:<${smtp.from_email}>`); await expect(250);
                        await send(`RCPT TO:<${to}>`); await expect([250, 251]);
                        await send('DATA'); await expect(354);
                        const msg = [
                            `From: ${smtp.from_name ? `${smtp.from_name} <${smtp.from_email}>` : `<${smtp.from_email}>`}`,
                            `To: <${to}>`,
                            `Subject: ${subject}`,
                            `Date: ${new Date().toUTCString()}`,
                            'MIME-Version: 1.0',
                            'Content-Type: text/html; charset=utf-8',
                            '', html, ''
                        ].join('\r\n');
                        await send(msg + '\r\n.'); await expect(250); await send('QUIT'); cleanup();
                    } catch (err) { cleanup(err); }
                })();
            }
            socket.once('error', (e) => cleanup(e));
        });

        // For email_logs, we might need to reconstruct the body if not stored. 
        // But if it's not stored in email_logs, we can only resend if we have a way to regenerate it.
        // Let's assume for now we only support resending if we have the content or it's a simple notification.
        // If server_response or error_message doesn't have the body, we might be stuck.
        // Wait, let's check if we can store the body in email_logs in the future.
        // For now, let's try to resend based on what we have.
        
        // Actually, if it's a RELEASE_STATUS, we could potentially regenerate it.
        // But a simpler way is to just use the subject and a generic "Resent" message if body is missing.
        // For broadcast_logs, we DO have the message stored.
        
        res.status(400).json({ error: 'Resending from email_logs is currently only supported if body is preserved. Please use Broadcast logs for full resend capability.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Resend Broadcast Log
router.post('/broadcast/resend/:id', authenticateToken, async (req, res) => {
    try {
        if (!req.user || !['Admin', 'Operator'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const [rows] = await db.query('SELECT * FROM broadcast_logs WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Log not found' });
        const log = rows[0];

        if (log.channel === 'email') {
            const [smtpRows] = await db.query('SELECT setting_value FROM settings WHERE setting_key = ?', ['smtp_settings']);
            const smtp = (smtpRows.length > 0 && smtpRows[0].setting_value) ? JSON.parse(smtpRows[0].setting_value) : null;
            if (!smtp) throw new Error('SMTP not configured');
            
            // Re-use SMTP helper
            const sendSmtp = ({ to, subject, html }) => new Promise((resolve, reject) => {
                const socket = Boolean(smtp.secure) ? tls.connect(Number(smtp.port || 587), smtp.host, { servername: smtp.host }, onConnect) : net.connect(Number(smtp.port || 587), smtp.host, onConnect);
                let buffer = ''; let closed = false;
                function cleanup(err) { if (closed) return; closed = true; try { socket.end(); } catch {} if (err) reject(err); else resolve({ ok: true }); }
                function expect(code) { return new Promise((res, rej) => {
                    const onData = (data) => {
                        buffer += data.toString('utf8');
                        const lines = buffer.split(/\r?\n/).filter(l => l.trim().length > 0);
                        const last = lines[lines.length - 1] || '';
                        const m = last.match(/^(\d{3})/);
                        if (m) {
                            const lastCode = parseInt(m[1], 10);
                            if (lastCode === code || (Array.isArray(code) && code.includes(lastCode))) { socket.removeListener('data', onData); buffer = ''; res(last); }
                            else if (lastCode >= 400) { socket.removeListener('data', onData); rej(new Error(`SMTP error ${lastCode}: ${last}`)); }
                        }
                    };
                    socket.on('data', onData);
                });}
                function send(cmd) { return new Promise((res, rej) => { try { socket.write(cmd + '\r\n', 'utf8', res); } catch (e) { rej(e); } }); }
                function onConnect() {
                    (async () => {
                        try {
                            await expect(220); await send(`EHLO localhost`); await expect(250);
                            await send('AUTH LOGIN'); await expect(334);
                            await send(Buffer.from(String(smtp.user)).toString('base64')); await expect(334);
                            await send(Buffer.from(String(smtp.pass)).toString('base64')); await expect(235);
                            await send(`MAIL FROM:<${smtp.from_email}>`); await expect(250);
                            await send(`RCPT TO:<${to}>`); await expect([250, 251]);
                            await send('DATA'); await expect(354);
                            const msg = [
                                `From: ${smtp.from_name ? `${smtp.from_name} <${smtp.from_email}>` : `<${smtp.from_email}>`}`,
                                `To: <${to}>`,
                                `Subject: ${subject}`,
                                `Date: ${new Date().toUTCString()}`,
                                'MIME-Version: 1.0',
                                'Content-Type: text/html; charset=utf-8',
                                '', log.message || '', ''
                            ].join('\r\n');
                            await send(msg + '\r\n.'); await expect(250); await send('QUIT'); cleanup();
                        } catch (err) { cleanup(err); }
                    })();
                }
                socket.once('error', (e) => cleanup(e));
            });
            
            await sendSmtp({ to: log.recipient, subject: log.subject, html: log.message });
        } else if (log.channel === 'wa') {
            const [waRows] = await db.query('SELECT setting_value FROM settings WHERE setting_key = ?', ['mpwa_settings']);
            const wa = (waRows.length > 0 && waRows[0].setting_value) ? JSON.parse(waRows[0].setting_value) : null;
            if (!wa) throw new Error('WA not configured');
            
            let url = wa.base_url || wa.endpoint || '';
            if (!url.includes('/send-message')) {
                if (!url.endsWith('/')) url += '/';
                url += 'send-message';
            }
            const cleanPhone = String(log.recipient).replace(/\D/g, '');
            const finalPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;

            const r = await fetch(url, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ api_key: wa.token, sender: wa.device_id, number: finalPhone, message: log.message })
            });
            if (!r.ok) throw new Error(`WA Gateway error ${r.status}`);
            const resJson = await r.json();
            if (resJson.status === false || resJson.status === 'false') throw new Error(resJson.msg || 'WA Failed');
        }

        await db.query('UPDATE broadcast_logs SET status = "SENT", error_message = NULL, sent_at = NOW() WHERE id = ?', [log.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
