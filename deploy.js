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
    localRoot: __dirname, // Deploy from root
    remoteRoot: process.env.FTP_REMOTE_ROOT || '/httpdocs/',
    // Include specific folders/files
    include: [
        "dist/**/*",
        "server/**/*",
        "package.json",
        ".env.example" 
        // Note: .env is usually not uploaded for security, but .env.example is good. 
        // If user wants to deploy .env, they should add it manually or we can add it here.
    ],
    // Exclude source files, git, node_modules, etc.
    exclude: [
        "src/**",
        "public/**", // content of public is already in dist
        "node_modules/**", 
        ".git/**", 
        ".gitignore",
        "deploy.js", // Don't upload the deploy script itself
        "README.md",
        "*.log"
    ],
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
