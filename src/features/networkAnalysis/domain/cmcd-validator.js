/**
 * Definitions of CMCD keys, their types, and descriptions.
 * Reference: CTA-5004 / ISO/IEC 23009-8
 */
const CMCD_KEYS = {
    br: { label: 'Encoded Bitrate', type: 'integer', unit: 'kbps' },
    bl: { label: 'Buffer Length', type: 'integer', unit: 'ms' },
    bs: { label: 'Buffer Starvation', type: 'boolean' },
    cid: { label: 'Content ID', type: 'string' },
    d: { label: 'Object Duration', type: 'integer', unit: 'ms' },
    dl: { label: 'Deadline', type: 'integer', unit: 'ms' },
    mtp: { label: 'Measured Throughput', type: 'integer', unit: 'kbps' },
    nor: { label: 'Next Object Request', type: 'string' },
    nrr: { label: 'Next Range Request', type: 'string' },
    ot: {
        label: 'Object Type',
        type: 'token',
        valid: ['m', 'a', 'v', 'av', 'i', 'c', 'tt', 'k', 'o'],
    },
    pr: { label: 'Playback Rate', type: 'decimal' },
    rtp: { label: 'Requested Max Throughput', type: 'integer', unit: 'kbps' },
    sf: { label: 'Stream Format', type: 'token', valid: ['d', 'h', 's', 'o'] },
    sid: { label: 'Session ID', type: 'string' },
    st: { label: 'Stream Type', type: 'token', valid: ['v', 'l'] },
    su: { label: 'Startup', type: 'boolean' },
    tb: { label: 'Top Bitrate', type: 'integer', unit: 'kbps' },
    v: { label: 'CMCD Version', type: 'integer' },
};

/**
 * Extracts CMCD data from a NetworkEvent's request data.
 * Checks headers (CMCD-Object, etc.) and Query Parameters.
 * @param {import('@/types').NetworkEvent} event
 */
export function extractCmcdData(event) {
    const data = new Map();
    const sources = [];

    // 1. Check Headers (CMCD-Header, CMCD-Object, CMCD-Request, CMCD-Session)
    const headerPrefix = 'cmcd-';
    Object.entries(event.request.headers).forEach(([key, val]) => {
        if (key.toLowerCase().startsWith(headerPrefix)) {
            sources.push('Header');
            parseCmcdString(val, data);
        }
    });

    // 2. Check Query Parameters (Common-Media-Client-Data or 'CMCD')
    try {
        const urlObj = new URL(event.url);
        const params = urlObj.searchParams;

        // Spec: CMCD query param contains key=value pairs comma separated
        if (params.has('CMCD')) {
            sources.push('QueryParam');
            parseCmcdString(params.get('CMCD'), data);
        }

        // Some implementations might use individual params (non-standard but possible)
        // We stick to the spec "CMCD" param for now.
    } catch (_e) {
        // Invalid URL, ignore
    }

    if (data.size === 0) return null;

    return {
        values: validateCmcdData(data),
        sources: [...new Set(sources)],
    };
}

/**
 * Parses a CMCD formatted string (k=v,k="v",k).
 * @param {string} str
 * @param {Map} map
 */
function parseCmcdString(str, map) {
    if (!str) return;
    // Split by comma, avoiding commas inside quotes
    const pairs = str.match(/(?:[^,"]+|"[^"]*")+/g) || [];

    pairs.forEach((pair) => {
        const parts = pair.split('=');
        const key = parts[0].trim();
        let value = parts.length > 1 ? parts.slice(1).join('=').trim() : 'true'; // Boolean flag is just key

        // Remove quotes
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
        }

        map.set(key, value);
    });
}

/**
 * Validates and formats extracted data.
 * @param {Map<string, string>} rawData
 */
function validateCmcdData(rawData) {
    const validated = [];

    rawData.forEach((val, key) => {
        const def = CMCD_KEYS[key];
        const item = {
            key,
            raw: val,
            label: def ? def.label : 'Unknown Key',
            isValid: true,
            error: null,
            description: def
                ? `${def.type}${def.unit ? ` (${def.unit})` : ''}`
                : 'Custom Key',
        };

        if (def) {
            // Type Check
            if (def.type === 'integer') {
                if (!/^\d+$/.test(val)) {
                    item.isValid = false;
                    item.error = 'Must be an integer';
                }
            } else if (def.type === 'boolean') {
                if (val !== 'true') {
                    // In CMCD header, boolean true is implied by key presence, but value should be parsed as true
                    // This parser sets val='true' if missing, so checks specific values
                }
            } else if (def.type === 'token' && def.valid) {
                if (!def.valid.includes(val)) {
                    item.isValid = false;
                    item.error = `Invalid token. Expected: ${def.valid.join(', ')}`;
                }
            }
        } else {
            // Reserved key check
            if (!key.includes('-')) {
                item.isValid = false; // Custom keys must have hyphen
                item.error = 'Custom keys must contain a hyphen';
            }
        }

        validated.push(item);
    });

    return validated.sort((a, b) => a.key.localeCompare(b.key));
}
