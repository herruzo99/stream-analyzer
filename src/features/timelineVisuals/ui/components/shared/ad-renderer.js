import { html } from 'lit-html';
import { eventBus } from '@/application/event-bus';

/**
 * Renders a collection of AdAvail objects onto a timeline.
 * @param {import('@/domain/ads/AdAvail').AdAvail[] | undefined} adAvails - The array of ad avail objects to render.
 * @param {number} totalDuration - The total duration of the timeline in seconds.
 * @param {number} [timelineStart=0] - The start time of the timeline in seconds, for offset calculation.
 * @returns {import('lit-html').TemplateResult | string} The rendered lit-html template.
 */
export const renderAdAvails = (adAvails, totalDuration, timelineStart = 0) => {
    if (!adAvails || adAvails.length === 0) return '';

    return html`${adAvails.map((avail) => {
        const left = ((avail.startTime - timelineStart) / totalDuration) * 100;
        const width = (avail.duration / totalDuration) * 100;

        // Do not render avails that are completely outside the visible timeline
        if (left > 100 || left + width < 0) return '';

        let creativeOffset = 0;
        return html`<div
            class="absolute top-0 h-full bg-purple-500/60 border-l-4 border-purple-400 z-10 flex cursor-pointer hover:ring-2 hover:ring-purple-300"
            style="left: ${left}%; width: ${width}%;"
            data-tooltip="Ad Avail: ${avail.id}
Duration: ${avail.duration.toFixed(2)}s
(Click for SCTE-35 details)"
            @click=${() =>
                eventBus.dispatch('ui:show-scte35-details', {
                    scte35: avail.scte35Signal,
                    startTime: avail.startTime,
                })}
        >
            ${avail.creatives.map((creative) => {
                // Creative width is a percentage of its parent ad avail's width
                const creativeWidth =
                    avail.duration > 0
                        ? (creative.duration / avail.duration) * 100
                        : 0;
                const creativeLeft = creativeOffset;
                creativeOffset += creativeWidth;

                return html`<div
                    class="h-full bg-purple-700/70 border-r border-purple-900/50"
                    style="position: absolute; left: ${creativeLeft}%; width: ${creativeWidth}%;"
                    data-tooltip="Creative: ${creative.id || 'N/A'}
Duration: ${creative.duration}s
URL: ${creative.mediaFileUrl}"
                ></div>`;
            })}
        </div>`;
    })}`;
};
