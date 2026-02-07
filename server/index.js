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

// Fix for some environments where process.env might be undefined for some keys
const PORT = process.env.PORT || 3000;

// ESM __dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
        console.error('Database Health Check Failed:', err);
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

