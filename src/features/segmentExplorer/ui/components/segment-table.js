import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { segmentRowTemplate } from './segment-row.js';
import { getScrollbarWidth } from '@/ui/shared/dom-utils';
import '@/ui/components/virtualized-list'; // Import the custom element
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { useUiStore, uiActions } from '@/state/uiStore';
import { eventBus } from '@/application/event-bus';

/**
 * A map to track which segments have been flashed for each representation.
 * This state is local to the component to avoid polluting the global store.
 * The key is the representation ID, and the value is a Set of unique segment IDs.
 * @type {Map<string, Set<string>>}
 */
const flashedSegmentIds = new Map();

// Subscribe to the analysis start event to clear the local state.
eventBus.subscribe('analysis:started', () => {
    flashedSegmentIds.clear();
});

/**
 * A shared component for rendering a table of media segments.
 *
 * @param {object} options
 * @param {string} options.id - A unique ID for the virtualized list. This is the composite key for the representation.
 * @param {string} [options.rawId] - The raw, un-sanitized ID for state lookups (e.g., HLS media playlist URL).
 * @param {string} options.title - The title to display in the table header.
 * @param {object[]} options.segments - The array of segment objects to render.
 * @param {import('@/types').Stream} options.stream - The parent stream object.
 * @param {Set<string>} options.currentSegmentUrls - A set of URLs for all segments in the current manifest.
 * @param {Set<string>} options.newlyAddedSegmentUrls - A set of URLs for segments new in the latest update.
 * @param {string} options.segmentFormat - The format of the segments (e.g., 'isobmff', 'ts').
 * @param {boolean} [options.isLoading=false] - If true, displays a loading indicator.
 * @param {string|null} [options.error=null] - If set, displays an error message.
 * @returns {import('lit-html').TemplateResult}
 */
export const segmentTableTemplate = ({
    id,
    rawId,
    title,
    segments,
    stream, // New parameter
    currentSegmentUrls,
    newlyAddedSegmentUrls,
    segmentFormat,
    isLoading = false,
    error = null,
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
        content = html`<div class="p-4 text-center text-gray-400 text-sm">
            No segments found for this representation.
        </div>`;
    } else {
        const getFromCache = useSegmentCacheStore.getState().get;
        const { segmentExplorerTargetTime, segmentExplorerScrollToTarget } =
            useUiStore.getState();

        if (!flashedSegmentIds.has(id)) {
            flashedSegmentIds.set(id, new Set(segments.map((s) => s.uniqueId)));
        }
        const thisTablesFlashed = flashedSegmentIds.get(id);

        const rowRenderer = (seg) => {
            const cacheEntry = getFromCache(seg.uniqueId);
            const shouldFlash =
                newlyAddedSegmentUrls.has(seg.uniqueId) &&
                !thisTablesFlashed.has(seg.uniqueId);

            if (shouldFlash) {
                thisTablesFlashed.add(seg.uniqueId);
            }

            return segmentRowTemplate(
                seg,
                stream,
                segmentFormat,
                rawId || id,
                currentSegmentUrls,
                cacheEntry,
                segmentExplorerTargetTime,
                shouldFlash
            );
        };
        const scrollbarWidth = getScrollbarWidth();

        setTimeout(() => {
            /** @type {import('@/ui/components/virtualized-list.js').default | null} */
            const listElement = document.querySelector(`#vl-${id}`);
            if (!listElement) return;

            if (segmentExplorerTargetTime && segmentExplorerScrollToTarget) {
                const targetIndex = segments.findIndex(
                    (seg) =>
                        seg.startTimeUTC <=
                            segmentExplorerTargetTime.getTime() &&
                        seg.endTimeUTC >= segmentExplorerTargetTime.getTime()
                );

                if (targetIndex !== -1) {
                    const centeredScrollTop =
                        targetIndex * listElement.rowHeight -
                        listElement.clientHeight / 2 +
                        listElement.rowHeight / 2;

                    listElement.scrollTop = Math.max(0, centeredScrollTop);
                }
                uiActions.clearSegmentExplorerScrollTrigger();
            }
        }, 0);

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
