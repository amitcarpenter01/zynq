import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const createStorageWithSubfolder = (subfolder) => {
    return multer.diskStorage({
        destination: function (req, file, cb) {
            const uploadDir = path.join(__dirname, '../uploads/doctor', subfolder);
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            cb(null, uploadDir);
        },
        filename: function (req, file, cb) {
            cb(null, `${Date.now()}-${file.originalname}`);
        },
    });
};

export const uploadFileTo = (subfolder = 'general', fieldName = 'file') => {
    const storage = createStorageWithSubfolder(subfolder);
    const upload = multer({ storage: storage });
    return upload.single(fieldName);
};

export const uploadFilesTo = (subfolder = 'general', fieldName = 'file', maxCount = 20) => {
    const storage = createStorageWithSubfolder(subfolder);
    const upload = multer({ storage: storage });
    return upload.array(fieldName, maxCount);
};

export const uploadCertificationFieldsTo = (fields) => {
    const multerFieldsConfig = fields.map(field => ({
        name: field.name,
        maxCount: field.maxCount || 1,
    }));
    const upload = multer({ storage: createStorageWithSubfolder('certifications') }); // Default storage
    return upload.fields(multerFieldsConfig);
};