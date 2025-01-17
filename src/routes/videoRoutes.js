import { Router } from 'express';
import  upload  from '../middlewares/uploadMiddleware.js';
import {
    uploadVideo,
    trimVideo,
} from '../controllers/videoController.js';

const router = Router();

// Upload a video
router.post('/upload',upload.any('videos'), uploadVideo);

// Trim a video
router.post('/trim', trimVideo);
export default router;
