import multer from 'multer';
import { ValidationError } from '../utils/errors';


// Configure multer for file uploads
export const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
        files: 1
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/javascript' ||
            file.mimetype === 'text/javascript' ||
            file.originalname.endsWith('.js')) {
            cb(null, true);
        } else {
            cb(new ValidationError('Only .js files are allowed'));
        }
    }
});
