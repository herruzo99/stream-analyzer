import { eventBus } from '@/application/event-bus';
import {
    findChildrenRecursive,
    getAttr,
} from '@/infrastructure/parsing/utils/recursive-parser';
import { getParsedSegment } from '@/infrastructure/segments/segmentService';
import { parseDuration } from '@/shared/utils/time';
import { useAnalysisStore } from '@/state/analysisStore';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { EVENTS } from '@/types/events';
import { hideLoader, showLoader } from '@/ui/components/loader';
import { showToast } from '@/ui/components/toast';
import { openModalWithContent } from '@/ui/services/modalService';
import { extractTimingConfig } from '@/features/interactiveManifest/domain/dash-timing.js';

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
        const activeStream = streams.find((s) => s.id === activeStreamId) ?? streams[0];

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

            // 1. Extract All Periods
            const periodElements = findChildrenRecursive(manifest, 'Period');
            if (periodElements.length === 0) {
                showToast({ message: 'No Periods found.', type: 'fail' });
                return;
            }

            const periods = periodElements.map((period) => {
                const start = parseDuration(getAttr(period, 'start')) || 0;
                const duration = parseDuration(getAttr(period, 'duration'));
                // Note: Duration might need to be calculated from next period's start if missing

                const tracks = [];
                const adaptationSets = findChildrenRecursive(
                    period,
                    'AdaptationSet'
                );
                for (const as of adaptationSets) {
                    const representations = findChildrenRecursive(
                        as,
                        'Representation'
                    );
                    for (const rep of representations) {
                        const config = extractTimingConfig(rep, as, period);
                        if (config) {
                            tracks.push(config);
                        }
                    }
                }
                return {
                    id: getAttr(period, 'id'),
                    start: start,
                    duration: duration, // duration is already in seconds or null
                    tracks: tracks,
                };
            });

            // Calculate absolute start times and durations if needed
            // (Simplified for now, assuming 'start' is present or calculable)

            // 3. Determine Initial Selection
            // Use the first period to determine available Representations
            let initialRepId = representationId;
            const firstPeriodTracks = periods[0].tracks;
            if (
                !initialRepId ||
                !firstPeriodTracks.some((t) => t.id === initialRepId)
            ) {
                initialRepId = firstPeriodTracks[0]?.id;
            }

            // NOTE: shared/utils/time parseDuration returns bare seconds
            // (unlike badges/utils which returns {total}). spd keeps ONLY
            // explicit SPD; minBufferTime rides separately so the live
            // playhead can prioritize SPD → minBufferTime → 1 segment.
            const spdSecs =
                parseDuration(getAttr(manifest, 'suggestedPresentationDelay')) || 0;
            const data = {
                isDynamic: getAttr(manifest, 'type') === 'dynamic',
                ast: new Date(
                    getAttr(manifest, 'availabilityStartTime') || 0
                ).getTime(),
                periods: periods, // Pass all periods
                initialRepId: initialRepId,
                streamId: streamId,
                spd: spdSecs,
                minBufferTimeSec:
                    parseDuration(getAttr(manifest, 'minBufferTime')) || 0,
                timeShiftBufferDepth: parseDuration(
                    getAttr(manifest, 'timeShiftBufferDepth')
                ),
            };

            openModalWithContent({
                title: 'DASH Timing Calculator',
                url: stream.originalUrl,
                content: {
                    type: 'dashCalculator',
                    data,
                },
                isFullWidth: true,
            });
        }
    );
}
