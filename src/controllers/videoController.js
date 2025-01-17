import db from "../db/sqlite.js"
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';
// Set the path to ffmpeg
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
import { getVideoDurationInSeconds } from 'get-video-duration';
import path from 'path';
import fs from "fs"
const UPLOAD_DIR = path.resolve('uploads');

// Set duration limits (5 seconds and 25 seconds)
const MIN_DURATION = 5;  // 5 seconds
const MAX_DURATION = 25; // 25 seconds


// Upload video
export const uploadVideo = async (req, res) => {
    const files = req.files; // Array of uploaded files

    if (!files || files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded' });
    }

    try {
        const videoDetails = await Promise.all(
            files.map(async (file) => {
                const { filename, path: tempPath, size } = file;
                const filepath = path.join(UPLOAD_DIR, filename);

                // // Get video duration
                const duration = await getVideoDurationInSeconds(filepath);

                // Validate video duration
                if (duration < MIN_DURATION || duration > MAX_DURATION) {
                    // Delete the file if it doesn't meet duration constraints
                    await fs.unlink(filepath);
                    throw new Error(
                        `Video duration must be between ${MIN_DURATION} and ${MAX_DURATION} seconds.`
                    );
                }

                // Save video details to the database using a promise
                return new Promise((resolve, reject) => {
                    db.run(
                        `INSERT INTO videos (filename, filepath, size, duration) VALUES (?, ?, ?, ?)`,
                        [filename, filepath, size, duration],
                        function (err) {
                            if (err) {
                                return reject(new Error('Database error'));
                            }
                            resolve({
                                videoId: this.lastID,
                                filename,
                                filepath,
                                size,
                                duration,
                            });
                        }
                    );
                });
            })
        );

        // Send success response with all video details
        res.json({
            message: `${files.length} video(s) uploaded successfully`,
            videos: videoDetails,
        });
    } catch (error) {
        console.error("Error:", error);
        // Handle errors during the process
        res.status(400).json({
            message: error.message || 'Error uploading videos',
        });
    }
};




// Trim video
export const trimVideo = (req, res) => {
    const { videoId, start, end } = req.body;

    // Validate start and end times
    if (isNaN(start) || isNaN(end) || start >= end) {
        return res.status(400).json({ message: 'Invalid start or end time' });
    }

    // Fetch video details from the database
    db.get(`SELECT * FROM videos WHERE id = ?`, [videoId], (err, video) => {
        if (err || !video) return res.status(404).json({ message: 'Video not found' });
        const outputFile = `trimmed-${Date.now()}.mp4`;
        const outputPath = path.join(UPLOAD_DIR, outputFile);
        // Trim the video using ffmpeg
        ffmpeg(video.filepath)
            .setStartTime(start)
            .setDuration(end - start)
            .output(outputPath)
            .on('end', () => {
                // After trimming, update the video details in the database
                db.run(
                    'UPDATE videos SET filepath = ?, duration = ? WHERE id = ?',
                    [outputPath, end - start, videoId],
                    (err) => {
                        if (err) {
                            return res.status(500).json({ message: 'Error updating video in database' });
                        }

                        // Send the success response after database update
                        res.json({ message: 'Video trimmed successfully', outputFile });
                    }
                );
            })
            .on('error', (err) => {
                // Handle ffmpeg error
                res.status(500).json({ message: err.message });
            })
            .run();
    });
};




