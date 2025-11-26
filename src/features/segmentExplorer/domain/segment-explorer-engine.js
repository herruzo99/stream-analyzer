import { inferMediaInfoFromExtension } from '@/infrastructure/parsing/utils/media-types';
import { appLog } from '@/shared/utils/debug';

/**
 * Core engine for transforming raw stream state into a grid-aligned,
 * virtualizable structure for the Segment Explorer.
 */
export class SegmentExplorerEngine {
    constructor() {
        this._cache = {
            streamId: null,
            activeTab: null,
            lastUpdateSignature: null,
            result: null,
        };
    }

    /**
     * Creates a signature to detect if expensive reprocessing is needed.
     */
    _createSignature(stream, activeTab) {
        if (!stream) return null;
        let sig = `${stream.id}-${activeTab}-${stream.protocol}`;

        if (stream.protocol === 'dash') {
            sig += `-${stream.dashRepresentationState.size}`;
            const first = stream.dashRepresentationState.values().next().value;
            if (first && first.segments.length)
                sig += `-${first.segments.length}`;
        } else if (stream.protocol === 'hls') {
            sig += `-${stream.hlsVariantState.size}`;
            const first = stream.hlsVariantState.values().next().value;
            if (first && first.segments.length)
                sig += `-${first.segments.length}`;
        }
        return sig;
    }

    _getContentType(stream, repId) {
        if (stream.protocol === 'dash') {
            for (const p of stream.manifest.periods) {
                for (const as of p.adaptationSets) {
                    if (as.representations.some((r) => r.id === repId)) {
                        return as.contentType;
                    }
                }
            }
        }
        return 'unknown';
    }

    _getTrackMeta(stream, repId) {
        if (stream.protocol === 'dash') {
            for (const p of stream.manifest.periods) {
                for (const as of p.adaptationSets) {
                    const rep = as.representations.find((r) => r.id === repId);
                    if (rep) {
                        return {
                            width: rep.width?.value,
                            height: rep.height?.value,
                            codecs: (rep.codecs || [])
                                .map((c) => c.value)
                                .join(', '),
                            lang: as.lang,
                            bandwidth: rep.bandwidth,
                        };
                    }
                }
            }
        }
        return { bandwidth: 0 };
    }

    process(stream, activeTab) {
        if (!stream) {
            appLog(
                'SegmentExplorerEngine',
                'warn',
                'Process called with null stream.'
            );
            return null;
        }

        const signature = this._createSignature(stream, activeTab);
        if (
            this._cache.result &&
            this._cache.lastUpdateSignature === signature
        ) {
            return this._cache.result;
        }

        appLog(
            'SegmentExplorerEngine',
            'info',
            `Processing stream ${stream.id} (${stream.protocol}) for tab '${activeTab}'. State size: HLS=${stream.hlsVariantState.size}, DASH=${stream.dashRepresentationState.size}`
        );

        const allowedTypes = new Set();
        if (activeTab === 'video') allowedTypes.add('video');
        if (activeTab === 'audio') allowedTypes.add('audio');
        if (activeTab === 'text') {
            allowedTypes.add('text');
            allowedTypes.add('application');
            allowedTypes.add('subtitles');
        }

        const rawTracks = [];
        let minSeq = Infinity;
        let maxSeq = -Infinity;

        // --- Extraction Phase ---
        if (stream.protocol === 'dash') {
            for (const [
                key,
                repState,
            ] of stream.dashRepresentationState.entries()) {
                if (!repState.segments || repState.segments.length === 0)
                    continue;

                const sampleSeg = repState.segments.find(
                    (s) => s.type === 'Media'
                );
                if (!sampleSeg) continue;

                const contentType = this._getContentType(
                    stream,
                    sampleSeg.repId
                );

                if (allowedTypes.has(contentType)) {
                    const meta = this._getTrackMeta(stream, sampleSeg.repId);

                    repState.segments.forEach((s) => {
                        if (s.type === 'Media') {
                            if (s.number < minSeq) minSeq = s.number;
                            if (s.number > maxSeq) maxSeq = s.number;
                        }
                    });

                    rawTracks.push({
                        id: key,
                        label: sampleSeg.repId,
                        meta,
                        rawSegments: repState.segments,
                        newlyAdded: repState.newlyAddedSegmentUrls || new Set(),
                        bandwidth: meta.bandwidth,
                        initSegment: repState.segments.find(
                            (s) => s.type === 'Init'
                        ),
                    });
                }
            }
        } else if (stream.protocol === 'hls') {
            for (const [
                variantId,
                variantState,
            ] of stream.hlsVariantState.entries()) {
                if (
                    !variantState.segments ||
                    variantState.segments.length === 0
                ) {
                    appLog(
                        'SegmentExplorerEngine',
                        'info',
                        `Skipping variant ${variantId}: No segments loaded.`
                    );
                    continue;
                }

                const sampleSeg =
                    variantState.segments.find((s) => s.type === 'Media') ||
                    variantState.segments[0];
                const sampleUrl = sampleSeg.resolvedUrl;
                const { contentType } = inferMediaInfoFromExtension(sampleUrl);

                // FIX: Robust fallback. If unknown/init, assume video to ensure it appears in default view.
                const effectiveType =
                    contentType === 'unknown' || contentType === 'init'
                        ? 'video'
                        : contentType;

                if (allowedTypes.has(effectiveType)) {
                    variantState.segments.forEach((s) => {
                        if (s.type === 'Media') {
                            if (s.number < minSeq) minSeq = s.number;
                            if (s.number > maxSeq) maxSeq = s.number;
                        }
                    });

                    let bandwidth = 0;
                    let codecs = 'HLS';
                    if (stream.manifest.variants) {
                        const variant = stream.manifest.variants.find(
                            (v) =>
                                v.stableId === variantId || v.uri === variantId
                        );
                        if (variant) {
                            bandwidth = variant.attributes.BANDWIDTH || 0;
                            codecs = variant.attributes.CODECS || 'HLS';
                        }
                    }

                    rawTracks.push({
                        id: variantId,
                        label: variantId.split('/').pop().split('?')[0],
                        meta: { codecs, bandwidth, width: 0, height: 0 },
                        rawSegments: variantState.segments,
                        newlyAdded:
                            variantState.newlyAddedSegmentUrls || new Set(),
                        bandwidth: bandwidth,
                        initSegment:
                            variantState.segments.find(
                                (s) => s.type === 'Init'
                            ) || null,
                    });
                } else {
                    appLog(
                        'SegmentExplorerEngine',
                        'info',
                        `Skipping variant ${variantId}: Type '${effectiveType}' not allowed in '${activeTab}' view.`
                    );
                }
            }
        } else if (stream.protocol === 'local') {
            const repState = stream.dashRepresentationState.get('0-local-rep');
            if (repState && allowedTypes.has('video')) {
                repState.segments.forEach((s) => {
                    if (s.number < minSeq) minSeq = s.number;
                    if (s.number > maxSeq) maxSeq = s.number;
                });
                rawTracks.push({
                    id: 'local',
                    label: 'Local Files',
                    meta: { count: repState.segments.length },
                    rawSegments: repState.segments,
                    newlyAdded: new Set(),
                    bandwidth: 0,
                    initSegment: null,
                });
            }
        }

        appLog(
            'SegmentExplorerEngine',
            'info',
            `Generated ${rawTracks.length} tracks. MinSeq: ${minSeq}, MaxSeq: ${maxSeq}`
        );

        if (minSeq === Infinity) {
            // Empty result
            const emptyResult = {
                tracks: [],
                gridBounds: { minSeq: 0, maxSeq: 0, totalColumns: 0 },
                baselineDuration: 0,
            };
            this._cache = {
                streamId: stream.id,
                activeTab,
                lastUpdateSignature: signature,
                result: emptyResult,
            };
            return emptyResult;
        }

        // --- Normalization Phase ---
        rawTracks.sort((a, b) => b.bandwidth - a.bandwidth);

        const totalColumns = maxSeq - minSeq + 1;

        let baselineDuration = 2;
        if (rawTracks.length > 0 && rawTracks[0].rawSegments.length > 0) {
            const samples = rawTracks[0].rawSegments
                .filter((s) => s.type === 'Media')
                .slice(0, 20);
            if (samples.length) {
                const durs = samples
                    .map((s) => s.duration / s.timescale)
                    .sort((a, b) => a - b);
                baselineDuration = durs[Math.floor(durs.length / 2)];
            }
        }

        const tracks = rawTracks.map((track) => {
            const segmentMap = new Map();
            track.rawSegments.forEach((s) => {
                if (s.type === 'Media') {
                    segmentMap.set(s.number - minSeq, s);
                }
            });

            return {
                ...track,
                segmentMap,
            };
        });

        const result = {
            tracks,
            gridBounds: { minSeq, maxSeq, totalColumns },
            baselineDuration,
            activeStreamId: stream.id,
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
