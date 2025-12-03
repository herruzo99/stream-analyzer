import { secureRandom } from '@/shared/utils/random';

const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 250;

/**
 * A promise-based sleep function.
 * @param {number} ms - The number of milliseconds to wait.
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wraps the native fetch API to provide automatic retries with exponential backoff and jitter
 * for recoverable network errors and specific server status codes.
 *
 * @param {string | Request} url The resource to fetch.
 * @param {RequestInit} [options] Optional request options.
 * @param {number} [attempt=1] The current retry attempt number.
 * @returns {Promise<Response>} A promise that resolves to the Response object.
 * @throws {Error} Throws an error if the fetch fails after all retries.
 */
export async function fetchWithRetry(url, options, attempt = 1) {
    try {
        const response = await fetch(url, options);

        // Retry on 425 (Too Early) and 5xx server errors
        if (
            (response.status === 425 || response.status >= 500) &&
            attempt <= MAX_RETRIES
        ) {
            const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
            const jitter = delay * 0.2 * secureRandom();
            await sleep(delay + jitter);
            return fetchWithRetry(url, options, attempt + 1);
        }

        return response;
    } catch (error) {
        if (attempt <= MAX_RETRIES) {
            const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
            const jitter = delay * 0.2 * secureRandom();
            await sleep(delay + jitter);
            return fetchWithRetry(url, options, attempt + 1);
        }
        // After all retries, throw the last error
        throw error;
    }
}