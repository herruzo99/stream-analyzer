const DEBUG_ENABLED =
    typeof window !== 'undefined' && window.location
        ? new URLSearchParams(window.location.search).has('debug')
        : false;

/**
 * Safely stringifies an object for logging, handling circular references and BigInts.
 * It also replaces large Maps or Arrays with a summary to prevent performance issues.
 * @param {any} obj The object to stringify.
 * @returns {string}
 */
function safeStringify(obj) {
    const cache = new Set();
    const replacer = (key, value) => {
        if (typeof value === 'bigint') {
            return value.toString() + 'n';
        }

        if (value instanceof Map) {
            // --- ARCHITECTURAL FIX: Prevent serialization of large maps ---
            if (value.size > 100) {
                return `[Map with ${value.size} entries]`;
            }
            return Array.from(value.entries());
        }

        if (Array.isArray(value)) {
            // --- ARCHITECTURAL FIX: Prevent serialization of large arrays ---
            if (value.length > 200) {
                return `[Array with ${value.length} items]`;
            }
        }
        // --- END FIX ---

        if (typeof value === 'object' && value !== null) {
            if (cache.has(value)) {
                return '[Circular]';
            }
            cache.add(value);
        }
        return value;
    };
    return JSON.stringify(obj, replacer, 2);
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