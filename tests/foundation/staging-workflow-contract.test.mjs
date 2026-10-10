import assert from 'node:assert/strict';
import test from 'node:test';
import {
    createStagingWorkflow,
    deriveRestingStagingPhase,
    transitionStagingWorkflow,
} from '../../src/features/streamInput/application/staging-workflow-contract.js';

test('workflow exposes explicit landing, validation, staging, analysis, and recovery transitions', () => {
    const landing = createStagingWorkflow();
    const validating = transitionStagingWorkflow(landing, 'validating', {
        operation: 'preflight',
    });
    const staging = transitionStagingWorkflow(validating, 'staging');
    const analyzing = transitionStagingWorkflow(staging, 'analyzing', {
        operation: 'analyze',
    });
    const recovery = transitionStagingWorkflow(analyzing, 'recovery', {
        error: 'Worker failed',
    });

    assert.deepEqual(validating, {
        phase: 'validating',
        operation: 'preflight',
        error: null,
    });
    assert.equal(staging.phase, 'staging');
    assert.equal(analyzing.phase, 'analyzing');
    assert.equal(recovery.error, 'Worker failed');
    assert.throws(
        () => transitionStagingWorkflow(analyzing, 'restoring'),
        /Invalid staging workflow transition/
    );
});

test('resting workflow derives solely from draft presence and preflight state', () => {
    assert.equal(deriveRestingStagingPhase([]), 'landing');
    assert.equal(
        deriveRestingStagingPhase([{ isTier0AnalysisLoading: true }]),
        'validating'
    );
    assert.equal(
        deriveRestingStagingPhase([{ isTier0AnalysisLoading: false }]),
        'staging'
    );
});
