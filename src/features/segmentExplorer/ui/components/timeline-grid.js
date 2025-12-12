import { useAnalysisStore } from '@/state/analysisStore';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { useUiStore } from '@/state/uiStore';
import { html, render } from 'lit-html';
import './timeline-track.js';

const TRACK_HEADER_WIDTH = 240;
const PIXELS_PER_SECOND = 20; // 1 second = 20px
const OVERSCAN_PX = 500; // Render buffer

export class VirtualTimelineGrid extends HTMLElement {
    constructor() {
        super();
        this._data = null;
        this._stream = null;

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

    set data({ viewModel, stream }) {
        this._data = viewModel;
        this._stream = stream;

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

        this.innerHTML = `<div id="scroller" class="w-full h-full overflow-auto bg-slate-950 relative scroll-smooth">
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
        if (!this._data || !this._stream || !this.content) return;

        const { tracks, timeBounds } = this._data;
        const totalDuration = timeBounds.duration;

        // Calculate Total Width based on Duration
        // Tight fit: Exact duration width + header width. Small buffer (20px) for labels.
        const totalWidth = Math.ceil(
            totalDuration * PIXELS_PER_SECOND + TRACK_HEADER_WIDTH + 20
        );
        this.content.style.width = `${totalWidth}px`;

        // Virtualization Window (Pixels relative to content start, excluding header)
        const effectiveScrollLeft = Math.max(
            0,
            this._scrollLeft - TRACK_HEADER_WIDTH
        );
        const visibleStartPx = Math.max(0, effectiveScrollLeft - OVERSCAN_PX);
        const visibleEndPx =
            effectiveScrollLeft + this.viewportWidth + OVERSCAN_PX;

        // Context Setup
        const { interactiveSegmentSelectedItem, segmentMatrixClickMode } =
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
            streamId: this._stream.id,
            segmentFormat: this._stream.manifest.segmentFormat,
            cache,
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
                    }}
                    style="display: block; position: relative; z-index: 10;"
                ></timeline-track>
            `
        );

        // Render Header (Sticky Ruler)
        const headerContent = this.renderRuler(
            visibleStartPx,
            visibleEndPx,
            totalWidth
        );

        // Render Full Height Grid Lines
        const gridContent = this.renderGridLines(
            visibleStartPx,
            visibleEndPx,
            totalWidth
        );

        render(
            html`
                <div class="flex flex-col min-w-max h-full relative">
                    ${headerContent} ${gridContent}
                    <div class="flex-1 pb-10 relative z-10">
                        ${tracksContent}
                    </div>
                </div>
            `,
            this.content
        );
    }

    renderGridLines(visibleStartPx, visibleEndPx, totalWidth) {
        const TICK_INTERVAL_SEC = 5;
        const tickIntervalPx = TICK_INTERVAL_SEC * PIXELS_PER_SECOND;

        const startTickIndex = Math.floor(visibleStartPx / tickIntervalPx);
        const endTickIndex = Math.ceil(visibleEndPx / tickIntervalPx);

        const lines = [];
        for (let i = startTickIndex; i <= endTickIndex; i++) {
            const posPx = i * tickIntervalPx + TRACK_HEADER_WIDTH;
            // Optimization: Don't render lines outside bounds
            if (posPx > totalWidth) break;

            lines.push(html`
                <div
                    class="absolute top-0 bottom-0 border-l border-slate-800/30 pointer-events-none"
                    style="left: ${posPx}px;"
                ></div>
            `);
        }

        return html`<div class="absolute inset-0 z-0 pointer-events-none">
            ${lines}
        </div>`;
    }

    renderRuler(visibleStartPx, visibleEndPx, totalWidth) {
        const TICK_INTERVAL_SEC = 5;
        const tickIntervalPx = TICK_INTERVAL_SEC * PIXELS_PER_SECOND;

        const startTickIndex = Math.floor(visibleStartPx / tickIntervalPx);
        const endTickIndex = Math.ceil(visibleEndPx / tickIntervalPx);

        const timelineWidth = totalWidth - TRACK_HEADER_WIDTH;

        const ticks = [];
        for (let i = startTickIndex; i <= endTickIndex; i++) {
            const posPx = i * tickIntervalPx;

            // FIX: Prevent ruler from expanding infinitely if scrolling overshot
            if (posPx > timelineWidth) break;

            const timeSec = i * TICK_INTERVAL_SEC;

            ticks.push(html`
                <div
                    class="absolute top-0 h-4 border-l border-slate-600/50 pl-1"
                    style="left: ${posPx}px;"
                >
                    <span
                        class="text-[9px] font-mono text-slate-500 block -mt-0.5"
                    >
                        ${timeSec}s
                    </span>
                </div>
            `);
        }

        const corner = html`
            <div
                class="sticky left-0 z-50 flex items-center justify-between px-4 bg-slate-900 border-r border-b border-slate-800 text-xs font-bold text-slate-400 shrink-0"
                style="width: ${TRACK_HEADER_WIDTH}px; height: 28px;"
            >
                <span>TRACKS</span>
            </div>
        `;

        return html`
            <div
                class="sticky top-0 z-40 flex bg-slate-900 border-b border-slate-800 h-[28px] shrink-0 shadow-sm"
            >
                ${corner}
                <div class="relative h-full grow">${ticks}</div>
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
