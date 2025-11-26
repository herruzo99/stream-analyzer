import { html, render } from 'lit-html';
import { repeat } from 'lit-html/directives/repeat.js';
import { useUiStore, uiActions } from '@/state/uiStore';
import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { eventBus } from '@/application/event-bus';
import { showToast } from '@/ui/components/toast';
import { inferMediaInfoFromExtension } from '@/infrastructure/parsing/utils/media-types';
import { renderSegmentNode } from './segment-node.js';
import { formatBitrate } from '@/ui/shared/format';
import { tooltipTriggerClasses } from '@/ui/shared/constants';

// Constants for layout
const TRACK_HEADER_WIDTH = 240;
const SEGMENT_WIDTH = 44; // 40px width + 2px margin on each side (approx)
const OVERSCAN_COLS = 10;

// --- Render Helpers ---

const renderTrackHeader = (track, initSegment, ctx) => {
    const { inspectedId, compareSet, clickMode, streamId, segmentFormat } = ctx;
    const codec = track.meta?.codecs?.split('.')[0] || 'Unknown';
    const resolution = track.meta?.width
        ? `${track.meta.width}x${track.meta.height}`
        : '';

    const isInitSelected = initSegment && compareSet.has(initSegment.uniqueId);
    const isInitInspected = initSegment && inspectedId === initSegment.uniqueId;

    let initClasses =
        'relative w-10 h-12 m-0.5 rounded border transition-all duration-75 cursor-pointer group overflow-hidden flex items-center justify-center';
    let initText = 'text-blue-300';
    let initDot = 'bg-blue-500';

    if (isInitInspected) {
        initClasses +=
            ' ring-2 ring-white shadow-2xl z-20 bg-slate-700 border-slate-500';
        initText = 'text-white';
    } else if (isInitSelected) {
        initClasses +=
            ' ring-2 ring-purple-500 z-10 bg-purple-900/40 border-purple-500';
        initText = 'text-purple-200';
        initDot = 'bg-purple-400';
    } else {
        initClasses +=
            ' bg-slate-800 border-blue-500/30 hover:border-blue-400 hover:bg-slate-700';
    }

    const handleInitClick = (e) => {
        e.stopPropagation();
        if (!initSegment) return;
        handleSegmentClick(e, initSegment, ctx);
    };

    return html`
        <div
            class="sticky left-0 z-30 flex bg-slate-900 border-r border-slate-800 shadow-[4px_0_15px_rgba(0,0,0,0.5)] group select-none h-14 w-[${TRACK_HEADER_WIDTH}px] shrink-0"
        >
            <div
                class="flex-1 flex flex-col justify-center px-3 py-1 min-w-0 w-[180px]"
            >
                <div class="flex items-baseline justify-between gap-2 mb-1">
                    <span
                        class="font-bold text-sm text-slate-100 truncate"
                        title="${track.label}"
                        >${track.label}</span
                    >
                    <span
                        class="text-[10px] font-mono text-cyan-400 bg-cyan-900/20 px-1.5 rounded border border-cyan-900/30"
                        >${formatBitrate(track.bandwidth)}</span
                    >
                </div>
                <div
                    class="flex items-center gap-2 text-[10px] text-slate-500 truncate"
                >
                    <span
                        class="uppercase font-semibold tracking-wider text-slate-400"
                        >${codec}</span
                    >
                    ${resolution
                        ? html`<span>•</span><span>${resolution}</span>`
                        : ''}
                </div>
            </div>
            <div
                class="shrink-0 h-full flex items-center px-1 border-l border-slate-800 bg-slate-900/50 w-[50px] justify-center"
            >
                ${initSegment
                    ? html`
                          <div
                              @click=${handleInitClick}
                              class="${initClasses} ${tooltipTriggerClasses}"
                              data-tooltip="Initialization Segment"
                          >
                              <div
                                  class="flex flex-col items-center justify-center pointer-events-none"
                              >
                                  <span
                                      class="text-[9px] font-mono ${initText} font-bold"
                                      >INIT</span
                                  >
                                  <div
                                      class="w-1 h-1 mt-1 rounded-full ${initDot}"
                                  ></div>
                              </div>
                          </div>
                      `
                    : html`<span
                          class="text-[8px] text-slate-600 font-mono opacity-40"
                          >N/A</span
                      >`}
            </div>
        </div>
    `;
};

const handleSegmentClick = (e, segment, ctx) => {
    const { clickMode, compareSet, streamId, segmentFormat, cache } = ctx;
    const { set } = useSegmentCacheStore.getState();

    const entry = cache.get(segment.uniqueId);
    const shouldFetch = !entry || (entry.status !== 200 && entry.status !== -1);

    if (clickMode === 'compare') {
        if (compareSet.has(segment.uniqueId)) {
            analysisActions.removeSegmentFromCompare(segment.uniqueId);
        } else {
            analysisActions.addSegmentToCompare({
                streamId,
                repId: segment.repId,
                segmentUniqueId: segment.uniqueId,
            });
            if (shouldFetch)
                triggerFetch(segment, streamId, segmentFormat, set);
        }
    } else {
        uiActions.setInteractiveSegmentSelectedItem(segment);
        if (shouldFetch) triggerFetch(segment, streamId, segmentFormat, set);
    }
};

const triggerFetch = (segment, streamId, format, setCache) => {
    const { contentType } = inferMediaInfoFromExtension(segment.resolvedUrl);
    const formatHint =
        contentType === 'text' ? 'vtt' : format === 'unknown' ? null : format;
    setCache(segment.uniqueId, { status: -1, data: null, parsedData: null });
    eventBus.dispatch('segment:fetch', {
        uniqueId: segment.uniqueId,
        streamId,
        format: formatHint,
        context: {},
    });
    showToast({ message: `Fetching #${segment.number}...`, type: 'info' });
};

// --- Main Component Class ---

export class VirtualTimelineGrid extends HTMLElement {
    constructor() {
        super();
        this.scrollLeft = 0;
        this.viewportWidth = 0;
        this.resizeObserver = null;
        this._data = null;
        this._stream = null;
        this._ctx = null; // Render context
        /** @type {HTMLElement | null} */
        this.scroller = null;
        /** @type {HTMLElement | null} */
        this.content = null;
    }

    set data({ viewModel, stream }) {
        this._data = viewModel;
        this._stream = stream;
        this.render();
    }

    connectedCallback() {
        this.innerHTML = `<div id="scroller" class="w-full h-full overflow-auto bg-slate-950 relative scroll-smooth">
            <div id="content" class="relative min-w-full"></div>
        </div>`;

        this.scroller = this.querySelector('#scroller');
        this.content = this.querySelector('#content');

        if (this.scroller) {
            this.scroller.addEventListener('scroll', this.onScroll.bind(this), {
                passive: true,
            });

            this.resizeObserver = new ResizeObserver((entries) => {
                for (let entry of entries) {
                    if (entry.contentRect.width > 0) {
                        this.viewportWidth = entry.contentRect.width;
                        this.render(); // Re-render on resize to adjust column count
                    }
                }
            });
            this.resizeObserver.observe(this.scroller);
        }
    }

    disconnectedCallback() {
        if (this.resizeObserver) this.resizeObserver.disconnect();
        if (this.scroller)
            this.scroller.removeEventListener('scroll', this.onScroll);
    }

    onScroll(e) {
        this.scrollLeft = e.target.scrollLeft;
        requestAnimationFrame(() => this.render());
    }

    render() {
        if (!this._data || !this._stream || !this.content) return;

        const { tracks, gridBounds, baselineDuration } = this._data;
        const { minSeq, totalColumns } = gridBounds;

        // 1. Virtualization Math
        const effectiveScrollLeft = Math.max(
            0,
            this.scrollLeft - TRACK_HEADER_WIDTH
        );

        let startCol = Math.floor(effectiveScrollLeft / SEGMENT_WIDTH);
        let visibleCols = Math.ceil(
            (this.viewportWidth - TRACK_HEADER_WIDTH) / SEGMENT_WIDTH
        );

        // Fallback if viewportWidth not yet measured (first render)
        if (this.viewportWidth === 0 && this.scroller) {
            visibleCols =
                Math.ceil(
                    (this.scroller.clientWidth - TRACK_HEADER_WIDTH) /
                        SEGMENT_WIDTH
                ) || 20;
        }

        // Safety bounds
        startCol = Math.max(0, startCol - OVERSCAN_COLS);
        let endCol = Math.min(
            totalColumns,
            startCol + visibleCols + OVERSCAN_COLS * 2
        );

        // Ensure we don't render negative indices
        if (startCol < 0) startCol = 0;

        // 2. Context for Cells
        const { interactiveSegmentSelectedItem, segmentMatrixClickMode } =
            useUiStore.getState();
        const { segmentsForCompare } = useAnalysisStore.getState();
        const { cache } = useSegmentCacheStore.getState();
        const inspectedId =
            interactiveSegmentSelectedItem?.item?.uniqueId ||
            interactiveSegmentSelectedItem?.uniqueId;
        const compareSet = new Set(
            segmentsForCompare.map((s) => s.segmentUniqueId)
        );

        this._ctx = {
            inspectedId,
            compareSet,
            clickMode: segmentMatrixClickMode,
            streamId: this._stream.id,
            segmentFormat: this._stream.manifest.segmentFormat,
            cache,
        };

        // 3. Templates
        const totalWidth = totalColumns * SEGMENT_WIDTH + TRACK_HEADER_WIDTH;
        this.content.style.width = `${totalWidth}px`;

        // Header Row (Ruler)
        const headerContent = this.renderRuler(startCol, endCol, minSeq);

        // Track Rows
        const tracksContent = tracks.map((track) =>
            this.renderTrack(track, startCol, endCol, minSeq, baselineDuration)
        );

        render(
            html`
                <div class="flex flex-col min-w-max pb-10">
                    ${headerContent} ${tracksContent}
                </div>
            `,
            this.content
        );
    }

    renderRuler(startCol, endCol, minSeq) {
        const cells = [];
        const leftPadding = startCol * SEGMENT_WIDTH;

        for (let i = startCol; i < endCol; i++) {
            const seq = minSeq + i;
            const label = i === 0 || seq % 5 === 0 ? seq : '';
            cells.push(html`
                <div
                    style="width: ${SEGMENT_WIDTH}px;"
                    class="shrink-0 flex justify-center text-[10px] font-mono text-slate-600 relative h-full"
                >
                    ${label
                        ? html`<span class="absolute top-2">${label}</span>
                              <div
                                  class="h-1 w-px bg-slate-700 absolute bottom-0"
                              ></div>`
                        : ''}
                </div>
            `);
        }

        const corner = html`
            <div
                class="sticky left-0 z-50 flex items-center justify-between px-4 bg-slate-900 border-r border-b border-slate-800 text-xs font-bold text-slate-400 shrink-0"
                style="width: ${TRACK_HEADER_WIDTH}px; height: 36px;"
            >
                <span>TRACKS</span>
            </div>
        `;

        return html`
            <div
                class="sticky top-0 z-40 flex bg-slate-900 border-b border-slate-800 h-[36px]"
            >
                ${corner}
                <div class="flex" style="padding-left: ${leftPadding}px">
                    ${cells}
                </div>
            </div>
        `;
    }

    renderTrack(track, startCol, endCol, minSeq, baselineDuration) {
        const leftPadding = startCol * SEGMENT_WIDTH;

        const indices = [];
        for (let i = startCol; i < endCol; i++) indices.push(i);

        const cellTemplates = repeat(
            indices,
            (i) => i,
            (i) => {
                const segment = track.segmentMap.get(i);
                const seqNumber = minSeq + i;

                if (!segment) {
                    return renderSegmentNode({
                        segment: null,
                        seqNumber,
                        baselineDuration: 0,
                        isSelected: false,
                        isInspected: false,
                        cacheStatus: null,
                        hasParsedData: false,
                        isStale: false,
                        isNew: false,
                        onClick: () => {},
                    });
                }

                const uniqueId = segment.uniqueId;
                const cacheEntry = this._ctx.cache.get(uniqueId);
                const isStale = false;
                const isNew = track.newlyAdded.has(uniqueId);

                return renderSegmentNode({
                    segment,
                    seqNumber,
                    baselineDuration,
                    isSelected: this._ctx.compareSet.has(uniqueId),
                    isInspected: uniqueId === this._ctx.inspectedId,
                    cacheStatus: cacheEntry ? cacheEntry.status : null,
                    hasParsedData: !!(
                        cacheEntry &&
                        cacheEntry.parsedData &&
                        !cacheEntry.parsedData.error
                    ),
                    isStale,
                    isNew,
                    onClick: (e) => handleSegmentClick(e, segment, this._ctx),
                });
            }
        );

        return html`
            <div
                class="flex border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
            >
                ${renderTrackHeader(track, track.initSegment, this._ctx)}
                <div
                    class="flex items-center"
                    style="padding-left: ${leftPadding}px"
                >
                    ${cellTemplates}
                </div>
            </div>
        `;
    }
}

customElements.define('virtual-timeline-grid', VirtualTimelineGrid);

export const timelineGridTemplate = (viewModel, stream) => {
    return html`<virtual-timeline-grid
        .data=${{ viewModel, stream }}
    ></virtual-timeline-grid>`;
};
