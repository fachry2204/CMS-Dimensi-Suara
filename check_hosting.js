import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('--- CMS HOSTING DIAGNOSTIC ---');
console.log('Node version:', process.version);
console.log('CWD:', process.cwd());

// 1. Check .env
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    console.log('✅ .env file found');
    dotenv.config({ path: envPath });
} else {
    console.log('❌ .env file NOT found in root');
}

// 2. Check DB Connection
async function checkDB() {
    try {
        console.log('Attempting DB connection to:', process.env.DB_HOST);
        const conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            connectTimeout: 5000
        });
        console.log('✅ Database connected successfully');
        await conn.end();
    } catch (err) {
        console.log('❌ Database connection FAILED:', err.message);
    }
}

// 3. Check node_modules
const modulesPath = path.join(__dirname, 'node_modules');
if (fs.existsSync(modulesPath)) {
    console.log('✅ node_modules found');
} else {
    console.log('❌ node_modules NOT found. Did you run npm install?');
}

// 4. Check Frontend Build
const publicPath = path.join(__dirname, 'public');
if (fs.existsSync(path.join(publicPath, 'index.html'))) {
    console.log('✅ Frontend build (public/index.html) found');
} else {
    console.log('❌ Frontend build NOT found. Did you run npm run build?');
}

checkDB();
