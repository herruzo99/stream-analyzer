import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { segmentRowTemplate } from './segment-row.js';
import { getScrollbarWidth } from '@/ui/shared/dom-utils';
import '@/ui/components/virtualized-list';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { useUiStore, uiActions } from '@/state/uiStore';
import * as customIcons from '@/ui/icons';
import { showToast } from '@/ui/components/toast.js';
import { eventBus } from '@/application/event-bus.js';
import { inferMediaInfoFromExtension } from '@/infrastructure/parsing/utils/media-types.js';

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

    const handleDownloadAll = () => {
        const { get, set } = useSegmentCacheStore.getState();
        const unloadedSegments = segments.filter((seg) => {
            if (seg.gap) return false;
            const entry = get(seg.uniqueId);
            return !entry || (entry.status !== 200 && entry.status !== -1);
        });

        if (unloadedSegments.length === 0) {
            showToast({
                message: 'All segments are already loaded.',
                type: 'info',
            });
            return;
        }

        showToast({
            message: `Queueing ${unloadedSegments.length} segment(s) for download.`,
            type: 'info',
        });

        const { isIFrame } = getIsIframe(stream, rawId);

        unloadedSegments.forEach((seg) => {
            const { contentType: inferredContentType } =
                inferMediaInfoFromExtension(seg.resolvedUrl);
            const formatHint =
                inferredContentType === 'text'
                    ? 'vtt'
                    : segmentFormat === 'unknown'
                      ? null
                      : segmentFormat;

            set(seg.uniqueId, { status: -1, data: null, parsedData: null });
            eventBus.dispatch('segment:fetch', {
                uniqueId: seg.uniqueId,
                streamId: stream.id,
                format: formatHint,
                context: { isIFrame },
            });
        });
    };

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
        const initSegment = segments.find((s) => s.type === 'Init');
        const mediaSegments = segments.filter((s) => s.type !== 'Init');

        const getFromCache = useSegmentCacheStore.getState().get;
        const { segmentExplorerTargetTime, segmentExplorerScrollToTarget } =
            useUiStore.getState();

        const { isIFrame: isIFrameRepresentation } = getIsIframe(stream, rawId);

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
                rawId,
                currentSegmentUrls,
                cacheEntry,
                segmentExplorerTargetTime,
                shouldFlash,
                isIFrameRepresentation
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
                ${initSegment ? rowRenderer(initSegment) : ''}
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
                <div class="ml-auto">
                    <button
                        @click=${handleDownloadAll}
                        class="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors"
                        title="Download and parse all unloaded segments for this representation"
                    >
                        ${customIcons.download}
                        <span>Download All</span>
                    </button>
                </div>
            </header>
            <div class="grow min-h-0 flex flex-col">${content}</div>
        </div>
    `;
};

function getIsIframe(stream, rawId) {
    let isIFrameRepresentation = false;
    if (stream.protocol === 'dash') {
        const [periodIndex, repId] = rawId.split('-');
        const period = stream.manifest.periods[parseInt(periodIndex, 10)];
        const as = period?.adaptationSets.find((as) =>
            as.representations.some((r) => r.id === repId)
        );
        isIFrameRepresentation =
            as?.roles?.some((r) => r.value === 'trick') || false;
    } else if (stream.protocol === 'hls') {
        isIFrameRepresentation =
            stream.mediaPlaylists.get(rawId)?.manifest?.summary?.hls
                ?.isIFrameOnly ||
            (stream.manifest.summary?.hls?.iFramePlaylists > 0 &&
                rawId.includes('_iframes'));
    }
    return { isIFrame: isIFrameRepresentation };
}