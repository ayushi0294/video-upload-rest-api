import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Resolve __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure the upload directory exists
const ensureUploadDir = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};


const UPLOAD_DIR = path.join(__dirname, '..', "..", 'uploads');
ensureUploadDir(UPLOAD_DIR);

// Configure Multer storage

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Check if the callback function is provided
        if (typeof cb !== 'function') {
            return new Error('Callback function not provided for destination');
        }
        cb(null, UPLOAD_DIR); // Specify the upload directory
    },
    filename: (req, file, cb) => {
        // Check if the callback function is provided
        if (typeof cb !== 'function') {
            return new Error('Callback function not provided for filename');
        }
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName); // Generate unique filename
    },
});

// Multer configuration
const upload = multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB limit
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = ['video/mp4', 'video/mkv', 'video/avi'];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only MP4, MKV, and AVI are allowed.'));
        }
    },
});

export default upload