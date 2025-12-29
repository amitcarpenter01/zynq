import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const FIELD_UPLOAD_MAP = {
  // Doctor documents
  medical_council: { base: 'doctor', sub: 'certifications' },
  deramatology_board: { base: 'doctor', sub: 'certifications' },
  laser_safety: { base: 'doctor', sub: 'certifications' },
  cosmetology_license: { base: 'doctor', sub: 'certifications' },
  profile: { base: 'doctor', sub: 'profile_images' },

  // Clinic documents
  logo: { base: 'clinic', sub: 'logo' },
  files: { base: 'clinic', sub: 'files' }
};


const createFieldBasedStorage = () => {
  return multer.diskStorage({
    destination: function (req, file, cb) {
      const config = FIELD_UPLOAD_MAP[file.fieldname];

      if (!config) {
        return cb(new Error(`Unknown upload field: ${file.fieldname}`));
      }

      const uploadDir = path.join(
        __dirname,
        '../uploads',
        config.base,
        config.sub
      );

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      cb(null, uploadDir);
    },

    filename: function (req, file, cb) {
      cb(null, `${Date.now()}-${file.originalname}`);
    }
  });
};


export const uploadVariousFieldsForSoloDoctorDynamic = multer({
  storage: createFieldBasedStorage()
}).fields([
  { name: 'medical_council', maxCount: 1 },
  { name: 'deramatology_board', maxCount: 1 },
  { name: 'laser_safety', maxCount: 1 },
  { name: 'cosmetology_license', maxCount: 1 },
  { name: 'profile', maxCount: 1 },
  { name: 'logo', maxCount: 1 },
  { name: 'files', maxCount: 50 }
]);
