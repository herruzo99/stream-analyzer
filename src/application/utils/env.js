const urlParams = typeof window !== 'undefined' && window.location 
    ? new URLSearchParams(window.location.search) 
    : new URLSearchParams('');

/**
 * A flag indicating if the application is in debug mode.
 * Activated by adding `?debug=1` to the URL.
 * @type {boolean}
 */
export const isDebugMode = urlParams.get('debug') === '1';