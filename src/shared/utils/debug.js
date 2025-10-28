const DEBUG_ENABLED =
    typeof window !== 'undefined' && window.location
        ? new URLSearchParams(window.location.search).has('debug')
        : false;

/**
 * Safely stringifies an object for logging, handling circular references.
 * @param {any} obj The object to stringify.
 * @returns {string}
 */
function safeStringify(obj) {
    const cache = new Set();
    return JSON.stringify(
        obj,
        (key, value) => {
            if (typeof value === 'object' && value !== null) {
                if (cache.has(value)) {
                    // Circular reference found, discard key
                    return '[Circular]';
                }
                cache.add(value);
            }
            return value;
        },
        2
    );
}

/**
 * Logs a message to the console's "debug" channel only if debugging is enabled via `?debug=1` in the URL.
 * @param {string} component The name of the component/module logging the message.
 * @param {...any} args The arguments to log.
 */
export function debugLog(component, ...args) {
    if (DEBUG_ENABLED) {
        const processedArgs = args.map((arg) =>
            typeof arg === 'object' && arg !== null ? JSON.parse(safeStringify(arg)) : arg
        );
        console.debug(`[DEBUG - ${component}]`, ...processedArgs);
    }
}