import { eventBus } from '@/application/event-bus.js';
import {
    createLocalSegmentSelection,
    localAnalysisProgress,
    projectLocalParsedData,
} from '@/features/segmentAnalysis/application/local-segment-analysis-contract.js';
import { workerService } from '@/infrastructure/worker/workerService.js';
import { analysisActions } from '@/state/analysisStore';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { createLocalSegmentAnalysisResult } from './local-segment-stream.js';

function abortError() {
    const error = new Error('Local segment analysis was cancelled.');
    error.name = 'AbortError';
    return error;
}

function publish(progress) {
    eventBus.dispatch('local-segment-analysis:progress', progress);
    globalThis.dispatchEvent?.(
        new CustomEvent('sa-local-segment-analysis-progress', {
            detail: progress,
        })
    );
}

function safeFailureMessage(error) {
    if (error?.name === 'AbortError') return 'Local analysis cancelled.';
    return 'A selected segment could not be parsed.';
}

/**
 * Starts a bounded, cancellable local analysis generation.
 * @param {{ files: File[] }} params
 */
export function startBoundedSegmentAnalysis({ files }) {
    const selection = createLocalSegmentSelection(files);
    let cancelled = false;
    let cancellationPublished = false;
    let activeTask = null;
    const cacheKeys = [];

    const cancel = () => {
        if (cancelled) return;
        cancelled = true;
        activeTask?.cancel();
        publish(localAnalysisProgress(selection, 0, 'cancelled', 'Cancelled.'));
        cancellationPublished = true;
    };

    const promise = (async () => {
        if (selection.state !== 'accepted') {
            eventBus.dispatch('ui:show-status', {
                message: selection.message,
                type: 'warn',
            });
            publish(
                localAnalysisProgress(
                    selection,
                    0,
                    'rejected',
                    selection.message
                )
            );
            return { state: 'rejected', selection };
        }

        analysisActions.startAnalysis();
        eventBus.dispatch('analysis:started');
        publish(
            localAnalysisProgress(
                selection,
                0,
                'reading',
                'Reading local files.'
            )
        );
        const parsed = [];

        try {
            const cache = useSegmentCacheStore.getState();
            for (const item of selection.items) {
                if (cancelled) throw abortError();
                const data = await item.file.arrayBuffer();
                if (cancelled) throw abortError();
                publish(
                    localAnalysisProgress(
                        selection,
                        item.index,
                        'parsing',
                        `Parsing ${item.index + 1} of ${selection.items.length}.`
                    )
                );
                const task = workerService.postTask('parse-segment-structure', {
                    data,
                    url: item.label,
                });
                activeTask = task;
                const workerResult = await task.promise;
                activeTask = null;
                if (cancelled) throw abortError();
                const projection = projectLocalParsedData(workerResult);
                const parsedData = Object.freeze({
                    ...projection.value,
                    localAnalysis: Object.freeze({
                        generationId: selection.generationId,
                        itemId: item.itemId,
                        projectedNodes: projection.projectedNodes,
                        truncated: projection.truncated,
                    }),
                });
                cache.set(item.cacheKey, {
                    status: 200,
                    data,
                    parsedData,
                    localOnly: true,
                    generationId: selection.generationId,
                });
                cacheKeys.push(item.cacheKey);
                parsed.push({
                    uniqueId: item.cacheKey,
                    parsedData,
                    label: item.label,
                });
                publish(
                    localAnalysisProgress(
                        selection,
                        item.index + 1,
                        'parsing',
                        `Parsed ${item.index + 1} of ${selection.items.length}.`
                    )
                );
            }

            if (cancelled) throw abortError();
            const { stream, streamInput } =
                createLocalSegmentAnalysisResult(parsed);
            analysisActions.completeAnalysis([stream], [], [streamInput]);
            const complete = localAnalysisProgress(
                selection,
                selection.items.length,
                'complete',
                'Local analysis complete.'
            );
            publish(complete);
            eventBus.dispatch('local-segment-analysis:complete', complete);
            return { state: 'complete', selection, stream };
        } catch (error) {
            activeTask = null;
            const cache = useSegmentCacheStore.getState();
            cacheKeys.forEach((key) => cache.delete(key));
            const state = error?.name === 'AbortError' ? 'cancelled' : 'error';
            const message = safeFailureMessage(error);
            const progress = localAnalysisProgress(
                selection,
                0,
                state,
                message
            );
            if (state !== 'cancelled' || !cancellationPublished) {
                publish(progress);
            }
            if (state === 'error') {
                eventBus.dispatch('analysis:error', { message });
                eventBus.dispatch('analysis:failed');
            }
            return { state, selection };
        }
    })();

    return Object.freeze({
        generationId: selection.generationId,
        promise,
        cancel,
    });
}
