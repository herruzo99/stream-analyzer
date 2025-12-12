import { eventBus } from '@/application/event-bus';
import {
    findChildrenRecursive,
    getAttr,
    getInheritedElement,
} from '@/infrastructure/parsing/utils/recursive-parser';
import { getParsedSegment } from '@/infrastructure/segments/segmentService';
import { parseDuration } from '@/shared/utils/time';
import { useAnalysisStore } from '@/state/analysisStore';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { EVENTS } from '@/types/events';
import { hideLoader, showLoader } from '@/ui/components/loader';
import { showToast } from '@/ui/components/toast';
import { openModalWithContent } from '@/ui/services/modalService';

/**
 * Extracts timing configuration from a Representation context.
 */
function extractTimingConfig(rep, as, period) {
    const hierarchy = [rep, as, period];
    const template = getInheritedElement('SegmentTemplate', hierarchy);

    if (!template) return null;

    let duration = parseFloat(getAttr(template, 'duration'));
    let timeline = null;

    const timelineEl = findChildrenRecursive(template, 'SegmentTimeline')[0];
    if (timelineEl) {
        timeline = findChildrenRecursive(timelineEl, 'S').map((s) => ({
            t: getAttr(s, 't') ? parseInt(getAttr(s, 't'), 10) : undefined,
            d: parseInt(getAttr(s, 'd'), 10),
            r: getAttr(s, 'r') ? parseInt(getAttr(s, 'r'), 10) : 0,
        }));
    }

    // Heuristic for missing duration when timeline exists
    if (isNaN(duration) && timeline) {
        // Calculate max duration from timeline for estimation
        duration = timeline.reduce((max, entry) => Math.max(max, entry.d), 0);
    }

    return {
        id: getAttr(rep, 'id'),
        bandwidth: parseInt(getAttr(rep, 'bandwidth') || '0', 10),
        contentType: getAttr(as, 'contentType') || 'unknown',
        timescale: parseFloat(getAttr(template, 'timescale') || '1'),
        duration: duration,
        startNumber: parseInt(getAttr(template, 'startNumber') || '1'),
        pto: parseFloat(getAttr(template, 'presentationTimeOffset') || '0'),
        mediaTemplate: getAttr(template, 'media'),
        timeline: timeline,
    };
}

export function initializeUiOrchestration() {
    // --- Memory Management Modal ---
    eventBus.subscribe('ui:memory-modal:open', () => {
        openModalWithContent({
            title: '',
            url: '',
            content: { type: 'memoryManagement', data: {} },
            isFullWidth: true,
        });
    });

    // --- Segment Analysis Modal ---
    eventBus.subscribe(
        EVENTS.UI.SHOW_SEGMENT_ANALYSIS_MODAL,
        ({ uniqueId, format, isIFrame, parsedData }) => {
            const { activeStreamId } = useAnalysisStore.getState();

            // NEW: If parsedData provided (e.g. synthetic SIDX inspector), skip cache check
            if (parsedData) {
                openModalWithContent({
                    title: 'Structure Inspector',
                    url: uniqueId,
                    content: {
                        type: 'segmentAnalysis',
                        data: {
                            parsedData: parsedData,
                            isIFrame: isIFrame || false,
                            uniqueId: uniqueId,
                        },
                    },
                });
                return;
            }

            const cachedEntry = useSegmentCacheStore.getState().get(uniqueId);

            if (cachedEntry?.parsedData) {
                openModalWithContent({
                    title: 'Segment Analysis',
                    url: uniqueId,
                    content: {
                        type: 'segmentAnalysis',
                        data: {
                            parsedData: cachedEntry.parsedData,
                            isIFrame: isIFrame,
                            uniqueId: uniqueId,
                        },
                    },
                });
                return;
            }

            showLoader('Analyzing segment...');
            getParsedSegment(uniqueId, activeStreamId, format, {
                isIFrame,
            })
                .then((parsedData) => {
                    hideLoader();
                    openModalWithContent({
                        title: 'Segment Analysis',
                        url: uniqueId,
                        content: {
                            type: 'segmentAnalysis',
                            data: {
                                parsedData: parsedData,
                                isIFrame,
                                uniqueId: uniqueId,
                            },
                        },
                    });
                })
                .catch((error) => {
                    hideLoader();
                    showToast({
                        message: `Failed to analyze segment: ${error.message}`,
                        type: 'fail',
                    });
                });
        }
    );

    // --- Segment Comparison ---
    eventBus.subscribe(
        EVENTS.UI.REQUEST_SEGMENT_COMPARISON,
        ({ urlA, urlB }) => {
            const { activeStreamId } = useAnalysisStore.getState();
            showLoader('Analyzing segments for comparison...');
            Promise.all([
                getParsedSegment(urlA, activeStreamId),
                getParsedSegment(urlB, activeStreamId),
            ])
                .then(([parsedDataA, parsedDataB]) => {
                    hideLoader();
                    openModalWithContent({
                        title: 'Segment Comparison',
                        url: 'Comparing two segments',
                        content: {
                            type: 'segmentAnalysis',
                            data: {
                                parsedData: parsedDataA,
                                parsedDataB: parsedDataB,
                            },
                        },
                    });
                })
                .catch((error) => {
                    hideLoader();
                    showToast({
                        message: `Failed to compare segments: ${error.message}`,
                        type: 'fail',
                    });
                });
        }
    );

    // --- SCTE-35 Details ---
    eventBus.subscribe(
        EVENTS.UI.SHOW_SCTE35_DETAILS,
        ({ scte35, startTime }) => {
            openModalWithContent({
                title: `SCTE-35 Details (${scte35.splice_command?.type || 'Unknown'})`,
                url: `Event at ${startTime.toFixed(3)}s`,
                content: {
                    type: 'segmentAnalysis',
                    data: {
                        parsedData: {
                            format: 'scte35',
                            data: scte35,
                        },
                    },
                },
            });
        }
    );

    // --- Manifest Patcher ---
    eventBus.subscribe(EVENTS.UI.SHOW_MANIFEST_PATCHER, () => {
        const { activeStreamId, streams } = useAnalysisStore.getState();
        const activeStream = streams.find((s) => s.id === activeStreamId);

        if (!activeStream) {
            showToast({
                message: 'No active stream to patch.',
                type: 'warn',
            });
            return;
        }

        openModalWithContent({
            title: 'Manifest Patcher',
            url: activeStream.originalUrl || 'Local File',
            content: {
                type: 'manifestPatcher',
                data: { streamId: activeStreamId },
            },
            isFullWidth: true,
        });
    });

    // --- DASH Timing Calculator ---
    eventBus.subscribe(
        EVENTS.UI.SHOW_DASH_TIMING_CALCULATOR,
        ({ streamId, representationId }) => {
            const stream = useAnalysisStore
                .getState()
                .streams.find((s) => s.id === streamId);
            if (!stream || stream.protocol !== 'dash') return;

            const manifest = stream.manifest.serializedManifest;
            let targetPeriod;

            // 1. Determine Target Period
            if (representationId) {
                // Scan to find which period owns this rep
                const periods = findChildrenRecursive(manifest, 'Period');
                for (const period of periods) {
                    const reps = findChildrenRecursive(
                        period,
                        'Representation'
                    );
                    if (
                        reps.some((r) => getAttr(r, 'id') === representationId)
                    ) {
                        targetPeriod = period;
                        break;
                    }
                }
            }

            if (!targetPeriod) {
                targetPeriod = findChildrenRecursive(manifest, 'Period')[0];
            }

            if (!targetPeriod) {
                showToast({ message: 'No Periods found.', type: 'fail' });
                return;
            }

            // 2. Extract All Valid Tracks in Period
            const tracks = [];
            const adaptationSets = findChildrenRecursive(
                targetPeriod,
                'AdaptationSet'
            );

            for (const as of adaptationSets) {
                const representations = findChildrenRecursive(
                    as,
                    'Representation'
                );
                for (const rep of representations) {
                    const config = extractTimingConfig(rep, as, targetPeriod);
                    if (config) {
                        tracks.push(config);
                    }
                }
            }

            if (tracks.length === 0) {
                showToast({
                    message: 'No valid SegmentTemplates found in Period.',
                    type: 'warn',
                });
                return;
            }

            // 3. Determine Initial Selection
            let initialRepId = representationId;
            if (!initialRepId || !tracks.some((t) => t.id === initialRepId)) {
                initialRepId = tracks[0].id;
            }

            const data = {
                isDynamic: getAttr(manifest, 'type') === 'dynamic',
                ast: new Date(
                    getAttr(manifest, 'availabilityStartTime') || 0
                ).getTime(),
                periodStart: parseDuration(getAttr(targetPeriod, 'start')) || 0,
                tracks: tracks,
                initialRepId: initialRepId,
            };

            openModalWithContent({
                title: 'DASH Timing Calculator',
                url: stream.originalUrl,
                content: {
                    type: 'dashCalculator',
                    data,
                },
            });
        }
    );
}
