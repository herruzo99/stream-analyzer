/**
 * @typedef {Object} Assertion
 * @property {string} id
 * @property {string} name
 * @property {string} path - Dot-notation path to property (e.g., 'manifest.type')
 * @property {string} operator - 'equals', 'notEquals', 'gt', 'lt', 'includes', 'exists'
 * @property {any} value - Target value
 * @property {string} [description]
 */

/**
 * Safely retrieves a nested property from an object using dot notation.
 * Handles arrays by returning the array itself, or mapped values if path continues.
 */
function getValue(obj, path) {
    if (!obj || !path) return undefined;

    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length; i++) {
        const key = parts[i];

        if (current === null || current === undefined) return undefined;

        // Array Handling: If current is an array, map the rest of the path over it
        if (Array.isArray(current) && isNaN(parseInt(key, 10))) {
            const remainingPath = parts.slice(i).join('.');
            return current.map((item) => getValue(item, remainingPath));
        }

        current = current[key];
    }
    return current;
}

/**
 * Evaluates a single assertion against a stream context.
 */
function evaluateAssertion(stream, assertion) {
    // Create a context object that flattens useful properties for easier access
    const context = {
        stream,
        manifest: stream.manifest,
        summary: stream.manifest?.summary,
        video: stream.manifest?.summary?.videoTracks,
        audio: stream.manifest?.summary?.audioTracks,
        security: stream.manifest?.summary?.security,
    };

    const actual = getValue(context, assertion.path);
    const expected = assertion.value;
    let passed = false;
    let details = '';

    // Normalization for comparison
    const normActual = actual;
    const normExpected = !isNaN(parseFloat(expected))
        ? parseFloat(expected)
        : expected;

    switch (assertion.operator) {
        case 'equals':
            // Handle strict equality
            passed = String(normActual) === String(normExpected);
            break;
        case 'notEquals':
            passed = String(normActual) !== String(normExpected);
            break;
        case 'gt': // Greater Than
            passed = Number(normActual) > Number(normExpected);
            break;
        case 'lt': // Less Than
            passed = Number(normActual) < Number(normExpected);
            break;
        case 'gte':
            passed = Number(normActual) >= Number(normExpected);
            break;
        case 'lte':
            passed = Number(normActual) <= Number(normExpected);
            break;
        case 'exists':
            passed = normActual !== undefined && normActual !== null;
            if (Array.isArray(normActual)) passed = normActual.length > 0;
            break;
        case 'includes':
            if (Array.isArray(normActual)) {
                passed = normActual.some((v) =>
                    String(v).includes(String(normExpected))
                );
            } else if (typeof normActual === 'string') {
                passed = normActual.includes(String(normExpected));
            }
            break;
        case 'every':
            if (Array.isArray(normActual)) {
                // Simplified "every" check - checks if all items equal target or satisfy condition
                // For complex logic, we'd need a lambda parser.
                // Here we assume primitive array.
                passed = normActual.every(
                    (v) => String(v) == String(normExpected)
                );
            }
            break;
        case 'some':
            if (Array.isArray(normActual)) {
                passed = normActual.some(
                    (v) => String(v) == String(normExpected)
                );
            }
            break;
        default:
            passed = false;
            details = `Unknown operator: ${assertion.operator}`;
    }

    if (!passed && !details) {
        const stringActual =
            typeof normActual === 'object'
                ? JSON.stringify(normActual)
                : String(normActual);
        details = `Expected ${assertion.operator} "${expected}", but got "${stringActual}".`;
    }

    return {
        id: assertion.id,
        assertion,
        passed,
        actual: normActual,
        details,
    };
}

export function runTestSuite(stream, suite) {
    if (!stream || !suite || !suite.assertions) return null;

    const results = suite.assertions.map((assert) =>
        evaluateAssertion(stream, assert)
    );
    const passedCount = results.filter((r) => r.passed).length;
    const totalCount = results.length;

    return {
        suiteId: suite.id,
        timestamp: Date.now(),
        passedCount,
        totalCount,
        status: passedCount === totalCount ? 'pass' : 'fail',
        results,
    };
}
