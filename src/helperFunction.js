

import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';
// Set the path to ffmpeg
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
//Helper function to get video size using ffprobe

export const getVideoFileSize = async (filePath) => {
    try {
        const metadata = await new Promise((resolve, reject) => {
            ffmpeg.ffprobe(filePath, (err, metadata) => {
                if (err) {
                    return reject(new Error(`Error retrieving metadata: ${err.message}`));
                }
                resolve(metadata);
            });
        });

        if (!metadata.format || !metadata.format.size) {
            throw new Error('File size not available in metadata.');
        }

        const fileSizeInMB = metadata.format.size / (1024 * 1024); // Convert bytes to MB
        return parseFloat(fileSizeInMB.toFixed(2)); // Return size rounded to two decimal places
    } catch (error) {
        throw new Error(`Error in getVideoFileSize: ${error.message}`);
    }
};
