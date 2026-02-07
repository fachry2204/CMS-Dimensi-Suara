import FtpDeploy from 'ftp-deploy';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
dotenv.config();

const ftpDeploy = new FtpDeploy();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config = {
    user: process.env.FTP_USER,
    // Password optional, prompted if none given
    password: process.env.FTP_PASSWORD,
    host: process.env.FTP_HOST,
    port: 21,
    localRoot: join(__dirname, 'dist'),
    remoteRoot: process.env.FTP_REMOTE_ROOT || '/httpdocs/',
    // include: ["*", "**/*"],      // this would upload everything except dot files
    include: ["*", "**/*", ".htaccess", "web.config"],
    // e.g. exclude sourcemaps, and THAT'S ALL
    exclude: ["dist/**/*.map", "node_modules/**", "node_modules/**/.*", ".git/**"],
    // delete ALL existing files at destination before uploading, if true
    deleteRemote: false,
    // Passive mode is generally more reliable
    forcePasv: true,
    sftp: false, // Set to true if using SFTP
};

console.log('🚀 Mulai proses deployment...');
console.log(`📂 Uploading dari: ${config.localRoot}`);
console.log(`☁️  Tujuan server: ${config.host}:${config.remoteRoot}`);

ftpDeploy
    .deploy(config)
    .then((res) => {
        console.log('✅ Deployment Selesai!');
        console.log(`📄 Jumlah file terupload: ${res.uploadedCount}`);
    })
    .catch((err) => {
        console.error('❌ Deployment Gagal:', err);
    });
