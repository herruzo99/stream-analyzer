/**
 * Parses segment URLs from a parsed HLS media playlist object.
 * @param {object} parsedMediaPlaylist The parsed HLS media playlist data.
 * @param {number} [startTime=0] The starting time in seconds for the first segment.
 * @returns {Record<string, object[]>} A map of a single key to the segment list.
 */
export function parseAllSegmentUrls(parsedMediaPlaylist, startTime = 0) {
    if (!parsedMediaPlaylist || !parsedMediaPlaylist.segments) {
        return {};
    }

    const segments = [];
    const mediaSequence = parsedMediaPlaylist.mediaSequence || 0;
    let currentTime = startTime;
    const hlsTimescale = 90000; // HLS uses a 90kHz clock

    // Handle initialization segment if present
    if (parsedMediaPlaylist.map) {
        segments.push({
            repId: 'hls-media',
            type: 'Init',
            number: 0,
            resolvedUrl: new URL(
                parsedMediaPlaylist.map.URI,
                parsedMediaPlaylist.baseUrl
            ).href,
            template: parsedMediaPlaylist.map.URI,
            time: -1,
            duration: 0,
            timescale: hlsTimescale,
        });
    }

    parsedMediaPlaylist.segments.forEach((seg, index) => {
        segments.push({
            repId: 'hls-media',
            type: 'Media',
            number: mediaSequence + index,
            resolvedUrl: seg.resolvedUri,
            template: seg.uri,
            time: Math.round(currentTime * hlsTimescale),
            duration: Math.round(seg.duration * hlsTimescale),
            timescale: hlsTimescale,
            dateTime: seg.dateTime,
        });
        currentTime += seg.duration;
    });

    // A single media playlist is treated as one "Representation" in our model
    return {
        'media-playlist': segments,
    };
}