import { html } from 'lit-html';

/**
 * Renders an SVG chart visualizing the video buffer ranges.
 * @param {TimeRanges} buffered The TimeRanges object from the video element.
 * @param {number} duration The total duration of the content.
 * @param {number} currentTime The current playback time.
 * @returns {import('lit-html').TemplateResult}
 */
export const bufferGraphTemplate = (buffered, duration, currentTime) => {
    if (!buffered || duration === 0) {
        return html`<div class="h-8 bg-gray-700 rounded"></div>`;
    }

    const segments = [];
    for (let i = 0; i < buffered.length; i++) {
        segments.push({
            start: (buffered.start(i) / duration) * 100,
            width: ((buffered.end(i) - buffered.start(i)) / duration) * 100,
        });
    }

    const playheadPosition = (currentTime / duration) * 100;

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
