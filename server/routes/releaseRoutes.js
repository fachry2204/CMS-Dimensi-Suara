import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from '../config/db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure Multer for Audio and Cover Art
// Ensure directories exist
const UPLOADS_ROOT = path.join(__dirname, '../../uploads');
const RELEASES_DIR = path.join(UPLOADS_ROOT, 'releases');

if (!fs.existsSync(RELEASES_DIR)) {
    fs.mkdirSync(RELEASES_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Organize by user/release-title if possible, or just flat/date-based
        // To keep it simple and avoid collision, use timestamp
        cb(null, RELEASES_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // Clean filename
        const cleanName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, `${file.fieldname}-${uniqueSuffix}-${cleanName}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit (adjust as needed for WAV)
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

router.post('/', authenticateToken, async (req, res) => {
    try {
        const releaseData = req.body;
        const userId = req.user.id;

        // --- DUPLICATE CHECK ---
        // Prevent double submission of the same release
        // Check if a pending release with same Title and Version exists for this user
        const [existing] = await db.query(
            'SELECT id FROM releases WHERE user_id = ? AND title = ? AND version = ? AND status != "Rejected"',
            [userId, releaseData.title, releaseData.version]
        );

        if (existing.length > 0) {
            // Return the existing one instead of creating duplicate
            // Or return error. Returning the existing ID is safer for idempotency.
            console.log(`Duplicate submission detected for ${releaseData.title}. Returning existing ID.`);
            return res.status(200).json({ 
                message: 'Release already exists', 
                id: existing[0].id,
                isDuplicate: true 
            });
        }
        // -----------------------

        // 1. Insert Release
        const [releaseResult] = await db.query(
            `INSERT INTO releases (
                user_id, title, version, release_type, 
                primary_artists, cover_art, label, 
                production_year, p_line, c_line, 
                genre, sub_genre, language, 
                upc, original_release_date, submission_date, 
                status, aggregator
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'Pending', ?)`,
            [
                userId,
                releaseData.title,
                releaseData.version,
                releaseData.type, // 'SINGLE' or 'ALBUM'
                JSON.stringify(releaseData.primaryArtists),
                releaseData.coverArt, // Path string
                releaseData.label,
                releaseData.productionYear,
                releaseData.pLine,
                releaseData.cLine,
                releaseData.genre,
                releaseData.subGenre,
                releaseData.language,
                releaseData.upc,
                releaseData.originalReleaseDate,
                releaseData.aggregator || null
            ]
        );

        const releaseId = releaseResult.insertId;

        // 2. Insert Tracks
        if (releaseData.tracks && releaseData.tracks.length > 0) {
            const trackValues = releaseData.tracks.map(track => [
                releaseId,
                track.trackNumber,
                track.title,
                track.version,
                JSON.stringify(track.primaryArtists),
                JSON.stringify(track.featuredArtists),
                track.audioFile, // Path string
                track.isrc,
                track.explicitLyrics,
                track.composer,
                track.lyricist,
                track.producer,
                track.genre,
                track.subGenre,
                track.previewStart
            ]);

            await db.query(
                `INSERT INTO tracks (
                    release_id, track_number, title, version, 
                    primary_artists, featured_artists, audio_file, 
                    isrc, explicit_lyrics, composer, 
                    lyricist, producer, genre, sub_genre, 
                    preview_start
                ) VALUES ?`,
                [trackValues]
            );
        }

        res.status(201).json({ message: 'Release submitted successfully', id: releaseId });

    } catch (err) {
        console.error("Create Release Error:", err);
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

        // Fetch tracks for each release (optional, or fetch on detail)
        // For list view, we might not need tracks, but the frontend type expects them?
        // Let's just return basic info + primary artists parsed
        
        const processedReleases = releases.map(r => {
            let parsedArtists = [];
            try {
                parsedArtists = typeof r.primary_artists === 'string' ? JSON.parse(r.primary_artists) : r.primary_artists;
            } catch (e) {
                parsedArtists = [r.primary_artists]; // Fallback
            }

            return {
                id: r.id,
                title: r.title,
                status: r.status,
                coverArt: r.cover_art,
                primaryArtists: parsedArtists,
                releaseDate: r.submission_date,
                submissionDate: r.submission_date,
                upc: r.upc,
                label: r.label,
                version: r.version,
                type: r.release_type,
                aggregator: r.aggregator,
                tracks: [] // Empty for list view to save bandwidth
            };
        });

        res.json(processedReleases);

    } catch (err) {
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

        // Parse JSON fields
        release.primaryArtists = typeof release.primary_artists === 'string' ? JSON.parse(release.primary_artists) : release.primary_artists;
        
        const processedTracks = tracks.map(t => ({
            ...t,
            primaryArtists: typeof t.primary_artists === 'string' ? JSON.parse(t.primary_artists) : t.primary_artists,
            featuredArtists: typeof t.featured_artists === 'string' ? JSON.parse(t.featured_artists) : t.featured_artists,
            contributors: [] // If you have a separate contributors table
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
