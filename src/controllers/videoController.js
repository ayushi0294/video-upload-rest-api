import db from "../db/sqlite.js";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";
import ffmpeg from "fluent-ffmpeg";
// Set the path to ffmpeg
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);
import { getVideoDurationInSeconds } from "get-video-duration";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
const UPLOAD_DIR = path.resolve("uploads");
import { promisify } from "util";
import { getVideoFileSize } from "../helperFunction.js";
// Set duration limits (5 seconds and 25 seconds)
const MIN_DURATION = 5; // 5 seconds
const MAX_DURATION = 25; // 25 seconds
const dbAll = promisify(db.all).bind(db);

// Upload video
export const uploadVideo = async (req, res) => {
    const files = req.files; // Array of uploaded files
    if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
    }

    try {
        const videoDetails = await Promise.all(
            files.map(async (file) => {
                const { filename, path: tempPath, size } = file;
                const filepath = path.join(UPLOAD_DIR, filename);
                const sizeInMB = parseFloat(size / (1024 * 1024)).toFixed(2);
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
                        [filename, filepath, sizeInMB, duration],
                        function (err) {
                            if (err) {
                                return reject(new Error("Database error"));
                            }
                            resolve({
                                videoId: this.lastID,
                                filename,
                                filepath,
                                size: `${sizeInMB} MB`,
                                duration: `${duration} sec`,
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
            message: error.message || "Error uploading videos",
        });
    }
};

// Trim video
export const trimVideo = async (req, res) => {
    const { videoId, start, end } = req.body;

    // Validate start and end times
    if (isNaN(start) || isNaN(end) || start >= end) {
        return res.status(400).json({ message: "Invalid start or end time" });
    }

    // Fetch video details from the database
    db.get(`SELECT * FROM videos WHERE id = ?`, [videoId], async (err, video) => {
        if (err || !video)
            return res.status(404).json({ message: "Video not found" });
        const outputFile = `trimmed-${Date.now()}.mp4`;
        const outputPath = path.join(UPLOAD_DIR, outputFile);
        // Trim the video using ffmpeg
        ffmpeg(video.filepath)
            .setStartTime(start)
            .setDuration(end - start)
            .output(outputPath)
            .on("end", async () => {
                const fileSizeInMB = await getVideoFileSize(outputPath);
                const duration = await getVideoDurationInSeconds(outputPath);
                // After trimming, update the video details in the database
                db.run(
                    "UPDATE videos SET filepath = ?, duration = ? ,size =? WHERE id = ?",
                    [outputPath, duration, fileSizeInMB, videoId],
                    (err) => {
                        if (err) {
                            return res
                                .status(500)
                                .json({ message: "Error updating video in database" });
                        }

                        // Send the success response after database update
                        res.json({ message: "Video trimmed successfully", outputFile });
                    }
                );
            })
            .on("error", (err) => {
                // Handle ffmpeg error
                res.status(500).json({ message: err.message });
            })
            .run();
    });
};

export const mergeVideos = async (req, res) => {
    const { videoIds } = req.body;

    // Validate input
    if (!videoIds || !Array.isArray(videoIds) || videoIds.length < 2) {
        return res
            .status(400)
            .json({ message: "Please provide at least two video IDs to merge." });
    }

    try {
        // Fetch video file paths from the database
        const placeholders = videoIds.map(() => "?").join(",");
        const videos = await dbAll(
            `SELECT * FROM videos WHERE id IN (${placeholders})`,
            videoIds
        );
        if (videos.length !== videoIds.length) {
            return res
                .status(404)
                .json({ message: "One or more video IDs not found." });
        }
        // Generate output file name and path
        const outputFile = `merged-${Date.now()}.mp4`;
        const outputPath = path.join(UPLOAD_DIR, outputFile);

        // Initialize ffmpeg and add video inputs
        const ffmpegCommand = ffmpeg();
        videos.forEach((video) => ffmpegCommand.input(video.filepath));

        // Merge videos
        ffmpegCommand
            .mergeToFile(outputPath)
            .on("end", async () => {
                try {
                    // Get file size and duration of the merged video
                    const fileSizeInMB = await getVideoFileSize(outputPath);
                    const duration = await getVideoDurationInSeconds(outputPath);
                    db.run(
                        "INSERT INTO videos (filename, filepath, size, duration) VALUES (?, ?, ?, ?)",
                        [outputFile, outputPath, fileSizeInMB, duration],
                        function (err) {
                            if (err) {
                                console.error("Error inserting video:", err.message);
                                return;
                            }
                            // Respond with success
                            res.json({
                                message: "Videos merged successfully",
                                mergedVideo: {
                                    id: this.lastID, // SQLite returns the last inserted row ID
                                    originalName: "Merged Video",
                                    fileName: outputFile,
                                    filePath: outputPath,
                                    size: `${fileSizeInMB} MB`,
                                    duration: `${duration} sec`,
                                },
                            });
                        }
                    );
                } catch (error) {
                    console.error(
                        "Error retrieving merged video metadata:",
                        error.message
                    );
                    res
                        .status(500)
                        .json({
                            message: `Error retrieving merged video metadata: ${error.message}`,
                        });
                }
            })
            .on("error", (err) => {
                console.error("Error merging videos:", err.message);
                res
                    .status(500)
                    .json({ message: `Error merging videos: ${err.message}` });
            });
    } catch (err) {
        console.error("Error processing the request:", err.message);
        res
            .status(500)
            .json({ message: `Error processing the request: ${err.message}` });
    }
};

// Generate expiring link
export const generateLink = (req, res) => {
    const { videoId, expiry } = req.body;

    db.get(
        `SELECT filepath FROM videos WHERE id = ?`,
        [videoId],
        (err, video) => {
            if (err || !video)
                return res.status(404).json({ message: "Video not found" });
            const token = jwt.sign({ filepath: video.filepath }, "secretKey", {
                expiresIn: expiry,
            });
            const baseUrl =
                process.env.BASE_URL || "http://localhost:3000/api/videos"; // Fallback to localhost if not set
            // Return the generated URL in the response
            res.json({ link: `${baseUrl}/${token}` });
        }
    );
};

// Access video via expiring link
export const accessVideo = (req, res) => {
    const token = req.params.token;

    jwt.verify(token, "secretKey", (err, decoded) => {
        if (err) return res.status(403).json({ message: "Link expired" });
        res.sendFile(decoded.filepath);
    });
};
