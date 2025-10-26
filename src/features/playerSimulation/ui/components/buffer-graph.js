import { html } from 'lit-html';

/**
 * Renders an SVG chart visualizing the video buffer ranges.
 * @param {HTMLVideoElement | null} videoEl The video element itself.
 * @returns {import('lit-html').TemplateResult}
 */
export const bufferGraphTemplate = (videoEl) => {
    if (!videoEl) {
        return html`<div class="h-8 bg-gray-700 rounded"></div>`;
    }

    const { buffered, duration, currentTime, seekable } = videoEl;
    let displayDuration = duration;
    let timeOffset = 0;

    // For live streams, duration is Infinity. We must use the seekable range as our timeline.
    if (
        (!isFinite(duration) || duration === 0) &&
        seekable &&
        seekable.length > 0
    ) {
        timeOffset = seekable.start(0);
        displayDuration = seekable.end(seekable.length - 1) - timeOffset;
    }

    if (!buffered || !isFinite(displayDuration) || displayDuration <= 0) {
        return html`<div class="h-8 bg-gray-700 rounded"></div>`;
    }

    const segments = [];
    for (let i = 0; i < buffered.length; i++) {
        const start =
            ((buffered.start(i) - timeOffset) / displayDuration) * 100;
        const width =
            ((buffered.end(i) - buffered.start(i)) / displayDuration) * 100;
        // Clamp values to ensure they stay within the 0-100 range visually
        if (width > 0) {
            segments.push({
                start: Math.max(0, start),
                width: Math.min(100 - Math.max(0, start), width),
            });
        }
    }

    const playheadPosition = Math.max(
        0,
        Math.min(100, ((currentTime - timeOffset) / displayDuration) * 100)
    );

    return html`
        <div class="relative w-full h-8 bg-gray-700 rounded overflow-hidden">
            ${segments.map(
                (seg) =>
                    html`<div
                        class="absolute top-0 h-full bg-blue-500"
                        style="left: ${seg.start}%; width: ${seg.width}%"
                    ></div>`
            )}
            <div
                class="absolute top-0 bottom-0 w-0.5 bg-red-500"
                style="left: ${playheadPosition}%"
                title="Playhead: ${currentTime.toFixed(2)}s"
            ></div>
        </div>
    `;
};
