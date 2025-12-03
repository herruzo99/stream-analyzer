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

export function initializeUiOrchestration() {
    // --- Memory Management Modal (NEW) ---
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
        ({ uniqueId, format, isIFrame }) => {
            const { activeStreamId } = useAnalysisStore.getState();
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
        ({ streamId }) => {
            const stream = useAnalysisStore
                .getState()
                .streams.find((s) => s.id === streamId);
            if (!stream || stream.protocol !== 'dash') return;

            const manifest = stream.manifest.serializedManifest;
            const period = findChildrenRecursive(manifest, 'Period')[0];
            const adaptationSet = findChildrenRecursive(
                period,
                'AdaptationSet'
            )[0];
            const representation = findChildrenRecursive(
                adaptationSet,
                'Representation'
            )[0];

            const hierarchy = [representation, adaptationSet, period];
            const template = getInheritedElement('SegmentTemplate', hierarchy);

            if (!template) {
                showToast({
                    message: 'No SegmentTemplate found in this manifest.',
                    type: 'warn',
                });
                return;
            }

            let duration = parseFloat(getAttr(template, 'duration'));
            if (isNaN(duration)) {
                const timeline = findChildrenRecursive(
                    template,
                    'SegmentTimeline'
                )[0];
                if (timeline) {
                    const sElements = findChildrenRecursive(timeline, 'S');
                    let maxDuration = 0;
                    for (const s of sElements) {
                        const d = parseFloat(getAttr(s, 'd') || '0');
                        if (d > maxDuration) maxDuration = d;
                    }
                    if (maxDuration > 0) duration = maxDuration;
                }
            }

            const data = {
                ast: new Date(
                    getAttr(manifest, 'availabilityStartTime') || 0
                ).getTime(),
                periodStart: parseDuration(getAttr(period, 'start')) || 0,
                timescale: parseFloat(getAttr(template, 'timescale')),
                duration: duration,
                startNumber: parseInt(getAttr(template, 'startNumber') || 1),
                pto: parseFloat(
                    getAttr(template, 'presentationTimeOffset') || 0
                ),
                mediaTemplate: getAttr(template, 'media'),
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
