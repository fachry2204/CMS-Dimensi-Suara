
import db from '../config/db.js';

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

        const result = await response.json();
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
            message = message.replace(new RegExp(`{{${k}}}`, 'g'), v || '');
        });

        // Clean up any remaining {{placeholder}} markers
        message = message.replace(/{{[a-zA-Z0-9]+}}/g, '');

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
        // Also send WhatsApp if user has phone and gateway is enabled
        if (userId) {
            // If templateKey is provided, try send templated WA
            if (templateKey) {
                await sendTemplatedWhatsApp(userId, templateKey, templateData);
            } else {
                // Fallback to simple message
                const [userRows] = await db.query('SELECT phone FROM users WHERE id = ?', [userId]);
                if (userRows.length > 0 && userRows[0].phone) {
                    const cleanPhone = String(userRows[0].phone).replace(/\D/g, '');
                    if (cleanPhone) {
                        const finalPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
                        await sendWhatsApp(finalPhone, message);
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
