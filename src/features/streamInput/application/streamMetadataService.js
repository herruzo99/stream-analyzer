import { workerService } from '@/infrastructure/worker/workerService';
import { appLog } from '@/shared/utils/debug';
import { analysisActions, useAnalysisStore } from '@/state/analysisStore';

const inFlightRequests = new Set();

function processStreamInputs() {
    const { streamInputs } = useAnalysisStore.getState();

    for (const input of streamInputs) {
        if (
            input.url &&
            input.isTier0AnalysisLoading &&
            !inFlightRequests.has(input.id)
        ) {
            inFlightRequests.add(input.id);

            workerService
                .postTask('tier0-analysis', {
                    url: input.url,
                    auth: input.auth,
                })
                .promise.then((tier0Result) => {
                    analysisActions.updateStreamInput(
                        input.id,
                        'tier0',
                        tier0Result
                    );
                    // Backwards compatibility for detectedDrm field
                    if (
                        tier0Result.detectedDrm &&
                        tier0Result.detectedDrm.length > 0
                    ) {
                        analysisActions.updateStreamInput(
                            input.id,
                            'detectedDrm',
                            tier0Result.detectedDrm
                        );
                    }
                    analysisActions.updateStreamInput(
                        input.id,
                        'isTier0AnalysisLoading',
                        false
                    );
                })
                .catch((error) => {
                    console.error(
                        `Tier 0 analysis failed for ${input.url}:`,
                        error
                    );
                    analysisActions.updateStreamInput(
                        input.id,
                        'isTier0AnalysisLoading',
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
