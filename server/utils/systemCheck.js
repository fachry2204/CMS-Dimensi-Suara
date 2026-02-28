import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../config/db.js';

const execPromise = util.promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');

export const checkDbIntegrity = async () => {
    try {
        const requiredTables = ['users', 'releases', 'songs', 'reports', 'settings', 'notifications', 'tickets', 'security_logs', 'system_logs'];
        const [rows] = await db.query('SHOW TABLES');
        const existingTables = rows.map(r => Object.values(r)[0]);
        
        const missingTables = requiredTables.filter(t => !existingTables.includes(t));
        
        return {
            status: missingTables.length === 0 ? 'OK' : 'MISSING_TABLES',
            missing: missingTables,
            checked_at: new Date()
        };
    } catch (err) {
        throw new Error('DB Integrity Check Failed: ' + err.message);
    }
};

export const checkSystemUpdate = async () => {
    try {
        try {
            await execPromise('git --version');
        } catch (e) {
             return { 
                updatesAvailable: false, 
                error: 'Git is not installed or not in PATH',
                checked_at: new Date()
            };
        }

        const repoUrl = 'https://github.com/fachry2204/CMS-Dimensi-Suara.git';
        
        // Fetch from specific repo to ensure we check the right source
        await execPromise(`git fetch ${repoUrl}`, { cwd: projectRoot });
        
        // Check behind count (HEAD vs FETCH_HEAD)
        const { stdout: behindCount } = await execPromise('git rev-list --count HEAD..FETCH_HEAD', { cwd: projectRoot });
        const { stdout: localHash } = await execPromise('git rev-parse --short HEAD', { cwd: projectRoot });
        const { stdout: remoteHash } = await execPromise('git rev-parse --short FETCH_HEAD', { cwd: projectRoot });
        
        const count = parseInt(behindCount.trim()) || 0;
        const updatesAvailable = count > 0;
        
        return {
            updatesAvailable,
            behindCount: count,
            localHash: localHash.trim(),
            remoteHash: remoteHash.trim(),
            repo: repoUrl,
            checked_at: new Date()
        };
    } catch (err) {
        throw new Error('System Update Check Failed: ' + err.message);
    }
};

export const logSystemCheck = async (type, result) => {
    try {
        const status = type === 'UPDATE_CHECK' 
            ? (result.updatesAvailable ? 'UPDATE_AVAILABLE' : (result.error ? 'ERROR' : 'OK'))
            : (result.status === 'OK' ? 'OK' : 'ERROR');

        const details = JSON.stringify(result);
        
        await db.query(
            'INSERT INTO system_logs (check_type, status, details, created_at) VALUES (?, ?, ?, ?)',
            [type, status, details, new Date()]
        );
    } catch (err) {
        console.error('Failed to log system check:', err);
    }
};

export const performSystemUpdate = async (cwd) => {
    const repoUrl = 'https://github.com/fachry2204/CMS-Dimensi-Suara.git';
    
    // 1. Pull Now
    console.log('Pulling updates from:', repoUrl);
    await execPromise(`git pull ${repoUrl} main`, { cwd });
    
    // 2. Deploy (Install Dependencies)
    console.log('Installing dependencies...');
    await execPromise('npm install', { cwd }); 
    
    // 3. Run Build
    console.log('Building project...');
    await execPromise('npm run build', { cwd });

    return { message: 'System Updated Successfully. Server is restarting...' };
};
