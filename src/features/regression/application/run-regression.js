import { executeRegressionRun } from '@/features/regression/application/regression-contract.js';
import { testSuiteActions, useTestSuiteStore } from '@/state/testSuiteStore';
import { showToast } from '@/ui/components/toast';

let activeController = null;

/**
 * Starts a regression run for the active suite against the given stream.
 * No-op (with toast) when there is nothing runnable. Returns a promise
 * that resolves when the run settles; call `cancelRegressionRun()` to
 * abort via AbortSignal.
 */
export async function startRegressionRun(stream) {
    const { suites, activeSuiteId, runState } = useTestSuiteStore.getState();
    if (runState === 'running') return;
    const suite = suites.find((s) => s.id === activeSuiteId);
    if (!suite) {
        showToast({ message: 'Select a suite first.', type: 'info' });
        return;
    }
    const rules = Array.isArray(suite.assertions) ? suite.assertions : [];
    if (rules.length === 0) {
        showToast({
            message: 'Add at least one rule before running.',
            type: 'info',
        });
        return;
    }
    if (!stream?.manifest) {
        showToast({
            message: 'Analyze a stream before running tests.',
            type: 'info',
        });
        return;
    }

    activeController?.abort();
    activeController = new AbortController();
    const { signal } = activeController;
    testSuiteActions.setRunState('running', 0);

    try {
        const result = await executeRegressionRun(stream, suite, {
            signal,
            onProgress: (progress) => {
                testSuiteActions.setRunState(
                    'running',
                    (progress.completed || 0) /
                        Math.max(1, progress.total || 1)
                );
            },
        });
        // Attach the local suite id so the runner can match results that
        // predate the contract shape (suiteId) as well as new ones.
        testSuiteActions.setLastRunResult({ ...result, suiteId: suite.id });
        const failed = result.totalCount - result.passedCount;
        showToast({
            message:
                failed === 0
                    ? `All ${result.totalCount} rules passed.`
                    : `${result.passedCount}/${result.totalCount} rules passed.`,
            type: failed === 0 ? 'pass' : 'warn',
        });
    } catch (error) {
        if (error?.name === 'AbortError' || signal.aborted) {
            showToast({ message: 'Run canceled.', type: 'info' });
        } else {
            showToast({
                message: error?.message || 'Run failed.',
                type: 'fail',
            });
        }
    } finally {
        activeController = null;
        testSuiteActions.setRunState('idle', 0);
    }
}

export function cancelRegressionRun() {
    activeController?.abort();
}
