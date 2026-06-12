const ffmpeg = require("fluent-ffmpeg");

function parseFps(frameRate) {
  if (!frameRate || typeof frameRate !== "string") {
    return null;
  }

  const [numeratorValue, denominatorValue] = frameRate.split("/");
  const numerator = Number(numeratorValue);
  const denominator = denominatorValue === undefined ? 1 : Number(denominatorValue);

  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return null;
  }

  return numerator / denominator;
}

async function probeVideoInfo(hlsUrl) {
  const metadata = await new Promise((resolve, reject) => {
    ffmpeg.ffprobe(hlsUrl, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });

  const videoStream = metadata.streams.find((stream) => stream.codec_type === "video");
  const audioStream = metadata.streams.find((stream) => stream.codec_type === "audio");

  return {
    duration: metadata.format.duration,
    size: metadata.format.size,
    bitrate: metadata.format.bit_rate,
    video: videoStream
      ? {
          codec: videoStream.codec_name,
          width: videoStream.width,
          height: videoStream.height,
          fps: parseFps(videoStream.r_frame_rate),
        }
      : null,
    audio: audioStream
      ? {
          codec: audioStream.codec_name,
          sampleRate: audioStream.sample_rate,
          channels: audioStream.channels,
        }
      : null,
  };
}

module.exports = {
  parseFps,
  probeVideoInfo,
};
