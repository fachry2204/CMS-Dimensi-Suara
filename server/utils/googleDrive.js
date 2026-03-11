import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_ROOT_FOLDER_NAME = 'CMS-Dimensi-Suara';
const DEFAULT_SUBFOLDERS = {
  releases: 'Releases',
  userDocs: 'User-Docs',
  contracts: 'Contracts'
};

const DRIVE_SCOPES = ['https://www.googleapis.com/auth/drive'];

let cachedDrive = null;
let cachedRootFolderId = null;
const folderCache = new Map();

const isEnabled = () => String(process.env.GOOGLE_DRIVE_ENABLED || '').toLowerCase() === 'true';

const getCredsPath = () => {
  const raw = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON_PATH || process.env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH || '';
  if (!raw) return null;
  return path.isAbsolute(raw) ? raw : path.join(__dirname, '../../', raw);
};

const getDrive = async () => {
  if (cachedDrive) return cachedDrive;

  const credsPath = getCredsPath();
  if (!credsPath) return null;
  if (!fs.existsSync(credsPath)) return null;

  const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: DRIVE_SCOPES
  });

  cachedDrive = google.drive({ version: 'v3', auth });
  return cachedDrive;
};

const ensureFolder = async (drive, name, parentId) => {
  const cacheKey = `${parentId || 'root'}::${name}`;
  const cached = folderCache.get(cacheKey);
  if (cached) return cached;

  const qParts = [
    `name = '${String(name).replace(/'/g, "\\'")}'`,
    `mimeType = 'application/vnd.google-apps.folder'`,
    'trashed = false'
  ];
  if (parentId) qParts.push(`'${parentId}' in parents`);
  if (!parentId) qParts.push(`'root' in parents`);

  const listRes = await drive.files.list({
    q: qParts.join(' and '),
    fields: 'files(id, name)',
    pageSize: 1
  });

  const found = listRes.data.files && listRes.data.files[0];
  if (found?.id) {
    folderCache.set(cacheKey, found.id);
    return found.id;
  }

  const createRes = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId || 'root']
    },
    fields: 'id'
  });

  const id = createRes.data.id;
  if (id) folderCache.set(cacheKey, id);
  return id || null;
};

const getOrCreateRootFolderId = async () => {
  if (!isEnabled()) return null;
  if (cachedRootFolderId) return cachedRootFolderId;

  const drive = await getDrive();
  if (!drive) return null;

  const configuredRoot = String(process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '').trim();
  if (configuredRoot) {
    cachedRootFolderId = configuredRoot;
    return cachedRootFolderId;
  }

  const rootName = String(process.env.GOOGLE_DRIVE_ROOT_FOLDER_NAME || DEFAULT_ROOT_FOLDER_NAME).trim();
  const id = await ensureFolder(drive, rootName, null);
  cachedRootFolderId = id;
  return cachedRootFolderId;
};

const getCategoryFolderId = async (category) => {
  if (!isEnabled()) return null;
  const drive = await getDrive();
  if (!drive) return null;
  const rootId = await getOrCreateRootFolderId();
  if (!rootId) return null;

  const releasesId = await ensureFolder(drive, DEFAULT_SUBFOLDERS.releases, rootId);
  const userDocsId = await ensureFolder(drive, DEFAULT_SUBFOLDERS.userDocs, rootId);
  const contractsId = await ensureFolder(drive, DEFAULT_SUBFOLDERS.contracts, rootId);

  if (category === 'release') return releasesId;
  if (category === 'user-doc') return userDocsId;
  if (category === 'contract') return contractsId;
  return rootId;
};

export const ensureReleaseFolder = async ({ artistFolderName, releaseFolderName }) => {
  if (!isEnabled()) return null;
  const drive = await getDrive();
  if (!drive) return null;
  const releasesRootId = await getCategoryFolderId('release');
  if (!releasesRootId) return null;

  const artistId = await ensureFolder(drive, String(artistFolderName || 'Unknown_Artist'), releasesRootId);
  if (!artistId) return null;
  const releaseId = await ensureFolder(drive, String(releaseFolderName || 'Untitled_Release'), artistId);
  return releaseId;
};

const makePublicIfConfigured = async (drive, fileId) => {
  const makePublic = String(process.env.GOOGLE_DRIVE_PUBLIC || '').toLowerCase() === 'true';
  if (!makePublic) return;
  await drive.permissions.create({
    fileId,
    requestBody: { type: 'anyone', role: 'reader' }
  });
};

export const uploadLocalFileToDrive = async ({
  absPath,
  fileName,
  mimeType,
  parentFolderId,
  category,
  deleteLocalOnSuccess = true
}) => {
  try {
    if (!isEnabled()) return null;

    const drive = await getDrive();
    if (!drive) return null;

    const parentId = parentFolderId || (await getCategoryFolderId(category || ''));
    if (!parentId) return null;

    if (!absPath || !fs.existsSync(absPath)) return null;

    const createRes = await drive.files.create({
      requestBody: {
        name: fileName || path.basename(absPath),
        parents: [parentId]
      },
      media: {
        mimeType: mimeType || 'application/octet-stream',
        body: fs.createReadStream(absPath)
      },
      fields: 'id, webViewLink, webContentLink'
    });

    const fileId = createRes.data.id;
    if (!fileId) return null;

    await makePublicIfConfigured(drive, fileId);

    const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

    if (deleteLocalOnSuccess) {
      try {
        fs.unlinkSync(absPath);
      } catch {}
    }

    return {
      fileId,
      url: directUrl,
      webViewLink: createRes.data.webViewLink || null,
      webContentLink: createRes.data.webContentLink || null
    };
  } catch {
    return null;
  }
};

export const deleteDriveFileByUrl = async (url) => {
  try {
    if (!isEnabled()) return false;
    const drive = await getDrive();
    if (!drive) return false;
    const raw = String(url || '');
    const m = raw.match(/[?&]id=([a-zA-Z0-9_-]+)/) || raw.match(/\/d\/([a-zA-Z0-9_-]+)/);
    const fileId = m ? m[1] : null;
    if (!fileId) return false;
    await drive.files.delete({ fileId });
    return true;
  } catch {
    return false;
  }
};

