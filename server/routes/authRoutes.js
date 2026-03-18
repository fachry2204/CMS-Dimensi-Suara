import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import geoip from 'geoip-lite';
import { createHash, randomBytes } from 'crypto';
import db from '../config/db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { syncUserToSheet } from '../utils/googleSheets.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';
const SESSION_EXPIRES_IN = '24h';
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const getCountry = (ip) => {
    // Handle localhost/private IPs
    if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
        return 'Localhost/Private';
    }
    const geo = geoip.lookup(ip);
    return geo ? geo.country : 'Unknown';
};

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
            npwpDocPath,
            signatureDocPath
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

        const fields = ['username', 'email', 'password_hash'];
        const values = [username, email, hash];

        if (hasRole) {
            fields.push('role');
            values.push('User');
        }
        if (hasStatus) {
            fields.push('status');
            values.push('Pending');
        }

        const extendedMap = [
            ['account_type', accountType || 'PERSONAL'],
            ['company_name', accountType === 'COMPANY' ? (companyName || null) : null],
            ['nik', nik || null],
            ['full_name', fullName || null],
            ['address', address || null],
            ['country', country || null],
            ['province', province || null],
            ['city', city || null],
            ['district', district || null],
            ['subdistrict', subdistrict || null],
            ['postal_code', postalCode || null],
            ['phone', phone || null],
            ['pic_name', picName || null],
            ['pic_position', picPosition || null],
            ['pic_phone', picPhone || null],
            ['nib_doc_path', nibDocPath || null],
            ['kemenkumham_doc_path', kemenkumhamDocPath || null],
            ['ktp_doc_path', ktpDocPath || null],
            ['npwp_doc_path', npwpDocPath || null],
            ['signature_doc_path', signatureDocPath || null],
            ['bank_name', req.body?.bank_name || null],
            ['bank_account_number', req.body?.bank_account_number || null],
            ['bank_account_name', req.body?.bank_account_name || null],
        ];

        for (const [col, val] of extendedMap) {
            if (colNames.includes(col)) {
                fields.push(col);
                values.push(val);
            }
        }

        const placeholders = fields.map(() => '?').join(', ');
        const sql = `INSERT INTO users (${fields.join(', ')}) VALUES (${placeholders})`;
        const [result] = await db.query(sql, values);

        res.status(201).json({ 
            message: 'User registered successfully', 
            userId: result.insertId,
            status: hasStatus ? 'Pending' : undefined
        });

        // Fire-and-forget: send registration email (if SMTP configured)
        (async () => {
            try {
                const [smtpRows] = await db.query('SELECT setting_value FROM settings WHERE setting_key = ?', ['smtp_settings']);
                if (smtpRows.length === 0 || !smtpRows[0].setting_value) return;
                const smtp = JSON.parse(smtpRows[0].setting_value);
                if (!smtp.host || !smtp.port || !smtp.user || !smtp.pass || !smtp.from_email) return;
                if (!email) return;
                let subject = 'Registrasi Berhasil - Dimensi Suara';
                let html = `
<!doctype html><html lang="id"><meta charset="utf-8" />
<body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
  <tr>
    <td style="padding:20px;background:linear-gradient(90deg,#1e40af,#2563eb);color:#fff">
      <div style="font-weight:700;font-size:18px">Dimensi Suara</div>
      <div style="font-size:12px;opacity:.9">Registrasi Akun</div>
    </td>
  </tr>
  <tr>
    <td style="padding:24px">
      <div style="font-size:14px;color:#0f172a;margin-bottom:12px">Halo ${fullName || username},</div>
      <div style="font-size:14px;color:#334155;line-height:1.6">Terima kasih telah mendaftar. Akun Anda telah tercatat dengan status <strong>Pending</strong> hingga diverifikasi.</div>
      <div style="margin-top:20px;font-size:12px;color:#94a3b8">© ${new Date().getFullYear()} Dimensi Suara</div>
    </td>
  </tr>
</table>
</body></html>`;
                try {
                    const [tplRows] = await db.query('SELECT subject_template, body_template FROM email_templates WHERE template_key = ?', ['user_register']);
                    if (tplRows.length > 0) {
                        const t = tplRows[0];
                        const replace = (s) => String(s || '')
                            .replaceAll('{{fullName}}', fullName || '')
                            .replaceAll('{{username}}', username || '');
                        subject = replace(t.subject_template);
                        html = replace(t.body_template);
                    }
                } catch {}
                // Minimal SMTP sender (reuse test logic)
                const tls = (await import('tls')).default;
                const net = (await import('net')).default;
                const sendEmail = ({ host, port, secure, user, pass, from_email, to, subject, html }) => {
                    return new Promise((resolve, reject) => {
                        const socket = secure ? tls.connect(port, host, { servername: host }, onConnect) : net.connect(port, host, onConnect);
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
                                    if (user && pass) {
                                        await send('AUTH LOGIN'); await expect(334);
                                        await send(Buffer.from(String(user)).toString('base64')); await expect(334);
                                        await send(Buffer.from(String(pass)).toString('base64')); await expect(235);
                                    }
                                    await send(`MAIL FROM:<${smtp.from_email}>`); await expect(250);
                                    await send(`RCPT TO:<${to}>`); await expect([250, 251]);
                                    await send('DATA'); await expect(354);
                                    const now = new Date();
                                    const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@${String(smtp.from_email).split('@')[1] || 'localhost'}>`;
                                    const msg = [
                                        `From: ${smtp.from_name ? `${smtp.from_name} <${smtp.from_email}>` : `<${smtp.from_email}>`}`,
                                        `To: <${to}>`,
                                        `Subject: ${subject}`,
                                        `Date: ${now.toUTCString()}`,
                                        `Message-ID: ${messageId}`,
                                        `Reply-To: ${smtp.from_email}`,
                                        'X-Mailer: DimensiSuaraCMS/1.0',
                                        'MIME-Version: 1.0',
                                        'Content-Type: text/html; charset=utf-8',
                                        'Content-Transfer-Encoding: 8bit',
                                        '', html, ''
                                    ].join('\r\n');
                                    await send(msg + '\r\n.'); const accepted = await expect(250); await send('QUIT'); cleanup();
                                    if (logId) {
                                        await db.query('UPDATE email_logs SET status = ?, sent_at = NOW(), server_response = ? WHERE id = ?', ['SENT', accepted?.slice(0, 480) || null, logId]);
                                    }
                                } catch (err) { cleanup(err); }
                            })();
                        }
                        socket.once('error', (e) => cleanup(e));
                        socket.once('close', () => cleanup(new Error('SMTP connection closed')));
                    });
                };
                let logId = null;
                try {
                    const [logRes] = await db.query(
                        'INSERT INTO email_logs (user_id, related_type, related_id, to_email, subject, status) VALUES (?, ?, ?, ?, ?, ?)',
                        [result.insertId, 'USER_REGISTER', result.insertId, email, subject, 'PENDING']
                    );
                    logId = logRes?.insertId || null;
                } catch {}
                try {
                    await sendEmail({
                        host: smtp.host,
                        port: Number(smtp.port || 587),
                        secure: Boolean(smtp.secure),
                        user: smtp.user,
                        pass: smtp.pass,
                        from_email: smtp.from_email,
                        to: email,
                        subject,
                        html
                    });
                } catch (err) {
                    if (logId) await db.query('UPDATE email_logs SET status = ?, error_message = ? WHERE id = ?', ['FAILED', String(err?.message || err), logId]);
                }
            } catch {}
        })();
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Username or email already exists' });
        }
        res.status(500).json({ error: err.message });
    }
});

router.post('/forgot-password', async (req, res) => {
    try {
        const email = String(req.body?.email || '').trim().toLowerCase();
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const [users] = await db.query('SELECT id, username, full_name, email FROM users WHERE LOWER(email) = ? LIMIT 1', [email]);
        if (!Array.isArray(users) || users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = users[0];

        try {
            await db.query('DELETE FROM password_reset_tokens WHERE user_id = ? AND used_at IS NULL', [user.id]);
        } catch {}

        const token = randomBytes(32).toString('hex');
        const tokenHash = createHash('sha256').update(token).digest('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        const [insertRes] = await db.query(
            'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
            [user.id, tokenHash, expiresAt]
        );
        const tokenId = insertRes?.insertId || null;

        const forwardedProto = req.headers['x-forwarded-proto'];
        const forwardedHost = req.headers['x-forwarded-host'];
        const proto = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto) || (req.secure ? 'https' : 'http');
        const host = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) || req.get('host');
        const origin = process.env.APP_URL || `${proto}://${host}`;
        const link = `${origin.replace(/\/+$/, '')}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

        const [smtpRows] = await db.query('SELECT setting_value FROM settings WHERE setting_key = ?', ['smtp_settings']);
        if (smtpRows.length === 0 || !smtpRows[0].setting_value) {
            return res.status(500).json({ error: 'SMTP settings not configured' });
        }
        const smtp = JSON.parse(smtpRows[0].setting_value);
        if (!smtp.host || !smtp.port || !smtp.user || !smtp.pass || !smtp.from_email) {
            return res.status(500).json({ error: 'Incomplete SMTP settings' });
        }

        const displayName = user.full_name || user.username || user.email || 'User';
        const subject = 'Reset Password - Dimensi Suara';
        const html = `<!doctype html><html lang="id"><meta charset="utf-8" />
<body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
  <tr>
    <td style="padding:20px;background:linear-gradient(90deg,#1e40af,#2563eb);color:#fff">
      <div style="font-weight:700;font-size:18px">Dimensi Suara</div>
      <div style="font-size:12px;opacity:.9">Reset Password</div>
    </td>
  </tr>
  <tr>
    <td style="padding:24px">
      <div style="font-size:14px;color:#0f172a;margin-bottom:12px">Halo ${String(displayName).replace(/</g, '&lt;').replace(/>/g, '&gt;')},</div>
      <div style="font-size:14px;color:#334155;line-height:1.6">Kami menerima permintaan reset password untuk akun Anda. Klik tombol di bawah untuk membuat password baru.</div>
      <div style="margin:18px 0">
        <a href="${link}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:10px;font-weight:700;font-size:14px">Reset Password</a>
      </div>
      <div style="font-size:12px;color:#64748b;line-height:1.6">Link ini berlaku selama 60 menit. Jika Anda tidak meminta reset password, abaikan email ini.</div>
      <div style="margin-top:20px;font-size:12px;color:#94a3b8">© ${new Date().getFullYear()} Dimensi Suara</div>
    </td>
  </tr>
</table>
</body></html>`;

        const tls = (await import('tls')).default;
        const net = (await import('net')).default;
        const sendEmail = ({ host, port, secure, user, pass, from_email, to, subject, html }) => {
            return new Promise((resolve, reject) => {
                const socket = secure ? tls.connect(port, host, { servername: host }, onConnect) : net.connect(port, host, onConnect);
                let buffer = '';
                let closed = false;
                function cleanup(err, result) {
                    if (closed) return;
                    closed = true;
                    try { socket.end(); } catch {}
                    if (err) reject(err);
                    else resolve(result || { ok: true });
                }
                function expect(code) {
                    return new Promise((res, rej) => {
                        const onData = (data) => {
                            buffer += data.toString('utf8');
                            const lines = buffer.split(/\r?\n/).filter(l => l.trim().length > 0);
                            const last = lines[lines.length - 1] || '';
                            const m = last.match(/^(\d{3})/);
                            if (m) {
                                const lastCode = parseInt(m[1], 10);
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
                        try { socket.write(cmd + '\r\n', 'utf8', res); } catch (e) { rej(e); }
                    });
                }
                function onConnect() {
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
                            const now = new Date();
                            const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@${String(from_email).split('@')[1] || 'localhost'}>`;
                            const msg = [
                                `From: ${smtp.from_name ? `${smtp.from_name} <${from_email}>` : `<${from_email}>`}`,
                                `To: <${to}>`,
                                `Subject: ${subject}`,
                                `Date: ${now.toUTCString()}`,
                                `Message-ID: ${messageId}`,
                                `Reply-To: ${from_email}`,
                                'X-Mailer: DimensiSuaraCMS/1.0',
                                'MIME-Version: 1.0',
                                'Content-Type: text/html; charset=utf-8',
                                'Content-Transfer-Encoding: 8bit',
                                '',
                                html,
                                ''
                            ].join('\r\n');
                            const accepted = await send(msg + '\r\n.').then(() => expect(250));
                            await send('QUIT');
                            cleanup(null, { ok: true, accepted });
                        } catch (err) {
                            cleanup(err);
                        }
                    })();
                }
                socket.once('error', (e) => cleanup(e));
                socket.once('close', () => cleanup(new Error('SMTP connection closed')));
            });
        };

        let logId = null;
        try {
            const [logRes] = await db.query(
                'INSERT INTO email_logs (user_id, related_type, related_id, to_email, subject, status) VALUES (?, ?, ?, ?, ?, ?)',
                [user.id, 'PASSWORD_RESET', tokenId, email, subject, 'PENDING']
            );
            logId = logRes?.insertId || null;
        } catch {}

        try {
            const sent = await sendEmail({
                host: smtp.host,
                port: Number(smtp.port || 587),
                secure: Boolean(smtp.secure),
                user: smtp.user,
                pass: smtp.pass,
                from_email: smtp.from_email,
                to: email,
                subject,
                html
            });
            if (logId) {
                await db.query('UPDATE email_logs SET status = ?, sent_at = NOW(), server_response = ? WHERE id = ?', ['SENT', sent?.accepted?.slice(0, 480) || null, logId]);
            }
        } catch (err) {
            if (logId) await db.query('UPDATE email_logs SET status = ?, error_message = ? WHERE id = ?', ['FAILED', String(err?.message || err), logId]);
            return res.status(500).json({ error: 'Failed to send reset email' });
        }

        res.json({ message: 'Reset link sent' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/reset-password', async (req, res) => {
    try {
        const email = String(req.body?.email || '').trim().toLowerCase();
        const token = String(req.body?.token || '').trim();
        const password = String(req.body?.password || '');
        if (!email || !token || !password) return res.status(400).json({ error: 'email, token, password required' });

        const strong = password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password);
        if (!strong) {
            return res.status(400).json({ error: 'Password kurang kuat. Gunakan ≥8 char, huruf besar, kecil, angka, simbol.' });
        }

        const [users] = await db.query('SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1', [email]);
        if (!Array.isArray(users) || users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const userId = users[0].id;

        const tokenHash = createHash('sha256').update(token).digest('hex');
        const [rows] = await db.query(
            'SELECT id, expires_at, used_at FROM password_reset_tokens WHERE user_id = ? AND token_hash = ? ORDER BY id DESC LIMIT 1',
            [userId, tokenHash]
        );
        if (!Array.isArray(rows) || rows.length === 0) {
            return res.status(400).json({ error: 'Token tidak valid atau sudah kadaluarsa' });
        }
        const row = rows[0];
        if (row.used_at) return res.status(400).json({ error: 'Token tidak valid atau sudah kadaluarsa' });
        const exp = row.expires_at ? new Date(row.expires_at).getTime() : 0;
        if (!exp || exp < Date.now()) return res.status(400).json({ error: 'Token tidak valid atau sudah kadaluarsa' });

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId]);
        await db.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?', [row.id]);
        res.json({ message: 'Password berhasil direset' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// LOGIN
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Allow login with either username or email
        const [users] = await db.query('SELECT * FROM users WHERE username = ? OR email = ?', [username, username]);
        if (users.length === 0) {
            // Log User Not Found
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            const country = getCountry(ip);
            await db.query('INSERT INTO security_logs (user_identifier, ip_address, country, attack_type, details) VALUES (?, ?, ?, ?, ?)', 
                [username, ip, country, 'USER_NOT_FOUND', 'User identifier not found']);
                
            return res.status(400).json({ error: 'User not found' });
        }

        const user = users[0];

        // Check password
        const validPass = await bcrypt.compare(password, user.password_hash);
        if (!validPass) {
            // Log Failed Login
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            const country = getCountry(ip);
            await db.query('INSERT INTO security_logs (user_identifier, ip_address, country, attack_type, details) VALUES (?, ?, ?, ?, ?)', 
                [username, ip, country, 'LOGIN_FAIL', 'Invalid password']);
            
            return res.status(400).json({ error: 'Invalid password' });
        }

        // Log Successful Login & Create Notification - REMOVED per user request
        // const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        // const country = getCountry(ip);
        
        // 1. Security Log (REMOVED)
        // await db.query('INSERT INTO security_logs (user_identifier, ip_address, country, attack_type, details) VALUES (?, ?, ?, ?, ?)', 
        //    [username, ip, country, 'LOGIN_SUCCESS', 'User logged in successfully']);

        // 2. User Notification (REMOVED)
        // const notifMsg = `Login baru terdeteksi pada perangkat Anda dari IP ${ip} (${country}).`;
        // await db.query('INSERT INTO notifications (user_id, type, message) VALUES (?, ?, ?)',
        //    [user.id, 'Security', notifMsg]);

        // Create Token (24h) and set session cookie
        const payload = { id: user.id, role: user.role };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: SESSION_EXPIRES_IN });

        const secure = req.secure || (req.headers['x-forwarded-proto'] === 'https');
        res.cookie('auth_token', token, {
            httpOnly: true,
            sameSite: 'lax',
            secure,
            maxAge: SESSION_MAX_AGE_MS
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

// REVERT IMPERSONATION (restore Admin session)
router.post('/impersonate/revert', authenticateToken, async (req, res) => {
    try {
        const adminId = req.user?.impersonated_by;
        if (!adminId) {
            return res.status(400).json({ error: 'Not currently impersonating' });
        }
        const [rows] = await db.query('SELECT id, username, role, status, profile_picture FROM users WHERE id = ?', [adminId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Admin user not found' });
        }
        const admin = rows[0];
        const payload = { id: admin.id, role: admin.role };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: SESSION_EXPIRES_IN });
        const secure = req.secure || (req.headers['x-forwarded-proto'] === 'https');
        res.cookie('auth_token', token, {
            httpOnly: true,
            sameSite: 'lax',
            secure,
            maxAge: SESSION_MAX_AGE_MS
        });
        res.json({
            token,
            user: {
                id: admin.id,
                username: admin.username,
                role: admin.role,
                status: admin.status,
                profile_picture: admin.profile_picture
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// IMPERSONATE USER (Admin only)
router.post('/impersonate/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ error: 'Access denied' });
        }
        const targetUserId = req.params.id;
        const [rows] = await db.query('SELECT id, username, role, status, profile_picture FROM users WHERE id = ?', [targetUserId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const target = rows[0];
        const payload = { id: target.id, role: target.role, impersonated_by: req.user.id };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: SESSION_EXPIRES_IN });
        
        const secure = req.secure || (req.headers['x-forwarded-proto'] === 'https');
        res.cookie('auth_token', token, {
            httpOnly: true,
            sameSite: 'lax',
            secure,
            maxAge: SESSION_MAX_AGE_MS
        });
        res.json({
            token,
            user: {
                id: target.id,
                username: target.username,
                role: target.role,
                status: target.status,
                profile_picture: target.profile_picture
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CHECK DUPLICATE (Public): validate fields before stepping registration
router.post('/check-duplicate', async (req, res) => {
    try {
        const { nik, companyName, email, phone } = req.body || {};
        const duplicateReasons = [];

        if (email) {
            const [rows] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
            if (rows.length > 0) duplicateReasons.push('EMAIL');
        }
        if (phone) {
            const [rows] = await db.query('SELECT id FROM users WHERE phone = ?', [phone]);
            if (rows.length > 0) duplicateReasons.push('PHONE');
        }
        if (nik) {
            const [rows] = await db.query('SELECT id FROM users WHERE nik = ?', [nik]);
            if (rows.length > 0) duplicateReasons.push('NIK');
        }
        if (companyName) {
            const [rows] = await db.query('SELECT id FROM users WHERE company_name = ?', [companyName]);
            if (rows.length > 0) duplicateReasons.push('COMPANY');
        }

        res.json({ duplicate: duplicateReasons });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/check-duplicate', async (req, res) => {
    try {
        const { nik, companyName, email, phone } = req.query || {};
        const duplicateReasons = [];

        if (email) {
            const [rows] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
            if (rows.length > 0) duplicateReasons.push('EMAIL');
        }
        if (phone) {
            const [rows] = await db.query('SELECT id FROM users WHERE phone = ?', [phone]);
            if (rows.length > 0) duplicateReasons.push('PHONE');
        }
        if (nik) {
            const [rows] = await db.query('SELECT id FROM users WHERE nik = ?', [nik]);
            if (rows.length > 0) duplicateReasons.push('NIK');
        }
        if (companyName) {
            const [rows] = await db.query('SELECT id FROM users WHERE company_name = ?', [companyName]);
            if (rows.length > 0) duplicateReasons.push('COMPANY');
        }

        res.json({ duplicate: duplicateReasons });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
