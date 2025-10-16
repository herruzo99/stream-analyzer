const RETRY_DELAY_MS = 250;

/**
 * Wraps the native fetch API to provide automatic retries for specific, recoverable status codes.
 * Currently handles the '425 Too Early' status by waiting and retrying the request once.
 *
 * @param {string | Request} url The resource to fetch.
 * @param {RequestInit} [options] Optional request options.
 * @param {number} [retries=1] The number of retries to attempt.
 * @returns {Promise<Response>} A promise that resolves to the Response object.
 * @throws {Error} Throws an error if the fetch fails after all retries.
 */
export async function fetchWithRetry(url, options, retries = 1) {
    try {
        const response = await fetch(url, options);
        if (response.status === 425 && retries > 0) {
            const jitter = Math.random() * RETRY_DELAY_MS;
            await new Promise((resolve) =>
                setTimeout(resolve, RETRY_DELAY_MS + jitter)
            );
            return fetchWithRetry(url, options, retries - 1);
        }
        return response;
    } catch (error) {
        if (retries > 0) {
            const jitter = Math.random() * RETRY_DELAY_MS;
            await new Promise((resolve) =>
                setTimeout(resolve, RETRY_DELAY_MS + jitter)
            );
            return fetchWithRetry(url, options, retries - 1);
        }
        throw error;
    }
}