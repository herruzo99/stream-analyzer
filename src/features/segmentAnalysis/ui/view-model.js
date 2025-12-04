/**
 * Extracts high-level ISOBMFF metadata (Video/Audio tracks, Duration).
 */
function getIsobmffSummary(data) {
    const boxes = data.boxes || [];
    const moov = boxes.find((b) => b.type === 'moov');
    const mvhd = moov?.children.find((b) => b.type === 'mvhd');

    // Heuristic to find tracks
    const traks = moov?.children.filter((b) => b.type === 'trak') || [];
    let videoTrack = null;
    let audioTrack = null;

    for (const trak of traks) {
        const mdia = trak.children.find((b) => b.type === 'mdia');
        const hdlr = mdia?.children.find((b) => b.type === 'hdlr');
        const handlerType = hdlr?.details?.handler_type?.value;

        if (handlerType === 'vide') videoTrack = trak;
        if (handlerType === 'soun') audioTrack = trak;
    }

    // If fragmented (no moov), look at top-level sidx or emsg
    const isFragmented = !moov;
    const segmentType = isFragmented
        ? 'Fragment (moof/mdat)'
        : 'Initialization (moov)';

    return {
        timescale: mvhd?.details?.timescale?.value || 0,
        duration: mvhd?.details?.duration_seconds?.value || 0,
        trackCount: traks.length,
        videoTrack,
        audioTrack,
        segmentType,
    };
}

function analyzeBitstream(parsedData) {
    if (!parsedData.bitstreamAnalysis) return null;

    // FIX: Extract seiMessages from the worker result
    const { frames, summary, seiMessages } = parsedData.bitstreamAnalysis;

    const distribution = { I: 0, P: 0, B: 0, Other: 0 };
    frames.forEach((f) => {
        if (f.isKeyFrame) distribution.I++;
        else if (f.type.includes('P')) distribution.P++;
        else if (f.type.includes('B')) distribution.B++;
        else distribution.Other++;
    });

    return {
        ...summary,
        distribution,
        frames,
        seiMessages, // Pass through to UI
    };
}

/**
 * Creates the view model for the segment analysis UI.
 * @param {object} parsedData - The parsed segment structure.
 * @param {number} rawDataSize - The size of the raw segment in bytes.
 * @param {string|null} manifestCodec - Optional codec string derived from the manifest (fallback).
 */
export function createSegmentAnalysisViewModel(
    parsedData,
    rawDataSize,
    manifestCodec = null
) {
    const format = parsedData.format;

    // 1. Base Stats
    const stats = {
        fileSize: rawDataSize,
        formatLabel: format.toUpperCase(),
        duration: 0,
        avgBitrate: 0,
        type: 'Unknown',
        mimeType: 'application/octet-stream',
    };

    // 2. Format-Specific Extraction
    let codecInfo = {
        name: 'Unknown',
        profile: '-',
        resolution: '-',
        details: [],
    };

    if (format === 'isobmff') {
        stats.formatLabel = 'ISOBMFF (MP4)';
        const isoSummary = getIsobmffSummary(parsedData.data);
        stats.type = isoSummary.segmentType;

        // Codec detection via sample entries (avc1, hvc1, mp4a)
        // This is a simplified lookup in the parsed structure
        const jsonStr = JSON.stringify(parsedData.data); // Quick scan
        if (jsonStr.includes('"type":"avc1"')) codecInfo.name = 'H.264 (AVC)';
        else if (jsonStr.includes('"type":"hvc1"'))
            codecInfo.name = 'H.265 (HEVC)';
        else if (jsonStr.includes('"type":"mp4a"'))
            codecInfo.name = 'AAC Audio';

        // Calculate duration from samples if available (accurate for fragments)
        if (parsedData.samples?.length > 0) {
            const timescale = parsedData.samples[0].timescale || 90000;
            const durationTicks = parsedData.samples.reduce(
                (acc, s) => acc + s.duration,
                0
            );
            stats.duration = durationTicks / timescale;
        } else {
            const parsedDuration = parseFloat(isoSummary.duration);
            stats.duration = !isNaN(parsedDuration) ? parsedDuration : 0;
        }

        // Fallback to manifest codec if internal inspection failed (e.g. missing init segment)
        if (stats.type.includes('Fragment') && codecInfo.name === 'Unknown') {
            if (manifestCodec) {
                // Map common MIME codecs to friendly names
                if (manifestCodec.startsWith('avc'))
                    codecInfo.name = `H.264 (${manifestCodec})`;
                else if (
                    manifestCodec.startsWith('hvc') ||
                    manifestCodec.startsWith('hev')
                )
                    codecInfo.name = `HEVC (${manifestCodec})`;
                else if (manifestCodec.startsWith('mp4a'))
                    codecInfo.name = `AAC (${manifestCodec})`;
                else codecInfo.name = manifestCodec;

                codecInfo.details.push('From Manifest');
            } else {
                codecInfo.name = 'Unknown (Missing Init)';
            }
        }
    } else if (format === 'ts') {
        stats.formatLabel = 'MPEG-TS';
        stats.type = 'Transport Stream';

        const mediaInfo = parsedData.mediaInfo;
        if (mediaInfo?.video) {
            codecInfo.name = mediaInfo.video.codec;
            codecInfo.resolution = mediaInfo.video.resolution;
            codecInfo.details.push(`${mediaInfo.video.frameRate} fps`);
        } else if (mediaInfo?.audio) {
            codecInfo.name = mediaInfo.audio.codec;
            codecInfo.details.push(`${mediaInfo.audio.sampleRate} Hz`);
            codecInfo.details.push(`${mediaInfo.audio.channels} Ch`);
        }

        // TS doesn't have a global duration header easily accessible without scan
        // We assume the calling context (Explorer) might provide it, or we accept 0.
    } else if (format === 'vtt') {
        stats.formatLabel = 'WebVTT';
        stats.type = 'Subtitle';
        codecInfo.name = 'Text';
        if (parsedData.data.cues.length > 0) {
            const lastCue =
                parsedData.data.cues[parsedData.data.cues.length - 1];
            const firstCue = parsedData.data.cues[0];
            stats.duration = lastCue.endTime - firstCue.startTime;
        }
    } else if (format === 'scte35') {
        stats.formatLabel = 'SCTE-35';
        stats.type = 'Binary Signal';
        codecInfo.name = 'Splice Info';
    }

    // 3. Bitrate Calculation
    if (stats.duration > 0 && stats.fileSize > 0) {
        stats.avgBitrate = (stats.fileSize * 8) / stats.duration;
    }

    // 4. Bitstream Analysis (GOP)
    const bitstream = analyzeBitstream(parsedData);

    return {
        stats,
        codecInfo,
        bitstream,
        structure: parsedData.data,
        issues: parsedData.data.issues || [],
        format,
    };
}
