// uploadClinicMiddleware.ts
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const createDynamicStorage = (baseFolder = 'clinic') => {
  return multer.diskStorage({
    destination: function (req, file, cb) {
      const fieldName = file.fieldname;
      const folderPath = path.join(__dirname, '../uploads', baseFolder, fieldName);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
      cb(null, folderPath);
    },
    filename: function (req, file, cb) {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  });
};

export const uploadDynamicClinicFiles = (getFieldsFn, baseFolder = 'clinic') => {
  const storage = createDynamicStorage(baseFolder);
  const upload = multer({ storage });

  return (req, res, next) => {
    const fields = getFieldsFn(req); 
    const multerMiddleware = upload.any(fields);
    multerMiddleware(req, res, next);
  };
};
