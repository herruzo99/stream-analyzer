import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { segmentRowTemplate } from './segment-row.js';
import { getScrollbarWidth } from '@/ui/shared/dom-utils';
import '@/ui/components/virtualized-list'; // Import the custom element

/**
 * A shared component for rendering a table of media segments.
 *
 * @param {object} options
 * @param {string} options.id - A unique ID for the virtualized list. This is the composite key for the representation.
 * @param {string} options.title - The title to display in the table header.
 * @param {object[]} options.segments - The array of segment objects to render.
 * @param {import('@/types').Stream} options.stream - The parent stream object.
 * @param {Set<string>} options.freshSegmentUrls - A set of URLs for segments that are considered "fresh".
 * @param {string} options.segmentFormat - The format of the segments (e.g., 'isobmff', 'ts').
 * @param {boolean} [options.isLoading=false] - If true, displays a loading indicator.
 * @param {string|null} [options.error=null] - If set, displays an error message.
 * @param {Function} [options.onLoadClick] - A handler for a "Load Segments" button.
 * @returns {import('lit-html').TemplateResult}
 */
export const segmentTableTemplate = ({
    id,
    title,
    segments,
    stream, // New parameter
    freshSegmentUrls,
    segmentFormat,
    isLoading = false,
    error = null,
    onLoadClick,
}) => {
    const header = html`
        <div
            class="flex items-center p-2 bg-gray-900/50 border-b border-gray-700"
        >
            <div class="grow flex items-center">
                <span class="font-semibold text-gray-200"
                    >${unsafeHTML(title)}</span
                >
            </div>
            ${onLoadClick && segments.length === 0 && !isLoading && !error
                ? html`<button
                      @click=${onLoadClick}
                      class="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
                  >
                      Load Segments
                  </button>`
                : ''}
        </div>
    `;

    let content;

    if (isLoading) {
        content = html`<div class="p-4 text-center text-gray-400 text-sm">
            Loading segments...
        </div>`;
    } else if (error) {
        content = html`<div class="p-4 text-red-400 text-sm">
            Error: ${error}
        </div>`;
    } else if (segments.length === 0) {
        if (!onLoadClick) {
            content = html`<div class="p-4 text-center text-gray-400 text-sm">
                No segments found for this representation.
            </div>`;
        } else {
            content = html``;
        }
    } else {
        const rowRenderer = (seg) => {
            // Pass the composite key 'id' as 'repId' and the stream object to the row template
            return segmentRowTemplate(seg, stream, segmentFormat, id);
        };
        const scrollbarWidth = getScrollbarWidth();

        content = html`
            <div class="overflow-x-auto text-sm">
                <div class="inline-block min-w-full align-middle">
                    <div
                        class="sticky top-0 bg-gray-900 z-10 hidden md:grid md:grid-cols-[32px_180px_128px_96px_112px_minmax(400px,auto)] font-semibold text-gray-400 text-xs"
                        style="padding-right: ${scrollbarWidth}px"
                    >
                        <div
                            class="px-3 py-2 border-b border-r border-gray-700"
                        ></div>
                        <div
                            class="px-3 py-2 border-b border-r border-gray-700"
                        >
                            Status / Type
                        </div>
                        <div
                            class="px-3 py-2 border-b border-r border-gray-700"
                        >
                            Timing (s)
                        </div>
                        <div
                            class="px-3 py-2 border-b border-r border-gray-700"
                        >
                            Flags
                        </div>
                        <div
                            class="px-3 py-2 border-b border-r border-gray-700"
                        >
                            Encryption
                        </div>
                        <div class="px-3 py-2 border-b border-gray-700">
                            URL & Actions
                        </div>
                    </div>
                    <virtualized-list
                        id="vl-${id}"
                        .items=${segments}
                        .rowTemplate=${rowRenderer}
                        .rowHeight=${64}
                        .itemId=${(item) => item.uniqueId}
                        class="md:h-auto"
                        style="height: ${Math.min(
                            segments.length * 64,
                            400
                        )}px; min-height: 80px;"
                    ></virtualized-list>
                </div>
            </div>
        `;
    }

    return html`
        <div class="bg-gray-800 rounded-lg border border-gray-700 mt-2">
            ${header}
            <div class="p-0 md:p-2">${content}</div>
        </div>
    `;
};
