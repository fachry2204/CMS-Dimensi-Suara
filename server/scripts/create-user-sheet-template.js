import 'dotenv/config';
import { createUserSheetTemplate } from '../utils/googleSheets.js';

async function run() {
  const title = process.argv.slice(2).join(' ') || process.env.GOOGLE_SHEET_TEMPLATE_TITLE || 'User Registration Template';
  try {
    const res = await createUserSheetTemplate(title);
    console.log(JSON.stringify(res));
  } catch (e) {
    console.error(e?.message || String(e));
    process.exit(1);
  }
}

run();
