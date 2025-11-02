import { html } from 'lit-html';
import { segmentRowTemplate } from './segment-row.js';
import { getScrollbarWidth } from '@/ui/shared/dom-utils';
import '@/ui/components/virtualized-list';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { useUiStore, uiActions } from '@/state/uiStore';
import { createIcons, icons } from 'lucide';

const flashedSegmentIds = new Map();

export const segmentTableTemplate = ({
    id,
    segments,
    stream,
    currentSegmentUrls,
    newlyAddedSegmentUrls,
    segmentFormat,
    isLoading = false,
    error = null,
}) => {
    let content;

    if (isLoading) {
        content = html`<div
            class="flex items-center justify-center h-full text-slate-400 text-sm"
        >
            <div class="animate-spin mr-2">${icons.spinner}</div>
            Loading segments...
        </div>`;
    } else if (error) {
        content = html`<div class="p-4 text-red-400 text-sm">
            Error loading segments: ${error}
        </div>`;
    } else if (segments.length === 0) {
        content = html`<div
            class="flex items-center justify-center h-full text-slate-400 text-sm"
        >
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
            const safeNewlyAdded = new Set(newlyAddedSegmentUrls || []);
            const shouldFlash =
                safeNewlyAdded.has(seg.uniqueId) &&
                !thisTablesFlashed.has(seg.uniqueId);
            if (shouldFlash) thisTablesFlashed.add(seg.uniqueId);

            return segmentRowTemplate(
                seg,
                stream,
                segmentFormat,
                id,
                currentSegmentUrls,
                cacheEntry,
                segmentExplorerTargetTime,
                shouldFlash
            );
        };

        const scrollbarWidth = getScrollbarWidth();

        setTimeout(() => {
            const listElement = document.querySelector(`#vl-${id}`);
            if (!listElement) return;
            if (segmentExplorerTargetTime && segmentExplorerScrollToTarget) {
                const targetIndex = segments.findIndex(
                    (seg) =>
                        seg.startTimeUTC <=
                            segmentExplorerTargetTime.getTime() &&
                        seg.endTimeUTC > segmentExplorerTargetTime.getTime()
                );
                if (targetIndex !== -1) {
                    listElement.scrollTop =
                        targetIndex * listElement.rowHeight -
                        listElement.clientHeight / 2 +
                        listElement.rowHeight / 2;
                }
                uiActions.clearSegmentExplorerScrollTrigger();
            }
        }, 0);

        content = html`
            <div class="text-sm flex flex-col min-h-0 h-full">
                <div
                    class="sticky top-0 bg-slate-800 z-10 hidden md:grid md:grid-cols-[4rem_minmax(0,1.5fr)_8rem_6rem_7rem_minmax(0,2.5fr)] font-semibold text-slate-400 text-xs shrink-0"
                    style="padding-right: ${scrollbarWidth}px"
                >
                    <div
                        class="px-3 py-2 border-b border-r border-slate-700 text-center"
                    >
                        Compare
                    </div>
                    <div class="px-3 py-2 border-b border-r border-slate-700">
                        Status / Type
                    </div>
                    <div class="px-3 py-2 border-b border-r border-slate-700">
                        Timing (s)
                    </div>
                    <div class="px-3 py-2 border-b border-r border-slate-700">
                        Flags
                    </div>
                    <div class="px-3 py-2 border-b border-r border-slate-700">
                        Encryption
                    </div>
                    <div class="px-3 py-2 border-b border-slate-700">
                        URL & Actions
                    </div>
                </div>
                <virtualized-list
                    id="vl-${id}"
                    .items=${segments}
                    .rowTemplate=${rowRenderer}
                    .rowHeight=${64}
                    .itemId=${(item) => item.uniqueId}
                    .postRenderCallback=${() => createIcons({ icons })}
                    class="grow"
                ></virtualized-list>
            </div>
        `;
    }

    return html`${content}`;
};