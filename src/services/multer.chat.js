import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

// Helper to get current directory in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure chat_files directory exists
const CHAT_FILES_PATH = path.join(__dirname, '../uploads/chat_files/');
if (!fs.existsSync(CHAT_FILES_PATH)) {
    fs.mkdirSync(CHAT_FILES_PATH, { recursive: true });
}

// Sanitize filename helper
const sanitizeFilename = (originalName) => {
    const name = originalName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
    const timestamp = Date.now();
    const shortId = uuidv4().split('-')[0]; // short UUID
    return `${timestamp}-${shortId}-${name}`;
};

// Multer storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, CHAT_FILES_PATH);
    },
    filename: function (req, file, cb) {
        const safeName = sanitizeFilename(file.originalname);
        cb(null, safeName);
    },
});

// Exported middleware for multiple file uploads
export const uploadMulterChatFiles = multer({ storage }).array('files', 20);
