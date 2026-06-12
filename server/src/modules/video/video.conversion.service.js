const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs-extra');
const {
    CACHE_DURATION_MS,
    TEMP_DIR,
    activeConversions,
    generateCacheKey,
    parseTimemark,
} = require("./video.cache");

const FFMPEG_INPUT_OPTIONS = [
    '-protocol_whitelist', 'file,http,https,tcp,tls,crypto',
    '-reconnect', '1',
    '-reconnect_streamed', '1',
    '-reconnect_delay_max', '5',
    '-timeout', '15000000',
    '-threads', '0',
    '-rw_timeout', '30000000',
    '-analyzeduration', '20000000',
    '-probesize', '20000000',
    '-fflags', '+genpts+discardcorrupt',
    '-user_agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
];

const FFMPEG_OUTPUT_OPTIONS = [
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-bsf:a', 'aac_adtstoasc',
    '-movflags', '+faststart',
    '-max_muxing_queue_size', '1024'
];

const FFMPEG_STREAM_INPUT_OPTIONS = [
    '-protocol_whitelist', 'file,http,https,tcp,tls,crypto',
    '-analyzeduration', '10000000',
    '-probesize', '10000000'
];

const FFMPEG_STREAM_OUTPUT_OPTIONS = [
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-bsf:a', 'aac_adtstoasc',
    '-movflags', 'frag_keyframe+empty_moov+faststart',
    '-f', 'mp4'
];

/**
 * Check if a cached video file exists and is valid
 */
function checkCacheFile(cacheKey) {
    const cachedFilePath = path.join(TEMP_DIR, `${cacheKey}.mp4`);
    const convertingMarkerPath = path.join(TEMP_DIR, `${cacheKey}.converting`);

    // Check if conversion is in progress
    if (fs.existsSync(convertingMarkerPath)) {
        let progress = 0;
        try {
            const markerContent = fs.readFileSync(convertingMarkerPath, 'utf8');
            const parts = markerContent.split('|');
            if (parts.length >= 2) {
                progress = parseInt(parts[1]) || 0;
            }
        } catch (err) {
            // Ignore read errors
        }
        return { exists: false, converting: true, progress };
    }

    if (fs.existsSync(cachedFilePath)) {
        try {
            const stats = fs.statSync(cachedFilePath);
            const ageMs = Date.now() - stats.mtimeMs;

            if (ageMs < CACHE_DURATION_MS) {
                return {
                    exists: true,
                    converting: false,
                    filePath: cachedFilePath,
                    size: stats.size,
                    ageMs,
                    ageMinutes: Math.round(ageMs / 60000),
                    expiresInMinutes: Math.round((CACHE_DURATION_MS - ageMs) / 60000)
                };
            } else {
                // Cache expired, delete it
                fs.removeSync(cachedFilePath);
                return { exists: false, converting: false, expired: true };
            }
        } catch (err) {
            return { exists: false, converting: false, error: err.message };
        }
    }

    return { exists: false, converting: false };
}

/**
 * Convert HLS to MP4 and save to file
 */
function convertHlsToFile(hlsUrl, outputPath, options = {}) {
    const { onStart, onProgress, onError, onEnd } = options;

    return new Promise((resolve, reject) => {
        const command = ffmpeg(hlsUrl)
            .inputOptions(FFMPEG_INPUT_OPTIONS)
            .outputOptions(FFMPEG_OUTPUT_OPTIONS)
            .on('start', (commandLine) => {
                if (onStart) onStart(commandLine);
            })
            .on('progress', (progress) => {
                if (onProgress) onProgress(progress);
            })
            .on('error', (err, stdout, stderr) => {
                if (onError) onError(err, stderr);
                reject(err);
            })
            .on('end', () => {
                if (onEnd) onEnd();
                resolve();
            })
            .save(outputPath);

        return command;
    });
}

/**
 * Convert HLS to MP4 stream (for direct streaming to response)
 */
function convertHlsToStream(hlsUrl, options = {}) {
    const { onStart, onProgress, onError, onEnd } = options;

    const command = ffmpeg(hlsUrl)
        .inputOptions(FFMPEG_STREAM_INPUT_OPTIONS)
        .outputOptions(FFMPEG_STREAM_OUTPUT_OPTIONS)
        .on('start', (commandLine) => {
            if (onStart) onStart(commandLine);
        })
        .on('progress', (progress) => {
            if (onProgress) onProgress(progress);
        })
        .on('error', (err, stdout, stderr) => {
            if (onError) onError(err, stderr);
        })
        .on('end', () => {
            if (onEnd) onEnd();
        });

    return command;
}

/**
 * Start background conversion with progress tracking
 */
async function startBackgroundConversion(hlsUrl, cacheKey, expectedDurationSec) {
    const cachedFilePath = path.join(TEMP_DIR, `${cacheKey}.mp4`);
    const convertingMarkerPath = path.join(TEMP_DIR, `${cacheKey}.converting`);

    // Create marker file
    fs.writeFileSync(convertingMarkerPath, `${Date.now()}|0|${expectedDurationSec}`);
    console.log(`[VideoConverter] Created converting marker: ${cacheKey} (expected duration: ${expectedDurationSec}s)`);

    try {
        await new Promise((resolve, reject) => {
            const ffmpegCommand = ffmpeg(hlsUrl)
                .inputOptions(FFMPEG_INPUT_OPTIONS)
                .outputOptions(FFMPEG_OUTPUT_OPTIONS)
                .on('start', () => {
                    console.log(`[VideoConverter] Background FFmpeg started: ${cacheKey}`);
                    activeConversions.set(cacheKey, ffmpegCommand);
                })
                .on('progress', (progress) => {
                    let percent = 0;
                    
                    if (progress.percent !== undefined && progress.percent !== null) {
                        const rawPercent = Number(progress.percent);
                        percent = isNaN(rawPercent) ? 0 : rawPercent;
                    } else if (progress.timemark && expectedDurationSec > 0) {
                        const currentSec = parseTimemark(progress.timemark);
                        percent = (currentSec / expectedDurationSec) * 100;
                    }

                    percent = Math.round(percent);
                    percent = Math.min(99, Math.max(0, percent));

                    try {
                        const markerContent = fs.readFileSync(convertingMarkerPath, 'utf8');
                        const parts = markerContent.split('|');
                        const markerStartTime = parts[0];
                        const currentPercent = Number(parts[1]) || 0;
                        const duration = parts[2] || expectedDurationSec;
                        
                        if (percent > currentPercent) {
                            fs.writeFileSync(convertingMarkerPath, `${markerStartTime}|${percent}|${duration}`);
                            console.log(`[VideoConverter] Background progress ${cacheKey}: ${percent}%`);
                        }
                    } catch (err) {
                        // Marker file might be deleted
                    }
                })
                .on('error', (err) => {
                    console.error(`[VideoConverter] Background conversion error: ${err.message}`);
                    activeConversions.delete(cacheKey);
                    fs.remove(convertingMarkerPath).catch(() => { });
                    fs.remove(cachedFilePath).catch(() => { });
                    reject(err);
                })
                .on('end', () => {
                    activeConversions.delete(cacheKey);
                    fs.remove(convertingMarkerPath).catch(() => { });
                    console.log(`[VideoConverter] Background conversion completed: ${cacheKey}`);
                    resolve();
                })
                .save(cachedFilePath);
        });

        return { success: true };
    } catch (err) {
        fs.remove(convertingMarkerPath).catch(() => { });
        fs.remove(cachedFilePath).catch(() => { });
        return { success: false, error: err.message };
    }
}

/**
 * Cancel an active conversion
 */
function cancelActiveConversion(cacheKey) {
    const cachedFilePath = path.join(TEMP_DIR, `${cacheKey}.mp4`);
    const convertingMarkerPath = path.join(TEMP_DIR, `${cacheKey}.converting`);

    const ffmpegCommand = activeConversions.get(cacheKey);
    
    if (ffmpegCommand) {
        try {
            ffmpegCommand.kill('SIGKILL');
            console.log(`[VideoConverter] Killed ffmpeg process: ${cacheKey}`);
        } catch (err) {
            console.error(`[VideoConverter] Error killing ffmpeg: ${err.message}`);
        }
        activeConversions.delete(cacheKey);
    }

    // Clean up files
    if (fs.existsSync(convertingMarkerPath)) {
        fs.remove(convertingMarkerPath).catch(() => { });
    }
    if (fs.existsSync(cachedFilePath)) {
        fs.remove(cachedFilePath).catch(() => { });
    }

    return { success: true };
}

/**
 * Wait for background conversion to complete
 */
async function waitForConversion(cacheKey, maxWaitMs = 5 * 60 * 1000, pollIntervalMs = 2000) {
    const convertingMarkerPath = path.join(TEMP_DIR, `${cacheKey}.converting`);
    const startTime = Date.now();

    while (fs.existsSync(convertingMarkerPath) && (Date.now() - startTime) < maxWaitMs) {
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
        console.log(`[VideoConverter] Still waiting for background conversion... (${Math.round((Date.now() - startTime) / 1000)}s)`);
    }

    return !fs.existsSync(convertingMarkerPath);
}

/**
 * Stream a file with range support
 */
function streamFileWithRange(filePath, range, res, headers = {}) {
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;

    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = (end - start) + 1;

        res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize,
            'Content-Type': 'video/mp4',
            ...headers
        });

        return fs.createReadStream(filePath, { start, end });
    }

    res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
        ...headers
    });

    return fs.createReadStream(filePath);
}

module.exports = {
    FFMPEG_INPUT_OPTIONS,
    FFMPEG_OUTPUT_OPTIONS,
    FFMPEG_STREAM_INPUT_OPTIONS,
    FFMPEG_STREAM_OUTPUT_OPTIONS,
    checkCacheFile,
    convertHlsToFile,
    convertHlsToStream,
    startBackgroundConversion,
    cancelActiveConversion,
    waitForConversion,
    streamFileWithRange,
};
