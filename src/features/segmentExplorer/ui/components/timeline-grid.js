import { useAnalysisStore } from '@/state/analysisStore';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { useUiStore } from '@/state/uiStore';
import { html, render } from 'lit-html';
import './timeline-track.js';

const getHeaderWidth = () => (window.innerWidth < 640 ? 120 : 240);
const PIXELS_PER_SECOND = 20; // 1 second = 20px
const OVERSCAN_PX = 500; // Render buffer

export class VirtualTimelineGrid extends HTMLElement {
    constructor() {
        super();
        this._data = null;
        this._streamId = null;
        this._segmentFormat = null;

        this._scrollTop = 0;
        this._scrollLeft = 0;
        this.viewportWidth = 0;

        this.isSticky = true;
        this.isProgrammaticScroll = false;

        /** @type {HTMLElement | null} */
        this.scroller = null;
        /** @type {HTMLElement | null} */
        this.content = null;
        this.resizeObserver = null;
        this.rafId = null;

        this.onScroll = this.onScroll.bind(this);
    }

    set data(val) {
        if (!val) return;
        const { viewModel, streamId, segmentFormat, uiState, segmentsForCompare } = val;

        const clickMode = uiState ? uiState.segmentMatrixClickMode : null;
        const activeThemeId = uiState ? uiState.activeThemeId : null;

        // Performance Optimization:
        if (
            this._data === viewModel &&
            this._streamId === streamId &&
            this._segmentFormat === segmentFormat &&
            this._clickMode === clickMode &&
            this._activeThemeId === activeThemeId &&
            this._segmentsForCompare === segmentsForCompare
        ) {
            return;
        }

        const prevStreamId = this._streamId;

        this._data = viewModel;
        this._streamId = streamId;
        this._segmentFormat = segmentFormat;
        this._clickMode = clickMode;
        this._activeThemeId = activeThemeId;
        this._segmentsForCompare = segmentsForCompare;

        // Reset scroll only if stream actually changed
        if (prevStreamId !== streamId) {
            this._scrollLeft = 0;
            if (this.scroller) this.scroller.scrollLeft = 0;
        }

        if (this._data && !this._data.isLive) {
            this.isSticky = false;
        }

        this.renderGrid();

        // Sticky Logic: Only snap if we are sticky AND layout is ready
        if (this.isSticky && this.scroller) {
            requestAnimationFrame(() => {
                if (this.scroller) {
                    // Calculate target position (Right Edge)
                    const maxScroll =
                        this.scroller.scrollWidth - this.scroller.clientWidth;

                    // Tolerance check: Don't scroll if we're already essentially there (prevents jitter)
                    // But DO scroll if the content grew
                    if (maxScroll > this._scrollLeft + 2) {
                        this.isProgrammaticScroll = true;
                        this.scroller.scrollLeft = maxScroll;
                        // Update local state immediately to prevent onScroll race conditions
                        this._scrollLeft = maxScroll;

                        // Reset programmatic flag after the scroll event has likely fired
                        // Using RAF to ensure it clears after the browser processes the scroll
                        requestAnimationFrame(() => {
                            this.isProgrammaticScroll = false;
                        });

                        // Re-render to show new content that just scrolled into view
                        this.renderGrid();
                    }
                }
            });
        }
    }

    connectedCallback() {
        this.style.display = 'block';
        this.style.height = '100%';
        this.style.width = '100%';
        this.style.overflow = 'hidden';

        this.innerHTML = `<div id="scroller" class="w-full h-full overflow-auto bg-transparent relative scroll-smooth custom-scrollbar">
            <div id="content" class="relative min-w-full h-full"></div>
        </div>`;

        this.scroller = /** @type {HTMLElement} */ (
            this.querySelector('#scroller')
        );
        this.content = /** @type {HTMLElement} */ (
            this.querySelector('#content')
        );

        if (this.scroller) {
            this.scroller.addEventListener('scroll', this.onScroll, {
                passive: true,
            });
            this.resizeObserver = new ResizeObserver((entries) => {
                for (let entry of entries) {
                    if (entry.contentRect.width > 0) {
                        this.viewportWidth = entry.contentRect.width;
                        this.renderGrid();
                    }
                }
            });
            this.resizeObserver.observe(this.scroller);
            this.viewportWidth = this.scroller.clientWidth;
        }

        this.renderGrid();
    }

    disconnectedCallback() {
        if (this.resizeObserver) this.resizeObserver.disconnect();
        if (this.scroller)
            this.scroller.removeEventListener('scroll', this.onScroll);
        if (this.rafId) cancelAnimationFrame(this.rafId);
    }

    onScroll(e) {
        const target = /** @type {HTMLElement} */ (e.target);
        const newTop = target.scrollTop;
        const newLeft = target.scrollLeft;

        // Detect Horizontal Scroll
        if (this._scrollLeft !== newLeft) {
            this._scrollLeft = newLeft;

            // Sticky State Management
            if (!this.isProgrammaticScroll) {
                const maxScroll = target.scrollWidth - target.clientWidth;
                // If user is within 20px of the right edge, enable sticky.
                // Otherwise, disable it immediately.
                const distFromEdge = Math.abs(maxScroll - newLeft);

                if (distFromEdge < 20) {
                    this.isSticky = true;
                } else {
                    this.isSticky = false; // Immediate disable to prevent hijacking
                }
            }

            this._scheduleRender();
        }

        // Detect Vertical Scroll
        if (this._scrollTop !== newTop) {
            this._scrollTop = newTop;
            this._scheduleRender();
        }
    }

    _scheduleRender() {
        if (!this.rafId) {
            this.rafId = requestAnimationFrame(() => {
                this.rafId = null;
                this.renderGrid();
            });
        }
    }

    renderGrid() {
        // DEBUG LOGS
        // console.log('[VirtualTimelineGrid] renderGrid called', { 
        //    hasData: !!this._data, 
        //    streamId: this._streamId, 
        //    hasContent: !!this.content 
        // });

        if (!this._data || this._streamId == null || !this.content) {
            // console.warn('[VirtualTimelineGrid] renderGrid aborted: missing strict dependencies.');
            return;
        }

        const { tracks, timeBounds } = this._data;
        const totalDuration = timeBounds.duration;

        const headerWidth = getHeaderWidth();

        // Calculate Total Width based on Duration
        // Tight fit: Exact duration width + header width. Small buffer (20px) for labels.
        const totalWidth = Math.ceil(
            totalDuration * PIXELS_PER_SECOND + headerWidth + 20
        );
        this.content.style.width = `${totalWidth}px`;

        // Virtualization Window (Pixels relative to content start, excluding header)
        const effectiveScrollLeft = Math.max(0, this._scrollLeft - headerWidth);
        const visibleStartPx = Math.max(0, effectiveScrollLeft - OVERSCAN_PX);
        const visibleEndPx =
            effectiveScrollLeft + this.viewportWidth + OVERSCAN_PX;

        // Context Setup
        const { interactiveSegmentSelectedItem, segmentMatrixClickMode, activeThemeId } =
            useUiStore.getState();
        const { segmentsForCompare } = useAnalysisStore.getState();
        const { cache } = useSegmentCacheStore.getState();

        // ARCHITECTURAL FIX: Extract full segment object for precise matching
        const inspectedSegment =
            interactiveSegmentSelectedItem?.item ||
            interactiveSegmentSelectedItem;

        const compareSet = new Set(
            segmentsForCompare.map((s) => s.segmentUniqueId)
        );

        const ctx = {
            inspectedSegment, // Pass full object, not just ID
            compareSet,
            clickMode: segmentMatrixClickMode,
            streamId: this._streamId, // Updated usage
            segmentFormat: this._segmentFormat, // Updated usage
            cache,
            activeThemeId,
        };

        // Render Tracks with Proportional Logic
        const tracksContent = tracks.map(
            (track) => html`
                <timeline-track
                    .data=${{
                    track,
                    ctx,
                    visibleStartPx,
                    visibleEndPx,
                    pixelsPerSecond: PIXELS_PER_SECOND,
                    totalWidthPx: totalWidth,
                    headerWidth: headerWidth,
                }}
                    style="display: block; position: relative; z-index: 10;"
                ></timeline-track>
            `
        );

        // Corner
        const corner = html`
            <div
                class="sticky left-0 z-50 bg-white/5 border-r border-white/10 shrink-0"
                style="width: ${headerWidth}px;"
            ></div>
        `;

        // Ticks
        const startTick = Math.floor(visibleStartPx / PIXELS_PER_SECOND);
        const endTick = Math.ceil(visibleEndPx / PIXELS_PER_SECOND);
        const ticks = [];

        // Determine label interval based on timestamp length to prevent overlap
        // For large timestamps (millions), we need more space.
        // 1000000s is ~7 chars. 10px font ~ 50-60px width.
        // 5 seconds * 20px = 100px space. Safe.
        const labelInterval = 5;

        for (let i = startTick; i <= endTick; i++) {
            if (i > totalDuration) break;
            const left = i * PIXELS_PER_SECOND;
            const isMajor = i % labelInterval === 0;

            ticks.push(html`
                <div
                    class="absolute top-0 bottom-0 border-l ${isMajor ? 'border-white/10 h-full' : 'border-white/10 h-2'}"
                    style="left: ${left}px;"
                >
                    ${isMajor
                    ? html`<span
                              class="absolute top-2 left-1 text-[10px] text-slate-400 select-none font-mono font-bold opacity-70"
                              >${i}s</span
                          >`
                    : ''}
                </div>
            `);
        }

        const header = html`
            <div
                class="sticky top-0 z-40 flex bg-white/5 border-b border-white/10 h-[28px] shrink-0"
            >
                ${corner}
                <div class="relative h-full grow">${ticks}</div>
            </div>
        `;

        render(
            html`
                ${header}
                <div class="flex flex-col">${tracksContent}</div>
            `,
            this.content
        );
    }
}

customElements.define('virtual-timeline-grid', VirtualTimelineGrid);

export const timelineGridTemplate = (
    viewModel,
    streamId,
    segmentFormat,
    uiState,
    segmentsForCompare
) => {
    return html`<virtual-timeline-grid
        .data=${{ viewModel, streamId, segmentFormat, uiState, segmentsForCompare }}
    ></virtual-timeline-grid>`;
};
