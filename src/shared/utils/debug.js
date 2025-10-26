const DEBUG_ENABLED =
    typeof window !== 'undefined' && window.location
        ? new URLSearchParams(window.location.search).has('debug')
        : false;

/**
 * Logs a message to the console's "debug" channel only if debugging is enabled via `?debug=1` in the URL.
 * @param {string} component The name of the component/module logging the message.
 * @param {...any} args The arguments to log.
 */
export function debugLog(component, ...args) {
    if (DEBUG_ENABLED) {
        console.debug(`[DEBUG - ${component}]`, ...args);
    }
}
