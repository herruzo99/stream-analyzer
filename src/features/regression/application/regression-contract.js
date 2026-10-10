import { evaluateAssertion } from '../domain/test-engine.js';

export const REGRESSION_CONTRACT_VERSION = 'sa-regression-run/1';
export const REGRESSION_SUITE_VERSION = 'sa-regression-suite/1';
export const REGRESSION_LIMITS = Object.freeze({
    suites: 32,
    assertions: 200,
    name: 120,
    description: 320,
    path: 160,
    value: 240,
    detail: 480,
});

const OPERATORS = new Set([
    'equals',
    'notEquals',
    'gt',
    'lt',
    'gte',
    'lte',
    'includes',
    'exists',
    'every',
    'some',
]);
const URL_LIKE = /https?:\/\/[^\s<>'"]+/gi;
const SECRET = /((?:token|key|secret|signature|authorization)=)[^&\s]+/gi;

/** @param {unknown} value @param {number} [limit] */
const text = (value, limit = REGRESSION_LIMITS.name) =>
    Array.from(String(value ?? ''))
        .filter((character) => {
            const code = character.codePointAt(0) ?? 0;
            return character === '\n' || character === '\t' || code >= 32;
        })
        .join('')
        .replace(SECRET, '$1[redacted]')
        .replace(URL_LIKE, '[redacted-url]')
        .slice(0, limit);

function stableHash(value) {
    let hash = 2166136261;
    for (const character of String(value)) {
        hash ^= character.codePointAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
}

const stableId = (prefix, value) => `${prefix}-${stableHash(value)}`;
const record = (value) =>
    value && typeof value === 'object'
        ? /** @type {Record<string, unknown>} */ (value)
        : {};

const canonical = (value) => {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object')
        return Object.fromEntries(
            Object.entries(/** @type {Record<string, unknown>} */ (value))
                .sort(([left], [right]) => left.localeCompare(right))
                .map(([key, item]) => [key, canonical(item)])
        );
    if (typeof value === 'string') return text(value, REGRESSION_LIMITS.detail);
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'boolean' || value === null) return value;
    return String(value ?? '');
};

/** @param {unknown} input @param {number} index */
function normalizeAssertion(input, index) {
    const assertion = record(input);
    const operator = text(assertion.operator, 24);
    return Object.freeze({
        id: stableId(
            'sa-regression-rule',
            `${assertion.id ?? index}:${assertion.path}:${operator}`
        ),
        sourceId: text(assertion.id ?? index, 96),
        name: text(assertion.name || `Rule ${index + 1}`),
        path: text(assertion.path, REGRESSION_LIMITS.path),
        operator: OPERATORS.has(operator) ? operator : 'invalid',
        value: text(assertion.value, REGRESSION_LIMITS.value),
        version: `${REGRESSION_SUITE_VERSION}:rule/1`,
    });
}

/** @param {unknown} input */
export function normalizeRegressionSuite(input) {
    const suite = record(input);
    const assertions = Array.isArray(suite.assertions)
        ? suite.assertions
              .slice(0, REGRESSION_LIMITS.assertions)
              .map(normalizeAssertion)
        : [];
    const name = text(suite.name || 'Unnamed suite');
    const config = Object.freeze({
        name,
        description: text(suite.description, REGRESSION_LIMITS.description),
        assertions: Object.freeze(assertions),
    });
    const configHash = stableId(
        'sa-regression-config',
        JSON.stringify(canonical(config))
    );
    return Object.freeze({
        id: stableId(
            'sa-regression-suite',
            `${suite.id ?? name}:${configHash}`
        ),
        sourceId: text(suite.id ?? name, 96),
        name,
        description: config.description,
        version: REGRESSION_SUITE_VERSION,
        configHash,
        valid:
            Boolean(name) &&
            assertions.length > 0 &&
            assertions.every(
                (assertion) =>
                    assertion.path && assertion.operator !== 'invalid'
            ),
        truncated:
            Array.isArray(suite.assertions) &&
            suite.assertions.length > REGRESSION_LIMITS.assertions,
        assertions: config.assertions,
    });
}

/** @param {unknown} value */
const projectActual = (value) => {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'object')
        return text(JSON.stringify(canonical(value)), REGRESSION_LIMITS.detail);
    return text(value, REGRESSION_LIMITS.detail);
};

const abortError = () => {
    const error = new Error('Regression run canceled.');
    error.name = 'AbortError';
    return error;
};

/**
 * Executes a bounded suite with cooperative cancellation and progress.
 * @param {import('@/types').Stream} stream
 * @param {unknown} suiteInput
 * @param {{signal?: AbortSignal, onProgress?: (progress: object) => void, yieldControl?: () => Promise<void>}} [options]
 */
export async function executeRegressionRun(
    stream,
    suiteInput,
    {
        signal,
        onProgress = () => {},
        yieldControl = () => Promise.resolve(),
    } = {}
) {
    const suite = normalizeRegressionSuite(suiteInput);
    if (!suite.valid) throw new TypeError('Regression suite is invalid.');
    const fixture = canonical({
        protocol: stream?.protocol,
        manifestType: stream?.manifest?.type,
        summary: stream?.manifest?.summary,
    });
    const fixtureHash = stableId(
        'sa-regression-fixture',
        JSON.stringify(fixture)
    );
    const runId = stableId(
        'sa-regression-run',
        `${suite.configHash}:${fixtureHash}:browser-local`
    );
    const results = [];
    for (let index = 0; index < suite.assertions.length; index += 1) {
        if (signal?.aborted) throw abortError();
        const assertion = suite.assertions[index];
        try {
            const result = evaluateAssertion(stream, assertion);
            results.push(
                Object.freeze({
                    id: stableId(
                        'sa-regression-result',
                        `${runId}:${assertion.id}`
                    ),
                    ruleId: assertion.id,
                    name: assertion.name,
                    passed: result.passed,
                    classification: result.passed ? 'pass' : 'fail',
                    expected: text(assertion.value, REGRESSION_LIMITS.value),
                    actual: projectActual(result.actual),
                    details: text(result.details, REGRESSION_LIMITS.detail),
                })
            );
        } catch (error) {
            results.push(
                Object.freeze({
                    id: stableId(
                        'sa-regression-result',
                        `${runId}:${assertion.id}`
                    ),
                    ruleId: assertion.id,
                    name: assertion.name,
                    passed: false,
                    classification: 'error',
                    expected: text(assertion.value, REGRESSION_LIMITS.value),
                    actual: 'unavailable',
                    details: text(
                        error instanceof Error
                            ? error.message
                            : 'Evaluation error',
                        REGRESSION_LIMITS.detail
                    ),
                })
            );
        }
        onProgress(
            Object.freeze({
                completed: index + 1,
                total: suite.assertions.length,
                percent: Math.round(
                    ((index + 1) / suite.assertions.length) * 100
                ),
            })
        );
        await yieldControl();
    }
    if (signal?.aborted) throw abortError();
    const passedCount = results.filter(
        (result) => result.classification === 'pass'
    ).length;
    const errorCount = results.filter(
        (result) => result.classification === 'error'
    ).length;
    return Object.freeze({
        contractVersion: REGRESSION_CONTRACT_VERSION,
        suiteVersion: suite.version,
        runId,
        fixtureHash,
        configHash: suite.configHash,
        environmentClass: 'browser-local',
        deterministic: true,
        status: errorCount
            ? 'error'
            : passedCount === results.length
              ? 'pass'
              : 'fail',
        passedCount,
        failedCount: results.length - passedCount - errorCount,
        errorCount,
        totalCount: results.length,
        suite,
        results: Object.freeze(results),
    });
}
