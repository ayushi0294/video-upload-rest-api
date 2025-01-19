import { Router } from 'express';
import  upload  from '../middlewares/uploadMiddleware.js';
import {
    uploadVideo,
    trimVideo,mergeVideos,generateLink,accessVideo
} from '../controllers/videoController.js';

const router = Router();

// Upload a video
router.post('/upload',upload.array('files', 10), uploadVideo);

// Trim a video
router.put('/trim', trimVideo);

router.post('/merge', mergeVideos);

// Generate an expiring link
router.post('/generate-link', generateLink);

// Access a video via expiring link
router.get('/:token', accessVideo);
export default router;
