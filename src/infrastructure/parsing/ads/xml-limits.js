export const AD_XML_LIMITS = Object.freeze({
    bytes: 2 * 1024 * 1024,
    items: 200,
    nestedItems: 100,
    errors: 50,
});

export function boundedAdXml(value) {
    if (typeof value !== 'string') throw new TypeError('Ad XML must be text.');
    if (new TextEncoder().encode(value).byteLength > AD_XML_LIMITS.bytes)
        throw new RangeError('Ad XML exceeds the 2 MiB safety limit.');
    return value;
}

/** @param {unknown} items @param {number} [limit] */
export const boundedAdItems = (items, limit = AD_XML_LIMITS.items) =>
    Array.isArray(items) ? items.slice(0, limit) : [];
