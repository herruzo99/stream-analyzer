const PRIVATE_QUERY_KEY =
    /^(?:access[_-]?token|api[_-]?key|auth|authorization|code|credential|jwt|key|password|secret|sig|signature|token)$/i;

/**
 * Validate and redact a source URL for persistence, sharing, and evidence.
 * @param {string} value
 */
export function redactSourceUrl(value) {
    let url;
    try {
        url = new URL(value);
    } catch {
        throw new Error('Stream URL must be a valid HTTP or HTTPS URL.');
    }
    if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Stream URL must use HTTP or HTTPS.');
    }

    const redactedFields = new Set();
    if (url.username || url.password) {
        url.username = '';
        url.password = '';
        redactedFields.add('url.credentials');
    }
    for (const key of [...url.searchParams.keys()]) {
        if (PRIVATE_QUERY_KEY.test(key)) {
            url.searchParams.delete(key);
            redactedFields.add(`url.query.${key.toLowerCase()}`);
        }
    }
    return Object.freeze({
        url: url.toString(),
        redactedFields: Object.freeze([...redactedFields].sort()),
    });
}
