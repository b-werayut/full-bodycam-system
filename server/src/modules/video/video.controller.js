const ffmpeg = require('fluent-ffmpeg');
const { PassThrough } = require('stream');
const path = require('path');
const fs = require('fs-extra');
const {
    CACHE_DURATION_MS,
    TEMP_DIR,
    activeConversions,
    generateCacheKey,
    isValidTimeRange,
    parseTimeValue,
    parseTimemark,
    startTempCleanup,
} = require("./video.cache");
const { probeVideoInfo } = require("./video.metadata.service");
const { fetchFreshHlsUrl } = require("./video.playback.service");

const INVALID_TIME_RANGE_ERROR = 'Invalid time range: startTime and endTime must be valid values, and endTime must be after startTime';

/**
 * Check if cached video exists for given playback params
 * Returns cache status and file info if exists
 * NOTE: Uses .converting marker file to detect if conversion is in progress
 * 
 * Supports both timestamp and datetime string format for startTime/endTime
 */
const checkVideoCache = async (req, res) => {
    const { playbackParams } = req.body;

    if (!playbackParams) {
        return res.status(400).json({ cached: false, error: 'playbackParams required' });
    }

    const { deviceCode, startTime, endTime } = playbackParams;
    if (!deviceCode || !startTime || !endTime) {
        return res.status(400).json({ cached: false, error: 'Missing params' });
    }

    // Parse time values to support both formats
    const parsedStartTime = parseTimeValue(startTime);
    const parsedEndTime = parseTimeValue(endTime);
    if (!isValidTimeRange(parsedStartTime, parsedEndTime)) {
        return res.status(400).json({ cached: false, error: INVALID_TIME_RANGE_ERROR });
    }

    const cacheKey = generateCacheKey(deviceCode, parsedStartTime, parsedEndTime);
    const cachedFilePath = path.join(TEMP_DIR, `${cacheKey}.mp4`);
    const convertingMarkerPath = path.join(TEMP_DIR, `${cacheKey}.converting`);

    console.log(`[VideoConverter] Checking cache for key: ${cacheKey}`);

    // Check if conversion is in progress (marker file exists)
    if (fs.existsSync(convertingMarkerPath)) {
        let progress = 0;
        try {
            const markerContent = fs.readFileSync(convertingMarkerPath, 'utf8');
            // Marker format: "startTime|progress" e.g. "1714234567890|45"
            const parts = markerContent.split('|');
            if (parts.length >= 2) {
                progress = parseInt(parts[1]) || 0;
            }
        } catch (err) {
            // Ignore read errors
        }
        console.log(`[VideoConverter] Cache CONVERTING: ${cacheKey} (progress: ${progress}%)`);
        return res.json({ cached: false, converting: true, progress });
    }

    if (fs.existsSync(cachedFilePath)) {
        try {
            const stats = fs.statSync(cachedFilePath);
            const ageMs = Date.now() - stats.mtimeMs;

            // Check if cache is still valid (not expired)
            if (ageMs < CACHE_DURATION_MS) {
                console.log(`[VideoConverter] Cache HIT: ${cacheKey} (age: ${Math.round(ageMs / 60000)} min)`);
                return res.json({
                    cached: true,
                    cacheKey,
                    size: stats.size,
                    createdAt: stats.mtimeMs,
                    ageMinutes: Math.round(ageMs / 60000),
                    expiresInMinutes: Math.round((CACHE_DURATION_MS - ageMs) / 60000)
                });
            } else {
                // Cache expired, delete it
                fs.removeSync(cachedFilePath);
                console.log(`[VideoConverter] Cache EXPIRED and removed: ${cacheKey}`);
            }
        } catch (err) {
            console.error(`[VideoConverter] Error checking cache: ${err.message}`);
        }
    }

    console.log(`[VideoConverter] Cache MISS: ${cacheKey}`);
    return res.json({ cached: false });
};

// Run cleanup every 30 minutes.
startTempCleanup();

/**
 * Convert HLS stream to MP4 using streaming (memory efficient)
 * Best for: Real-time download without waiting for full conversion
 */
const convertHlsToMp4Stream = async (req, res) => {
    const { hlsUrl, filename } = req.body;

    if (!hlsUrl) {
        return res.status(400).json({
            success: false,
            error: 'HLS URL is required'
        });
    }

    const outputFilename = filename || `video_${Date.now()}.mp4`;

    console.log(`[VideoConverter] Starting stream conversion: ${hlsUrl}`);

    // Set response headers for streaming download
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(outputFilename)}"`);
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');

    const passthrough = new PassThrough();
    passthrough.pipe(res);

    let ffmpegCommand = null;
    let isKilled = false;

    // Handle client disconnect
    req.on('close', () => {
        if (ffmpegCommand && !isKilled) {
            console.log('[VideoConverter] Client disconnected, killing ffmpeg process');
            isKilled = true;
            try {
                ffmpegCommand.kill('SIGKILL');
            } catch (err) {
                console.log('[VideoConverter] Error killing process:', err.message);
            }
        }
    });

    ffmpegCommand = ffmpeg(hlsUrl)
        .inputOptions([
            '-protocol_whitelist', 'file,http,https,tcp,tls,crypto',
            '-analyzeduration', '10000000',
            '-probesize', '10000000'
        ])
        .outputOptions([
            '-c:v', 'copy',           // Copy video codec (no re-encoding = fast)
            '-c:a', 'aac',            // Ensure audio is AAC
            '-bsf:a', 'aac_adtstoasc',
            '-movflags', 'frag_keyframe+empty_moov+faststart',
            '-f', 'mp4'
        ])
        .on('start', (commandLine) => {
            console.log('[VideoConverter] FFmpeg started:', commandLine);
        })
        .on('progress', (progress) => {
            if (progress.timemark) {
                console.log(`[VideoConverter] Progress: ${progress.timemark}`);
            }
        })
        .on('error', (err, stdout, stderr) => {
            // Ignore errors if we killed the process intentionally
            if (isKilled) {
                console.log('[VideoConverter] Process was killed intentionally');
                return;
            }
            console.error('[VideoConverter] FFmpeg error:', err.message);
            console.error('[VideoConverter] FFmpeg stderr:', stderr);

            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    error: 'Video conversion failed',
                    details: err.message
                });
            } else {
                passthrough.destroy();
            }
        })
        .on('end', () => {
            console.log('[VideoConverter] Conversion completed successfully');
        });

    // Start the ffmpeg process and pipe output
    const ffmpegStream = ffmpegCommand.pipe();
    ffmpegStream.pipe(passthrough, { end: true });
};

/**
 * Convert HLS to MP4 and save to temp file first
 * Best for: When you need to know file size before download
 * Returns download URL instead of streaming directly
 * 
 * Accepts either:
 * - hlsUrl: Direct HLS URL (may expire)
 * - playbackParams: { deviceCode, channelId, startTime, endTime } to fetch fresh URL
 */
const convertHlsToMp4File = async (req, res) => {
    const { hlsUrl, filename, playbackParams } = req.body;

    let finalHlsUrl = hlsUrl;

    // If playbackParams provided, fetch fresh HLS URL
    if (playbackParams && !hlsUrl) {
        try {
            finalHlsUrl = await fetchFreshHlsUrl(playbackParams);
            console.log(`[VideoConverter] Got fresh HLS URL: ${finalHlsUrl}`);
        } catch (err) {
            return res.status(400).json({
                success: false,
                error: 'Failed to get playback URL',
                details: err.message
            });
        }
    }

    if (!finalHlsUrl) {
        return res.status(400).json({
            success: false,
            error: 'HLS URL or playbackParams is required'
        });
    }

    const fileId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const outputFilename = filename || `video_${fileId}.mp4`;
    const tempFilePath = path.join(TEMP_DIR, `${fileId}.mp4`);

    console.log(`[VideoConverter] Starting file conversion: ${finalHlsUrl}`);
    console.log(`[VideoConverter] Output path: ${tempFilePath}`);

    try {
        await new Promise((resolve, reject) => {
            ffmpeg(finalHlsUrl)
                .inputOptions([
                    '-protocol_whitelist', 'file,http,https,tcp,tls,crypto',
                    '-reconnect', '1',
                    '-reconnect_streamed', '1',
                    '-reconnect_delay_max', '5',
                    '-timeout', '30000000',
                    '-rw_timeout', '30000000',
                    '-analyzeduration', '20000000',
                    '-probesize', '20000000',
                    '-fflags', '+genpts+discardcorrupt',
                    '-user_agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                ])
                .outputOptions([
                    '-c:v', 'copy',
                    '-c:a', 'aac',
                    '-bsf:a', 'aac_adtstoasc',
                    '-movflags', '+faststart',
                    '-max_muxing_queue_size', '1024'
                ])
                .on('start', (commandLine) => {
                    console.log('[VideoConverter] FFmpeg started:', commandLine);
                })
                .on('progress', (progress) => {
                    if (progress.percent) {
                        console.log(`[VideoConverter] Progress: ${Math.round(progress.percent)}%`);
                    }
                })
                .on('error', (err, stdout, stderr) => {
                    console.error('[VideoConverter] FFmpeg error:', err.message);
                    reject(err);
                })
                .on('end', () => {
                    console.log('[VideoConverter] Conversion completed');
                    resolve();
                })
                .save(tempFilePath);
        });

        // Get file stats
        const stats = fs.statSync(tempFilePath);

        res.json({
            success: true,
            fileId: fileId,
            filename: outputFilename,
            size: stats.size,
            downloadUrl: `/api_internal/download-video/${fileId}?filename=${encodeURIComponent(outputFilename)}`
        });

    } catch (err) {
        // Clean up failed conversion
        fs.removeSync(tempFilePath);

        res.status(500).json({
            success: false,
            error: 'Video conversion failed',
            details: err.message
        });
    }
};

/**
 * Download a previously converted video file
 */
const downloadConvertedVideo = async (req, res) => {
    const { fileId } = req.params;
    const { filename } = req.query;

    if (!fileId) {
        return res.status(400).json({
            success: false,
            error: 'File ID is required'
        });
    }

    const filePath = path.join(TEMP_DIR, `${fileId}.mp4`);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({
            success: false,
            error: 'File not found or expired'
        });
    }

    const stats = fs.statSync(filePath);
    const outputFilename = filename || `video_${fileId}.mp4`;

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(outputFilename)}"`);

    const readStream = fs.createReadStream(filePath);

    readStream.on('end', () => {
        // Delete file after successful download
        setTimeout(() => {
            fs.removeSync(filePath);
            console.log(`[VideoConverter] Cleaned up downloaded file: ${fileId}`);
        }, 5000);
    });

    readStream.on('error', (err) => {
        console.error('[VideoConverter] Read stream error:', err);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: 'Failed to read video file'
            });
        }
    });

    readStream.pipe(res);
};

/**
 * Check conversion status and get video info
 */
const getVideoInfo = async (req, res) => {
    const { hlsUrl } = req.body;

    if (!hlsUrl) {
        return res.status(400).json({
            success: false,
            error: 'HLS URL is required'
        });
    }

    try {
        res.json({
            success: true,
            ...(await probeVideoInfo(hlsUrl)),
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: 'Failed to get video info',
            details: err.message
        });
    }
};

/**
 * Download video as MP4 - All-in-one endpoint with caching
 * 1. Check if cached file exists (instant download if yes)
 * 2. Fetch fresh HLS URL from playback API
 * 3. Convert HLS to MP4 using FFmpeg (save to cache file for proper faststart)
 * 4. Stream MP4 file to client for download
 * 
 * Uses cache to avoid re-converting the same video within the configured cache duration
 * Uses temp file to enable faststart (moov atom at beginning) for seekable playback
 * 
 * Supports Range Requests for mobile resume download capability
 */
const downloadVideoAsMp4 = async (req, res) => {
    const { filename, playbackParams } = req.body;

    if (!playbackParams) {
        return res.status(400).json({
            success: false,
            error: 'playbackParams is required'
        });
    }

    const { deviceCode, channelId, startTime, endTime } = playbackParams;
    if (!deviceCode || !startTime || !endTime) {
        return res.status(400).json({
            success: false,
            error: 'deviceCode, startTime, and endTime are required'
        });
    }

    const parsedStartTime = parseTimeValue(startTime);
    const parsedEndTime = parseTimeValue(endTime);
    if (!isValidTimeRange(parsedStartTime, parsedEndTime)) {
        return res.status(400).json({
            success: false,
            error: INVALID_TIME_RANGE_ERROR
        });
    }

    const parsedPlaybackParams = {
        ...playbackParams,
        startTime: parsedStartTime,
        endTime: parsedEndTime
    };

    // Generate cache key from playback params
    const cacheKey = generateCacheKey(deviceCode, parsedStartTime, parsedEndTime);
    const cachedFilePath = path.join(TEMP_DIR, `${cacheKey}.mp4`);
    const convertingMarkerPath = path.join(TEMP_DIR, `${cacheKey}.converting`);
    const outputFilename = filename || `video_${cacheKey}.mp4`;

    // Step 1: Check if cached file exists and is valid
    // If background conversion is in progress, wait for it to complete (max 5 minutes)
    const isConverting = fs.existsSync(convertingMarkerPath);

    if (isConverting) {
        console.log(`[VideoConverter] Background conversion in progress, waiting for completion: ${cacheKey}`);

        // Wait for background conversion to complete (poll every 2 seconds, max 5 minutes)
        const maxWaitMs = 5 * 60 * 1000; // 5 minutes
        const pollIntervalMs = 2000; // 2 seconds
        const startTime = Date.now();

        while (fs.existsSync(convertingMarkerPath) && (Date.now() - startTime) < maxWaitMs) {
            await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
            console.log(`[VideoConverter] Still waiting for background conversion... (${Math.round((Date.now() - startTime) / 1000)}s)`);
        }

        // Check if conversion completed or timed out
        if (fs.existsSync(convertingMarkerPath)) {
            console.log(`[VideoConverter] Background conversion timed out, will convert fresh: ${cacheKey}`);
        } else {
            console.log(`[VideoConverter] Background conversion completed, checking cache: ${cacheKey}`);
        }
    }

    // Re-check cache after waiting (background conversion might have completed)
    if (!fs.existsSync(convertingMarkerPath) && fs.existsSync(cachedFilePath)) {
        try {
            const stats = fs.statSync(cachedFilePath);
            const ageMs = Date.now() - stats.mtimeMs;

            if (ageMs < CACHE_DURATION_MS) {
                console.log(`[VideoConverter] Cache HIT! Serving cached file: ${cacheKey}`);

                const fileSize = stats.size;
                const range = req.headers.range;

                // Support Range Requests for mobile resume download
                if (range) {
                    const parts = range.replace(/bytes=/, "").split("-");
                    const start = parseInt(parts[0], 10);
                    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                    const chunkSize = (end - start) + 1;

                    console.log(`[VideoConverter] Cache HIT with Range: ${cacheKey}, bytes ${start}-${end}/${fileSize}`);

                    res.writeHead(206, {
                        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                        'Accept-Ranges': 'bytes',
                        'Content-Length': chunkSize,
                        'Content-Type': 'video/mp4',
                        'Content-Disposition': `attachment; filename="${encodeURIComponent(outputFilename)}"`,
                        'X-Cache': 'HIT',
                        'X-Cache-Age-Minutes': Math.round(ageMs / 60000)
                    });

                    const readStream = fs.createReadStream(cachedFilePath, { start, end });
                    readStream.on('end', () => {
                        console.log(`[VideoConverter] Cached file range download completed: ${cacheKey}`);
                    });
                    readStream.pipe(res);
                    return;
                }

                // Full file download (no range)
                res.setHeader('Content-Type', 'video/mp4');
                res.setHeader('Content-Length', fileSize);
                res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(outputFilename)}"`);
                res.setHeader('Accept-Ranges', 'bytes');
                res.setHeader('X-Cache', 'HIT');
                res.setHeader('X-Cache-Age-Minutes', Math.round(ageMs / 60000));

                const readStream = fs.createReadStream(cachedFilePath);
                readStream.on('end', () => {
                    console.log(`[VideoConverter] Cached file download completed: ${cacheKey}`);
                });
                readStream.pipe(res);
                return;
            } else {
                // Cache expired, delete it
                fs.removeSync(cachedFilePath);
                console.log(`[VideoConverter] Cache expired, removed: ${cacheKey}`);
            }
        } catch (err) {
            console.error(`[VideoConverter] Error reading cached file: ${err.message}`);
        }
    }

    console.log(`[VideoConverter] Cache MISS. Converting: ${cacheKey}`);

    // Step 2: Fetch fresh HLS URL
    let hlsUrl;
    try {
        hlsUrl = await fetchFreshHlsUrl(parsedPlaybackParams);
        console.log(`[VideoConverter] Got HLS URL: ${hlsUrl}`);
    } catch (err) {
        return res.status(400).json({
            success: false,
            error: 'Failed to get playback URL',
            details: err.message
        });
    }

    // Step 3: Convert to cache file (required for faststart to work properly)
    console.log(`[VideoConverter] Starting download conversion: ${hlsUrl}`);
    console.log(`[VideoConverter] Cache file: ${cachedFilePath}`);

    let isAborted = false;

    // Handle client disconnect during conversion
    req.on('close', () => {
        if (!res.writableEnded) {
            console.log('[VideoConverter] Client disconnected during conversion');
            isAborted = true;
            // Clean up cache file if conversion was incomplete
            fs.remove(cachedFilePath).catch(() => { });
        }
    });

    try {
        // Convert HLS to MP4 with faststart (saves to cache file)
        await new Promise((resolve, reject) => {
            const command = ffmpeg(hlsUrl)
                .inputOptions([
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
                ])
                .outputOptions([
                    '-c:v', 'copy',
                    '-c:a', 'aac',
                    '-bsf:a', 'aac_adtstoasc',
                    '-movflags', '+faststart',  // Moves moov atom to beginning for seekable playback
                    '-max_muxing_queue_size', '1024'
                ])
                .on('start', (commandLine) => {
                    console.log('[VideoConverter] FFmpeg started:', commandLine);
                })
                .on('progress', (progress) => {
                    if (progress.timemark) {
                        console.log(`[VideoConverter] Progress: ${progress.timemark}`);
                    }
                    // Check if client disconnected
                    if (isAborted) {
                        command.kill('SIGKILL');
                    }
                })
                .on('error', (err, stdout, stderr) => {
                    if (isAborted) {
                        console.log('[VideoConverter] Conversion aborted by client');
                        return resolve(); // Don't reject, just resolve silently
                    }
                    console.error('[VideoConverter] FFmpeg error:', err.message);
                    console.error('[VideoConverter] FFmpeg stderr:', stderr);
                    reject(err);
                })
                .on('end', () => {
                    console.log('[VideoConverter] Conversion completed and cached');
                    resolve();
                })
                .save(cachedFilePath);
        });

        // Check if client disconnected during conversion
        if (isAborted) {
            fs.remove(cachedFilePath).catch(() => { });
            return;
        }

        // Step 4: Stream the converted/cached file to client
        const stats = fs.statSync(cachedFilePath);
        const fileSize = stats.size;
        const range = req.headers.range;

        // Support Range Requests for mobile resume download (freshly converted file)
        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunkSize = (end - start) + 1;

            console.log(`[VideoConverter] Fresh conversion with Range: ${cacheKey}, bytes ${start}-${end}/${fileSize}`);

            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
                'Content-Type': 'video/mp4',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(outputFilename)}"`,
                'X-Cache': 'MISS'
            });

            const readStream = fs.createReadStream(cachedFilePath, { start, end });
            readStream.on('end', () => {
                console.log(`[VideoConverter] Range download completed. File cached as: ${cacheKey}`);
            });
            readStream.on('error', (err) => {
                console.error('[VideoConverter] Read stream error:', err);
                if (!res.headersSent) {
                    res.status(500).json({
                        success: false,
                        error: 'Failed to stream video file'
                    });
                }
            });
            readStream.pipe(res);
            return;
        }

        // Full file download (no range)
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Length', fileSize);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(outputFilename)}"`);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('X-Cache', 'MISS');

        const readStream = fs.createReadStream(cachedFilePath);

        readStream.on('end', () => {
            console.log(`[VideoConverter] Download completed. File cached as: ${cacheKey}`);
            // DO NOT delete the file - keep it for cache
        });

        readStream.on('error', (err) => {
            console.error('[VideoConverter] Read stream error:', err);
            // Only remove if read failed (file might be corrupted)
            fs.remove(cachedFilePath).catch(() => { });
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    error: 'Failed to stream video file'
                });
            }
        });

        readStream.pipe(res);

    } catch (err) {
        // Clean up cache file on error
        fs.remove(cachedFilePath).catch(() => { });

        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: 'Video conversion failed',
                details: err.message
            });
        }
    }
};

/**
 * Stream cached video for playback in browser
 * Supports range requests for seeking
 */
const streamCachedVideo = async (req, res) => {
    const { cacheKey } = req.params;

    if (!cacheKey) {
        return res.status(400).json({ error: 'cacheKey required' });
    }

    const cachedFilePath = path.join(TEMP_DIR, `${cacheKey}.mp4`);

    if (!fs.existsSync(cachedFilePath)) {
        return res.status(404).json({ error: 'Cached file not found' });
    }

    try {
        const stats = fs.statSync(cachedFilePath);
        const fileSize = stats.size;

        // Check if cache is still valid
        const ageMs = Date.now() - stats.mtimeMs;
        if (ageMs >= CACHE_DURATION_MS) {
            fs.removeSync(cachedFilePath);
            return res.status(404).json({ error: 'Cache expired' });
        }

        const range = req.headers.range;

        if (range) {
            // Handle range request for seeking
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunkSize = (end - start) + 1;

            console.log(`[VideoConverter] Streaming cached video (range): ${cacheKey}, bytes ${start}-${end}`);

            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
                'Content-Type': 'video/mp4'
            });

            fs.createReadStream(cachedFilePath, { start, end }).pipe(res);
        } else {
            // Stream entire file
            console.log(`[VideoConverter] Streaming cached video (full): ${cacheKey}`);

            res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4',
                'Accept-Ranges': 'bytes'
            });

            fs.createReadStream(cachedFilePath).pipe(res);
        }
    } catch (err) {
        console.error(`[VideoConverter] Stream error: ${err.message}`);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to stream video' });
        }
    }
};

/**
 * Convert HLS to MP4 and cache in background (no download)
 * Called after user starts watching HLS playback
 * This allows next playback to be instant from cache
 * 
 * Supports both timestamp and datetime string format for startTime/endTime
 * channelId can be string format like "1000067$1$0$0"
 */
const convertAndCacheVideo = async (req, res) => {
    const { playbackParams } = req.body;

    if (!playbackParams) {
        return res.status(400).json({ success: false, error: 'playbackParams required' });
    }

    const { deviceCode, channelId, startTime, endTime } = playbackParams;
    if (!deviceCode || !startTime || !endTime) {
        return res.status(400).json({ success: false, error: 'Missing params' });
    }

    // Parse time values to support both formats
    const parsedStartTime = parseTimeValue(startTime);
    const parsedEndTime = parseTimeValue(endTime);
    if (!isValidTimeRange(parsedStartTime, parsedEndTime)) {
        return res.status(400).json({ success: false, error: INVALID_TIME_RANGE_ERROR });
    }

    // Generate default channelId if not provided: "deviceCode$1$0$0"
    const finalChannelId = channelId || `${deviceCode}$1$0$0`;

    const cacheKey = generateCacheKey(deviceCode, parsedStartTime, parsedEndTime);
    const cachedFilePath = path.join(TEMP_DIR, `${cacheKey}.mp4`);
    const convertingMarkerPath = path.join(TEMP_DIR, `${cacheKey}.converting`);

    // Check if conversion is already in progress
    if (fs.existsSync(convertingMarkerPath)) {
        console.log(`[VideoConverter] Conversion already in progress: ${cacheKey}`);
        return res.json({ success: true, cached: false, converting: true, cacheKey, message: 'Conversion already in progress' });
    }

    // Check if already cached
    if (fs.existsSync(cachedFilePath)) {
        const stats = fs.statSync(cachedFilePath);
        const ageMs = Date.now() - stats.mtimeMs;
        if (ageMs < CACHE_DURATION_MS) {
            console.log(`[VideoConverter] Already cached: ${cacheKey}`);
            return res.json({ success: true, cached: true, cacheKey, message: 'Already cached' });
        }
        // Expired, remove it
        fs.removeSync(cachedFilePath);
    }

    // Calculate expected duration in seconds for progress calculation
    const expectedDurationSec = (parsedEndTime - parsedStartTime) / 1000;

    let hlsUrl;
    try {
        hlsUrl = await fetchFreshHlsUrl({
            deviceCode,
            channelId: finalChannelId,
            startTime: parsedStartTime,
            endTime: parsedEndTime
        });
        console.log(`[VideoConverter] Background conversion - Got HLS URL: ${hlsUrl}`);
    } catch (err) {
        console.error(`[VideoConverter] Failed to prepare conversion: ${err.message}`);
        return res.status(502).json({
            success: false,
            error: err.message || 'Failed to prepare video conversion'
        });
    }
    
    // Create marker file to indicate conversion is in progress (format: "startTime|progress|expectedDuration")
    fs.writeFileSync(convertingMarkerPath, `${Date.now()}|0|${expectedDurationSec}`);
    console.log(`[VideoConverter] Created converting marker: ${cacheKey} (expected duration: ${expectedDurationSec}s)`);

    // Respond immediately - conversion happens in background
    res.json({ success: true, cached: false, converting: true, cacheKey, message: 'Conversion started in background' });

    // Start background conversion
    console.log(`[VideoConverter] Starting background conversion for cache: ${cacheKey}`);

    try {
        // Convert to MP4 in background
        await new Promise((resolve, reject) => {
            const ffmpegCommand = ffmpeg(hlsUrl)
                .inputOptions([
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
                ])
                .outputOptions([
                    '-c:v', 'copy',
                    '-c:a', 'aac',
                    '-bsf:a', 'aac_adtstoasc',
                    '-movflags', '+faststart',
                    '-max_muxing_queue_size', '1024'
                ])
                .on('start', (cmd) => {
                    console.log(`[VideoConverter] Background FFmpeg started: ${cacheKey}`);
                    // Store the command reference for potential cancellation
                    activeConversions.set(cacheKey, ffmpegCommand);
                })
                .on('progress', (progress) => {
                    let percent = 0;
                    
                    if (progress.percent !== undefined && progress.percent !== null) {
                        const rawPercent = Number(progress.percent);
                        percent = isNaN(rawPercent) ? 0 : rawPercent;
                    } else if (progress.timemark && expectedDurationSec > 0) {
                        // Calculate progress from timemark when percent is not available
                        const currentSec = parseTimemark(progress.timemark);
                        percent = (currentSec / expectedDurationSec) * 100;
                    }

                    percent = Math.round(percent);
                    percent = Math.min(99, Math.max(0, percent)); // Cap at 99% until complete

                    try {
                        const markerContent = fs.readFileSync(convertingMarkerPath, 'utf8');
                        const parts = markerContent.split('|');
                        const markerStartTime = parts[0];
                        const currentPercent = Number(parts[1]) || 0;
                        const duration = parts[2] || expectedDurationSec;
                        
                        // Only update if progress increased (avoid going backwards)
                        if (percent > currentPercent) {
                            fs.writeFileSync(convertingMarkerPath, `${markerStartTime}|${percent}|${duration}`);
                            console.log(`[VideoConverter] Background progress ${cacheKey}: ${percent}%`);
                        }
                    } catch (err) {
                        // Marker file might be deleted, ignore
                    }
                })
                .on('error', (err) => {
                    console.error(`[VideoConverter] Background conversion error: ${err.message}`);
                    // Remove from active conversions
                    activeConversions.delete(cacheKey);
                    // Remove marker and incomplete file on error
                    fs.remove(convertingMarkerPath).catch(() => { });
                    fs.remove(cachedFilePath).catch(() => { });
                    reject(err);
                })
                .on('end', () => {
                    // Remove from active conversions
                    activeConversions.delete(cacheKey);
                    // Remove marker file when conversion is complete
                    fs.remove(convertingMarkerPath).catch(() => { });
                    console.log(`[VideoConverter] Background conversion completed: ${cacheKey}`);
                    resolve();
                })
                .save(cachedFilePath);
        });

    } catch (err) {
        console.error(`[VideoConverter] Background conversion failed: ${err.message}`);
        // Remove marker and incomplete file on error
        fs.remove(convertingMarkerPath).catch(() => { });
        fs.remove(cachedFilePath).catch(() => { });
    }
};

/**
 * Mobile-friendly download endpoint using POST method
 * Supports resume download via Range header
 * 
 * Body params:
 * - deviceCode: Device code (e.g. "1000067")
 * - channelId: Channel ID string (e.g. "1000067$1$0$0", optional)
 * - startTime: Start time - timestamp or datetime string "YYYY-MM-DD HH:mm:ss"
 * - endTime: End time - timestamp or datetime string "YYYY-MM-DD HH:mm:ss"
 * - filename: Output filename (optional)
 * 
 * Example: POST /api_internal/download-video-mobile
 * Body: { "deviceCode": "1000067", "startTime": "2026-04-23 14:38:00", "endTime": "2026-04-23 14:40:00" }
 */
const downloadVideoMobile = async (req, res) => {
    const { deviceCode, channelId, startTime, endTime, filename } = req.body;

    if (!deviceCode || !startTime || !endTime) {
        return res.status(400).json({
            success: false,
            error: 'deviceCode, startTime, and endTime are required'
        });
    }

    // Parse time values using shared helper
    const parsedStartTime = parseTimeValue(startTime);
    const parsedEndTime = parseTimeValue(endTime);
    if (!isValidTimeRange(parsedStartTime, parsedEndTime)) {
        return res.status(400).json({
            success: false,
            error: INVALID_TIME_RANGE_ERROR
        });
    }

    // Generate default channelId if not provided: "deviceCode$1$0$0"
    const finalChannelId = channelId || `${deviceCode}$1$0$0`;

    const playbackParams = {
        deviceCode,
        channelId: finalChannelId,
        startTime: parsedStartTime,
        endTime: parsedEndTime
    };

    // Generate cache key from playback params (use parsed time for consistent cache key)
    const cacheKey = generateCacheKey(deviceCode, parsedStartTime, parsedEndTime);
    const cachedFilePath = path.join(TEMP_DIR, `${cacheKey}.mp4`);
    const convertingMarkerPath = path.join(TEMP_DIR, `${cacheKey}.converting`);
    const outputFilename = filename || `video_${cacheKey}.mp4`;

    // Check if conversion is in progress
    if (fs.existsSync(convertingMarkerPath)) {
        let progress = 0;
        try {
            const markerContent = fs.readFileSync(convertingMarkerPath, 'utf8');
            const parts = markerContent.split('|');
            if (parts.length >= 2) {
                progress = parseInt(parts[1]) || 0;
            }
        } catch (err) { }

        return res.status(202).json({
            success: false,
            converting: true,
            progress,
            message: 'Video is being converted, please try again later'
        });
    }

    // Check if cached file exists
    if (fs.existsSync(cachedFilePath)) {
        try {
            const stats = fs.statSync(cachedFilePath);
            const ageMs = Date.now() - stats.mtimeMs;

            if (ageMs < CACHE_DURATION_MS) {
                const fileSize = stats.size;
                const range = req.headers.range;

                // Support Range Requests for resume download
                if (range) {
                    const parts = range.replace(/bytes=/, "").split("-");
                    const start = parseInt(parts[0], 10);
                    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                    const chunkSize = (end - start) + 1;

                    console.log(`[VideoConverter] Mobile download with Range: ${cacheKey}, bytes ${start}-${end}/${fileSize}`);

                    res.writeHead(206, {
                        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                        'Accept-Ranges': 'bytes',
                        'Content-Length': chunkSize,
                        'Content-Type': 'video/mp4',
                        'Content-Disposition': `attachment; filename="${encodeURIComponent(outputFilename)}"`
                    });

                    fs.createReadStream(cachedFilePath, { start, end }).pipe(res);
                    return;
                }

                // Full file download
                console.log(`[VideoConverter] Mobile download (full): ${cacheKey}`);

                res.setHeader('Content-Type', 'video/mp4');
                res.setHeader('Content-Length', fileSize);
                res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(outputFilename)}"`);
                res.setHeader('Accept-Ranges', 'bytes');

                fs.createReadStream(cachedFilePath).pipe(res);
                return;
            } else {
                // Cache expired
                fs.removeSync(cachedFilePath);
            }
        } catch (err) {
            console.error(`[VideoConverter] Mobile download error: ${err.message}`);
        }
    }

    // File not cached - return 404 with instruction to start conversion first
    return res.status(404).json({
        success: false,
        cached: false,
        cacheKey,
        message: 'Video not cached. Please call /api_internal/convert-and-cache first to start background conversion.'
    });
};

/**
 * Cancel an ongoing background conversion
 * Kills the ffmpeg process and cleans up marker/incomplete files
 */
const cancelConversion = async (req, res) => {
    const { playbackParams } = req.body;

    if (!playbackParams) {
        return res.status(400).json({ success: false, error: 'playbackParams required' });
    }

    const { deviceCode, startTime, endTime } = playbackParams;
    if (!deviceCode || !startTime || !endTime) {
        return res.status(400).json({ success: false, error: 'Missing params' });
    }

    // Parse time values to support both formats
    const parsedStartTime = parseTimeValue(startTime);
    const parsedEndTime = parseTimeValue(endTime);
    if (!isValidTimeRange(parsedStartTime, parsedEndTime)) {
        return res.status(400).json({ success: false, error: INVALID_TIME_RANGE_ERROR });
    }

    const cacheKey = generateCacheKey(deviceCode, parsedStartTime, parsedEndTime);
    const cachedFilePath = path.join(TEMP_DIR, `${cacheKey}.mp4`);
    const convertingMarkerPath = path.join(TEMP_DIR, `${cacheKey}.converting`);

    console.log(`[VideoConverter] Cancel conversion requested: ${cacheKey}`);

    // Check if conversion is active
    const ffmpegCommand = activeConversions.get(cacheKey);
    
    if (ffmpegCommand) {
        try {
            // Kill the ffmpeg process
            ffmpegCommand.kill('SIGKILL');
            console.log(`[VideoConverter] Killed ffmpeg process: ${cacheKey}`);
        } catch (err) {
            console.error(`[VideoConverter] Error killing ffmpeg: ${err.message}`);
        }
        activeConversions.delete(cacheKey);
    }

    // Clean up marker file
    if (fs.existsSync(convertingMarkerPath)) {
        fs.remove(convertingMarkerPath).catch(() => { });
        console.log(`[VideoConverter] Removed marker file: ${cacheKey}`);
    }

    // Clean up incomplete mp4 file
    if (fs.existsSync(cachedFilePath)) {
        fs.remove(cachedFilePath).catch(() => { });
        console.log(`[VideoConverter] Removed incomplete file: ${cacheKey}`);
    }

    return res.json({ 
        success: true, 
        cacheKey, 
        message: 'Conversion cancelled and files cleaned up' 
    });
};

module.exports = {
    convertHlsToMp4Stream,
    convertHlsToMp4File,
    downloadConvertedVideo,
    downloadVideoAsMp4,
    downloadVideoMobile,
    checkVideoCache,
    streamCachedVideo,
    convertAndCacheVideo,
    cancelConversion,
    getVideoInfo
};
