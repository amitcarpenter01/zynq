import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../uploads/')); 
    },
    filename: function (req, file, cb) {
         const sanitizedName = file.originalname.replace(/\s+/g, '_');
        cb(null, `${Date.now()}-${sanitizedName}`);
    },
});

export const upload = multer({ storage: storage });
export const uploadFile = upload.single('file');
export const uploadMultipleFiles = upload.array('files', 20);