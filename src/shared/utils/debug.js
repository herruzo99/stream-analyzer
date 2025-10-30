const DEBUG_ENABLED =
    typeof window !== 'undefined' && window.location
        ? new URLSearchParams(window.location.search).has('debug')
        : false;

/**
 * Safely stringifies an object for logging, handling circular references and BigInts.
 * @param {any} obj The object to stringify.
 * @returns {string}
 */
function safeStringify(obj) {
    const cache = new Set();
    const replacer = (key, value) => {
        // --- ARCHITECTURAL FIX ---
        // JSON.stringify cannot serialize BigInt values by default. This replacer
        // detects them and converts them to a string representation suffixed with 'n'
        // to clearly indicate their original type in the debug logs.
        if (typeof value === 'bigint') {
            return value.toString() + 'n';
        }
        // --- END FIX ---

        if (typeof value === 'object' && value !== null) {
            if (cache.has(value)) {
                // Circular reference found, discard key
                return '[Circular]';
            }
            cache.add(value);
        }
        return value;
    };
    return JSON.stringify(obj, replacer, 2);
}

/**
 * Logs a message to the console's "debug" channel only if debugging is enabled via `?debug=1` in the URL.
 * @param {string} component The name of the component/module logging the message.
 * @param {...any} args The arguments to log.
 */
export function debugLog(component, ...args) {
    if (DEBUG_ENABLED) {
        const processedArgs = args.map((arg) =>
            typeof arg === 'object' && arg !== null
                ? JSON.parse(safeStringify(arg))
                : arg
        );
        console.debug(`[DEBUG - ${component}]`, ...processedArgs);
    }
}
