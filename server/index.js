import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import releaseRoutes from './routes/releaseRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import songwriterRoutes from './routes/songwriterRoutes.js';
import publishingRoutes from './routes/publishingRoutes.js';

// Configuration
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// ESM __dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static Files (Serve the React Frontend)
// Assuming "dist" is in the project root (one level up from server/)
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/releases', releaseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/songwriters', songwriterRoutes);
app.use('/api/publishing', publishingRoutes);

// Test Database Connection Route
app.get('/api/health', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT 1 as val');
        res.json({ status: 'OK', db: 'Connected', val: rows[0].val });
    } catch (err) {
        res.status(500).json({ status: 'Error', error: err.message });
    }
});

// Catch-All Route for SPA (Must be last)
app.get('*', (req, res) => {
    // If request starts with /api, return 404 JSON immediately
    if (req.originalUrl.startsWith('/api')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }

    // Otherwise send index.html for React Router to handle
    res.sendFile(path.join(distPath, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
