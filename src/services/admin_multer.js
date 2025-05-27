// uploadClinicMiddleware.ts
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const createStorageWithSubfolder = (subfolder) => {
    return multer.diskStorage({
        destination: function (req, file, cb) {
            const uploadDir = path.join(__dirname, '../uploads/admin', subfolder);
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            cb(null, uploadDir);
        },
        filename: function (req, file, cb) {
            const safeOriginalName = file.originalname.replace(/\s+/g, '_');
            cb(null, `${Date.now()}-${safeOriginalName}`);
        },
    });
};

export const uploadAdminProfile = (fieldName = 'file', subfolder = 'general') => {
    const storage = createStorageWithSubfolder(subfolder);
    const upload = multer({ storage: storage });
    return upload.single(fieldName);
};