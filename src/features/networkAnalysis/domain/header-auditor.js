/**
 * @typedef {object} AuditIssue
 * @property {string} id
 * @property {'error' | 'warn'} level
 * @property {string} message
 * @property {string} [header] The name of the header associated with the issue.
 */

/**
 * @typedef {object} Rule
 * @property {string} id
 * @property {'error' | 'warn'} level
 * @property {string} description
 * @property {(e: import('@/types').NetworkEvent) => boolean} check
 * @property {string} message
 * @property {string} [header]
 */

/**
 * @param {string | null} contentType
 * @returns {boolean}
 */
const isTextResource = (contentType) => {
    if (!contentType) return false;
    const ct = contentType.toLowerCase();
    return (
        ct.includes('text') ||
        ct.includes('xml') ||
        ct.includes('json') ||
        ct.includes('javascript') ||
        ct.includes('dash+xml') ||
        ct.includes('vnd.apple.mpegurl')
    );
};

/** @type {Rule[]} */
const RULES = [
    {
        id: 'cors-missing',
        level: 'error',
        description: 'Missing Access-Control-Allow-Origin',
        check: (e) => !e.response.headers['access-control-allow-origin'],
        message:
            'CORS header missing. This will block playback in web browsers.',
        header: 'access-control-allow-origin',
    },
    {
        id: 'cors-wildcard-credentials',
        level: 'warn',
        description: 'CORS Wildcard with Credentials',
        check: (e) =>
            e.response.headers['access-control-allow-origin'] === '*' &&
            e.response.headers['access-control-allow-credentials'] === 'true',
        message: 'Wildcard origin cannot be used with Allow-Credentials.',
        header: 'access-control-allow-origin',
    },
    {
        id: 'manifest-compression',
        level: 'warn',
        description: 'Uncompressed Manifest',
        check: (e) => {
            const isManifest =
                e.resourceType === 'manifest' || e.resourceType === 'text';
            const encoding = e.response.headers['content-encoding'];
            return (
                isManifest &&
                (!encoding || !['gzip', 'br', 'deflate'].includes(encoding))
            );
        },
        message: 'Text resource is not compressed (gzip/br/deflate).',
        header: 'content-encoding',
    },
    {
        id: 'cache-control-missing',
        level: 'warn',
        description: 'Missing Cache-Control',
        check: (e) =>
            !e.response.headers['cache-control'] && e.response.status === 200,
        message:
            'Missing Cache-Control header. Browser caching behavior may be unpredictable.',
        header: 'cache-control',
    },
    {
        id: 'mime-mismatch-video',
        level: 'warn',
        description: 'Incorrect Video MIME',
        check: (e) => {
            if (e.resourceType !== 'video' && e.resourceType !== 'init')
                return false;
            const ct = e.response.contentType?.toLowerCase() || '';
            // Common misconfigurations: text/plain for segments
            return (
                ct.includes('text/plain') ||
                ct.includes('application/octet-stream')
            );
        },
        message: 'Video segment served with generic or text MIME type.',
        header: 'content-type',
    },
];

/**
 * Analyzes a network event against best practices.
 * @param {import('@/types').NetworkEvent} event
 * @returns {AuditIssue[]}
 */
export function auditNetworkEvent(event) {
    /** @type {AuditIssue[]} */
    const issues = [];
    // Skip local/synthetic requests or pending requests
    if (
        event.response.status === 0 ||
        event.url.startsWith('blob:') ||
        event.url.startsWith('data:')
    ) {
        return [];
    }

    for (const rule of RULES) {
        try {
            if (rule.check(event)) {
                issues.push({
                    id: rule.id,
                    level: rule.level,
                    message: rule.message,
                    header: rule.header,
                });
            }
        } catch (e) {
            console.warn(
                `[HeaderAuditor] Rule ${rule.id} failed to execute`,
                e
            );
        }
    }
    return issues;
}
