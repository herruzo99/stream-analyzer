import { inferMediaInfoFromExtension } from '@/infrastructure/parsing/utils/media-types';

const MAX_HISTORY_PER_TRACK = 2000;

export class SegmentExplorerEngine {
    constructor() {
        this._cache = {
            streamId: null,
            activeTab: null,
            lastUpdateSignature: null,
            result: null,
        };
        this._streamHistory = new Map();
    }

    _createSignature(stream, activeTab) {
        if (!stream) return null;
        let sig = `${stream.id}-${activeTab}-${stream.protocol}`;
        const latestUpdate = stream.manifestUpdates?.[0];
        if (latestUpdate) {
            const seq =
                latestUpdate.endSequenceNumber || latestUpdate.sequenceNumber;
            const ts = latestUpdate.endTimestamp || latestUpdate.timestamp;
            sig += `-${latestUpdate.id}-${seq}-${ts}`;
        }

        let totalSegments = 0;
        if (stream.protocol === 'dash') {
            for (const state of stream.dashRepresentationState.values()) {
                totalSegments += state.segments.length;
            }
        } else if (stream.protocol === 'hls') {
            for (const state of stream.hlsVariantState.values()) {
                totalSegments += state.segments.length;
            }
        }

        sig += `-${totalSegments}`;
        return sig;
    }

    _getContentType(stream, repId) {
        if (stream.protocol === 'dash') {
            for (const p of stream.manifest.periods) {
                for (const as of p.adaptationSets) {
                    if (as.representations.some((r) => r.id === repId)) {
                        if (as.contentType) return as.contentType;
                        if (as.mimeType) return as.mimeType.split('/')[0];
                        // Check Rep mimeType
                        const rep = as.representations.find(
                            (r) => r.id === repId
                        );
                        if (rep?.mimeType) return rep.mimeType.split('/')[0];
                    }
                }
            }
        }
        return 'unknown';
    }

    _getHlsContentType(stream, trackId) {
        if (!stream.manifest || !stream.manifest.periods) return null;

        for (const p of stream.manifest.periods) {
            for (const as of p.adaptationSets) {
                // Check if the AdaptationSet ID matches (e.g. "audio-group-1")
                if (as.id === trackId) return as.contentType;

                // Check if any Representation ID matches (e.g. "English")
                if (as.representations.some(r => r.id === trackId)) {
                    return as.contentType;
                }
            }
        }
        return null;
    }

    /**
     * Splits a list of codecs into video and audio components.
     * @param {string[]} codecs Array of codec strings (e.g. ['avc1.4d401e', 'mp4a.40.2'])
     */
    _parseCodecs(codecs) {
        const videoPrefixes = [
            'avc',
            'hvc',
            'hev',
            'dvh',
            'vp9',
            'vp09',
            'av01',
            'mp4v',
        ];
        const audioPrefixes = [
            'mp4a',
            'ac-3',
            'ec-3',
            'opus',
            'flac',
            'alac',
        ];

        let video = null;
        let audio = null;

        codecs.forEach((c) => {
            const lower = c.toLowerCase();
            if (videoPrefixes.some((p) => lower.startsWith(p))) {
                video = c;
            } else if (audioPrefixes.some((p) => lower.startsWith(p))) {
                audio = c;
            }
        });

        return { video, audio };
    }

    /**
     * Extracts a short, meaningful file identity from a full URL.
     * E.g. "http://foo.com/video/hls/level1/index.m3u8" -> "level1/index.m3u8"
     */
    _extractFileIdentity(url) {
        if (!url) return null;
        try {
            const urlObj = new URL(url);
            const parts = urlObj.pathname.split('/').filter(Boolean);
            if (parts.length === 0) return url;

            const filename = parts[parts.length - 1];
            // If there's a parent folder, include it for context (often holds bitrate/id)
            if (parts.length > 1) {
                const parent = parts[parts.length - 2];
                return `${parent}/${filename}`;
            }
            return filename;
        } catch (_e) {
            return url;
        }
    }

    _calculateAverageBitrate(track) {
        if (!track || !track.historyMap || track.historyMap.size === 0) {
            return 0;
        }

        let totalBytes = 0;
        let totalDuration = 0;
        let count = 0;
        const SAMPLE_LIMIT = 50; // Use up to 50 segments for estimation

        // Iterate backwards for live streams to get the most recent segments
        const segments = Array.from(track.historyMap.values()).reverse();

        for (const seg of segments) {
            if (count >= SAMPLE_LIMIT) break;
            if (seg.size && seg.duration && seg.timescale) {
                totalBytes += seg.size;
                totalDuration += seg.duration / seg.timescale;
                count++;
            }
        }

        if (totalDuration > 0) {
            return Math.round((totalBytes * 8) / totalDuration);
        }

        return 0;
    }

    _getTrackMeta(stream, repId) {
        const getGenericMeta = () => ({
            contentType: 'unknown',
            primaryCodec: 'Unknown',
            secondaryCodec: null,
            resolution: null,
            lang: null,
            bandwidth: 0,
            repId: 'unknown',
            fileIdentity: null,
        });

        if (stream.protocol === 'dash') {
            for (const p of stream.manifest.periods) {
                for (const as of p.adaptationSets) {
                    const rep = as.representations.find((r) => r.id === repId);
                    if (rep) {
                        const allCodecs = [
                            ...(rep.codecs || []),
                            ...(as.codecs || []),
                        ].map((c) => c.value);
                        const { video, audio } = this._parseCodecs(allCodecs);
                        const contentType =
                            as.contentType ||
                            (as.mimeType
                                ? as.mimeType.split('/')[0]
                                : 'unknown');

                        let primaryCodec = null,
                            secondaryCodec = null,
                            resolution = null;

                        const summaryTrack = stream.manifest?.summary?.[`${contentType}Tracks`]?.find(t => t.id === rep.id);

                        if (contentType === 'video') {
                            primaryCodec = summaryTrack?.format || video;
                            secondaryCodec = audio;
                            if (rep.width?.value && rep.height?.value) {
                                resolution = `${rep.width.value}x${rep.height.value}`;
                            }
                        } else if (contentType === 'audio') {
                            primaryCodec = audio || allCodecs[0] || 'Audio';
                        } else if (
                            contentType === 'text' ||
                            contentType === 'application'
                        ) {
                            primaryCodec = allCodecs[0] || 'Text';
                        }

                        let sourceUrl = null;
                        const repState = stream.dashRepresentationState.get(
                            `${p.id || 0}-${repId}`
                        );
                        if (repState) {
                            if (repState.initSegment)
                                sourceUrl = repState.initSegment.resolvedUrl;
                            else if (repState.segments.length > 0)
                                sourceUrl = repState.segments[0].resolvedUrl;
                        }

                        return {
                            contentType,
                            label: summaryTrack?.label || rep.id,
                            primaryCodec,
                            secondaryCodec,
                            resolution,
                            lang: as.lang,
                            bandwidth: rep.bandwidth,
                            repId,
                            fileIdentity: this._extractFileIdentity(sourceUrl),
                        };
                    }
                }
            }
        } else if (stream.protocol === 'hls') {
            for (const as of stream.manifest.periods[0]?.adaptationSets || []) {
                const rep = as.representations.find((r) => r.id === repId);

                if (rep) {
                    const mediaTagValue = rep.serializedManifest?.value || {};
                    const label = mediaTagValue.NAME || rep.lang || rep.id;
                    const contentType = as.contentType || 'unknown';
                    const allCodecs = (rep.codecs || []).map((c) => c.value);
                    const summaryTrack = stream.manifest?.summary?.[`${contentType}Tracks`]?.find(t => t.id === rep.id);

                    let primaryCodec = null,
                        secondaryCodec = null,
                        resolution = null;

                    if (contentType === 'video') {
                        const { video, audio } = this._parseCodecs(allCodecs);
                        primaryCodec = video;
                        secondaryCodec = audio;
                        if (rep.width?.value && rep.height?.value) {
                            resolution = `${rep.width.value}x${rep.height.value}`;
                        }
                    } else if (contentType === 'audio') {
                        const { audio } = this._parseCodecs(allCodecs);
                        primaryCodec = audio || allCodecs[0] || 'Audio';
                    } else if (
                        contentType === 'text' ||
                        contentType === 'subtitles' ||
                        contentType === 'application'
                    ) {
                        primaryCodec = summaryTrack?.format || rep.format || allCodecs[0] || 'Text';
                    }

                    return {
                        contentType,
                        label: summaryTrack?.label || label,
                        primaryCodec,
                        secondaryCodec,
                        resolution,
                        lang: rep.lang || as.lang || null,
                        bandwidth: rep.bandwidth || 0,
                        repId,
                        fileIdentity: this._extractFileIdentity(
                            rep.__variantUri
                        ),
                    };
                }
            }
        }

        return getGenericMeta();
    }

    /**
     * Updates the persistent segment history.
     */
    _updateHistory(
        streamId,
        compositeKey,
        segmentsFromStore,
        activeUrlSet,
        isDynamic
    ) {
        if (!this._streamHistory.has(streamId)) {
            this._streamHistory.set(streamId, new Map());
        }
        const streamHistory = this._streamHistory.get(streamId);

        if (!streamHistory.has(compositeKey)) {
            streamHistory.set(compositeKey, new Map());
        }
        const segmentHistory = streamHistory.get(compositeKey);

        // 1. Merge incoming segments from the store
        segmentsFromStore.forEach((seg) => {
            if (seg.type === 'Media') {
                const isStale = isDynamic
                    ? !activeUrlSet.has(seg.uniqueId)
                    : false;

                const timelineId =
                    typeof seg.number === 'number'
                        ? `${seg.number}_${seg.uniqueId}`
                        : `${seg.time}_${seg.uniqueId}`;

                segmentHistory.set(timelineId, {
                    ...seg,
                    timelineId,
                    _isStale: isStale,
                });
            }
        });

        // 2. Re-evaluate stale status for existing history items
        if (isDynamic) {
            for (const [key, seg] of segmentHistory.entries()) {
                const shouldBeStale = !activeUrlSet.has(seg.uniqueId);
                if (seg._isStale !== shouldBeStale) {
                    segmentHistory.set(key, {
                        ...seg,
                        _isStale: shouldBeStale,
                    });
                }
            }
        }

        // 3. Prune history
        if (segmentHistory.size > MAX_HISTORY_PER_TRACK) {
            const entries = Array.from(segmentHistory.entries());
            // Sort by number if available, or time
            entries.sort((a, b) => {
                if (typeof a[1].number === 'number' && typeof b[1].number === 'number') {
                    return a[1].number - b[1].number;
                }
                return a[1].time - b[1].time;
            });
            const toRemoveCount = segmentHistory.size - MAX_HISTORY_PER_TRACK;
            for (let i = 0; i < toRemoveCount; i++) {
                segmentHistory.delete(entries[i][0]);
            }
        }

        return segmentHistory;
    }

    process(stream, activeTab) {
        if (!stream) return null;

        const signature = this._createSignature(stream, activeTab);
        if (
            this._cache.result &&
            this._cache.lastUpdateSignature === signature
        ) {
            return this._cache.result;
        }

        const isDynamic = stream.manifest.type === 'dynamic';

        const allowedTypes = new Set();
        if (activeTab === 'video') allowedTypes.add('video');
        if (activeTab === 'audio') allowedTypes.add('audio');
        if (activeTab === 'text') {
            allowedTypes.add('text');
            allowedTypes.add('application');
            allowedTypes.add('subtitles');
            allowedTypes.add('closed-captions');
        }

        const groupedTracks = new Map();

        if (stream.protocol === 'dash') {
            for (const [
                key,
                repState,
            ] of stream.dashRepresentationState.entries()) {
                let repId = 'unknown';
                const sampleSeg = repState.segments.find(
                    (s) => s.type === 'Media'
                );
                if (sampleSeg) {
                    repId = sampleSeg.repId;
                } else {
                    const parts = key.split('-');
                    if (parts.length > 1) repId = parts.slice(1).join('-');
                }

                const contentType = this._getContentType(stream, repId);

                if (allowedTypes.has(contentType)) {
                    const currentUrls =
                        repState.currentSegmentUrls || new Set();

                    const fragmentHistory = this._updateHistory(
                        stream.id,
                        key,
                        repState.segments,
                        currentUrls,
                        isDynamic
                    );

                    if (!groupedTracks.has(repId)) {
                        groupedTracks.set(repId, {
                            id: repId,
                            label: repId,
                            meta: this._getTrackMeta(stream, repId),
                            historyMap: new Map(),
                            newlyAdded: new Set(),
                            bandwidth: 0,
                            initSegment: null,
                        });
                    }
                    const group = groupedTracks.get(repId);

                    for (const [
                        timelineId,
                        seg,
                    ] of fragmentHistory.entries()) {
                        group.historyMap.set(timelineId, seg);
                    }

                    if (repState.newlyAddedSegmentUrls) {
                        for (const url of repState.newlyAddedSegmentUrls)
                            group.newlyAdded.add(url);
                    }

                    // Bandwidth update logic for DASH
                    if (group.meta.bandwidth > group.bandwidth)
                        group.bandwidth = group.meta.bandwidth;

                    const init = repState.segments.find(
                        (s) => s.type === 'Init'
                    );
                    if (init) group.initSegment = init;
                }
            }
        } else if (stream.protocol === 'hls') {
            for (const [
                variantId,
                variantState,
            ] of stream.hlsVariantState.entries()) {
                let effectiveType = 'video';

                // 1. Try to find the type from the Manifest IR (Source of Truth)
                const irType = this._getHlsContentType(stream, variantId);
                if (irType && irType !== 'unknown') {
                    effectiveType = irType;
                } else {
                    // 2. Fallback to Extension Heuristics
                    const sampleSeg =
                        variantState.segments.find((s) => s.type === 'Media') ||
                        variantState.segments[0];

                    if (sampleSeg) {
                        const { contentType } = inferMediaInfoFromExtension(
                            sampleSeg.resolvedUrl
                        );
                        effectiveType =
                            contentType === 'unknown' || contentType === 'init'
                                ? 'video'
                                : contentType;
                    }
                }

                if (allowedTypes.has(effectiveType)) {
                    const currentUrls =
                        variantState.currentSegmentUrls || new Set();

                    const trackHistory = this._updateHistory(
                        stream.id,
                        variantId,
                        variantState.segments,
                        currentUrls,
                        isDynamic
                    );

                    const meta = this._getTrackMeta(stream, variantId);

                    groupedTracks.set(variantId, {
                        id: variantId,
                        label: variantId,
                        meta: meta,
                        historyMap: trackHistory,
                        newlyAdded:
                            variantState.newlyAddedSegmentUrls || new Set(),
                        bandwidth: meta.bandwidth || 0,
                        initSegment:
                            variantState.segments.find(
                                (s) => s.type === 'Init'
                            ) || null,
                    });
                }
            }
        }

        const rawTracks = Array.from(groupedTracks.values());

        // Calculate fallback bandwidth if missing (common for HLS Audio/Text)
        rawTracks.forEach(track => {
            if (!track.bandwidth || track.bandwidth === 0) {
                track.isEstimatedBitrate = true;
                let totalBytes = 0;
                let totalDuration = 0;
                let count = 0;

                // Use history to estimate
                for (const seg of track.historyMap.values()) {
                    if (seg.size && seg.duration) {
                        totalBytes += seg.size;
                        // Duration in timescale units
                        const durationSec = seg.duration / (seg.timescale || 1);
                        totalDuration += durationSec;
                        count++;
                    }
                }

                if (count > 0 && totalDuration > 0) {
                    const avgBitrate = (totalBytes * 8) / totalDuration;
                    track.bandwidth = Math.round(avgBitrate);
                    track.isEstimatedBitrate = true;
                }
            }
        });

        let globalMinTime = Infinity;
        let globalMaxTime = -Infinity;

        // --- ARCHITECTURAL FIX: Time Normalization ---
        const getAbsTime = (seg) => {
            // 1. Prefer absolute Program Date Time if available (HLS)
            // FIX: Only use PDT for Live streams. For VOD, prefer relative 0-based timing
            // to avoid sync issues if some tracks lack PDT (e.g. Audio vs Video).
            if (isDynamic && seg.dateTime) {
                try {
                    return new Date(seg.dateTime).getTime() / 1000;
                } catch (_e) {
                    /* fallthrough */
                }
            }

            // 2. Use calculated time from parser (DASH or HLS relative)
            // Note: HLS segments in worker handler are now rebased to be monotonic.
            if (seg.time !== undefined && seg.timescale) {
                // If DASH, periodStart makes it absolute relative to AST.
                // If HLS, periodStart is usually 0 but 'time' is cumulative.
                return (seg.periodStart || 0) + seg.time / seg.timescale;
            }

            // 3. Fallback
            return seg.time || 0;
        };

        const getDurationSec = (seg) => {
            if (seg.duration && seg.timescale)
                return seg.duration / seg.timescale;
            return 0;
        };

        const processedTracks = rawTracks.map((track) => {
            const segments = Array.from(track.historyMap.values())
                .map((seg) => {
                    const start = getAbsTime(seg);
                    const duration = getDurationSec(seg);
                    return {
                        ...seg,
                        start,
                        end: start + duration,
                        durationSec: duration,
                    };
                })
                .sort((a, b) => a.start - b.start);

            if (segments.length > 0) {
                if (segments[0].start < globalMinTime)
                    globalMinTime = segments[0].start;
                const last = segments[segments.length - 1];
                if (last.end > globalMaxTime) globalMaxTime = last.end;
            }

            return {
                ...track,
                segments,
            };
        });

        if (globalMinTime === Infinity) {
            const emptyResult = {
                tracks: [],
                timeBounds: { start: 0, end: 0 },
            };
            this._cache = {
                streamId: stream.id,
                activeTab,
                lastUpdateSignature: signature,
                result: emptyResult,
            };
            return emptyResult;
        }

        processedTracks.sort((a, b) => b.bandwidth - a.bandwidth);

        // Normalize all segments to be relative to the earliest segment in the current view window
        // This keeps the UI coordinates sane (0 to N)
        processedTracks.forEach((track) => {
            track.segments.forEach((seg) => {
                seg.relStart = seg.start - globalMinTime;
                seg.relEnd = seg.end - globalMinTime;
            });
        });

        const totalDuration = Math.max(0, globalMaxTime - globalMinTime);

        const result = {
            tracks: processedTracks,
            timeBounds: {
                start: globalMinTime,
                end: globalMaxTime,
                duration: totalDuration,
            },
            activeStreamId: stream.id,
            isLive: isDynamic,
        };

        this._cache = {
            streamId: stream.id,
            activeTab,
            lastUpdateSignature: signature,
            result,
        };
        return result;
    }
}