import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create upload folder if it doesn't exist
// const uploadDir = path.join(__dirname, '../uploads/solo_doctor');
// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir, { recursive: true });
// }

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, uploadDir);
//   },
//   filename: function (req, file, cb) {
//     const sanitizedName = file.originalname.replace(/\s+/g, '_');
//     cb(null, `${Date.now()}-${sanitizedName}`);
//   },
// });
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let targetDir = '';

    if (file.fieldname === 'profile') {
      targetDir = path.join(__dirname, '../uploads/doctor/profile_images');
    } else if (file.fieldname === 'logo') {
      targetDir = path.join(__dirname, '../uploads/clinic/logo');
    } else {
      return cb(new Error('Invalid file field name'), null);
    }

    // Ensure the target directory exists
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    cb(null, targetDir);
  },

  filename: function (req, file, cb) {
    const sanitizedName = file.originalname.replace(/\s+/g, '_');
    cb(null, `${Date.now()}-${sanitizedName}`);
  },
});

export const upload = multer({ storage });
