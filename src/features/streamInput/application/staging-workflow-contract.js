export const STAGING_WORKFLOW_PHASES = Object.freeze([
    'landing',
    'staging',
    'validating',
    'restoring',
    'analyzing',
    'recovery',
]);

const ALLOWED_TRANSITIONS = Object.freeze({
    landing: new Set([
        'landing',
        'staging',
        'validating',
        'restoring',
        'analyzing',
        'recovery',
    ]),
    staging: new Set([
        'landing',
        'staging',
        'validating',
        'restoring',
        'analyzing',
        'recovery',
    ]),
    validating: new Set([
        'landing',
        'staging',
        'validating',
        'analyzing',
        'recovery',
    ]),
    restoring: new Set(['landing', 'staging', 'validating', 'recovery']),
    analyzing: new Set(['landing', 'staging', 'recovery']),
    recovery: new Set([
        'landing',
        'staging',
        'validating',
        'restoring',
        'analyzing',
        'recovery',
    ]),
});

export function createStagingWorkflow(phase = 'landing') {
    if (!STAGING_WORKFLOW_PHASES.includes(phase)) {
        throw new TypeError(`Unknown staging workflow phase: ${String(phase)}`);
    }
    return Object.freeze({ phase, operation: null, error: null });
}

export function deriveRestingStagingPhase(inputs) {
    if (!Array.isArray(inputs) || inputs.length === 0) return 'landing';
    return inputs.some((input) => input.isTier0AnalysisLoading)
        ? 'validating'
        : 'staging';
}

export function transitionStagingWorkflow(current, phase, details = {}) {
    const source = current ?? createStagingWorkflow();
    if (!ALLOWED_TRANSITIONS[source.phase]?.has(phase)) {
        throw new Error(
            `Invalid staging workflow transition: ${source.phase} -> ${phase}`
        );
    }
    return Object.freeze({
        phase,
        operation: details.operation ?? null,
        error: details.error ?? null,
    });
}
