import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logFile = path.join(__dirname, 'error_startup.log');

try {
    console.log('Starting application...');
    await import('./server/index.js');
} catch (err) {
    const errorMsg = `${new Date().toISOString()} - FATAL STARTUP ERROR: ${err.stack || err}\n`;
    console.error(errorMsg);
    fs.appendFileSync(logFile, errorMsg);
    process.exit(1);
}

