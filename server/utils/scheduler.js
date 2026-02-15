import db from '../config/db.js';
import { backupCurrentDatabase } from './db-backup.js';

let currentTimer = null;
let currentConfig = { frequency: 'none', time: '02:00' };

const parseTime = (t) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t || '');
  if (!m) return { h: 2, min: 0 };
  return { h: Math.min(23, Math.max(0, parseInt(m[1], 10) || 0)), min: Math.min(59, Math.max(0, parseInt(m[2], 10) || 0)) };
};

const nextRunDelay = (frequency, time) => {
  const { h, min } = parseTime(time);
  const now = new Date();
  const next = new Date(now);
  next.setHours(h, min, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + (frequency === 'weekly' ? 7 : 1));
  }
  if (frequency === 'weekly') {
    // Keep same weekday; adding 7 days above is enough
  }
  return next.getTime() - now.getTime();
};

const scheduleOnce = () => {
  if (currentTimer) {
    clearTimeout(currentTimer);
    currentTimer = null;
  }
  if (currentConfig.frequency === 'none') return;
  const delay = nextRunDelay(currentConfig.frequency, currentConfig.time);
  currentTimer = setTimeout(async () => {
    try {
      console.log(`⏰ Scheduled DB backup running (${currentConfig.frequency} @ ${currentConfig.time})`);
      const file = await backupCurrentDatabase();
      console.log(`✅ Scheduled DB backup saved to ${file}`);
    } catch (e) {
      console.warn('⚠️ Scheduled DB backup failed:', e.message);
    } finally {
      scheduleOnce(); // reschedule next
    }
  }, delay);
};

export const loadBackupScheduleFromDb = async () => {
  try {
    const [rows] = await db.query('SELECT setting_key, setting_value FROM settings WHERE setting_key IN (?, ?)', ['db_backup_schedule', 'db_backup_time']);
    for (const r of rows) {
      if (r.setting_key === 'db_backup_schedule') currentConfig.frequency = r.setting_value || 'none';
      if (r.setting_key === 'db_backup_time') currentConfig.time = r.setting_value || '02:00';
    }
    scheduleOnce();
  } catch (e) {
    console.warn('Failed to load backup schedule from DB:', e.message);
  }
};

export const setBackupSchedule = async (frequency, time) => {
  currentConfig = { frequency, time };
  scheduleOnce();
  // Persist to settings
  try {
    await db.query(
      'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
      ['db_backup_schedule', frequency]
    );
    await db.query(
      'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
      ['db_backup_time', time]
    );
  } catch (e) {
    console.warn('Failed to persist backup schedule:', e.message);
  }
};

export const getBackupSchedule = () => ({ ...currentConfig });

