import { eventBus } from '@/application/event-bus';
import { inferMediaInfoFromExtension } from '@/infrastructure/parsing/utils/media-types';
import { analysisActions } from '@/state/analysisStore';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { uiActions } from '@/state/uiStore';
import { showToast } from '@/ui/components/toast';
import { tooltipTriggerClasses } from '@/ui/shared/constants';
import { formatBitrate } from '@/ui/shared/format';
import { html, render } from 'lit-html';
import { repeat } from 'lit-html/directives/repeat.js';
import { renderSegmentNode } from './segment-node.js';

const TRACK_HEADER_WIDTH = 240;

const handleSegmentClick = (
    e,
    segment,
    streamId,
    format,
    clickMode,
    compareSet,
    setCache
) => {
    e.stopPropagation();
    if (!segment) return;
    const entry = setCache
        ? null
        : useSegmentCacheStore.getState().get(segment.uniqueId);
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
            if (shouldFetch && setCache)
                triggerFetch(segment, streamId, format, setCache);
        }
    } else {
        uiActions.setInteractiveSegmentSelectedItem(segment);
        if (shouldFetch && setCache)
            triggerFetch(segment, streamId, format, setCache);
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

export class TimelineTrack extends HTMLElement {
    constructor() {
        super();
        this._track = null;
        this._ctx = null;
        this._visibleStartPx = 0;
        this._visibleEndPx = 0;
        this._pixelsPerSecond = 1;
        this._totalWidthPx = 0;
    }

    set data(val) {
        if (!val) return;
        this._track = val.track;
        this._ctx = val.ctx;
        this._visibleStartPx = val.visibleStartPx || 0;
        this._visibleEndPx = val.visibleEndPx || 0;
        this._pixelsPerSecond = val.pixelsPerSecond || 1;
        this._totalWidthPx = val.totalWidthPx || 0;
        this.render();
    }

    connectedCallback() {
        this.render();
    }

    render() {
        const track = this._track;
        const ctx = this._ctx;

        if (!track || !ctx) return;

        const meta = track.meta || {};
        const codec = meta.codecs?.split('.')[0] || 'Unknown';
        const resolution = meta.width ? `${meta.width}x${meta.height}` : '';
        const bandwidth = track.bandwidth || 0;
        const initSegment = track.initSegment;
        const isInitSelected =
            initSegment &&
            ctx.compareSet &&
            ctx.compareSet.has(initSegment.uniqueId);
        const isInitInspected =
            initSegment && ctx.inspectedId === initSegment.uniqueId;

        const initClasses = `relative w-10 h-12 m-0.5 rounded border transition-all duration-75 cursor-pointer group overflow-hidden flex items-center justify-center ${
            isInitInspected
                ? 'ring-2 ring-white shadow-2xl z-20 bg-slate-700 border-slate-500'
                : isInitSelected
                  ? 'ring-2 ring-purple-500 z-10 bg-purple-900/40 border-purple-500'
                  : 'bg-slate-800 border-blue-500/30 hover:border-blue-400 hover:bg-slate-700'
        }`;

        const initText = isInitInspected
            ? 'text-white'
            : isInitSelected
              ? 'text-purple-200'
              : 'text-blue-300';
        const initDot = isInitInspected
            ? 'bg-blue-500'
            : isInitSelected
              ? 'bg-purple-400'
              : 'bg-blue-500';

        const headerTemplate = html`
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
                            >${formatBitrate(bandwidth)}</span
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
                                  @click=${(e) =>
                                      handleSegmentClick(
                                          e,
                                          initSegment,
                                          ctx.streamId,
                                          ctx.segmentFormat,
                                          ctx.clickMode,
                                          ctx.compareSet,
                                          useSegmentCacheStore.getState().set
                                      )}
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

        // Virtualization Filter
        const visibleSegments = track.segments.filter((seg) => {
            const segLeft = seg.relStart * this._pixelsPerSecond;
            const segRight = seg.relEnd * this._pixelsPerSecond;
            return (
                segRight > this._visibleStartPx && segLeft < this._visibleEndPx
            );
        });

        const segmentsTemplate = repeat(
            visibleSegments,
            (seg) => seg.uniqueId,
            (segment) => {
                const uniqueId = segment.uniqueId;
                const cacheEntry = ctx.cache.get(uniqueId);
                const isNew = track.newlyAdded
                    ? track.newlyAdded.has(uniqueId)
                    : false;
                const isStale = !!segment._isStale;

                // Position
                const leftPx = segment.relStart * this._pixelsPerSecond;
                const widthPx = Math.max(
                    2,
                    (segment.durationSec || 0) * this._pixelsPerSecond
                ); // Minimum 2px

                return html`
                    <div
                        style="position: absolute; left: ${leftPx}px; width: ${widthPx}px; height: 100%; padding: 2px;"
                    >
                        ${renderSegmentNode({
                            segment,
                            seqNumber: segment.number,
                            baselineDuration: 0, // Not used for drift calc in visual mode
                            isSelected: ctx.compareSet
                                ? ctx.compareSet.has(uniqueId)
                                : false,
                            isInspected: uniqueId === ctx.inspectedId,
                            cacheStatus: cacheEntry ? cacheEntry.status : null,
                            hasParsedData: !!(
                                cacheEntry &&
                                cacheEntry.parsedData &&
                                !cacheEntry.parsedData.error
                            ),
                            isStale,
                            isNew,
                            onClick: (e) =>
                                handleSegmentClick(
                                    e,
                                    segment,
                                    ctx.streamId,
                                    ctx.segmentFormat,
                                    ctx.clickMode,
                                    ctx.compareSet,
                                    useSegmentCacheStore.getState().set
                                ),
                        })}
                    </div>
                `;
            }
        );

        const rowStyle = `width: ${this._totalWidthPx}px;`;

        const template = html`
            <div
                class="flex border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors shrink-0"
                style="${rowStyle} box-sizing: border-box;"
            >
                ${headerTemplate}
                <div class="relative h-14 grow overflow-hidden">
                    ${segmentsTemplate}
                </div>
            </div>
        `;

        render(template, this);
    }
}

customElements.define('timeline-track', TimelineTrack);
