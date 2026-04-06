
import db from '../config/db.js';
import tls from 'tls';
import net from 'net';

/**
 * Send email using manual SMTP implementation (to avoid extra dependencies)
 */
export const sendEmail = async ({ host, port, secure, user, pass, from_email, from_name, to, subject, html }) => {
    return new Promise((resolve, reject) => {
        const socket = secure ? tls.connect(port, host, { servername: host }, onConnect) : net.connect(port, host, onConnect);
        let buffer = '';
        let closed = false;

        function cleanup(err) {
            if (closed) return;
            closed = true;
            try { socket.end(); } catch {}
            if (err) reject(err);
            else resolve({ ok: true });
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
                        `From: ${from_name ? `${from_name} <${from_email}>` : `<${from_email}>`}`,
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

                    await send(msg + '\r\n.');
                    const accepted = await expect(250);
                    await send('QUIT');
                    cleanup();
                } catch (err) {
                    cleanup(err);
                }
            })();
        }

        socket.once('error', (e) => cleanup(e));
        socket.once('close', () => cleanup(new Error('SMTP connection closed')));
    });
};

/**
 * Send email using a template from database
 */
export const sendTemplatedEmail = async (userId, templateKey, data = {}) => {
    try {
        const [userRows] = await db.query('SELECT email, full_name FROM users WHERE id = ?', [userId]);
        if (userRows.length === 0 || !userRows[0].email) return null;

        const [templateRows] = await db.query('SELECT subject_template, body_template FROM email_templates WHERE template_key = ?', [templateKey]);
        if (templateRows.length === 0) return null;

        const [smtpRows] = await db.query('SELECT setting_value FROM settings WHERE setting_key = ?', ['smtp_settings']);
        if (smtpRows.length === 0 || !smtpRows[0].setting_value) return null;

        const smtp = JSON.parse(smtpRows[0].setting_value);
        if (!smtp.host || !smtp.port || !smtp.from_email) return null;

        let subject = templateRows[0].subject_template;
        let body = templateRows[0].body_template;

        const mergedData = { ...data, fullName: userRows[0].full_name || 'User' };
        Object.entries(mergedData).forEach(([k, v]) => {
            const regex = new RegExp(`{{${k}}}`, 'g');
            subject = subject.replace(regex, v || '');
            body = body.replace(regex, v || '');
        });

        // Clean up
        subject = subject.replace(/{{[a-zA-Z0-9]+}}/g, '');
        body = body.replace(/{{[a-zA-Z0-9]+}}/g, '');

        return await sendEmail({
            host: smtp.host,
            port: Number(smtp.port),
            secure: Boolean(smtp.secure),
            user: smtp.user,
            pass: smtp.pass,
            from_email: smtp.from_email,
            from_name: smtp.from_name || 'Dimensi Suara',
            to: userRows[0].email,
            subject,
            html: body
        });
    } catch (error) {
        console.error('Error sending templated email:', error);
        return null;
    }
};

/**
 * Send WhatsApp message using configured MPWA Gateway
 */
export const sendWhatsApp = async (phone, message) => {
    try {
        if (!phone) return null;

        const [rows] = await db.query('SELECT setting_value FROM settings WHERE setting_key = ?', ['mpwa_settings']);
        if (rows.length === 0 || !rows[0].setting_value) return null;

        const cfg = JSON.parse(rows[0].setting_value);
        if (!cfg.enabled || !cfg.base_url || !cfg.token || !cfg.device_id) return null;

        let url = cfg.base_url;
        if (!url.includes('/send-message')) {
            if (!url.endsWith('/')) url += '/';
            url += 'send-message';
        }

        const body = {
            api_key: cfg.token,
            sender: cfg.device_id,
            number: phone,
            message: message
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const responseText = await response.text().catch(()=>'');
        let result = {};
        try { result = JSON.parse(responseText); } catch {}

        if (!response.ok) {
            console.error(`WA Gateway Error ${response.status}:`, responseText);
            return null;
        }

        if (result.status === false || result.status === 'false') {
            console.error(`WA Gateway Logic Error:`, result.msg || 'Unknown error');
            return null;
        }

        return result;
    } catch (error) {
        console.error('Error sending WhatsApp notification:', error);
        return null;
    }
};

/**
 * Send WhatsApp message using a template from database
 */
export const sendTemplatedWhatsApp = async (userId, templateKey, data = {}) => {
    try {
        const [userRows] = await db.query('SELECT phone, full_name FROM users WHERE id = ?', [userId]);
        if (userRows.length === 0 || !userRows[0].phone) return null;

        const [templateRows] = await db.query('SELECT body_template FROM whatsapp_templates WHERE template_key = ?', [templateKey]);
        if (templateRows.length === 0) return null;

        let message = templateRows[0].body_template;
        
        // Replace placeholders
        const mergedData = { ...data, fullName: userRows[0].full_name || 'User' };
        Object.entries(mergedData).forEach(([k, v]) => {
            const val = String(v || '');
            // Use split/join to avoid regex $ issues and ensure global replacement
            message = message.split(`{{${k}}}`).join(val);
        });

        // Clean up any remaining {{placeholder}} markers
        message = message.replace(/{{[a-zA-Z0-9_]+}}/g, '');

        const cleanPhone = String(userRows[0].phone).replace(/\D/g, '');
        if (!cleanPhone) return null;
        const finalPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;

        return await sendWhatsApp(finalPhone, message);
    } catch (error) {
        console.error('Error sending templated WhatsApp:', error);
        return null;
    }
};

/**
 * Create a new notification for a user
 */
export const createNotification = async (userId, type, message, templateKey = null, templateData = {}) => {
    try {
        // Also send WhatsApp & Email if user has contact info and gateway is enabled
        if (userId) {
            // If templateKey is provided, try send templated WA and Email
            if (templateKey) {
                // Run in background
                sendTemplatedWhatsApp(userId, templateKey, templateData).catch(err => console.error('WA background error:', err));
                sendTemplatedEmail(userId, templateKey, templateData).catch(err => console.error('Email background error:', err));
            } else {
                // Fallback to simple message for WA
                const [userRows] = await db.query('SELECT phone FROM users WHERE id = ?', [userId]);
                if (userRows.length > 0 && userRows[0].phone) {
                    const cleanPhone = String(userRows[0].phone).replace(/\D/g, '');
                    if (cleanPhone) {
                        const finalPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
                        sendWhatsApp(finalPhone, message).catch(err => console.error('WA background error:', err));
                    }
                }
            }
        }

        const [result] = await db.query(
            'INSERT INTO notifications (user_id, type, message) VALUES (?, ?, ?)',
            [userId, type, message]
        );
        return result.insertId;
    } catch (error) {
        console.error('Error creating notification:', error);
        return null;
    }
};
