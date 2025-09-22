
/**
 * @typedef {import('../../core/state.js').Manifest} Manifest
 * @typedef {import('../../core/state.js').Period} Period
 * @typedef {import('../../core/state.js').AdaptationSet} AdaptationSet
 * @typedef {import('../../core/state.js').Representation} Representation
 */
import { getDrmSystemName } from '../../shared/utils/drm.js';

/**
 * Transforms a parsed HLS manifest object into a protocol-agnostic Intermediate Representation (IR).
 * @param {object} hlsParsed - The parsed HLS manifest data from the parser.
 * @returns {Manifest} The manifest IR object.
 */
export function adaptHlsToIr(hlsParsed) {
    /** @type {Manifest} */
    const manifestIR = {
        type: hlsParsed.isLive ? 'dynamic' : 'static',
        profiles: `HLS v${hlsParsed.version}`,
        minBufferTime: hlsParsed.targetDuration || 0,
        publishTime: null,
        availabilityStartTime: null,
        timeShiftBufferDepth: null,
        minimumUpdatePeriod: hlsParsed.isLive
            ? hlsParsed.targetDuration
            : null,
        duration: hlsParsed.segments.reduce(
            (sum, seg) => sum + seg.duration,
            0
        ),
        segmentFormat: hlsParsed.map ? 'isobmff' : 'ts',
        periods: [],
        rawElement: hlsParsed,
    };

    // For HLS, we treat the entire playlist as a single Period.
    const periodIR = {
        id: 'hls-period-0',
        start: 0,
        duration: manifestIR.duration,
        adaptationSets: [],
    };

    if (hlsParsed.isMaster) {
        // In a Master Playlist, EXT-X-STREAM-INF defines variants, which we map to AdaptationSets.
        // EXT-X-MEDIA defines renditions, which we group by their GROUP-ID.
        const mediaGroups = hlsParsed.media.reduce((acc, media) => {
            const groupId = media['GROUP-ID'];
            if (!acc[groupId]) {
                acc[groupId] = [];
            }
            acc[groupId].push(media);
            return acc;
        }, {});

        hlsParsed.variants.forEach((variant, index) => {
            const resolution = variant.attributes.RESOLUTION;
            const asIR = {
                id: `variant-${index}`,
                contentType: resolution ? 'video' : 'audio',
                lang: null,
                mimeType: hlsParsed.map ? 'video/mp4' : 'video/mp2t',
                representations: [],
                contentProtection: [], // Master playlists can have session keys
            };

            const repIR = {
                id: `variant-${index}-rep-0`,
                codecs: variant.attributes.CODECS,
                bandwidth: variant.attributes.BANDWIDTH,
                width: resolution
                    ? parseInt(String(resolution).split('x')[0], 10)
                    : null,
                height: resolution
                    ? parseInt(String(resolution).split('x')[1], 10)
                    : null,
            };
            asIR.representations.push(repIR);
            periodIR.adaptationSets.push(asIR);

            // Find associated audio/subtitle renditions and add them as separate AdaptationSets
            const audioGroupId = variant.attributes.AUDIO;
            if (audioGroupId && mediaGroups[audioGroupId]) {
                mediaGroups[audioGroupId].forEach((media, mediaIndex) => {
                    periodIR.adaptationSets.push({
                        id: `audio-rendition-${audioGroupId}-${mediaIndex}`,
                        contentType: 'audio',
                        lang: media.LANGUAGE,
                        mimeType: 'audio/mp2t',
                        representations: [], // In IR, these are just AS-level properties
                        contentProtection: [],
                    });
                });
            }
        });
    } else {
        // For a Media Playlist, create a single virtual AdaptationSet and Representation.
        const asIR = {
            id: 'media-0',
            contentType: 'video', // Assume video content if not specified
            lang: null,
            mimeType: hlsParsed.map ? 'video/mp4' : 'video/mp2t',
            representations: [
                {
                    id: 'media-0-rep-0',
                    codecs: null, // Not available at this level
                    bandwidth: 0, // Not available at this level
                    width: null,
                    height: null,
                },
            ],
            contentProtection: [],
        };
        // Check for encryption in media playlist
        const keyTag = hlsParsed.segments.find((s) => s.key)?.key;
        if (keyTag && keyTag.METHOD !== 'NONE') {
            asIR.contentProtection.push({
                schemeIdUri: keyTag.KEYFORMAT || 'identity',
                system: keyTag.METHOD,
            });
        }
        periodIR.adaptationSets.push(asIR);
    }

    manifestIR.periods.push(periodIR);
    return manifestIR;
}