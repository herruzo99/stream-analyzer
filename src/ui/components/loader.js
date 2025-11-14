import { eventBus } from '@/application/event-bus';

let dom;

/**
 * Displays the global loader with a specific message.
 * @param {string} [message='Processing...'] The message to display under the loader.
 */
export function showLoader(message = 'Processing...') {
    if (!dom || !dom.globalLoader || !dom.loaderMessage) return;
    dom.loaderMessage.textContent = message;
    dom.globalLoader.classList.remove('hidden');
    dom.globalLoader.classList.add('flex');
}

/**
 * Hides the global loader.
 */
export function hideLoader() {
    if (!dom || !dom.globalLoader) return;
    dom.globalLoader.classList.add('hidden');
    dom.globalLoader.classList.remove('flex');
}

/**
 * Initializes the loader component, setting up event listeners to automate its visibility.
 * @param {object} domContext The application's DOM context.
 */
export function initializeLoader(domContext) {
    dom = domContext;

    // --- Primary Analysis Flow ---
    eventBus.subscribe('analysis:started', () =>
        showLoader('Analyzing streams...')
    );
    eventBus.subscribe('analysis:progress', ({ message }) => {
        showLoader(message);
    });
    eventBus.subscribe('state:analysis-complete', hideLoader);
    eventBus.subscribe('analysis:failed', hideLoader);
    eventBus.subscribe('analysis:error', hideLoader);

    // --- Segment Loading ---
    eventBus.subscribe('segment:pending', () =>
        showLoader('Loading segment...')
    );
    eventBus.subscribe('segment:loaded', hideLoader);

    // --- HLS Media Playlist Loading ---
    eventBus.subscribe(
        'hls:media-playlist-fetch-request',
        ({ isBackground }) => {
            // Only show loader for user-initiated (foreground) fetches.
            if (!isBackground) {
                showLoader('Fetching media playlist...');
            }
        }
    );
    eventBus.subscribe('hls-media-playlist-fetched', hideLoader);
    eventBus.subscribe('hls-media-playlist-error', hideLoader);
}