import express from 'express';
import db from '../config/db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Ensure Uploads Directory Exists
const UPLOADS_ROOT = path.join(__dirname, '../../uploads');
const TEMP_DIR = path.join(UPLOADS_ROOT, 'temp');

if (!fs.existsSync(UPLOADS_ROOT)) fs.mkdirSync(UPLOADS_ROOT, { recursive: true });
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// Configure Multer (Temp Storage)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, TEMP_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Database Initialization (Lazy)
const initTables = async () => {
    try {
        // Add cover_art to releases if not exists
        try {
            await db.query('SELECT cover_art FROM releases LIMIT 1');
        } catch (e) {
            await db.query('ALTER TABLE releases ADD COLUMN cover_art VARCHAR(255)');
            console.log('Added cover_art column to releases table');
        }

        // Create tracks table
        await db.query(`
            CREATE TABLE IF NOT EXISTS tracks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                release_id INT,
                title VARCHAR(255),
                version VARCHAR(100),
                primary_artists TEXT,
                writer TEXT,
                composer TEXT,
                producer TEXT,
                isrc VARCHAR(50),
                explicit BOOLEAN,
                audio_file VARCHAR(255),
                FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE
            )
        `);

        // Ensure columns exist (for existing tables)
        const trackColumns = [
            { name: 'version', type: 'VARCHAR(100)' },
            { name: 'writer', type: 'TEXT' },
            { name: 'composer', type: 'TEXT' },
            { name: 'producer', type: 'TEXT' },
            { name: 'audio_file', type: 'VARCHAR(255)' }
        ];

        for (const col of trackColumns) {
            try {
                await db.query(`SELECT ${col.name} FROM tracks LIMIT 1`);
            } catch (e) {
                try {
                    await db.query(`ALTER TABLE tracks ADD COLUMN ${col.name} ${col.type}`);
                    console.log(`Added ${col.name} column to tracks table`);
                } catch (alterErr) {
                    console.error(`Failed to add ${col.name} to tracks:`, alterErr.message);
                }
            }
        }
    } catch (err) {
        console.error('Table init error:', err);
    }
};
initTables();

// Helper: Sanitize Folder Name
const sanitizeName = (name) => {
    return name.replace(/[^a-zA-Z0-9 \-_]/g, '').trim();
};

// GET ALL RELEASES
router.get('/', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM releases ORDER BY created_at DESC');
        const releases = rows.map(r => ({
            ...r,
            primary_artists: typeof r.primary_artists === 'string' ? JSON.parse(r.primary_artists) : r.primary_artists,
            coverArt: r.cover_art // Map to frontend expected prop
        }));
        res.json(releases);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CREATE RELEASE (With File Uploads)
router.post('/', authenticateToken, upload.any(), async (req, res) => {
    try {
        // 1. Parse Data
        // Frontend should send a 'data' field containing the JSON
        let releaseData;
        try {
            releaseData = JSON.parse(req.body.data);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid data format. Expected "data" JSON string.' });
        }

        const userId = req.user.id;
        const { title, upc, primaryArtists, ...otherData } = releaseData;
        const artistName = Array.isArray(primaryArtists) ? primaryArtists[0] : (primaryArtists || 'Unknown');
        
        // 2. Prepare Target Directory
        const folderName = `${sanitizeName(artistName)} - ${sanitizeName(title)}`;
        const targetDir = path.join(UPLOADS_ROOT, folderName);
        
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        // 3. Handle Cover Art
        let coverArtPath = null;
        const coverFile = req.files.find(f => f.fieldname === 'coverArt');
        if (coverFile) {
            const newFilename = `cover${path.extname(coverFile.originalname)}`;
            const newPath = path.join(targetDir, newFilename);
            fs.renameSync(coverFile.path, newPath);
            coverArtPath = `/uploads/${folderName}/${newFilename}`; // Web-accessible path
        }

        // 4. Insert Release
        const [result] = await db.query(
            `INSERT INTO releases 
            (user_id, title, upc, primary_artists, status, submission_date, cover_art) 
            VALUES (?, ?, ?, ?, 'Pending', NOW(), ?)`,
            [userId, title, upc, JSON.stringify(primaryArtists || []), coverArtPath]
        );
        const releaseId = result.insertId;

        // 5. Handle Tracks
        if (releaseData.tracks && Array.isArray(releaseData.tracks)) {
            for (let i = 0; i < releaseData.tracks.length; i++) {
                const track = releaseData.tracks[i];
                let audioPath = null;
                
                // Find corresponding audio file
                // Expecting fieldname "track_0_audio", "track_1_audio", etc.
                const trackFile = req.files.find(f => f.fieldname === `track_${i}_audio`);
                
                if (trackFile) {
                    const safeTrackTitle = sanitizeName(track.title);
                    const newFilename = `${i + 1}. ${safeTrackTitle}${path.extname(trackFile.originalname)}`;
                    const newPath = path.join(targetDir, newFilename);
                    fs.renameSync(trackFile.path, newPath);
                    audioPath = `/uploads/${folderName}/${newFilename}`;
                }

                await db.query(
                    `INSERT INTO tracks 
                    (release_id, title, version, primary_artists, writer, composer, producer, isrc, explicit, audio_file) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        releaseId, 
                        track.title, 
                        track.version || '', // Frontend might not send version yet
                        JSON.stringify(track.artists || []), // Use 'artists' from frontend (mapped to primary_artists)
                        track.lyricist || '', // Map lyricist to writer
                        track.composer || '', // Map composer to composer
                        JSON.stringify(track.contributors?.filter(c => c.type === 'Producer') || []), // Extract producers
                        track.isrc,
                        track.explicitLyrics === 'Yes' ? 1 : 0, // Frontend uses 'Yes'/'No'/'Clean'
                        audioPath
                    ]
                );
            }
        }
        
        // Cleanup: Remove any temp files that weren't moved (optional, but good practice)
        // (In this logic, we moved the files we needed. Any extra files in req.files should be deleted)
        req.files.forEach(f => {
            if (fs.existsSync(f.path)) {
                fs.unlinkSync(f.path);
            }
        });

        res.status(201).json({ message: 'Release created successfully', id: releaseId });

    } catch (err) {
        console.error("Release Upload Error:", err);
        // Cleanup temp files on error
        if (req.files) {
            req.files.forEach(f => {
                if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
            });
        }
        res.status(500).json({ error: err.message });
    }
});

export default router;
