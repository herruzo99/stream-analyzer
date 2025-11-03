import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { segmentRowTemplate } from './segment-row.js';
import { getScrollbarWidth } from '@/ui/shared/dom-utils';
import '@/ui/components/virtualized-list';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { useUiStore, uiActions } from '@/state/uiStore';
import * as customIcons from '@/ui/icons';

const flashedSegmentIds = new Map();

export const segmentTableTemplate = ({
    id,
    rawId,
    title,
    contentType,
    segments,
    stream,
    currentSegmentUrls,
    newlyAddedSegmentUrls,
    segmentFormat,
    isLoading = false,
    error = null,
}) => {
    const iconMap = {
        video: customIcons.clapperboard,
        audio: customIcons.audioLines,
        text: customIcons.fileText,
        application: customIcons.fileText,
    };
    const icon = iconMap[contentType] || customIcons.fileScan;

    let content;

    if (isLoading) {
        content = html`<div
            class="flex items-center justify-center h-24 text-slate-400 text-sm"
        >
            <div class="animate-spin mr-2">${customIcons.spinner}</div>
            Loading segments...
        </div>`;
    } else if (error) {
        content = html`<div class="p-4 text-red-400 text-sm">
            Error loading segments: ${error}
        </div>`;
    } else if (!segments || segments.length === 0) {
        content = html`<div
            class="flex items-center justify-center h-24 text-slate-400 text-sm"
        >
            No segments found for this representation.
        </div>`;
    } else {
        // --- ARCHITECTURAL REFACTOR: Separate Init and Media Segments ---
        const initSegment = segments.find((s) => s.type === 'Init');
        const mediaSegments = segments.filter((s) => s.type !== 'Init');
        // --- END REFACTOR ---

        const getFromCache = useSegmentCacheStore.getState().get;
        const { segmentExplorerTargetTime, segmentExplorerScrollToTarget } =
            useUiStore.getState();

        if (!flashedSegmentIds.has(id)) {
            flashedSegmentIds.set(id, new Set(segments.map((s) => s.uniqueId)));
        }
        const thisTablesFlashed = flashedSegmentIds.get(id);

        const rowRenderer = (seg, index) => {
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
            const listElement =
                /** @type {HTMLElement & { scrollTop: number, clientHeight: number, scrollHeight: number, rowHeight: number }} */ (
                    document.querySelector(`#vl-${id}`)
                );
            if (!listElement) return;
            if (segmentExplorerTargetTime && segmentExplorerScrollToTarget) {
                const targetIndex = mediaSegments.findIndex(
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
                <!-- Render Init Segment Separately -->
                ${initSegment
                    ? rowRenderer(initSegment)
                    : ''}
                <!-- Virtualized List for Media Segments -->
                <virtualized-list
                    id="vl-${id}"
                    .items=${mediaSegments}
                    .rowTemplate=${(item, index) => rowRenderer(item, index)}
                    .rowHeight=${64}
                    .itemId=${(item) => item.uniqueId}
                    class="grow"
                ></virtualized-list>
            </div>
        `;
    }

    return html`
        <div
            class="bg-slate-800 rounded-lg border border-slate-700 flex flex-col h-full"
        >
            <header
                class="flex items-center gap-3 p-3 bg-slate-900/50 border-b border-slate-700 rounded-t-lg"
            >
                <span class="text-slate-400">${icon}</span>
                <h4 class="font-semibold text-slate-200 text-sm">
                    ${unsafeHTML(title)}
                </h4>
            </header>
            <div class="grow min-h-0 flex flex-col">${content}</div>
        </div>
    `;
};