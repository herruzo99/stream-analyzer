import { eventBus } from '@/application/event-bus';
import { LoaderFX } from './loader-fx.js';

let dom;
let loaderVisualizer = null;
let isHiding = false;
let activeTimeout = null;
let showTimestamp = 0;

const MIN_DISPLAY_DURATION = 600; // ms - Minimum time the loader remains visible
const TRANSITION_DURATION = 300; // ms - Matches CSS transition duration

export function showLoader(message = 'Processing...') {
    if (!dom || !dom.globalLoader) return;

    // 1. Cancel any pending hide operation
    if (activeTimeout) {
        clearTimeout(activeTimeout);
        activeTimeout = null;
    }
    isHiding = false;

    // 2. Update Message immediately
    if (dom.loaderMessage) {
        dom.loaderMessage.textContent = message;
        // Reset glint animation
        dom.loaderMessage.classList.remove('animate-pulse');
        void dom.loaderMessage.offsetWidth;
        dom.loaderMessage.classList.add('animate-pulse');
    }

    // 3. If already visible, just ensure visualizer is running
    if (!dom.globalLoader.classList.contains('hidden')) {
        if (loaderVisualizer) loaderVisualizer.fadeIn();
        return;
    }

    // 4. Show Logic (First appearance)
    showTimestamp = Date.now();

    // Prepare DOM (Invisible but present for layout)
    dom.globalLoader.classList.remove('hidden');
    dom.globalLoader.classList.add('flex');

    // Start visualizer before fading in (so it's ready)
    if (!loaderVisualizer) {
        const canvas = dom.globalLoader.querySelector('canvas');
        if (canvas) {
            loaderVisualizer = new LoaderFX(canvas);
        }
    }
    if (loaderVisualizer) {
        loaderVisualizer.fadeIn();
    }

    // Trigger Fade In (next frame to allow layout)
    requestAnimationFrame(() => {
        if (dom.globalLoader) {
            dom.globalLoader.classList.remove('opacity-0');
            dom.globalLoader.classList.add('opacity-100');
        }
    });
}

export async function hideLoader() {
    if (!dom || !dom.globalLoader || isHiding) return;

    const elapsed = Date.now() - showTimestamp;
    const remainingHoldTime = Math.max(0, MIN_DISPLAY_DURATION - elapsed);

    isHiding = true;

    // Wait for minimum duration to prevent flash
    if (remainingHoldTime > 0) {
        await new Promise((resolve) => {
            activeTimeout = setTimeout(resolve, remainingHoldTime);
        });
    }

    // If cancelled during wait (showLoader called again), abort hide
    if (!isHiding) {
        activeTimeout = null;
        return;
    }

    // Start Visual Exit (Particles fade/speed up)
    if (loaderVisualizer) {
        loaderVisualizer.fadeOut();
    }

    // Start DOM Fade Out
    dom.globalLoader.classList.remove('opacity-100');
    dom.globalLoader.classList.add('opacity-0');

    // Wait for CSS transition to finish before hiding DOM
    await new Promise((resolve) => {
        activeTimeout = setTimeout(resolve, TRANSITION_DURATION);
    });

    // Final teardown if still hiding
    if (isHiding) {
        dom.globalLoader.classList.add('hidden');
        dom.globalLoader.classList.remove('flex');
        if (loaderVisualizer) {
            loaderVisualizer.stop();
        }
        isHiding = false;
        activeTimeout = null;
    }
}

export function initializeLoader(domContext) {
    dom = domContext;

    // Ensure initial state classes
    if (dom.globalLoader) {
        // Start hidden and transparent
        dom.globalLoader.classList.add(
            'hidden',
            'opacity-0',
            'transition-opacity',
            'duration-300',
            'ease-in-out'
        );
    }

    // Bind Events
    eventBus.subscribe('analysis:started', () => showLoader('Analyzing...'));
    eventBus.subscribe('analysis:progress', ({ message }) =>
        showLoader(message)
    );

    eventBus.subscribe('state:analysis-complete', hideLoader);
    eventBus.subscribe('analysis:failed', hideLoader);
    eventBus.subscribe('analysis:error', hideLoader);

    eventBus.subscribe('segment:pending', () =>
        showLoader('Loading Segment...')
    );
    eventBus.subscribe('segment:loaded', hideLoader);

    eventBus.subscribe(
        'hls:media-playlist-fetch-request',
        ({ isBackground }) => {
            if (!isBackground) showLoader('Fetching Playlist...');
        }
    );
    eventBus.subscribe('hls-media-playlist-fetched', hideLoader);
    eventBus.subscribe('hls-media-playlist-error', hideLoader);
}
