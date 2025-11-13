const DEBUG_ENABLED =
    typeof window !== 'undefined' && window.location
        ? new URLSearchParams(window.location.search).has('debug')
        : false;
/**
 * A utility function to create a concise summary of a TRUN box's samples.
 * @param {object[]} samples - The array of sample objects from a parsed TRUN box.
 * @returns {object} A summary object.
 */
function summarizeTrunSamples(samples) {
    if (!samples || samples.length === 0) {
        return { count: 0 };
    }
    const summary = {
        count: samples.length,
        duration: { min: Infinity, max: -Infinity, total: 0 },
        size: { min: Infinity, max: -Infinity, total: 0 },
        compositionTimeOffset: { min: Infinity, max: -Infinity, total: 0 },
        syncSampleCount: 0,
    };

    for (const sample of samples) {
        if (sample.duration !== undefined) {
            summary.duration.min = Math.min(summary.duration.min, sample.duration);
            summary.duration.max = Math.max(summary.duration.max, sample.duration);
            summary.duration.total += sample.duration;
        }
        if (sample.size !== undefined) {
            summary.size.min = Math.min(summary.size.min, sample.size);
            summary.size.max = Math.max(summary.size.max, sample.size);
            summary.size.total += sample.size;
        }
        if (sample.compositionTimeOffset !== undefined) {
            summary.compositionTimeOffset.min = Math.min(summary.compositionTimeOffset.min, sample.compositionTimeOffset);
            summary.compositionTimeOffset.max = Math.max(summary.compositionTimeOffset.max, sample.compositionTimeOffset);
            summary.compositionTimeOffset.total += sample.compositionTimeOffset;
        }
        if (sample.sampleFlags && !sample.sampleFlags.sample_is_non_sync_sample) {
            summary.syncSampleCount++;
        }
    }

    // Clean up empty fields
    if (summary.duration.total === 0) delete summary.duration;
    if (summary.size.total === 0) delete summary.size;
    if (summary.compositionTimeOffset.total === 0) delete summary.compositionTimeOffset;

    return summary;
}

/**
 * Creates a summary of TS packets.
 * @param {object[]} packets - Array of parsed TS packets.
 * @returns {object} A summary of packet counts.
 */
function summarizeTsPackets(packets) {
    if (!packets || packets.length === 0) {
        return { totalCount: 0 };
    }
    const countsByType = packets.reduce((acc, packet) => {
        const type = packet.payloadType || 'Unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {});

    const countsByPid = packets.reduce((acc, packet) => {
        const pid = packet.pid;
        acc[pid] = (acc[pid] || 0) + 1;
        return acc;
    }, {});

    return {
        totalCount: packets.length,
        countsByType,
        countsByPid,
    };
}

/**
 * A replacer for JSON.stringify that handles BigInts, Maps, Sets, and circular references.
 * It now includes a `distill` option for creating high-level summaries of complex data structures.
 * @param {object} [options]
 * @param {boolean} [options.limitCollections=false] - If true, large Maps/Arrays will be replaced with summaries.
 * @param {boolean} [options.distill=false] - If true, applies specific summarization logic to known large objects.
 * @returns {(key: string, value: any) => any}
 */
export function createSafeJsonReplacer({ limitCollections = false, distill = false } = {}) {
    const cache = new Set();
    return function replacer(key, value) {
        if (typeof value === 'bigint') {
            return value.toString() + 'n';
        }

        if (value instanceof Map) {
            if (limitCollections && value.size > 100) {
                return `[Map with ${value.size} entries]`;
            }
            return Array.from(value.entries());
        }

        if (value instanceof Set) {
            if (limitCollections && value.size > 100) {
                return `[Set with ${value.size} entries]`;
            }
            return Array.from(value.values());
        }

        if (Array.isArray(value)) {
            if (limitCollections && value.length > 200) {
                return `[Array with ${value.length} items]`;
            }
        }

        if (typeof value === 'object' && value !== null) {
            if (cache.has(value)) {
                return '[Circular]';
            }
            cache.add(value);

            // --- DISTILLATION LOGIC ---
            if (distill) {
                if (value.type === 'trun' && value.samples) {
                    const distilledBox = { ...value, samples: summarizeTrunSamples(value.samples) };
                    delete distilledBox.dataView;
                    return distilledBox;
                }
                if (['sdtp', 'stts', 'ctts', 'stsc', 'stsz', 'stco', 'stss'].includes(value.type) && value.entries) {
                    return { ...value, entries: `[${value.entries.length} entries]` };
                }
                if (value.format === 'isobmff' && value.data?.boxes) { // Distill ISOBMFF segment
                    const distilledData = { ...value };
                    delete distilledData.rawSegmentBase64;
                    distilledData.data.boxes = distilledData.data.boxes.map(b => replacer(b.type, b));
                    return distilledData;
                }
                if (value.format === 'ts' && value.data?.packets) { // Distill TS segment
                    const distilledData = {
                        ...value,
                        data: {
                            ...value.data,
                            packets: summarizeTsPackets(value.data.packets),
                            summary: {
                                ...value.data.summary,
                                pcrList: { count: value.data.summary.pcrList.length },
                                continuityCounters: { pidCount: Object.keys(value.data.summary.continuityCounters).length },
                            }
                        },
                    };
                    return distilledData;
                }
                // Omit dataView and raw buffers
                if (key === 'dataView' || value instanceof ArrayBuffer || value instanceof Uint8Array) {
                    return `[${value.constructor.name}]`;
                }
            }
            // --- END DISTILLATION LOGIC ---
        }
        return value;
    };
}

/**
 * Safely stringifies an object for logging, handling circular references and BigInts.
 * It also replaces large Maps or Arrays with a summary to prevent performance issues.
 * @param {any} obj The object to stringify.
 * @returns {string}
 */
function safeStringify(obj) {
    return JSON.stringify(
        obj,
        createSafeJsonReplacer({ limitCollections: true }),
        2
    );
}

/**
 * Logs a message to the console only if debugging is enabled.
 * Supports different console levels for richer logging.
 * Ensures 'error' messages are always logged outside of any group.
 * @param {string} component The name of the component/module logging the message.
 * @param {'log' | 'info' | 'warn' | 'error' | 'table' } level The console log level.
 * @param {...any} args The arguments to log.
 */
export function appLog(component, level, ...args) {
    if (!DEBUG_ENABLED) {
        return;
    }

    const logFn = console[level] || console.debug;
    const label = `[${component}]`;

    const processedArgs = args.map((arg) =>
        typeof arg === 'object' && arg !== null && level !== 'table'
            ? JSON.parse(safeStringify(arg))
            : arg
    );

    if (level === 'table') {
        console.log(label, ...processedArgs.slice(1));
        logFn(processedArgs[0]);
        return;
    }

    logFn(label, ...processedArgs);
}