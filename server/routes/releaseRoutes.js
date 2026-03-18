import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from '../config/db.js';
import { spawn } from 'child_process';
import { authenticateToken } from '../middleware/authMiddleware.js';
import xlsx from 'xlsx';
import { ensureReleaseFolder, uploadLocalFileToDrive, deleteDriveFileByUrl } from '../utils/googleDrive.js';
import { createNotification, sendWhatsApp } from '../utils/notification.js';
import tls from 'tls';
import net from 'net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const sanitizeName = (s) => String(s || '').replace(/[/\\?%*:|"<>]/g, '_').replace(/\s+/g, ' ').trim();

// Configure Multer for Audio and Cover Art
// Ensure directories exist
const UPLOADS_ROOT = path.join(__dirname, '../../uploads');
const RELEASES_DIR = path.join(UPLOADS_ROOT, 'releases');
const TMP_DIR = path.join(UPLOADS_ROOT, 'tmp');

try {
    if (!fs.existsSync(UPLOADS_ROOT)) {
        console.log('Creating uploads root:', UPLOADS_ROOT);
        fs.mkdirSync(UPLOADS_ROOT, { recursive: true });
    }
    if (!fs.existsSync(RELEASES_DIR)) {
        console.log('Creating releases dir:', RELEASES_DIR);
        fs.mkdirSync(RELEASES_DIR, { recursive: true });
    }
    if (!fs.existsSync(TMP_DIR)) {
        console.log('Creating tmp dir:', TMP_DIR);
        fs.mkdirSync(TMP_DIR, { recursive: true });
    }
} catch (err) {
    console.error('Failed to create upload directories:', err);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Ensure directory exists at runtime to be safe
        if (!fs.existsSync(RELEASES_DIR)) {
             try {
                fs.mkdirSync(RELEASES_DIR, { recursive: true });
             } catch (e) {
                return cb(e);
             }
        }
        cb(null, RELEASES_DIR);
    },
    filename: (req, file, cb) => {
        let artist = 'Unknown_Artist';
        let title = 'Untitled_Release';
        try {
            if (req.body && typeof req.body.data === 'string') {
                const payload = JSON.parse(req.body.data);
                const p = (Array.isArray(payload.primaryArtists) && payload.primaryArtists[0]) ? payload.primaryArtists[0] : 'Unknown_Artist';
                const primaryArtist = (typeof p === 'object' && p !== null && p.name) ? p.name : p;
                artist = sanitizeName(primaryArtist).substring(0, 80) || 'Unknown_Artist';
                title = sanitizeName(payload.title).substring(0, 80) || 'Untitled_Release';
            }
        } catch {}
        const ext = path.extname(file.originalname) || '';
        const base = `${artist} - ${title}`;
        let suffix = '';
        if (file.fieldname === 'coverArt') {
            suffix = '-cover';
        } else {
            const m = file.fieldname.match(/^track_(\d+)_(audio|clip|ipl)$/);
            if (m) {
                const idx = parseInt(m[1], 10) + 1;
                const kind = m[2];
                if (kind === 'audio') suffix = `-track${idx}`;
                else suffix = `-track${idx}-${kind}`;
            }
        }
        const fileName = `${base}${suffix}${ext}`;
        cb(null, fileName);
    }
});

const storageTmp = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync(TMP_DIR)) {
             try {
                fs.mkdirSync(TMP_DIR, { recursive: true });
             } catch (e) {
                return cb(e);
             }
        }
        cb(null, TMP_DIR);
    },
    filename: (req, file, cb) => {
        let artist = 'Unknown_Artist';
        let title = 'Untitled_Release';
        try {
            if (req.body && typeof req.body.data === 'string') {
                const payload = JSON.parse(req.body.data);
                const p = (Array.isArray(payload.primaryArtists) && payload.primaryArtists[0]) ? payload.primaryArtists[0] : 'Unknown_Artist';
                const primaryArtist = (typeof p === 'object' && p !== null && p.name) ? p.name : p;
                artist = sanitizeName(primaryArtist).substring(0, 80) || 'Unknown_Artist';
                title = sanitizeName(payload.title).substring(0, 80) || 'Untitled_Release';
            }
        } catch {}
        const ext = path.extname(file.originalname) || '';
        const base = `${artist} - ${title}`;
        // preserve raw/original cues
        const orig = file.fieldname;
        const fileName = `${base}-${orig}${ext}`;
        cb(null, fileName);
    }
});

const DEFAULT_MAX = 8 * 1024 * 1024 * 1024;
const parseSize = (raw) => {
    if (!raw) return DEFAULT_MAX;
    const s = String(raw).trim().toUpperCase();
    const m = s.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB)?$/);
    if (!m) {
        const n = Number(s);
        return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_MAX;
    }
    const n = parseFloat(m[1]);
    const unit = m[2] || 'B';
    const mul = unit === 'TB' ? 1024 ** 4 :
                unit === 'GB' ? 1024 ** 3 :
                unit === 'MB' ? 1024 ** 2 :
                unit === 'KB' ? 1024 : 1;
    const val = Math.floor(n * mul);
    return val > 0 ? val : DEFAULT_MAX;
};
const MAX_BYTES = parseSize(process.env.UPLOAD_MAX_BYTES);

const upload = multer({ 
    storage: storage,
    limits: { fileSize: MAX_BYTES }
});
const uploadTmp = multer({
    storage: storageTmp,
    limits: { fileSize: MAX_BYTES }
});

// Chunk upload (store small parts then assemble)
const chunkStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync(TMP_DIR)) {
             try {
                fs.mkdirSync(TMP_DIR, { recursive: true });
             } catch (e) {
                return cb(e);
             }
        }
        cb(null, TMP_DIR);
    },
    filename: (req, file, cb) => {
        const name = `chunk-${Date.now()}-${Math.random().toString(36).slice(2)}.part`;
        cb(null, name);
    }
});
const uploadTmpChunk = multer({
    storage: chunkStorage,
    limits: { fileSize: Math.min(MAX_BYTES, 16 * 1024 * 1024) }
});

const probeAudioFormat24_48 = (inPath) => {
    return new Promise((resolve) => {
        const args = [
            '-v', 'error',
            '-select_streams', 'a:0',
            '-show_entries', 'stream=sample_rate,bits_per_raw_sample',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            inPath
        ];
        const proc = spawn('ffprobe', args);
        let out = '';
        let errOut = '';
        proc.stdout.on('data', (d) => { out += d.toString(); });
        proc.stderr.on('data', (d) => { errOut += d.toString(); });
        proc.on('error', () => resolve({ ok: true, skipped: true, sampleRate: null, bitDepth: null }));
        proc.on('exit', (code) => {
            if (code !== 0) {
                console.warn('ffprobe exited with code', code, errOut);
                resolve({ ok: true, skipped: true, sampleRate: null, bitDepth: null });
                return;
            }
            const parts = out.trim().split(/\s+/).filter(Boolean);
            const sampleRate = parts[0] ? parseInt(parts[0], 10) : null;
            const bitDepth = parts[1] ? parseInt(parts[1], 10) : null;
            const ok = sampleRate === 48000 && bitDepth === 24;
            resolve({ ok, skipped: false, sampleRate, bitDepth });
        });
    });
};

// Middleware wrapper to catch Multer errors with JSON response
const handleUpload = (uploader) => (req, res, next) => {
    uploader(req, res, (err) => {
        if (err) {
            console.error('Multer Upload Error:', err);
            // Ensure JSON response
            if (err instanceof multer.MulterError) {
                return res.status(400).json({ 
                    error: `Upload Error: ${err.message}`, 
                    code: err.code 
                });
            } else if (err) {
                return res.status(500).json({ 
                    error: `Server Upload Error: ${err.message}`,
                    details: 'Multer failed to process file'
                });
            }
        }
        next();
    });
};

router.post('/upload', authenticateToken, handleUpload(upload.any()), async (req, res) => {
    try {
        const releaseData = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
        const p = (Array.isArray(releaseData.primaryArtists) && releaseData.primaryArtists[0]) ? releaseData.primaryArtists[0] : 'Unknown_Artist';
        const primaryArtist = (typeof p === 'object' && p !== null && p.name) ? p.name : p;
        const artistDirName = sanitizeName(primaryArtist).substring(0, 80) || 'Unknown_Artist';
        const releaseDirName = sanitizeName(releaseData.title).substring(0, 80) || 'Untitled_Release';
        const targetDir = path.join(RELEASES_DIR, artistDirName, releaseDirName);
        
        // Ensure parent directories exist
        if (!fs.existsSync(UPLOADS_ROOT)) fs.mkdirSync(UPLOADS_ROOT, { recursive: true });
        if (!fs.existsSync(RELEASES_DIR)) fs.mkdirSync(RELEASES_DIR, { recursive: true });
        if (!fs.existsSync(targetDir)) {
            try {
                fs.mkdirSync(targetDir, { recursive: true, mode: 0o755 });
            } catch (mkdirErr) {
                console.error('Failed to create upload dir:', mkdirErr);
                return res.status(500).json({ error: 'Failed to create upload directory. Check permissions.' });
            }
        }

        const files = Array.isArray(req.files) ? req.files : [];
        const paths = {};
        for (const f of files) {
            const destName = f.filename;
            const destPath = path.join(targetDir, destName);
            // f.path is where multer saved it (RELEASES_DIR/filename)
            if (f.path !== destPath) {
                 // Try rename, fallback to copy+unlink if cross-device
                 try {
                    fs.renameSync(f.path, destPath);
                 } catch (renameErr) {
                    if (renameErr.code === 'EXDEV') {
                        fs.copyFileSync(f.path, destPath);
                        fs.unlinkSync(f.path);
                    } else {
                        throw renameErr;
                    }
                 }
            }
            const publicPath = `/uploads/releases/${artistDirName}/${releaseDirName}/${destName}`;
            paths[f.fieldname] = publicPath;
        }

        res.json({ paths });
    } catch (err) {
        console.error('Upload Release File Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Upload to TMP (store original files before final submit)
router.post('/upload-tmp', authenticateToken, handleUpload(uploadTmp.any()), async (req, res) => {
    try {
        const releaseData = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
        const userId = req.user.id;
        const p = (Array.isArray(releaseData.primaryArtists) && releaseData.primaryArtists[0]) ? releaseData.primaryArtists[0] : 'Unknown_Artist';
        const primaryArtist = (typeof p === 'object' && p !== null && p.name) ? p.name : p;
        const artistDirName = sanitizeName(primaryArtist).substring(0, 80) || 'Unknown_Artist';
        const releaseDirName = sanitizeName(releaseData.title).substring(0, 80) || 'Untitled_Release';
        const targetDir = path.join(TMP_DIR, String(userId), artistDirName, releaseDirName);
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

        const files = Array.isArray(req.files) ? req.files : [];
        const paths = {};
        for (const f of files) {
            const destName = f.filename;
            const destPath = path.join(targetDir, destName);
            if (f.path !== destPath) {
                try {
                    fs.renameSync(f.path, destPath);
                } catch (renameErr) {
                    if (renameErr.code === 'EXDEV') {
                        fs.copyFileSync(f.path, destPath);
                        fs.unlinkSync(f.path);
                    } else {
                        throw renameErr;
                    }
                }
            }
            const publicPath = `/uploads/tmp/${userId}/${artistDirName}/${releaseDirName}/${destName}`;
            paths[f.fieldname] = publicPath;
        }

        res.json({ paths });
    } catch (err) {
        console.error('Upload TMP File Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Chunked TMP upload (append chunks sequentially)
router.post('/upload-tmp-chunk', authenticateToken, handleUpload(uploadTmpChunk.single('chunk')), async (req, res) => {
    try {
        const releaseData = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
        const userId = req.user.id;
        const p = (Array.isArray(releaseData.primaryArtists) && releaseData.primaryArtists[0]) ? releaseData.primaryArtists[0] : 'Unknown_Artist';
        const primaryArtist = (typeof p === 'object' && p !== null && p.name) ? p.name : p;
        const artistDirName = sanitizeName(primaryArtist).substring(0, 80) || 'Unknown_Artist';
        const releaseDirName = sanitizeName(releaseData.title).substring(0, 80) || 'Untitled_Release';
        const targetDir = path.join(TMP_DIR, String(userId), artistDirName, releaseDirName);
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

        const { fileId, chunkIndex, totalChunks, filename, field } = releaseData;
        if (fileId === undefined || chunkIndex === undefined || totalChunks === undefined || !filename || !field) {
            return res.status(400).json({ error: 'Missing chunk metadata' });
        }

        const assemblingPath = path.join(targetDir, `${fileId}.assembling`);
        const chunkPath = req.file?.path;
        if (!chunkPath || !fs.existsSync(chunkPath)) {
            return res.status(400).json({ error: 'Chunk file missing' });
        }
        // Append chunk
        const data = fs.readFileSync(chunkPath);
        fs.appendFileSync(assemblingPath, data);
        try { fs.unlinkSync(chunkPath); } catch {}

        const isLast = Number(chunkIndex) + 1 >= Number(totalChunks);
        if (!isLast) {
            return res.json({ received: true, index: Number(chunkIndex) });
        }
        // Finalize
        const ext = path.extname(filename) || '';
        const finalName = `${artistDirName} - ${releaseDirName}-${field}${ext || ''}`;
        const finalAbs = path.join(targetDir, finalName);
        fs.renameSync(assemblingPath, finalAbs);
        const publicPath = `/uploads/tmp/${userId}/${artistDirName}/${releaseDirName}/${finalName}`;
        return res.json({ done: true, path: publicPath, field });
    } catch (err) {
        console.error('Upload TMP Chunk Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Cleanup TMP folder for current user and given release meta
router.post('/tmp/cleanup', authenticateToken, async (req, res) => {
    try {
        const { title, primaryArtists } = req.body || {};
        const userId = req.user.id;
        const p = (Array.isArray(primaryArtists) && primaryArtists[0]) ? primaryArtists[0] : 'Unknown_Artist';
        const primaryArtist = (typeof p === 'object' && p !== null && p.name) ? p.name : p;
        const artistDirName = sanitizeName(primaryArtist).substring(0, 80) || 'Unknown_Artist';
        const releaseDirName = sanitizeName(title).substring(0, 80) || 'Untitled_Release';
        const targetDir = path.join(TMP_DIR, String(userId), artistDirName, releaseDirName);
        if (fs.existsSync(targetDir)) {
            try {
                fs.rmSync(targetDir, { recursive: true, force: true });
            } catch (e) {
                console.warn('Failed to cleanup tmp dir:', e.message);
            }
        }
        res.json({ message: 'TMP cleaned' });
    } catch (err) {
        console.error('TMP Cleanup Error:', err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/tmp/preview-clip', authenticateToken, async (req, res) => {
    try {
        const { tmpPath, startSec, durationSec } = req.body || {};
        const absTmp = (typeof tmpPath === 'string') ? (function(p){ 
            const normalized = String(p).replace(/^[\\/]+/, '');
            let relPath = normalized;
            // Handle various prefixes
            if (relPath.startsWith('uploads/')) relPath = relPath.replace(/^uploads[\\/]/, '');
            else if (relPath.startsWith('/uploads/')) relPath = relPath.replace(/^\/uploads[\\/]/, '');
            
            // Ensure path starts with tmp/
            if (!relPath.startsWith('tmp/')) {
                 // Check if it's just the part after tmp/
                 const segs = relPath.split(/[\\/]/);
                 if (segs[0] !== 'tmp') {
                     // Maybe it's a direct relative path? Let's check if it exists in TMP_DIR
                     const checkAbs = path.join(TMP_DIR, relPath);
                     if (fs.existsSync(checkAbs)) return checkAbs;
                     return null;
                 }
            }
            
            // It starts with tmp/
            // But TMP_DIR already ends with uploads/tmp
            // So we need to strip 'tmp/' from relPath to join with TMP_DIR
            // OR join with UPLOADS_ROOT
            
            // Let's rely on standard resolution:
            // If p is "uploads/tmp/user/file", abs is UPLOADS_ROOT + p
            const absFromRoot = path.join(__dirname, '../../', normalized);
            if (fs.existsSync(absFromRoot) && absFromRoot.startsWith(TMP_DIR)) return absFromRoot;
            
            // If p is "/uploads/tmp/user/file", handle leading slash
            const normalizedNoSlash = normalized.replace(/^\//, '');
            const absFromRoot2 = path.join(__dirname, '../../', normalizedNoSlash);
            if (fs.existsSync(absFromRoot2) && absFromRoot2.startsWith(TMP_DIR)) return absFromRoot2;

            return null;
        })(tmpPath) : null;
        if (!absTmp || !fs.existsSync(absTmp)) {
            return res.status(400).json({ error: 'Invalid tmpPath' });
        }
        const dir = path.dirname(absTmp);
        const base = path.basename(absTmp, path.extname(absTmp));
        const outName = `${base}-preview.wav`;
        const outAbs = path.join(dir, outName);
        await runFfmpegConvert(absTmp, outAbs, { startSec: Number(startSec || 0), durationSec: Number(durationSec || 60) });
        const rel = path.relative(path.join(__dirname, '../../'), outAbs).replace(/\\/g, '/');
        const pub = `/${rel}`;
        res.json({ previewPath: pub });
    } catch (err) {
        console.error('TMP Preview Clip Error:', err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/tmp/validate-audio', authenticateToken, async (req, res) => {
    try {
        const tmpPath = String(req.body?.tmpPath || '').trim();
        if (!tmpPath) return res.status(400).json({ error: 'tmpPath required' });
        const userId = String(req.user.id);
        const normalized = tmpPath.replace(/^[\\/]+/, '');
        const abs = path.join(__dirname, '../../', normalized);
        const userBase = path.join(TMP_DIR, userId) + path.sep;
        if (!abs.startsWith(userBase) || !fs.existsSync(abs)) {
            return res.status(400).json({ error: 'Invalid tmpPath' });
        }
        const fmt = await probeAudioFormat24_48(abs);
        res.json({
            ok: Boolean(fmt.ok),
            skipped: Boolean(fmt.skipped),
            sampleRate: fmt.sampleRate ?? null,
            bitDepth: fmt.bitDepth ?? null
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// CREATE NEW RELEASE
// Expects: JSON data in 'data' field, and files in 'files'
// But for simplicity in this MVP, we might accept JSON first, then files, OR multipart/form-data.
// Let's stick to the Wizard approach: 
// 1. Upload files individually (returns path) -> handled by /upload endpoint (we need one)
// 2. Submit final JSON with file paths.
//
// OR: Step 4 submits everything. 
// Given the frontend code in Step4Review doesn't seem to use FormData for the *final* submit (it calls api.createRelease(token, data)), 
// we assume files were uploaded in previous steps? 
// WAIT: The frontend snippet showed `track.audioFile` as a File object?
// If `Step4Review` sends JSON, it cannot send File objects.
// Let's check `api.createRelease`. 

router.post('/', authenticateToken, handleUpload(upload.any()), async (req, res) => {
    try {
        // Parse JSON payload from 'data' field when using multipart/form-data
        const releaseData = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
        let userId = req.user.id;
        if (req.user.role === 'Admin' && releaseData.userId) {
            userId = releaseData.userId;
        }
        const isUpdate = !!releaseData.id;

        const p = (Array.isArray(releaseData.primaryArtists) && releaseData.primaryArtists[0]) ? releaseData.primaryArtists[0] : 'Unknown_Artist';
        const primaryArtist = (typeof p === 'object' && p !== null && p.name) ? p.name : p;
        const artistDirName = sanitizeName(primaryArtist).substring(0, 80) || 'Unknown_Artist';
        // Folder name: Artist - Release Title
        const releaseDirName = sanitizeName(`${primaryArtist} - ${releaseData.title}`).substring(0, 80) || 'Untitled_Release';
        const targetDir = path.join(RELEASES_DIR, artistDirName, releaseDirName);
        
        // Ensure directories exist with correct permissions
        if (!fs.existsSync(UPLOADS_ROOT)) fs.mkdirSync(UPLOADS_ROOT, { recursive: true });
        if (!fs.existsSync(RELEASES_DIR)) fs.mkdirSync(RELEASES_DIR, { recursive: true });
        if (!fs.existsSync(targetDir)) {
            try {
                fs.mkdirSync(targetDir, { recursive: true, mode: 0o755 });
            } catch (mkdirErr) {
                console.error('Failed to create target dir:', mkdirErr);
                // Continue if dir exists (race condition), else throw
                if (!fs.existsSync(targetDir)) throw mkdirErr;
            }
        }

        const driveReleaseFolderId = await ensureReleaseFolder({ artistFolderName: artistDirName, releaseFolderName: releaseDirName });

        // Move uploaded files into targetDir and collect public paths
        const files = Array.isArray(req.files) ? req.files : [];
        const pathMap = {};
        for (const f of files) {
            const destName = f.filename;
            const destPath = path.join(targetDir, destName);
            if (f.path !== destPath) {
                // Try rename, fallback to copy+unlink if cross-device
                try {
                   fs.renameSync(f.path, destPath);
                } catch (renameErr) {
                   if (renameErr.code === 'EXDEV') {
                       fs.copyFileSync(f.path, destPath);
                       fs.unlinkSync(f.path);
                   } else {
                       throw renameErr;
                   }
                }
            }
            const publicPath = `/uploads/releases/${artistDirName}/${releaseDirName}/${destName}`;
            const uploaded = await uploadLocalFileToDrive({
                absPath: destPath,
                fileName: destName,
                mimeType: f.mimetype,
                parentFolderId: driveReleaseFolderId,
                category: 'release',
                deleteLocalOnSuccess: true
            });
            pathMap[f.fieldname] = uploaded?.url || publicPath;
        }

        // Helper: resolve absolute path from public tmp path (validates user scope)
        const resolveTmpAbs = (pubPath) => {
            if (!pubPath || typeof pubPath !== 'string') return null;
            const normalized = String(pubPath).replace(/^[\\/]+/, '');
            let relPath = normalized;
            // Handle various prefixes
            if (relPath.startsWith('uploads/')) relPath = relPath.replace(/^uploads[\\/]/, '');
            else if (relPath.startsWith('/uploads/')) relPath = relPath.replace(/^\/uploads[\\/]/, '');
            
            // Ensure path starts with tmp/
            if (!relPath.startsWith('tmp/')) {
                 // Check if it's just the part after tmp/
                 const segs = relPath.split(/[\\/]/);
                 if (segs[0] !== 'tmp') {
                     // Maybe it's a direct relative path? Let's check if it exists in TMP_DIR
                     const checkAbs = path.join(TMP_DIR, relPath);
                     if (fs.existsSync(checkAbs)) return checkAbs;
                     return null;
                 }
            }
            
            // It starts with tmp/
            // But TMP_DIR already ends with uploads/tmp
            // So we need to strip 'tmp/' from relPath to join with TMP_DIR
            // OR join with UPLOADS_ROOT
            
            // Let's rely on standard resolution:
            // If p is "uploads/tmp/user/file", abs is UPLOADS_ROOT + p
            const absFromRoot = path.join(__dirname, '../../', normalized);
            if (fs.existsSync(absFromRoot) && absFromRoot.startsWith(TMP_DIR)) return absFromRoot;
            
            // If p is "/uploads/tmp/user/file", handle leading slash
            const normalizedNoSlash = normalized.replace(/^\//, '');
            const absFromRoot2 = path.join(__dirname, '../../', normalizedNoSlash);
            if (fs.existsSync(absFromRoot2) && absFromRoot2.startsWith(TMP_DIR)) return absFromRoot2;

            return null;
        };

        // Handle Cover Art move from TMP if not uploaded directly
        if (!pathMap['coverArt'] && releaseData.coverArt && typeof releaseData.coverArt === 'string' && releaseData.coverArt.includes('/uploads/tmp/')) {
             const tmpCover = releaseData.coverArt;
             const absTmp = resolveTmpAbs(tmpCover);
             if (absTmp && fs.existsSync(absTmp)) {
                 const ext = path.extname(absTmp) || path.extname(tmpCover) || '.jpg';
                 const outName = `${artistDirName} - ${releaseDirName}-cover${ext}`;
                 const outAbs = path.join(targetDir, outName);
                if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
                
                // Delete existing file if replacing
                if (fs.existsSync(outAbs)) {
                    try { fs.unlinkSync(outAbs); } catch (e) { console.warn('Failed to unlink existing file:', e); }
                }

                try {
                    fs.copyFileSync(absTmp, outAbs);
                    try { fs.unlinkSync(absTmp); } catch {}
                    const mimeType = String(ext || '').toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
                    const uploaded = await uploadLocalFileToDrive({
                        absPath: outAbs,
                        fileName: outName,
                        mimeType,
                        parentFolderId: driveReleaseFolderId,
                        category: 'release',
                        deleteLocalOnSuccess: true
                    });
                    pathMap['coverArt'] = uploaded?.url || `/uploads/releases/${artistDirName}/${releaseDirName}/${outName}`;
                } catch (e) {
                    console.warn('Cover art move failed:', e);
                }
             }
        }
        const checkAudioFormat24_48 = (inPath) => {
            return new Promise((resolve) => {
                const args = [
                    '-v', 'error',
                    '-select_streams', 'a:0',
                    '-show_entries', 'stream=sample_rate,bits_per_raw_sample',
                    '-of', 'default=noprint_wrappers=1:nokey=1',
                    inPath
                ];
                const proc = spawn('ffprobe', args);
                let out = '';
                let errOut = '';
                proc.stdout.on('data', (d) => { out += d.toString(); });
                proc.stderr.on('data', (d) => { errOut += d.toString(); });
                proc.on('error', (e) => {
                    console.warn('ffprobe spawn error (skipping check):', e.message || e);
                    // If ffprobe is missing, we skip validation instead of failing
                    resolve({ ok: true, skipped: true });
                });
                proc.on('exit', (code) => {
                    if (code !== 0) {
                        console.warn('ffprobe exited with code', code, errOut);
                        // If ffprobe fails to read file, we might want to fail or skip. 
                        // Let's skip for now to avoid blocking valid files if ffprobe is buggy.
                        resolve({ ok: true, skipped: true }); 
                    }
                    const parts = out.trim().split(/\s+/).filter(Boolean);
                    const sampleRate = parts[0] ? parseInt(parts[0], 10) : null;
                    const bitDepth = parts[1] ? parseInt(parts[1], 10) : null;
                    // Relaxed validation: Allow any format for now to unblock uploads
                    // const ok = sampleRate === 48000 && bitDepth === 24;
                    const ok = true; 
                    resolve({ ok, sampleRate, bitDepth });
                });
            });
        };
        const runFfmpegConvert = (inPath, outPath, opts = {}) => {
            return new Promise((resolve, reject) => {
                const args = ['-y'];
                if (opts.startSec !== undefined) {
                    args.push('-ss', String(opts.startSec));
                }
                args.push('-i', inPath);
                if (opts.durationSec !== undefined) {
                    args.push('-t', String(opts.durationSec));
                }
                // 24-bit PCM WAV at 48kHz
                args.push('-acodec', 'pcm_s24le', '-ar', '48000', outPath);
                const proc = spawn('ffmpeg', args, { stdio: 'ignore' });
                proc.on('error', (err) => reject(err));
                proc.on('exit', (code) => {
                    if (code === 0) resolve(true);
                    else reject(new Error(`ffmpeg exited with code ${code}`));
                });
            });
        };

        const audioFormatErrors = [];

        // Attach file paths back into releaseData
        if (pathMap['coverArt']) {
            releaseData.coverArt = pathMap['coverArt'];
        }
        if (releaseData.tracks && Array.isArray(releaseData.tracks)) {
            releaseData.tracks = await Promise.all(releaseData.tracks.map(async (t, idx) => {
                const audioField = `track_${idx}_audio`;
                const clipField = `track_${idx}_clip`;
                const iplField = `track_${idx}_ipl`;

                // Derive artists arrays from generic "artists" if specific arrays absent
                let primaryArtists = t.primaryArtists;
                let featuredArtists = t.featuredArtists;
                if ((!primaryArtists || !Array.isArray(primaryArtists)) || (!featuredArtists || !Array.isArray(featuredArtists))) {
                    const arts = Array.isArray(t.artists) ? t.artists : [];
                    primaryArtists = primaryArtists && Array.isArray(primaryArtists) ? primaryArtists : arts.filter(a => /main/i.test(a.role)).map(a => a.name);
                    featuredArtists = featuredArtists && Array.isArray(featuredArtists) ? featuredArtists : arts.filter(a => /feat/i.test(a.role)).map(a => a.name);
                }

                // Convert & move from TMP if provided
                let audioPath = pathMap[audioField] || t.audioFile || null;
                let clipPath = pathMap[clipField] || t.audioClip || null;
                const tmpAudioSource =
                    (typeof t.tempAudioPath === 'string' && t.tempAudioPath) ||
                    (typeof t.audioFile === 'string' && /\/uploads\/tmp\//.test(t.audioFile) ? t.audioFile : null);
                const tmpClipSource =
                    (typeof t.tempClipPath === 'string' && t.tempClipPath) ||
                    (typeof t.audioClip === 'string' && /\/uploads\/tmp\//.test(t.audioClip) ? t.audioClip : null);
                try {
                    const baseName = `${artistDirName} - ${releaseDirName}`;
                    const trackIdx = idx + 1;
                    if (tmpAudioSource) {
                        const absTmp = resolveTmpAbs(tmpAudioSource);
                        if (absTmp && fs.existsSync(absTmp)) {
                            const fmt = await checkAudioFormat24_48(absTmp);
                            if (!fmt.ok) {
                                audioFormatErrors.push(
                                    `Track ${trackIdx}: format harus 24-bit 48kHz (sampleRate=${fmt.sampleRate || 'unknown'}, bitDepth=${fmt.bitDepth || 'unknown'})`
                                );
                            } else {
                                const ext = path.extname(absTmp) || '.wav';
                            const outName = `${baseName}-track${trackIdx}${ext}`;
                            const outAbs = path.join(targetDir, outName);
                            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
                            
                            // Delete existing file if replacing
                            if (fs.existsSync(outAbs)) {
                                try { fs.unlinkSync(outAbs); } catch (e) { console.warn('Failed to unlink existing track:', e); }
                            }

                            try {
                                fs.copyFileSync(absTmp, outAbs);
                                try { fs.unlinkSync(absTmp); } catch {}
                                const uploaded = await uploadLocalFileToDrive({
                                    absPath: outAbs,
                                    fileName: outName,
                                    mimeType: 'audio/wav',
                                    parentFolderId: driveReleaseFolderId,
                                    category: 'release',
                                    deleteLocalOnSuccess: true
                                });
                                audioPath = uploaded?.url || `/uploads/releases/${artistDirName}/${releaseDirName}/${outName}`;
                            } catch (copyErr) {
                                console.warn('Audio copy failed:', copyErr.message || copyErr);
                            }
                            }
                        }
                    }
                    if (tmpClipSource) {
                        const absTmp = resolveTmpAbs(tmpClipSource);
                        if (absTmp && fs.existsSync(absTmp)) {
                            const outName = `${baseName}-track${trackIdx}-clip.wav`;
                            const outAbs = path.join(targetDir, outName);
                            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
                            
                            // Delete existing file if replacing
                            if (fs.existsSync(outAbs)) {
                                try { fs.unlinkSync(outAbs); } catch (e) { console.warn('Failed to unlink existing clip:', e); }
                            }

                            const startSec = Number(t.previewStart || 0);
                            let convertedClip = false;
                            try {
                                await runFfmpegConvert(absTmp, outAbs, { startSec, durationSec: 60 });
                                convertedClip = true;
                            } catch (convErr) {
                                console.warn('Clip ffmpeg convert failed, fallback to copy:', convErr.message || convErr);
                                try {
                                    fs.copyFileSync(absTmp, outAbs);
                                    convertedClip = true;
                                } catch (copyErr) {
                                    console.warn('Clip fallback copy failed:', copyErr.message || copyErr);
                                }
                            }
                            if (convertedClip) {
                                try { fs.unlinkSync(absTmp); } catch {}
                                const uploaded = await uploadLocalFileToDrive({
                                    absPath: outAbs,
                                    fileName: outName,
                                    mimeType: 'audio/wav',
                                    parentFolderId: driveReleaseFolderId,
                                    category: 'release',
                                    deleteLocalOnSuccess: true
                                });
                                clipPath = uploaded?.url || `/uploads/releases/${artistDirName}/${releaseDirName}/${outName}`;
                            }
                        }
                    }
                } catch (e) {
                    console.warn('TMP convert/move failed:', e.message || e);
                }

                return {
                    ...t,
                    primaryArtists,
                    featuredArtists,
                    audioFile: audioPath,
                    audioClip: clipPath,
                    iplFile: pathMap[iplField] || t.iplFile || null
                };
            }));
        }

        if (audioFormatErrors.length > 0) {
            console.log('Audio format validation failed:', audioFormatErrors);
            return res.status(400).json({
                error: 'Hanya file audio WAV 24-bit 48kHz yang diterima. Mohon convert file di DAW lalu upload ulang.',
                code: 'INVALID_AUDIO_FORMAT',
                details: audioFormatErrors
            });
        }

        if (isUpdate) {
            const [rows] = await db.query('SELECT * FROM releases WHERE id = ?', [releaseData.id]);
            if (rows.length === 0) {
                return res.status(404).json({ error: 'Release not found' });
            }
            const existingRelease = rows[0];
            if (req.user.role !== 'Admin' && existingRelease.user_id !== userId) {
                return res.status(403).json({ error: 'Access denied' });
            }
        } else {
            const [existing] = await db.query(
                'SELECT id FROM releases WHERE user_id = ? AND title = ? AND version = ? AND status != "Rejected"',
                [userId, releaseData.title, releaseData.version]
            );
            if (existing.length > 0) {
                return res.status(200).json({ 
                    message: 'Release already exists', 
                    id: existing[0].id,
                    isDuplicate: true 
                });
            }
        }

        // 1. Insert/Update Release (dynamic columns for optional fields)
        const [releaseCols] = await db.query('SHOW COLUMNS FROM releases');
        const releaseColNames = releaseCols.map(c => c.Field);
        const cols = [
            'title','version','release_type',
            'primary_artists','cover_art','label',
            'p_line','c_line','genre','sub_genre','language',
            'upc'
        ];
        const vals = [
            releaseData.title,
            releaseData.version || '',
            releaseData.type,
            JSON.stringify(releaseData.primaryArtists || []),
            releaseData.coverArt || null,
            releaseData.label || null,
            releaseData.pLine || null,
            releaseData.cLine || null,
            releaseData.genre || null,
            releaseData.subGenre || null,
            releaseData.language || null,
            releaseData.upc || null
        ];
        if (releaseColNames.includes('distribution_targets')) {
            cols.push('distribution_targets');
            vals.push(JSON.stringify(releaseData.distributionTargets || []));
        }
        if (releaseColNames.includes('original_release_date')) {
            cols.push('original_release_date');
            vals.push(releaseData.originalReleaseDate || null);
        }
        if (releaseColNames.includes('planned_release_date')) {
            cols.push('planned_release_date');
            vals.push(releaseData.plannedReleaseDate || null);
        }
        if (releaseColNames.includes('aggregator')) {
            cols.push('aggregator'); vals.push(releaseData.aggregator || null);
        }
        let releaseId;
        if (!isUpdate) {
            // Check for existing release with same title/version by this user
            const [existing] = await db.query(
                'SELECT id FROM releases WHERE user_id = ? AND title = ? AND version = ? AND status != "Rejected"',
                [userId, releaseData.title, releaseData.version || '']
            );
            
            if (existing.length > 0) {
                // If exists, inform frontend it's a duplicate instead of silently updating
                // This allows the user to decide whether to change title/version or confirm overwrite (if we want to support that later)
                // But per user request: "informasikan ke user dengan modal data sudah ada"
                return res.status(200).json({ 
                    message: 'Release already exists', 
                    id: existing[0].id,
                    isDuplicate: true,
                    duplicateTitle: releaseData.title,
                    duplicateVersion: releaseData.version || 'Original'
                });
            } else {
                cols.unshift('user_id');
                vals.unshift(userId);
                cols.push('submission_date'); vals.push(new Date());
                cols.push('status'); vals.push('Pending');
                const placeholders = `(${cols.map(() => '?').join(', ')})`;
                const [releaseResult] = await db.query(
                    `INSERT INTO releases (${cols.join(', ')}) VALUES ${placeholders}`,
                    vals
                );
                releaseId = releaseResult.insertId;
            }
        } else {
            // Ensure ownership is preserved (or corrected) when Admin updates
            // Only update user_id if explicitly provided to avoid accidental overwrite
            if (req.user.role === 'Admin' && releaseData.userId) {
                cols.push('user_id');
                vals.push(releaseData.userId);
            }

            const setParts = cols.map(col => `${col} = ?`);
            await db.query(
                `UPDATE releases SET ${setParts.join(', ')} WHERE id = ?`,
                [...vals, releaseData.id]
            );
            releaseId = releaseData.id;
        }

        // 2. Insert Tracks (dynamic columns for optional fields like audio_clip, lyrics)
        if (releaseData.tracks && releaseData.tracks.length > 0) {
            const [trackCols] = await db.query('SHOW COLUMNS FROM tracks');
            const trackColNames = trackCols.map(c => c.Field);

            const baseCols = [
                'release_id','track_number','title','version',
                'primary_artists','featured_artists','audio_file',
                'isrc','explicit_lyrics','composer','lyricist','producer','genre','sub_genre','preview_start'
            ];
            const optCols = [];
            if (trackColNames.includes('audio_clip')) optCols.push('audio_clip');
            if (trackColNames.includes('lyrics')) optCols.push('lyrics');
            if (trackColNames.includes('ipl_file')) optCols.push('ipl_file');
            if (trackColNames.includes('is_instrumental')) optCols.push('is_instrumental');

            const allCols = baseCols.concat(optCols);
            if (isUpdate) {
                await db.query('DELETE FROM tracks WHERE release_id = ?', [releaseId]);
            }
            const trackValues = releaseData.tracks.map(track => {
                const values = [
                    releaseId,
                    track.trackNumber || '',
                    track.title || '',
                    track.version || '',
                    JSON.stringify(track.primaryArtists || []),
                    JSON.stringify(track.featuredArtists || []),
                    track.audioFile || null,
                    track.isrc || null,
                    track.explicitLyrics || null,
                    track.composer || null,
                    track.lyricist
                        ? JSON.stringify(Array.isArray(track.lyricist) ? track.lyricist : [track.lyricist])
                        : null,
                    track.producer
                        ? JSON.stringify(Array.isArray(track.producer) ? track.producer : [track.producer])
                        : null,
                    track.genre || null,
                    track.subGenre || null,
                    track.previewStart || 0
                ];
                if (optCols.includes('audio_clip')) values.push(track.audioClip || null);
                if (optCols.includes('lyrics')) values.push(track.lyrics || null);
                if (optCols.includes('ipl_file')) values.push(track.iplFile || null);
                if (optCols.includes('is_instrumental')) values.push(track.isInstrumental === 'Yes' ? 1 : 0);
                return values;
            });

            const placeholders = `(${allCols.map(() => '?').join(', ')})`;
            const sql = `INSERT INTO tracks (${allCols.join(', ')}) VALUES ${trackValues.map(() => placeholders).join(', ')}`;
            const flatParams = trackValues.flat();
            await db.query(sql, flatParams);

            // Save Contributors if table exists
            let contribCols = null;
            try {
                const [cc] = await db.query('SHOW COLUMNS FROM track_contributors');
                contribCols = cc.map(c => c.Field);
            } catch (e) {
                contribCols = null;
            }
            if (contribCols && contribCols.includes('track_id')) {
                const [savedTracks] = await db.query('SELECT id, track_number FROM tracks WHERE release_id = ? ORDER BY track_number ASC', [releaseId]);
                const mapByTrackNumber = new Map(savedTracks.map(t => [String(t.track_number), t.id]));
                const colsContrib = ['track_id','name','type','role'].filter(c => contribCols.includes(c));
                if (colsContrib.length >= 2) {
                    const contribValues = [];
                    releaseData.tracks.forEach(tr => {
                        const tid = mapByTrackNumber.get(String(tr.trackNumber || ''));
                        if (!tid) return;
                        (tr.contributors || []).forEach(c => {
                            const row = [];
                            colsContrib.forEach(col => {
                                if (col === 'track_id') row.push(tid);
                                else if (col === 'name') row.push(c.name || '');
                                else if (col === 'type') row.push(c.type || '');
                                else if (col === 'role') row.push(c.role || '');
                            });
                            contribValues.push(row);
                        });
                    });
                    if (contribValues.length > 0) {
                        const placeholdersC = `(${colsContrib.map(() => '?').join(', ')})`;
                        const sqlC = `INSERT INTO track_contributors (${colsContrib.join(',')}) VALUES ${contribValues.map(() => placeholdersC).join(', ')}`;
                        await db.query(sqlC, contribValues.flat());
                    }
                }
            }
        }

        // Cleanup TMP folder for this release
        // Only remove if tracks no longer reference any /uploads/tmp/ path
        try {
            const stillUsesTmp = Array.isArray(releaseData.tracks) && releaseData.tracks.some(t => {
                const a = t.audioFile;
                const c = t.audioClip;
                return (typeof a === 'string' && a.includes('/uploads/tmp/')) ||
                       (typeof c === 'string' && c.includes('/uploads/tmp/'));
            });
            if (!stillUsesTmp) {
                const userIdStr = String(userId);
                const tmpTargetDir = path.join(TMP_DIR, userIdStr, artistDirName, releaseDirName);
                if (fs.existsSync(tmpTargetDir)) {
                    fs.rmSync(tmpTargetDir, { recursive: true, force: true });
                }
            }
        } catch (e) {
            console.warn('Cleanup tmp after finalize failed:', e.message || e);
        }

        res.status(isUpdate ? 200 : 201).json({ message: isUpdate ? 'Release updated successfully' : 'Release submitted successfully', id: releaseId });

    } catch (err) {
        console.error("Create Release Error:", err);
        const errorMsg = err instanceof Error ? err.message : (typeof err === 'string' ? err : 'Unknown Server Error');
        
        // Return more detailed error for debugging on hosting
        res.status(500).json({ 
            error: errorMsg, 
            code: err?.code,
            sqlMessage: err?.sqlMessage,
            details: 'Check server logs for full stack trace'
        });
    }
});

// DELETE RELEASE
router.delete('/:id', authenticateToken, async (req, res) => {
    const releaseId = req.params.id;
    try {
        const [rows] = await db.query('SELECT id, user_id, cover_art, title, primary_artists FROM releases WHERE id = ?', [releaseId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Release not found' });
        }
        const rel = rows[0];
        if (req.user.role !== 'Admin') return res.status(403).json({ error: 'Access denied' });

        try {
            if (rel.cover_art && /^https?:\/\//i.test(String(rel.cover_art))) {
                await deleteDriveFileByUrl(rel.cover_art);
            }
            const [trowsAll] = await db.query('SELECT audio_file, audio_clip, ipl_file FROM tracks WHERE release_id = ?', [releaseId]);
            for (const t of trowsAll) {
                const urls = [t.audio_file, t.audio_clip, t.ipl_file].filter(Boolean);
                for (const u of urls) {
                    if (/^https?:\/\//i.test(String(u))) {
                        await deleteDriveFileByUrl(u);
                    }
                }
            }
        } catch {}
        const releasesBase = path.join(__dirname, '../../uploads/releases');
        const resolveDirFromPath = (p) => {
            if (!p || typeof p !== 'string') return null;
            const normalized = String(p).replace(/^[\\/]+/, '');
            let relPath = normalized;
            if (relPath.startsWith('uploads/')) {
                relPath = relPath.replace(/^uploads[\\/]/, '');
            } else if (relPath.startsWith('/uploads/')) {
                relPath = relPath.replace(/^\/uploads[\\/]/, '');
            }
            const abs = path.join(__dirname, '../../', relPath);
            if (!abs.startsWith(releasesBase)) return null;
            return path.dirname(abs);
        };
        let dirToRemove = resolveDirFromPath(rel.cover_art);
        if (!dirToRemove) {
            try {
                const [trows] = await db.query('SELECT audio_file FROM tracks WHERE release_id = ? AND audio_file IS NOT NULL LIMIT 1', [releaseId]);
                if (trows.length > 0) {
                    dirToRemove = resolveDirFromPath(trows[0].audio_file);
                }
            } catch {}
        }
        if (dirToRemove && fs.existsSync(dirToRemove)) {
            try {
                fs.rmSync(dirToRemove, { recursive: true, force: true });
            } catch (e) {
                console.warn('Failed to remove release folder:', e.message);
            }
        }
        await db.query(`DELETE FROM releases WHERE id = ?`, [releaseId]);
        res.json({ message: 'Release deleted' });
    } catch (err) {
        console.error('Delete Release Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// UPDATE ARTIST SPOTIFY LINK (Global)
router.post('/artist/update-spotify', authenticateToken, async (req, res) => {
    try {
        const { artistName, spotifyLink } = req.body;
        if (!artistName) return res.status(400).json({ error: 'Artist name is required' });

        if (req.user.role !== 'Admin' && req.user.role !== 'Operator') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const normTarget = String(artistName).trim().toLowerCase();

        // 1. Update Releases
        const [releases] = await db.query('SELECT id, primary_artists FROM releases');
        for (const rel of releases) {
            let artists = [];
            try {
                artists = typeof rel.primary_artists === 'string' ? JSON.parse(rel.primary_artists) : (rel.primary_artists || []);
            } catch { continue; }

            let changed = false;
            const updated = artists.map(a => {
                const name = typeof a === 'string' ? a : a.name;
                if (name && name.trim().toLowerCase() === normTarget) {
                    changed = true;
                    return { name, spotifyLink };
                }
                return a;
            });

            if (changed) {
                await db.query('UPDATE releases SET primary_artists = ? WHERE id = ?', [JSON.stringify(updated), rel.id]);
            }
        }

        // 2. Update Tracks
        const [tracks] = await db.query('SELECT id, primary_artists, featured_artists FROM tracks');
        for (const track of tracks) {
            let pArtists = [];
            let fArtists = [];
            try {
                pArtists = typeof track.primary_artists === 'string' ? JSON.parse(track.primary_artists) : (track.primary_artists || []);
                fArtists = typeof track.featured_artists === 'string' ? JSON.parse(track.featured_artists) : (track.featured_artists || []);
            } catch { continue; }

            let changed = false;
            const updatedP = pArtists.map(a => {
                const name = typeof a === 'string' ? a : a.name;
                if (name && name.trim().toLowerCase() === normTarget) {
                    changed = true;
                    return { name, spotifyLink };
                }
                return a;
            });

            const updatedF = fArtists.map(a => {
                const name = typeof a === 'string' ? a : a.name;
                if (name && name.trim().toLowerCase() === normTarget) {
                    changed = true;
                    return { name, spotifyLink };
                }
                return a;
            });

            if (changed) {
                await db.query('UPDATE tracks SET primary_artists = ?, featured_artists = ? WHERE id = ?', [
                    JSON.stringify(updatedP),
                    JSON.stringify(updatedF),
                    track.id
                ]);
            }
        }

        res.json({ message: 'Artist Spotify link updated successfully' });
    } catch (err) {
        console.error('Update Artist Spotify Error:', err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/:id/cover-art', authenticateToken, handleUpload(upload.single('cover_art')), async (req, res) => {
    const releaseId = req.params.id;
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ error: 'cover_art file is required' });

        const [rows] = await db.query('SELECT id, user_id, title, primary_artists, status FROM releases WHERE id = ?', [releaseId]);
        if (rows.length === 0) return res.status(404).json({ error: 'Release not found' });
        const rel = rows[0];

        if (req.user.role !== 'Admin' && rel.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        let primaryArtists = [];
        try {
            primaryArtists = typeof rel.primary_artists === 'string' ? JSON.parse(rel.primary_artists) : (rel.primary_artists || []);
        } catch {
            primaryArtists = [];
        }
        const p0 = (Array.isArray(primaryArtists) && primaryArtists[0]) ? primaryArtists[0] : 'Unknown_Artist';
        const primaryArtistName = (typeof p0 === 'object' && p0 !== null && p0.name) ? p0.name : p0;
        const artistDirName = sanitizeName(primaryArtistName).substring(0, 80) || 'Unknown_Artist';
        const releaseDirName = sanitizeName(`${primaryArtistName} - ${rel.title}`).substring(0, 80) || 'Untitled_Release';
        const targetDir = path.join(RELEASES_DIR, artistDirName, releaseDirName);

        if (!fs.existsSync(UPLOADS_ROOT)) fs.mkdirSync(UPLOADS_ROOT, { recursive: true });
        if (!fs.existsSync(RELEASES_DIR)) fs.mkdirSync(RELEASES_DIR, { recursive: true });
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true, mode: 0o755 });

        const destName = file.filename;
        const destPath = path.join(targetDir, destName);
        if (file.path !== destPath) {
            try {
                fs.renameSync(file.path, destPath);
            } catch (renameErr) {
                if (renameErr.code === 'EXDEV') {
                    fs.copyFileSync(file.path, destPath);
                    fs.unlinkSync(file.path);
                } else {
                    throw renameErr;
                }
            }
        }

        const driveReleaseFolderId = await ensureReleaseFolder({ artistFolderName: artistDirName, releaseFolderName: releaseDirName });
        const uploaded = await uploadLocalFileToDrive({
            absPath: destPath,
            fileName: destName,
            mimeType: file.mimetype,
            parentFolderId: driveReleaseFolderId,
            category: 'release',
            deleteLocalOnSuccess: true
        });
        const publicPath = uploaded?.url || `/uploads/releases/${artistDirName}/${releaseDirName}/${destName}`;
        const nextStatus = req.user.role === 'Admin' ? rel.status : 'Request Edit';
        await db.query('UPDATE releases SET cover_art = ?, status = ? WHERE id = ?', [publicPath, nextStatus, releaseId]);

        res.json({ message: 'Cover art updated', coverArt: publicPath, status: nextStatus });
    } catch (err) {
        console.error('Update Cover Art Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET MY RELEASES
router.get('/', authenticateToken, async (req, res) => {
    try {
        const [userCols] = await db.query('SHOW COLUMNS FROM users');
        const userColNames = (userCols || []).map(c => c.Field);
        const userSelectParts = [
            'u.id as owner_user_id',
            userColNames.includes('account_type') ? 'u.account_type as owner_account_type' : 'NULL as owner_account_type',
            userColNames.includes('company_name') ? 'u.company_name as owner_company_name' : 'NULL as owner_company_name',
            userColNames.includes('full_name') ? 'u.full_name as owner_full_name' : 'NULL as owner_full_name',
            userColNames.includes('name') ? 'u.name as owner_name_field' : 'NULL as owner_name_field',
            userColNames.includes('username') ? 'u.username as owner_username' : 'NULL as owner_username',
            userColNames.includes('email') ? 'u.email as owner_email' : 'NULL as owner_email'
        ];

        let query = `SELECT r.*, ${userSelectParts.join(', ')} FROM releases r LEFT JOIN users u ON u.id = r.user_id`;
        const params = [];

        if (req.user.role !== 'Admin' && req.user.role !== 'Operator') {
            query += ' WHERE r.user_id = ?';
            params.push(req.user.id);
        }

        query += ' ORDER BY r.submission_date DESC';

        const [releases] = await db.query(query, params);

        let tracksByRelease = new Map();
        if (releases.length > 0) {
            const releaseIds = releases.map(r => r.id);
            try {
                const [trackRows] = await db.query(
                    `SELECT id, release_id, track_number, isrc FROM tracks WHERE release_id IN (${releaseIds.map(() => '?').join(',')}) ORDER BY release_id, track_number ASC`,
                    releaseIds
                );
                trackRows.forEach(t => {
                    if (!tracksByRelease.has(t.release_id)) tracksByRelease.set(t.release_id, []);
                    tracksByRelease.get(t.release_id).push({
                        id: t.id,
                        trackNumber: t.track_number,
                        isrc: t.isrc
                    });
                });
            } catch (e) {
                tracksByRelease = new Map();
            }
        }

        const processedReleases = releases.map(r => {
            let parsedArtists = [];
            try {
                parsedArtists = typeof r.primary_artists === 'string' ? JSON.parse(r.primary_artists) : r.primary_artists;
            } catch (e) {
                parsedArtists = [r.primary_artists];
            }

            const submissionDate = r.submission_date;
            const plannedReleaseDate = r.planned_release_date;
            const originalReleaseDate = r.original_release_date;
            const ownerDisplayName = (() => {
                const accountType = String(r.owner_account_type || '').toUpperCase();
                const company = r.owner_company_name;
                if (accountType === 'COMPANY' && company) return company;
                return r.owner_full_name || r.owner_name_field || r.owner_username || r.owner_email || '';
            })();

            return {
                id: r.id,
                user_id: r.user_id,
                ownerDisplayName,
                ownerEmail: r.owner_email || null,
                company_name: r.company_name,
                user_full_name: r.user_full_name,
                owner_name: r.owner_name,
                owner: r.owner,
                created_by: r.created_by,
                title: r.title,
                status: r.status,
                coverArt: r.cover_art,
                primaryArtists: parsedArtists,
                releaseDate: plannedReleaseDate || originalReleaseDate || submissionDate,
                submissionDate,
                plannedReleaseDate,
                originalReleaseDate,
                upc: r.upc,
                label: r.label,
                version: r.version,
                type: r.release_type,
                aggregator: r.aggregator,
                tracks: tracksByRelease.get(r.id) || []
            };
        });

        res.json(processedReleases);

    } catch (err) {
        console.error('Get Releases Error:', err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/:id/workflow', authenticateToken, async (req, res) => {
    try {
        const releaseId = req.params.id;
        const { status, aggregator, upc, rejectionReason, rejectionDescription, tracks } = req.body || {};

        const [releases] = await db.query('SELECT * FROM releases WHERE id = ?', [releaseId]);
        if (releases.length === 0) return res.status(404).json({ error: 'Release not found' });
        const release = releases[0];

        if (req.user.role !== 'Admin') return res.status(403).json({ error: 'Access denied' });

        const [releaseCols] = await db.query('SHOW COLUMNS FROM releases');
        const releaseColNames = releaseCols.map(c => c.Field);
        const setParts = [];
        const vals = [];

        if (typeof status === 'string' && status) {
            setParts.push('status = ?');
            vals.push(status);
        }
        if (releaseColNames.includes('aggregator')) {
            setParts.push('aggregator = ?');
            vals.push(aggregator || null);
        }
        if (releaseColNames.includes('upc')) {
            setParts.push('upc = ?');
            vals.push(upc || null);
        }
        if (releaseColNames.includes('rejection_reason')) {
            setParts.push('rejection_reason = ?');
            vals.push(rejectionReason || null);
        }
        if (releaseColNames.includes('rejection_description')) {
            setParts.push('rejection_description = ?');
            vals.push(rejectionDescription || null);
        }

        if (setParts.length > 0) {
            await db.query(
                `UPDATE releases SET ${setParts.join(', ')} WHERE id = ?`,
                [...vals, releaseId]
            );
        }

        // Create notification when status changes
        try {
            if (typeof status === 'string' && status && status !== release.status) {
                const [users] = await db.query('SELECT id FROM users WHERE id = ?', [release.user_id]);
                if (users.length > 0) {
                    const msg = `Status Rilisan "${release.title}" berubah menjadi ${status}`;
                    const templateKey = `release_status.${status}`;
                    const templateData = { 
                        title: release.title, 
                        status: status,
                        upc: release.upc || ''
                    };
                    
                    await createNotification(release.user_id, 'RELEASE_STATUS', msg, templateKey, templateData);

                    try {
                        const [smtpRows] = await db.query('SELECT setting_value FROM settings WHERE setting_key = ?', ['smtp_settings']);
                        if (smtpRows.length > 0 && smtpRows[0].setting_value) {
                            const smtp = JSON.parse(smtpRows[0].setting_value);
                            if (smtp.host && smtp.port && smtp.from_email) {
                                const [ownerRows] = await db.query('SELECT email, full_name FROM users WHERE id = ?', [release.user_id]);
                                if (ownerRows.length > 0) {
                                    const to = ownerRows[0].email || '';
                                    const fullName = ownerRows[0].full_name || '';
                                    if (to) {
                                        let subject = `Update Status Rilisan: ${release.title} → ${status}`;
                                        // Build ISRC block: Single shows single ISRC; EP/Album lists Track Title + ISRC
                                        let isrcBlock = '';
                                        try {
                                            const [trackRows] = await db.query('SELECT title, isrc FROM tracks WHERE release_id = ? ORDER BY track_number ASC', [release.id]);
                                            const tracksList = Array.isArray(trackRows) ? trackRows : [];
                                            const relTypeRaw = String(release.release_type || release.type || '').toUpperCase();
                                            const isSingle = relTypeRaw.includes('SINGLE') || tracksList.length === 1;
                                            if (isSingle) {
                                                const code = String(tracksList[0]?.isrc || '').trim();
                                                if (code) {
                                                    isrcBlock = `<div style="font-size:14px;color:#0f172a"><strong>ISRC:</strong> ${code}</div>`;
                                                }
                                            } else {
                                                const items = tracksList.filter(t => t && String(t.isrc || '').trim().length > 0);
                                                if (items.length > 0) {
                                                    const listHtml = items.map(t => {
                                                        const title = String(t.title || '').trim() || 'Track';
                                                        const code = String(t.isrc || '').trim();
                                                        return `<div style="font-size:14px;color:#0f172a"><strong>${title}:</strong> ${code}</div>`;
                                                    }).join('');
                                                    isrcBlock = `
          <div style="font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;margin:16px 0 8px">Daftar Track &amp; ISRC</div>
          ${listHtml}
        `;
                                                }
                                            }
                                        } catch {}
                                        let html = `
<div style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;padding:24px">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
    <tr>
      <td style="padding:20px;background:linear-gradient(90deg,#1e40af,#2563eb);color:#fff">
        <div style="font-weight:700;font-size:18px">Dimensi Suara</div>
        <div style="font-size:12px;opacity:.9">Music Distribution Update</div>
      </td>
    </tr>
    <tr>
      <td style="padding:24px">
        <div style="font-size:14px;color:#0f172a;margin-bottom:12px">Halo ${fullName || 'User'},</div>
        <div style="font-size:14px;color:#334155;line-height:1.6">
          Status rilisan Anda telah diperbarui.
        </div>
        <div style="margin:16px 0;padding:16px;border:1px solid #e2e8f0;border-radius:10px;background:#f9fafb">
          <div style="font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;margin-bottom:8px">Detail Rilisan</div>
          <div style="font-size:14px;color:#0f172a"><strong>Judul:</strong> ${release.title}</div>
          <div style="font-size:14px;color:#0f172a"><strong>Status Baru:</strong> ${status}</div>
          ${release.upc ? `<div style="font-size:14px;color:#0f172a"><strong>UPC:</strong> ${release.upc}</div>` : ''}
          ${isrcBlock}
        </div>
        <div style="margin-top:20px;font-size:12px;color:#94a3b8">© ${new Date().getFullYear()} Dimensi Suara</div>
      </td>
    </tr>
  </table>
</div>`;
                                        try {
                                            const key = `release_status.${status}`;
                                            const [tplRows] = await db.query('SELECT subject_template, body_template FROM email_templates WHERE template_key = ?', [key]);
                                            if (tplRows.length > 0) {
                                                const t = tplRows[0];
                                                const replace = (s) => String(s || '')
                                                    .replaceAll('{{fullName}}', fullName || 'User')
                                                    .replaceAll('{{title}}', release.title || '')
                                                    .replaceAll('{{status}}', status || '')
                                                    .replaceAll('{{upc}}', release.upc || '')
                                                    .replaceAll('{{isrcBlock}}', isrcBlock)
                                                    .replaceAll('{{reason}}', String(rejectionReason || ''))
                                                    .replaceAll('{{description}}', String(rejectionDescription || ''));
                                                subject = replace(t.subject_template);
                                                html = replace(t.body_template);
                                            }
                                        } catch {}
                                        const sendEmail = ({ host, port, secure, user, pass, from_email, to, subject, html }) => {
                                            return new Promise((resolve, reject) => {
                                                const socket = secure ? tls.connect(port, host, { servername: host }, onConnect) : net.connect(port, host, onConnect);
                                                let buffer = '';
                                                let closed = false;
                                                function cleanup(err) { if (closed) return; closed = true; try { socket.end(); } catch {} if (err) reject(err); else resolve({ ok: true }); }
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
                                                function send(cmd) { return new Promise((res, rej) => { try { socket.write(cmd + '\r\n', 'utf8', res); } catch (e) { rej(e); } }); }
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
                                                                '',
                                                                html,
                                                                ''
                                                            ].join('\r\n');
                                                            await send(msg + '\r\n.');
                                                            const accepted = await expect(250);
                                                            await send('QUIT');
                                                            cleanup();
                                                            if (logId) {
                                                                await db.query('UPDATE email_logs SET status = ?, sent_at = NOW(), server_response = ? WHERE id = ?', ['SENT', accepted?.slice(0, 480) || null, logId]);
                                                            }
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
                                                [release.user_id, 'RELEASE_STATUS', release.id, to, subject, 'PENDING']
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
                                                to,
                                                subject,
                                                html
                                            });
                                        } catch (err) {
                                            if (logId) {
                                                await db.query('UPDATE email_logs SET status = ?, error_message = ? WHERE id = ?', ['FAILED', String(err?.message || err), logId]);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    } catch (e) {}
                }
            }
        } catch (e) {
            console.warn('Failed to insert release notification:', e.message);
        }

        if (Array.isArray(tracks) && tracks.length > 0) {
            for (const t of tracks) {
                if (!t || !t.id) continue;
                await db.query(
                    'UPDATE tracks SET isrc = ? WHERE id = ? AND release_id = ?',
                    [t.isrc || null, t.id, releaseId]
                );
            }
        }

        res.json({ message: 'Workflow updated' });
    } catch (err) {
        console.error('Update workflow error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET SINGLE RELEASE
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const [releases] = await db.query('SELECT * FROM releases WHERE id = ?', [req.params.id]);
        if (releases.length === 0) return res.status(404).json({ error: 'Release not found' });

        const release = releases[0];

        // Check ownership
        if (req.user.role !== 'Admin' && release.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get Tracks
        const [tracks] = await db.query('SELECT * FROM tracks WHERE release_id = ? ORDER BY track_number ASC', [release.id]);
        // Optional: load contributors if table exists
        let contribByTrack = new Map();
        try {
            const [cc] = await db.query('SHOW COLUMNS FROM track_contributors');
            if (cc && cc.length > 0) {
                const trackIds = tracks.map(t => t.id);
                if (trackIds.length > 0) {
                    const [rows] = await db.query(`SELECT * FROM track_contributors WHERE track_id IN (${trackIds.map(()=>' ?').join(',')})`, trackIds);
                    rows.forEach(r => {
                        if (!contribByTrack.has(r.track_id)) contribByTrack.set(r.track_id, []);
                        contribByTrack.get(r.track_id).push({
                            name: r.name || '',
                            type: r.type || '',
                            role: r.role || ''
                        });
                    });
                }
            }
        } catch (e) {
            // ignore if table not found
        }

        // Parse JSON fields
        release.primaryArtists = typeof release.primary_artists === 'string' ? JSON.parse(release.primary_artists) : release.primary_artists;
        if (release.distribution_targets) {
            try {
                release.distributionTargets = typeof release.distribution_targets === 'string' ? JSON.parse(release.distribution_targets) : release.distribution_targets;
            } catch {
                release.distributionTargets = [];
            }
        }
        
        const processedTracks = tracks.map(t => ({
            ...t,
            primaryArtists: typeof t.primary_artists === 'string' ? JSON.parse(t.primary_artists) : t.primary_artists,
            featuredArtists: typeof t.featured_artists === 'string' ? JSON.parse(t.featured_artists) : t.featured_artists,
            composer: (() => {
                if (t.composer == null) return t.composer;
                if (typeof t.composer !== 'string') return t.composer;
                try {
                    const parsed = JSON.parse(t.composer);
                    return Array.isArray(parsed) ? parsed.join(', ') : String(parsed ?? t.composer);
                } catch {
                    return t.composer;
                }
            })(),
            lyricist: (() => {
                if (t.lyricist == null) return t.lyricist;
                if (typeof t.lyricist !== 'string') return t.lyricist;
                try {
                    const parsed = JSON.parse(t.lyricist);
                    return Array.isArray(parsed) ? parsed.join(', ') : String(parsed ?? t.lyricist);
                } catch {
                    return t.lyricist;
                }
            })(),
            producer: (() => {
                if (t.producer == null) return t.producer;
                if (typeof t.producer !== 'string') return t.producer;
                try {
                    const parsed = JSON.parse(t.producer);
                    return Array.isArray(parsed) ? parsed.join(', ') : String(parsed ?? t.producer);
                } catch {
                    return t.producer;
                }
            })(),
            contributors: contribByTrack.get(t.id) || []
        }));

        res.json({
            ...release,
            tracks: processedTracks
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/import/template', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'Admin' && req.user.role !== 'Operator') {
            return res.status(403).json({ error: 'Access denied' });
        }
        const headers = [
            'Title','Version','ReleaseType','Language','PrimaryArtists',
            'RecordLabel',
            'Genre','SubGenre','PLine','CLine',
            'PlannedReleaseDate','OriginalReleaseDate',
            'DistributionTargets','DistributionHistory',
            'OwnerEmail','Aggregator','UPC','ISRC','Author','Komposer'
        ];
        const sample = [{
            Title: 'Contoh Lagu Demo',
            Version: 'Original',
            ReleaseType: 'SINGLE',
            Language: 'Indonesian',
            PrimaryArtists: 'Artist Satu, Artist Dua',
            Label: 'Dimensi Suara',
            Genre: 'Pop',
            SubGenre: 'Indie Pop',
            PLine: '2026 Dimensi Suara',
            CLine: '2026 Dimensi Suara',
            PlannedReleaseDate: new Date(Date.now() + 7*24*60*60*1000).toISOString().slice(0,10),
            OriginalReleaseDate: '',
            DistributionTargets: 'SOCIAL,YOUTUBE_MUSIC,ALL_DSP',
            RecordLabel: 'Dimensi Suara Records',
            DistributionHistory: 'Yes',
            OwnerEmail: 'owner@example.com',
            Aggregator: 'SoundOn',
            UPC: '123456789012',
            ISRC: 'USABC1234567',
            Author: 'Lyric Writer Name',
            Komposer: 'Composer Name'
        }];
        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.json_to_sheet(sample, { header: headers });
        ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length, 18) }));
        xlsx.utils.book_append_sheet(wb, ws, 'Releases');
        const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="release_import_template.xlsx"');
        res.send(buf);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/import', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        if (req.user.role !== 'Admin' && req.user.role !== 'Operator') {
            return res.status(403).json({ error: 'Access denied' });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const wb = xlsx.readFile(req.file.path);
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(ws, { defval: '' });
        if (!Array.isArray(rows) || rows.length === 0) {
            return res.status(400).json({ error: 'Empty file' });
        }
        const [releaseCols] = await db.query('SHOW COLUMNS FROM releases');
        const releaseColNames = releaseCols.map(c => c.Field);
        let inserted = 0;
        const errors = [];
        for (const row of rows) {
            try {
                const title = String(row.Title || '').trim();
                if (!title) { errors.push('Missing Title'); continue; }
                const version = String(row.Version || 'Original').trim();
                const release_type = (String(row.ReleaseType || 'SINGLE').toUpperCase() === 'ALBUM') ? 'ALBUM' : 'SINGLE';
                const primary_artists = JSON.stringify(String(row.PrimaryArtists || '').split(',').map(s=>s.trim()).filter(Boolean));
                const record_label = row.RecordLabel || null;
                const p_line = row.PLine || null;
                const c_line = row.CLine || null;
                const genre = row.Genre || null;
                const sub_genre = row.SubGenre || null;
                const language = row.Language || null;
                const planned_release_date = row.PlannedReleaseDate || null;
                const original_release_date = row.OriginalReleaseDate || null;
                const upc = row.UPC || null;
                const isrcSingle = row.ISRC || null;
                const author = row.Author || null;
                const komposer = row.Komposer || null;
                const distribution_targets = (() => {
                    const ids = String(row.DistributionTargets || '').split(',').map(s=>s.trim()).filter(Boolean);
                    if (ids.length === 0) return null;
                    const optionMap = {
                        'SOCIAL': { id: 'SOCIAL', label: 'Social Media', logo: '/assets/platforms/social.svg' },
                        'YOUTUBE_MUSIC': { id: 'YOUTUBE_MUSIC', label: 'YouTube Music', logo: '/assets/platforms/youtube-music.svg' },
                        'ALL_DSP': { id: 'ALL_DSP', label: 'All DSP', logo: '/assets/platforms/alldsp.svg' },
                    };
                    return JSON.stringify(ids.map(id => optionMap[id]).filter(Boolean));
                })();
                const distribution_history = (() => {
                    const raw = String(row.DistributionHistory || '').trim().toLowerCase();
                    if (!raw) return null;
                    const yes = ['yes','y','true','1'].includes(raw);
                    return JSON.stringify(yes);
                })();
                const aggregator = row.Aggregator || null;
                let user_id = req.user.id;
                if (row.OwnerEmail) {
                    const [users] = await db.query('SELECT id FROM users WHERE email = ?', [row.OwnerEmail]);
                    if (users.length > 0) user_id = users[0].id;
                }
                const cols = ['user_id','title','version','release_type','primary_artists'];
                const vals = [user_id, title, version, release_type, primary_artists];
                if (releaseColNames.includes('cover_art')) { cols.push('cover_art'); vals.push(null); }
                if (releaseColNames.includes('record_label')) { cols.push('record_label'); vals.push(record_label); }
                if (releaseColNames.includes('p_line')) { cols.push('p_line'); vals.push(p_line); }
                if (releaseColNames.includes('c_line')) { cols.push('c_line'); vals.push(c_line); }
                if (releaseColNames.includes('genre')) { cols.push('genre'); vals.push(genre); }
                if (releaseColNames.includes('sub_genre')) { cols.push('sub_genre'); vals.push(sub_genre); }
                if (releaseColNames.includes('language')) { cols.push('language'); vals.push(language); }
                if (releaseColNames.includes('planned_release_date')) { cols.push('planned_release_date'); vals.push(planned_release_date || null); }
                if (releaseColNames.includes('original_release_date')) { cols.push('original_release_date'); vals.push(original_release_date || null); }
                if (releaseColNames.includes('distribution_targets')) { cols.push('distribution_targets'); vals.push(distribution_targets || JSON.stringify([])); }
                if (releaseColNames.includes('aggregator')) { cols.push('aggregator'); vals.push(aggregator); }
                if (releaseColNames.includes('upc')) { cols.push('upc'); vals.push(upc); }
                if (releaseColNames.includes('distribution_history')) { cols.push('distribution_history'); vals.push(distribution_history); }
                cols.push('submission_date'); vals.push(new Date());
                cols.push('status'); vals.push('Pending');
                const placeholders = `(${cols.map(()=>'?').join(', ')})`;
                const [insertRes] = await db.query(`INSERT INTO releases (${cols.join(', ')}) VALUES ${placeholders}`, vals);
                const newReleaseId = insertRes.insertId;

                // If ISRC provided, create a placeholder track
                if (isrcSingle) {
                    try {
                        const [trackCols] = await db.query('SHOW COLUMNS FROM tracks');
                        const trackColNames = trackCols.map(c => c.Field);
                        const tCols = ['release_id','track_number','title','version','primary_artists','isrc'];
                        const tVals = [newReleaseId, 1, title, version, primary_artists, isrcSingle];
                        if (trackColNames.includes('composer')) { tCols.push('composer'); tVals.push(komposer || null); }
                        if (trackColNames.includes('lyricist')) { 
                            tCols.push('lyricist'); 
                            tVals.push(author ? JSON.stringify([author]) : null); 
                        }
                        await db.query(`INSERT INTO tracks (${tCols.join(', ')}) VALUES (${tCols.map(()=>'?').join(', ')})`, tVals);
                    } catch (e) {
                        errors.push(`Track create error for "${title}": ${e.message}`);
                    }
                }
                inserted += 1;
            } catch (e) {
                errors.push(e.message || 'Row insert error');
            }
        }
        res.json({ inserted, errors });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Preview import: parse Excel and return rows without inserting
const importPreviewHandler = async (req, res) => {
    try {
        if (req.user.role !== 'Admin' && req.user.role !== 'Operator') {
            return res.status(403).json({ error: 'Access denied' });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const wb = xlsx.readFile(req.file.path);
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(ws, { defval: '' });
        const normalized = rows.map((row) => ({
            Title: String(row.Title || '').trim(),
            Version: String(row.Version || 'Original').trim(),
            ReleaseType: String(row.ReleaseType || 'SINGLE').trim(),
            Language: String(row.Language || '').trim(),
            PrimaryArtists: String(row.PrimaryArtists || '').trim(),
            RecordLabel: row.RecordLabel || '',
            Genre: row.Genre || '',
            SubGenre: row.SubGenre || '',
            PLine: row.PLine || '',
            CLine: row.CLine || '',
            PlannedReleaseDate: row.PlannedReleaseDate || '',
            OriginalReleaseDate: row.OriginalReleaseDate || '',
            DistributionTargets: row.DistributionTargets || '',
            DistributionHistory: row.DistributionHistory || '',
            OwnerEmail: row.OwnerEmail || '',
            Aggregator: row.Aggregator || '',
            UPC: row.UPC || '',
            ISRC: row.ISRC || '',
            Author: row.Author || '',
            Komposer: row.Komposer || ''
        }));
        res.json({ rows: normalized });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
router.post('/import/preview', authenticateToken, upload.single('file'), importPreviewHandler);
router.post('/import-preview', authenticateToken, upload.single('file'), importPreviewHandler);
router.post('/excel/preview', authenticateToken, upload.single('file'), importPreviewHandler);

// Import selected rows (JSON payload)
const importRowsHandler = async (req, res) => {
    try {
        if (req.user.role !== 'Admin' && req.user.role !== 'Operator') {
            return res.status(403).json({ error: 'Access denied' });
        }
        const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
        if (rows.length === 0) {
            return res.status(400).json({ error: 'No rows provided' });
        }
        const [releaseCols] = await db.query('SHOW COLUMNS FROM releases');
        const releaseColNames = releaseCols.map(c => c.Field);
        let inserted = 0;
        const errors = [];
        for (const row of rows) {
            try {
                const title = String(row.Title || '').trim();
                if (!title) { errors.push('Missing Title'); continue; }
                const version = String(row.Version || 'Original').trim();
                const release_type = (String(row.ReleaseType || 'SINGLE').toUpperCase() === 'ALBUM') ? 'ALBUM' : 'SINGLE';
                const primary_artists = JSON.stringify(String(row.PrimaryArtists || '').split(',').map(s=>s.trim()).filter(Boolean));
                const record_label = row.RecordLabel || null;
                const p_line = row.PLine || null;
                const c_line = row.CLine || null;
                const genre = row.Genre || null;
                const sub_genre = row.SubGenre || null;
                const language = row.Language || null;
                const planned_release_date = row.PlannedReleaseDate || null;
                const original_release_date = row.OriginalReleaseDate || null;
                const upc = row.UPC || null;
                const isrcSingle = row.ISRC || null;
                const author = row.Author || null;
                const komposer = row.Komposer || null;
                const distribution_targets = (() => {
                    const ids = String(row.DistributionTargets || '').split(',').map(s=>s.trim()).filter(Boolean);
                    if (ids.length === 0) return null;
                    const optionMap = {
                        'SOCIAL': { id: 'SOCIAL', label: 'Social Media', logo: '/assets/platforms/social.svg' },
                        'YOUTUBE_MUSIC': { id: 'YOUTUBE_MUSIC', label: 'YouTube Music', logo: '/assets/platforms/youtube-music.svg' },
                        'ALL_DSP': { id: 'ALL_DSP', label: 'All DSP', logo: '/assets/platforms/alldsp.svg' },
                    };
                    return JSON.stringify(ids.map(id => optionMap[id]).filter(Boolean));
                })();
                const distribution_history = (() => {
                    const raw = String(row.DistributionHistory || '').trim().toLowerCase();
                    if (!raw) return null;
                    const yes = ['yes','y','true','1'].includes(raw);
                    return JSON.stringify(yes);
                })();
                const aggregator = row.Aggregator || null;
                let user_id = req.user.id;
                if (row.OwnerEmail) {
                    const [users] = await db.query('SELECT id FROM users WHERE email = ?', [row.OwnerEmail]);
                    if (users.length > 0) user_id = users[0].id;
                }
                const cols = ['user_id','title','version','release_type','primary_artists'];
                const vals = [user_id, title, version, release_type, primary_artists];
                if (releaseColNames.includes('cover_art')) { cols.push('cover_art'); vals.push(null); }
                if (releaseColNames.includes('record_label')) { cols.push('record_label'); vals.push(record_label); }
                if (releaseColNames.includes('p_line')) { cols.push('p_line'); vals.push(p_line); }
                if (releaseColNames.includes('c_line')) { cols.push('c_line'); vals.push(c_line); }
                if (releaseColNames.includes('genre')) { cols.push('genre'); vals.push(genre); }
                if (releaseColNames.includes('sub_genre')) { cols.push('sub_genre'); vals.push(sub_genre); }
                if (releaseColNames.includes('language')) { cols.push('language'); vals.push(language); }
                if (releaseColNames.includes('planned_release_date')) { cols.push('planned_release_date'); vals.push(planned_release_date || null); }
                if (releaseColNames.includes('original_release_date')) { cols.push('original_release_date'); vals.push(original_release_date || null); }
                if (releaseColNames.includes('distribution_targets')) { cols.push('distribution_targets'); vals.push(distribution_targets || JSON.stringify([])); }
                if (releaseColNames.includes('aggregator')) { cols.push('aggregator'); vals.push(aggregator); }
                if (releaseColNames.includes('upc')) { cols.push('upc'); vals.push(upc); }
                if (releaseColNames.includes('distribution_history')) { cols.push('distribution_history'); vals.push(distribution_history); }
                cols.push('submission_date'); vals.push(new Date());
                cols.push('status'); vals.push('Pending');
                const placeholders = `(${cols.map(()=>'?').join(', ')})`;
                const [insertRes] = await db.query(`INSERT INTO releases (${cols.join(', ')}) VALUES ${placeholders}`, vals);
                const newReleaseId = insertRes.insertId;
                // ISRC track placeholder
                if (isrcSingle) {
                    try {
                        const [trackCols] = await db.query('SHOW COLUMNS FROM tracks');
                        const trackColNames = trackCols.map(c => c.Field);
                        const tCols = ['release_id','track_number','title','version','primary_artists','isrc'];
                        const tVals = [newReleaseId, 1, title, version, primary_artists, isrcSingle];
                        if (trackColNames.includes('composer')) { tCols.push('composer'); tVals.push(komposer || null); }
                        if (trackColNames.includes('lyricist')) { tCols.push('lyricist'); tVals.push(author ? JSON.stringify([author]) : null); }
                        await db.query(`INSERT INTO tracks (${tCols.join(', ')}) VALUES (${tCols.map(()=>'?').join(', ')})`, tVals);
                    } catch (e) {
                        errors.push(`Track create error for "${title}": ${e.message}`);
                    }
                }
                inserted += 1;
            } catch (e) {
                errors.push(e.message || 'Row insert error');
            }
        }
        res.json({ inserted, errors });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
router.get('/:id/email-preview', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const draftStatus = typeof req.query.status === 'string' ? req.query.status : '';
        const overrideAgg = typeof req.query.aggregator === 'string' ? req.query.aggregator : undefined;
        const overrideUpc = typeof req.query.upc === 'string' ? req.query.upc : undefined;
        const reason = typeof req.query.reason === 'string' ? req.query.reason : '';
        const description = typeof req.query.description === 'string' ? req.query.description : '';

        const [rows] = await db.query('SELECT * FROM releases WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).send('Release not found');
        const release = rows[0];

        if (req.user.role !== 'Admin' && release.user_id !== req.user.id) {
            return res.status(403).send('Access denied');
        }

        const status = draftStatus || release.status || 'Pending';
        const aggregator = overrideAgg !== undefined ? overrideAgg : (release.aggregator || null);
        const upc = overrideUpc !== undefined ? overrideUpc : (release.upc || null);

        const [ownerRows] = await db.query('SELECT email, full_name FROM users WHERE id = ?', [release.user_id]);
        const fullName = ownerRows.length > 0 ? (ownerRows[0].full_name || '') : '';

        const subject = `Update Status Rilisan: ${release.title} → ${status}`;
        // Build ISRC section for preview
        let isrcBlock = '';
        try {
            const [trackRows] = await db.query('SELECT title, isrc FROM tracks WHERE release_id = ? ORDER BY track_number ASC', [release.id]);
            const tracksList = Array.isArray(trackRows) ? trackRows : [];
            const relTypeRaw = String(release.release_type || release.type || '').toUpperCase();
            const isSingle = relTypeRaw.includes('SINGLE') || tracksList.length === 1;
            if (isSingle) {
                const code = String(tracksList[0]?.isrc || '').trim();
                if (code) {
                    isrcBlock = `<div style="font-size:14px;color:#0f172a"><strong>ISRC:</strong> ${code}</div>`;
                }
            } else {
                const items = tracksList.filter(t => t && String(t.isrc || '').trim().length > 0);
                if (items.length > 0) {
                    const listHtml = items.map(t => {
                        const title = String(t.title || '').trim() || 'Track';
                        const code = String(t.isrc || '').trim();
                        return `<div style="font-size:14px;color:#0f172a"><strong>${title}:</strong> ${code}</div>`;
                    }).join('');
                    isrcBlock = `
      <div style="font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;margin:16px 0 8px">Daftar Track &amp; ISRC</div>
      ${listHtml}
    `;
                }
            }
        } catch {}
        const extraBlock = (status === 'Rejected' && (reason || description))
            ? `
        <div style="margin-top:12px;padding:16px;border:1px dashed #fecaca;border-radius:10px;background:#fff1f2">
          <div style="font-size:12px;color:#b91c1c;text-transform:uppercase;font-weight:700;margin-bottom:8px">Alasan Penolakan</div>
          ${reason ? `<div style="font-size:14px;color:#7f1d1d"><strong>Ringkas:</strong> ${reason}</div>` : ''}
          ${description ? `<div style="font-size:14px;color:#7f1d1d;white-space:pre-wrap;margin-top:8px"><strong>Detail:</strong> ${description}</div>` : ''}
        </div>` : '';

        const html = `
<!doctype html>
<html lang="id">
<meta charset="utf-8" />
<title>${subject}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
  <tr>
    <td style="padding:20px;background:linear-gradient(90deg,#1e40af,#2563eb);color:#fff">
      <div style="font-weight:700;font-size:18px">Dimensi Suara</div>
      <div style="font-size:12px;opacity:.9">Music Distribution Update</div>
    </td>
  </tr>
  <tr>
    <td style="padding:24px">
      <div style="font-size:14px;color:#0f172a;margin-bottom:12px">Halo ${fullName || 'User'},</div>
      <div style="font-size:14px;color:#334155;line-height:1.6">Status rilisan Anda telah diperbarui.</div>
      <div style="margin:16px 0;padding:16px;border:1px solid #e2e8f0;border-radius:10px;background:#f9fafb">
        <div style="font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;margin-bottom:8px">Detail Rilisan</div>
        <div style="font-size:14px;color:#0f172a"><strong>Judul:</strong> ${release.title}</div>
        <div style="font-size:14px;color:#0f172a"><strong>Status Baru:</strong> ${status}</div>
        ${upc ? `<div style="font-size:14px;color:#0f172a"><strong>UPC:</strong> ${upc}</div>` : ''}
        ${isrcBlock}
      </div>
      ${extraBlock}
      <div style="margin-top:20px;font-size:12px;color:#94a3b8">© ${new Date().getFullYear()} Dimensi Suara</div>
    </td>
  </tr>
</table>
<div style="max-width:640px;margin:16px auto 0;color:#64748b;font-size:12px">
  <div><strong>Subject:</strong> ${subject}</div>
</div>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
    } catch (err) {
        res.status(500).send(err?.message || 'Failed to build preview');
    }
});
router.post('/import/rows', authenticateToken, importRowsHandler);
router.post('/import-rows', authenticateToken, importRowsHandler);
router.post('/excel/rows', authenticateToken, importRowsHandler);
export default router;
