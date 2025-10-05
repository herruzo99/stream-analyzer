const urlParams = new URLSearchParams(window.location.search);

/**
 * A flag indicating if the application is in debug mode.
 * Activated by adding `?debug=1` to the URL.
 * @type {boolean}
 */
export const isDebugMode = urlParams.get('debug') === '1';
