import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from '../config/db.js';
import { spawn } from 'child_process';
import { authenticateToken } from '../middleware/authMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const sanitizeName = (s) => String(s || '').replace(/[/\\?%*:|"<>]/g, '_').replace(/\s+/g, ' ').trim();

// Configure Multer for Audio and Cover Art
// Ensure directories exist
const UPLOADS_ROOT = path.join(__dirname, '../../uploads');
const RELEASES_DIR = path.join(UPLOADS_ROOT, 'releases');
const TMP_DIR = path.join(UPLOADS_ROOT, 'tmp');

if (!fs.existsSync(RELEASES_DIR)) {
    fs.mkdirSync(RELEASES_DIR, { recursive: true });
}
if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Organize by user/release-title if possible, or just flat/date-based
        // To keep it simple and avoid collision, use timestamp
        cb(null, RELEASES_DIR);
    },
    filename: (req, file, cb) => {
        let artist = 'Unknown_Artist';
        let title = 'Untitled_Release';
        try {
            if (req.body && typeof req.body.data === 'string') {
                const payload = JSON.parse(req.body.data);
                const primaryArtist = (Array.isArray(payload.primaryArtists) && payload.primaryArtists[0]) ? payload.primaryArtists[0] : 'Unknown_Artist';
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
        cb(null, TMP_DIR);
    },
    filename: (req, file, cb) => {
        let artist = 'Unknown_Artist';
        let title = 'Untitled_Release';
        try {
            if (req.body && typeof req.body.data === 'string') {
                const payload = JSON.parse(req.body.data);
                const primaryArtist = (Array.isArray(payload.primaryArtists) && payload.primaryArtists[0]) ? payload.primaryArtists[0] : 'Unknown_Artist';
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

router.post('/upload', authenticateToken, upload.any(), async (req, res) => {
    try {
        const releaseData = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
        const primaryArtist = (Array.isArray(releaseData.primaryArtists) && releaseData.primaryArtists[0]) ? releaseData.primaryArtists[0] : 'Unknown_Artist';
        const artistDirName = sanitizeName(primaryArtist).substring(0, 80) || 'Unknown_Artist';
        const releaseDirName = sanitizeName(releaseData.title).substring(0, 80) || 'Untitled_Release';
        const targetDir = path.join(RELEASES_DIR, artistDirName, releaseDirName);
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

        const files = Array.isArray(req.files) ? req.files : [];
        const paths = {};
        for (const f of files) {
            const destName = f.filename;
            const destPath = path.join(targetDir, destName);
            if (f.path !== destPath) {
                fs.renameSync(f.path, destPath);
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
router.post('/upload-tmp', authenticateToken, uploadTmp.any(), async (req, res) => {
    try {
        const releaseData = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
        const userId = req.user.id;
        const primaryArtist = (Array.isArray(releaseData.primaryArtists) && releaseData.primaryArtists[0]) ? releaseData.primaryArtists[0] : 'Unknown_Artist';
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
                fs.renameSync(f.path, destPath);
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
router.post('/upload-tmp-chunk', authenticateToken, uploadTmpChunk.single('chunk'), async (req, res) => {
    try {
        const releaseData = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
        const userId = req.user.id;
        const primaryArtist = (Array.isArray(releaseData.primaryArtists) && releaseData.primaryArtists[0]) ? releaseData.primaryArtists[0] : 'Unknown_Artist';
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
        const primaryArtist = (Array.isArray(primaryArtists) && primaryArtists[0]) ? primaryArtists[0] : 'Unknown_Artist';
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

router.post('/', authenticateToken, upload.any(), async (req, res) => {
    try {
        // Parse JSON payload from 'data' field when using multipart/form-data
        const releaseData = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
        const userId = req.user.id;
        const isUpdate = !!releaseData.id;

        const primaryArtist = (Array.isArray(releaseData.primaryArtists) && releaseData.primaryArtists[0]) ? releaseData.primaryArtists[0] : 'Unknown_Artist';
        const artistDirName = sanitizeName(primaryArtist).substring(0, 80) || 'Unknown_Artist';
        const releaseDirName = sanitizeName(releaseData.title).substring(0, 80) || 'Untitled_Release';
        const targetDir = path.join(RELEASES_DIR, artistDirName, releaseDirName);
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

        // Move uploaded files into targetDir and collect public paths
        const files = Array.isArray(req.files) ? req.files : [];
        const pathMap = {};
        for (const f of files) {
            const destName = f.filename;
            const destPath = path.join(targetDir, destName);
            if (f.path !== destPath) {
                fs.renameSync(f.path, destPath);
            }
            const publicPath = `/uploads/releases/${artistDirName}/${releaseDirName}/${destName}`;
            pathMap[f.fieldname] = publicPath;
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
                            const outName = `${baseName}-track${trackIdx}.wav`;
                            const outAbs = path.join(targetDir, outName);
                            // Ensure targetDir exists
                            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
                            // Convert using ffmpeg
                            await runFfmpegConvert(absTmp, outAbs, {});
                            // Delete original tmp file
                            try { fs.unlinkSync(absTmp); } catch {}
                            audioPath = `/uploads/releases/${artistDirName}/${releaseDirName}/${outName}`;
                        }
                    }
                    if (tmpClipSource) {
                        const absTmp = resolveTmpAbs(tmpClipSource);
                        if (absTmp && fs.existsSync(absTmp)) {
                            const outName = `${baseName}-track${trackIdx}-clip.wav`;
                            const outAbs = path.join(targetDir, outName);
                            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
                            const startSec = Number(t.previewStart || 0);
                            await runFfmpegConvert(absTmp, outAbs, { startSec, durationSec: 60 });
                            try { fs.unlinkSync(absTmp); } catch {}
                            clipPath = `/uploads/releases/${artistDirName}/${releaseDirName}/${outName}`;
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

        if (isUpdate) {
            const [rows] = await db.query('SELECT * FROM releases WHERE id = ?', [releaseData.id]);
            if (rows.length === 0) {
                return res.status(404).json({ error: 'Release not found' });
            }
            const existingRelease = rows[0];
            if (req.user.role === 'User' && existingRelease.user_id !== userId) {
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
        } else {
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
                    track.lyricist || null,
                    track.producer || null,
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
        try {
            const userIdStr = String(userId);
            const tmpTargetDir = path.join(TMP_DIR, userIdStr, artistDirName, releaseDirName);
            if (fs.existsSync(tmpTargetDir)) {
                fs.rmSync(tmpTargetDir, { recursive: true, force: true });
            }
        } catch (e) {
            console.warn('Cleanup tmp after finalize failed:', e.message || e);
        }

        res.status(isUpdate ? 200 : 201).json({ message: isUpdate ? 'Release updated successfully' : 'Release submitted successfully', id: releaseId });

    } catch (err) {
        console.error("Create Release Error:", err);
        res.status(500).json({ error: err.message });
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
        if (req.user.role === 'User' && rel.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }
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
        let deleteWhere = 'id = ?';
        const deleteParams = [releaseId];
        if (req.user.role === 'User') {
            deleteWhere += ' AND user_id = ?';
            deleteParams.push(req.user.id);
        }
        await db.query(`DELETE FROM releases WHERE ${deleteWhere}`, deleteParams);
        res.json({ message: 'Release deleted' });
    } catch (err) {
        console.error('Delete Release Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET MY RELEASES
router.get('/', authenticateToken, async (req, res) => {
    try {
        let query = 'SELECT * FROM releases';
        const params = [];

        if (req.user.role === 'User') {
            query += ' WHERE user_id = ?';
            params.push(req.user.id);
        }

        query += ' ORDER BY submission_date DESC';

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

            return {
                id: r.id,
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

        if (req.user.role === 'User' && release.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

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
        if (req.user.role === 'User' && release.user_id !== req.user.id) {
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

export default router;
