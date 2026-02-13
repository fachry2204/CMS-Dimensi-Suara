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
// import publishingRoutes from './routes/publishingRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import userRoutes from './routes/userRoutes.js';

import { initDb } from './init-db.js';

// ESM __dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
dotenv.config({ path: path.join(__dirname, '../.env') });

// Fix for some environments where process.env might be undefined for some keys
const PORT = process.env.PORT || 3000;

// Run Database Migration on Startup
initDb().then(() => {
    console.log('Database migration check completed.');
}).catch(err => {
    console.error('Database migration check failed:', err);
});

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global Error Handler for JSON parsing errors
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        console.error('Bad JSON:', err.message);
        return res.status(400).json({ error: 'Invalid JSON format' });
    }
    next();
});

// Static Files (Serve the React Frontend)
// Serve from "public" (Vite outDir) at the project root
const distPath = path.join(__dirname, '../public');
app.use(express.static(distPath));

// Serve Uploads
const uploadsPath = path.join(__dirname, '../uploads');
console.log("Serving uploads from:", uploadsPath);
app.use('/uploads', express.static(uploadsPath));
// Prevent SPA fallback for missing images
app.use('/uploads', (req, res) => {
    res.status(404).send('Image not found');
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/releases', releaseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/songwriters', songwriterRoutes);
// app.use('/api/publishing', publishingRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);

// Test Database Connection Route
app.get('/api/health', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT 1 as val');
        res.json({ status: 'OK', db: 'Connected', val: rows[0].val });
    } catch (err) {
        console.error('Database Health Check Failed:', err);
        res.status(500).json({ status: 'Error', error: err.message });
    }
});

// API 404 Handler (Must be after all API routes)
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: `API endpoint ${req.method} ${req.originalUrl} not found` });
});

// Catch-All Route for SPA (Must be last)
app.get('*', (req, res) => {
    // If request starts with /api, return 404 JSON immediately
    if (req.originalUrl.startsWith('/api')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }

    // Otherwise send index.html for React Router to handle
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
        if (err) {
            console.error('Error sending index.html:', err);
            res.status(500).send('Error loading application.');
        }
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📂 Serving static files from: ${distPath}`);
});

// Handle Uncaught Exceptions to prevent crash without logging
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
    // Keep running if possible, or exit gracefully
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION:', reason);
});
