import { workerService } from '@/infrastructure/worker/workerService';
import { appLog } from '@/shared/utils/debug';
import { analysisActions, useAnalysisStore } from '@/state/analysisStore';

const inFlightRequests = new Set();

function processStreamInputs() {
    const { streamInputs } = useAnalysisStore.getState();

    for (const input of streamInputs) {
        if (
            input.url &&
            input.isDrmInfoLoading &&
            !inFlightRequests.has(input.id)
        ) {
            inFlightRequests.add(input.id);
            appLog(
                'streamMetadataService',
                'info',
                `Dispatching DRM detection for input ID: ${input.id}`,
                { url: input.url }
            );

            workerService
                .postTask('get-stream-drm-info', {
                    url: input.url,
                    auth: input.auth,
                })
                .promise.then((detectedDrm) => {
                    appLog(
                        'streamMetadataService',
                        'info',
                        `DRM detection complete for input ID: ${input.id}`,
                        { detectedDrm }
                    );
                    analysisActions.updateStreamInput(
                        input.id,
                        'detectedDrm',
                        detectedDrm
                    );
                    analysisActions.updateStreamInput(
                        input.id,
                        'isDrmInfoLoading',
                        false
                    );
                })
                .catch((error) => {
                    console.error(
                        `DRM detection failed for ${input.url}:`,
                        error
                    );
                    analysisActions.updateStreamInput(
                        input.id,
                        'detectedDrm',
                        []
                    ); // Empty array on failure
                    analysisActions.updateStreamInput(
                        input.id,
                        'isDrmInfoLoading',
                        false
                    );
                })
                .finally(() => {
                    inFlightRequests.delete(input.id);
                });
        }
    }
}

let unsubscribe = null;

export function initializeStreamMetadataService() {
    if (unsubscribe) {
        unsubscribe();
    }
    // We subscribe to the store to react to changes, making the system declarative.
    unsubscribe = useAnalysisStore.subscribe(processStreamInputs);
    appLog(
        'streamMetadataService',
        'info',
        'Initialized and subscribed to analysis store.'
    );
}
