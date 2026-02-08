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

// Helper: Sanitize Folder Name
const sanitizeName = (name) => {
    return name.replace(/[^a-zA-Z0-9 \-_]/g, '').trim();
};

// GET ALL RELEASES
router.get('/', authenticateToken, async (req, res) => {
    try {
        let query = 'SELECT * FROM releases';
        const params = [];

        // If user is restricted (e.g. 'User' role), only show their own releases
        if (req.user.role === 'User') {
            query += ' WHERE user_id = ?';
            params.push(req.user.id);
        }

        query += ' ORDER BY created_at DESC';

        const [rows] = await db.query(query, params);
        
        // Fetch tracks for all releases
        // Optimization: Fetch all tracks for these releases in one go
        const releaseIds = rows.map(r => r.id);
        let tracksByRelease = {};

        if (releaseIds.length > 0) {
            const [trackRows] = await db.query('SELECT * FROM tracks WHERE release_id IN (?)', [releaseIds]);
            trackRows.forEach(t => {
                if (!tracksByRelease[t.release_id]) {
                    tracksByRelease[t.release_id] = [];
                }
                tracksByRelease[t.release_id].push({
                    ...t,
                    primaryArtists: typeof t.primary_artists === 'string' ? JSON.parse(t.primary_artists || '[]') : t.primary_artists,
                    writers: typeof t.writer === 'string' ? [t.writer] : t.writer, // Map writer string to array
                    composers: typeof t.composer === 'string' ? [t.composer] : t.composer, // Map composer string to array
                    producers: typeof t.producer === 'string' ? JSON.parse(t.producer || '[]') : t.producer,
                    explicitLyrics: t.explicit ? 'Yes' : 'No'
                });
            });
        }

        const releases = rows.map(r => {
            let parsedArtists = [];
            try {
                parsedArtists = typeof r.primary_artists === 'string' ? JSON.parse(r.primary_artists) : r.primary_artists;
            } catch (e) {
                parsedArtists = [];
            }
            // Ensure parsedArtists is an array
            if (!Array.isArray(parsedArtists)) parsedArtists = [];

            return {
                ...r,
                primaryArtists: parsedArtists,
                coverArt: r.cover_art, // Map to frontend expected prop
                tracks: tracksByRelease[r.id] || [] // Attach tracks
            };
        });
        res.json(releases);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CREATE RELEASE (With File Uploads)
router.post('/', authenticateToken, upload.any(), async (req, res) => {
    try {
        console.log('--- START CREATE RELEASE ---');
        console.log('Headers:', req.headers['content-type']);
        console.log('Files:', req.files);
        console.log('Body:', req.body);

        // 1. Parse Data
        // Frontend should send a 'data' field containing the JSON
        console.log('--- RAW BODY ---', req.body);
        let releaseData;
        try {
            releaseData = JSON.parse(req.body.data);
            console.log('--- PARSED DATA ---', releaseData);
        } catch (e) {
            console.error('JSON Parse Error:', e);
            console.error('Raw data content:', req.body.data);
            return res.status(400).json({ error: 'Invalid data format. Expected "data" JSON string.' });
        }

        const userId = req.user.id;
        const { title, upc, primaryArtists, ...otherData } = releaseData;
        const artistName = Array.isArray(releaseData.primaryArtists) ? releaseData.primaryArtists[0] : (releaseData.primaryArtists || 'Unknown');
        
        // 2. Prepare Target Directory
        const folderName = `${sanitizeName(artistName)} - ${sanitizeName(releaseData.title)}`; 
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
            (user_id, title, upc, primary_artists, label, genre, language, p_line, c_line, release_type, version, is_new_release, original_release_date, planned_release_date, status, submission_date, cover_art) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', NOW(), ?)`,
            [
                userId, 
                releaseData.title, 
                releaseData.upc, 
                JSON.stringify(releaseData.primaryArtists || []), 
                releaseData.label || null, 
                releaseData.genre || null, 
                releaseData.language || null, 
                releaseData.pLine || null, 
                releaseData.cLine || null, 
                releaseData.type || null, // release_type
                releaseData.version || null,
                releaseData.isNewRelease !== undefined ? releaseData.isNewRelease : null,
                releaseData.originalReleaseDate || null,
                releaseData.plannedReleaseDate || null,
                coverArtPath
            ]
        );
        const releaseId = result.insertId;

        // 5. Handle Tracks
        if (releaseData.tracks && Array.isArray(releaseData.tracks)) {
            for (let i = 0; i < releaseData.tracks.length; i++) {
                const track = releaseData.tracks[i];
                let audioPath = null;
                
                // Find corresponding audio file
                const audioFile = req.files.find(f => f.fieldname === `track_${i}_audio`);
                if (audioFile) {
                    const trackFilename = `track-${i + 1}-${sanitizeName(track.title)}${path.extname(audioFile.originalname)}`;
                    const trackPath = path.join(targetDir, trackFilename);
                    fs.renameSync(audioFile.path, trackPath);
                    audioPath = `/uploads/${folderName}/${trackFilename}`;
                }

                // Map frontend fields to backend fields
                const artists = track.artists || track.primaryArtists || [];
                const writers = track.writers || (track.lyricist ? [track.lyricist] : []);
                const composers = track.composers || (track.composer ? [track.composer] : []);
                const producers = track.producers || [];
                
                await db.query(
                    `INSERT INTO tracks 
                    (release_id, title, version, primary_artists, writer, composer, producer, isrc, explicit, audio_file, track_number, duration, genre, lyrics, contributors) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        releaseId, 
                        track.title, 
                        track.version || 'Original',
                        JSON.stringify(artists),
                        JSON.stringify(writers),
                        JSON.stringify(composers),
                        JSON.stringify(producers),
                        track.isrc,
                        track.explicitLyrics === 'Yes',
                        audioPath,
                        track.trackNumber || (i + 1).toString(),
                        track.duration || '00:00',
                        track.genre,
                        track.lyrics,
                        JSON.stringify(track.contributors || [])
                    ]
                );
            }
        }

        // 6. Send Notification to Admins
        try {
            // Find all admins
            const [admins] = await db.query("SELECT id FROM users WHERE role = 'Admin'");
            
            // Notification message
            const notifMessage = `New release submitted: "${releaseData.title}" by ${Array.isArray(releaseData.primaryArtists) ? releaseData.primaryArtists[0] : (releaseData.primaryArtists || 'Unknown')}`;
            
            // Insert notification for each admin
            for (const admin of admins) {
                await db.query(
                    'INSERT INTO notifications (user_id, type, message) VALUES (?, ?, ?)',
                    [admin.id, 'release_created', notifMessage]
                );
            }

            // Send Confirmation Notification to the Submitter
            await db.query(
                'INSERT INTO notifications (user_id, type, message) VALUES (?, ?, ?)',
                [userId, 'RELEASE_STATUS', `Your release "${title}" has been successfully submitted and is pending review.`]
            );

        } catch (notifErr) {
            console.error('Failed to send notifications:', notifErr);
            // Don't fail the request just because notification failed
        }

        res.status(201).json({ message: 'Release created successfully', id: releaseId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
