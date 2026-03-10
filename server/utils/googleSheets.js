import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Utilitas untuk sinkronisasi data ke Google Sheets
 */
export const syncUserToSheet = async (userData) => {
    try {
        const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
        const CREDENTIALS_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH;

        if (!SPREADSHEET_ID || !CREDENTIALS_PATH) {
            console.warn('⚠️ Google Sheets integration skipped: Missing GOOGLE_SHEET_ID or GOOGLE_SERVICE_ACCOUNT_JSON_PATH in .env');
            return;
        }

        const fullPath = path.isAbsolute(CREDENTIALS_PATH) 
            ? CREDENTIALS_PATH 
            : path.join(__dirname, '../../', CREDENTIALS_PATH);

        if (!fs.existsSync(fullPath)) {
            console.error(`❌ Google Sheets credentials file not found at: ${fullPath}`);
            return;
        }

        const creds = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

        const serviceAccountAuth = new JWT({
            email: creds.client_email,
            key: creds.private_key,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
        await doc.loadInfo();

        const sheet = doc.sheetsByIndex[0]; // Gunakan sheet pertama

        // Ambil header jika sheet kosong
        await sheet.loadHeaderRow();
        if (sheet.headerValues.length === 0) {
            await sheet.setHeaderRow(['ID', 'Username', 'Email', 'Role', 'Status', 'Full Name', 'Account Type', 'Company Name', 'Registered At']);
        }

        const rowData = {
            'ID': userData.id,
            'Username': userData.username || userData.name,
            'Email': userData.email,
            'Role': userData.role,
            'Status': userData.status,
            'Full Name': userData.full_name || '',
            'Account Type': userData.account_type || '',
            'Company Name': userData.company_name || '',
            'Registered At': userData.registeredDate || userData.registered_at || new Date().toISOString()
        };

        // Cari apakah user sudah ada (untuk update)
        const rows = await sheet.getRows();
        const existingRow = rows.find(row => row.get('ID') == userData.id);

        if (existingRow) {
            // Update baris yang sudah ada
            Object.keys(rowData).forEach(key => {
                existingRow.set(key, rowData[key]);
            });
            await existingRow.save();
            console.log(`✅ Google Sheet: Updated user ID ${userData.id}`);
        } else {
            // Tambah baris baru
            await sheet.addRow(rowData);
            console.log(`✅ Google Sheet: Added new user ID ${userData.id}`);
        }

    } catch (error) {
        console.error('❌ Error syncing to Google Sheets:', error.message);
    }
};

/**
 * Fungsi untuk migrasi masal data user yang ada ke Google Sheet
 */
export const syncAllUsersToSheet = async (users) => {
    for (const user of users) {
        await syncUserToSheet(user);
    }
};
