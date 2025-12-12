import { eventBus } from '@/application/event-bus';
import { inferMediaInfoFromExtension } from '@/infrastructure/parsing/utils/media-types';
import { analysisActions } from '@/state/analysisStore';
import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { uiActions } from '@/state/uiStore';
import { showToast } from '@/ui/components/toast';
import { formatBitrate } from '@/ui/shared/format';
import { html, render } from 'lit-html';
import { repeat } from 'lit-html/directives/repeat.js';
import { renderSegmentNode } from './segment-node.js';

const TRACK_HEADER_WIDTH = 240;

const handleSegmentClick = (
    e,
    segment,
    trackId,
    streamId,
    format,
    clickMode,
    compareSet,
    setCache
) => {
    e.stopPropagation();
    if (!segment) return;

    const contextSegment = {
        ...segment,
        repId: trackId,
    };

    const entry = useSegmentCacheStore.getState().get(segment.uniqueId);
    const isLoaded = entry && entry.status === 200 && entry.data;
    const isLoading = entry && entry.status === -1;

    if (clickMode === 'compare') {
        if (compareSet.has(segment.uniqueId)) {
            analysisActions.removeSegmentFromCompare(segment.uniqueId);
        } else {
            analysisActions.addSegmentToCompare({
                streamId,
                repId: trackId,
                segmentUniqueId: segment.uniqueId,
            });
            if (!isLoaded && !isLoading && setCache) {
                triggerFetch(
                    segment.uniqueId,
                    segment.resolvedUrl,
                    segment.number,
                    streamId,
                    format,
                    setCache
                );
            }
        }
    } else {
        uiActions.setInteractiveSegmentSelectedItem(contextSegment);
        if (!isLoaded && !isLoading && setCache) {
            triggerFetch(
                segment.uniqueId,
                segment.resolvedUrl,
                segment.number,
                streamId,
                format,
                setCache
            );
        }
    }
};

const triggerFetch = (
    uniqueId,
    resolvedUrl,
    number,
    streamId,
    format,
    setCache
) => {
    const { contentType } = inferMediaInfoFromExtension(resolvedUrl);
    let formatHint = format === 'unknown' ? null : format;

    if (contentType === 'text') {
        const urlLower = resolvedUrl.toLowerCase();
        if (
            urlLower.endsWith('.ttml') ||
            urlLower.endsWith('.dfxp') ||
            urlLower.endsWith('.xml') ||
            urlLower.includes('ttml+xml')
        ) {
            formatHint = 'ttml';
        } else {
            formatHint = 'vtt';
        }
    }

    setCache(uniqueId, { status: -1, data: null, parsedData: null });
    eventBus.dispatch('segment:fetch', {
        uniqueId: uniqueId,
        streamId,
        format: formatHint,
        context: {},
    });

    const label = typeof number === 'number' ? `#${number}` : 'Index';
    showToast({ message: `Fetching Segment ${label}...`, type: 'info' });
};

const handleInspectSidx = (e, sidxInfo, trackId, setCache) => {
    e.stopPropagation();
    if (!sidxInfo || !sidxInfo.fullBox) return;

    const uniqueId = sidxInfo.sidxUniqueId || `SIDX-synthetic-${Date.now()}`;
    const box = sidxInfo.fullBox;
    let rawData = new ArrayBuffer(0);

    if (box.dataView) {
        try {
            rawData = box.dataView.buffer.slice(
                box.dataView.byteOffset,
                box.dataView.byteOffset + box.dataView.byteLength
            );
        } catch (err) {
            console.error('Failed to extract SIDX raw bytes:', err);
        }
    }

    const boxClone = JSON.parse(JSON.stringify(box));
    const startOffset = boxClone.offset;

    const normalizeNode = (node) => {
        if (typeof node.offset === 'number') {
            node.offset -= startOffset;
        }
        if (typeof node.contentOffset === 'number') {
            node.contentOffset -= startOffset;
        }
        if (node.details) {
            for (const key in node.details) {
                if (typeof node.details[key].offset === 'number') {
                    node.details[key].offset -= startOffset;
                }
            }
        }
        if (node.children) {
            node.children.forEach(normalizeNode);
        }
    };
    normalizeNode(boxClone);

    const boxLayout = new Float64Array(6);
    boxLayout[0] = 0;
    boxLayout[1] = boxClone.size;
    boxLayout[2] = 9;
    boxLayout[3] = 0;
    boxLayout[4] = 0;
    boxLayout[5] = -1;

    const byteMap = {
        boxLayout: boxLayout,
        palette: [],
    };

    const parsedData = {
        format: 'isobmff',
        data: {
            boxes: [boxClone],
            issues: [],
            events: [],
            size: boxClone.size,
        },
        byteMap: byteMap,
        bitstreamAnalysisAttempted: true,
        mediaInfo: {
            video: {
                codec: 'SIDX Index',
                resolution: 'Metadata',
                frameRate: null,
            },
        },
    };

    setCache(uniqueId, {
        status: 200,
        data: rawData,
        parsedData: parsedData,
    });

    const syntheticSegment = {
        repId: trackId || 'SIDX',
        type: 'Init',
        number: 0,
        uniqueId: uniqueId,
        resolvedUrl: 'Segment Index (SIDX)',
        template: 'SIDX',
        time: boxClone.details.earliest_presentation_time?.value || 0,
        duration: sidxInfo.subsegmentDuration || 0,
        timescale: boxClone.details.timescale?.value || 1,
        gap: false,
        flags: [],
        sidx: sidxInfo,
    };

    uiActions.setInteractiveSegmentSelectedItem(syntheticSegment);
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
        const {
            contentType,
            primaryCodec,
            secondaryCodec,
            resolution,
            lang,
            bandwidth,
            label,
        } = meta;
        const isEstimatedBitrate = track.isEstimatedBitrate;

        let detailsHtml;

        if (contentType === 'video') {
            detailsHtml = html`
                ${resolution
                    ? html`<span
                          class="text-slate-300 bg-slate-800 px-1 rounded font-mono"
                          >${resolution}</span
                      >`
                    : ''}
                <span
                    class="uppercase font-semibold tracking-wider text-slate-400"
                    >${primaryCodec
                        ? primaryCodec.split('.')[0]
                        : 'Video'}</span
                >
                ${secondaryCodec
                    ? html`
                          <span
                              class="uppercase font-semibold tracking-wider text-purple-400 border border-purple-500/30 px-1 rounded bg-purple-500/10"
                          >
                              + ${secondaryCodec.split('.')[0]}
                          </span>
                      `
                    : ''}
            `;
        } else if (contentType === 'audio') {
            detailsHtml = html`
                ${lang
                    ? html`<span
                          class="text-slate-300 bg-slate-800 px-1 rounded font-mono"
                          >${lang.toUpperCase()}</span
                      >`
                    : ''}
                <span
                    class="uppercase font-semibold tracking-wider text-slate-400"
                    >${primaryCodec || 'Text'}</span
                >
            `;
        } else if (
            contentType === 'text' ||
            contentType === 'application' ||
            contentType === 'subtitles'
        ) {
            detailsHtml = html`
                ${lang
                    ? html`<span
                          class="text-slate-300 bg-slate-800 px-1 rounded font-mono"
                          >${lang.toUpperCase()}</span
                      >`
                    : ''}
                <span
                    class="uppercase font-semibold tracking-wider text-slate-400"
                    >${primaryCodec || 'Text'}</span
                >
            `;
        } else {
            detailsHtml = html`<span
                class="uppercase font-semibold tracking-wider text-slate-500"
                >Unknown Track Type</span
            >`;
        }

        const initSegment = track.initSegment;

        const firstSegmentWithSidx = track.segments.find((s) => s.sidx);
        const sidxInfo = firstSegmentWithSidx
            ? firstSegmentWithSidx.sidx
            : null;

        let initNode = html`
            <div class="h-10 w-10 flex items-center justify-center opacity-30">
                <span class="text-[8px] text-slate-600 font-mono">No Init</span>
            </div>
        `;

        if (initSegment) {
            const cacheEntry = ctx.cache.get(initSegment.uniqueId);
            const isInspected =
                ctx.inspectedSegment?.uniqueId === initSegment.uniqueId &&
                ctx.inspectedSegment?.repId === track.id;

            initNode = renderSegmentNode({
                segment: initSegment,
                customLabel: 'INIT',
                isSelected:
                    ctx.compareSet && ctx.compareSet.has(initSegment.uniqueId),
                isInspected,
                cacheStatus: cacheEntry ? cacheEntry.status : null,
                hasParsedData: !!(
                    cacheEntry &&
                    cacheEntry.parsedData &&
                    !cacheEntry.parsedData.error
                ),
                onClick: (e) =>
                    handleSegmentClick(
                        e,
                        initSegment,
                        track.id,
                        ctx.streamId,
                        ctx.segmentFormat,
                        ctx.clickMode,
                        ctx.compareSet,
                        useSegmentCacheStore.getState().set
                    ),
            });
        }

        let sidxNode = null;
        if (sidxInfo) {
            const sidxUniqueId =
                sidxInfo.sidxUniqueId || `SIDX-synthetic-${track.id}`;
            const sidxCacheEntry = ctx.cache.get(sidxUniqueId);
            const mockSidxSegment = {
                number: 0,
                uniqueId: sidxUniqueId,
                time: 0,
                duration: 0,
                timescale: 1,
            };

            const isInspected =
                ctx.inspectedSegment?.uniqueId === sidxUniqueId &&
                ctx.inspectedSegment?.repId === track.id;

            sidxNode = renderSegmentNode({
                segment: mockSidxSegment,
                customLabel: 'IDX',
                isSelected: false,
                isInspected,
                cacheStatus: sidxCacheEntry ? sidxCacheEntry.status : null,
                hasParsedData: !!(
                    sidxCacheEntry &&
                    sidxCacheEntry.parsedData &&
                    !sidxCacheEntry.parsedData.error
                ),
                onClick: (e) =>
                    handleInspectSidx(
                        e,
                        sidxInfo,
                        track.id,
                        useSegmentCacheStore.getState().set
                    ),
            });
        }

        const rightColumn = html`
            <div
                class="shrink-0 h-full flex flex-col items-center justify-center px-1 border-l border-slate-800 bg-slate-900/50 w-[50px] gap-1 py-1"
            >
                ${sidxInfo && initSegment
                    ? html`
                          <div class="w-8 h-6">${initNode}</div>
                          <div class="w-8 h-6">${sidxNode}</div>
                      `
                    : html`
                          <div class="w-10 h-10">
                              ${initSegment ? initNode : sidxNode || initNode}
                          </div>
                      `}
            </div>
        `;

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
                            title="${label}"
                            >${label}</span
                        >
                        <span
                            class="text-[10px] font-mono text-cyan-400 bg-cyan-900/20 px-1.5 rounded border border-cyan-900/30"
                            title="${isEstimatedBitrate
                                ? 'Estimated from segments'
                                : 'From manifest'}"
                            >${isEstimatedBitrate && bandwidth > 0
                                ? '~'
                                : ''}${formatBitrate(bandwidth)}</span
                        >
                    </div>
                    <div
                        class="flex items-center gap-2 text-[10px] text-slate-500 truncate"
                    >
                        ${detailsHtml}
                    </div>
                </div>
                ${rightColumn}
            </div>
        `;

        const visibleSegments = track.segments.filter((seg) => {
            const segLeft = seg.relStart * this._pixelsPerSecond;
            const segRight = seg.relEnd * this._pixelsPerSecond;
            return (
                segRight > this._visibleStartPx && segLeft < this._visibleEndPx
            );
        });

        const segmentsTemplate = repeat(
            visibleSegments,
            (seg) => seg.timelineId || seg.uniqueId,
            (segment) => {
                const uniqueId = segment.uniqueId;
                const cacheEntry = ctx.cache.get(uniqueId);
                const isNew = track.newlyAdded
                    ? track.newlyAdded.has(uniqueId)
                    : false;
                const isStale = !!segment._isStale;

                const cacheStatus = cacheEntry ? cacheEntry.status : null;
                const hasParsedData = !!(
                    cacheEntry &&
                    cacheEntry.parsedData &&
                    !cacheEntry.parsedData.error
                );

                const hasSidx = !!segment.sidx;

                const leftPx = segment.relStart * this._pixelsPerSecond;
                const widthPx = Math.max(
                    2,
                    (segment.durationSec || 0) * this._pixelsPerSecond
                );

                const isInspected =
                    ctx.inspectedSegment &&
                    ctx.inspectedSegment.uniqueId === uniqueId &&
                    ctx.inspectedSegment.repId === track.id &&
                    (!ctx.inspectedSegment.number ||
                        ctx.inspectedSegment.number === segment.number);

                return html`
                    <div
                        style="position: absolute; left: ${leftPx}px; width: ${widthPx}px; height: 100%; padding: 2px;"
                    >
                        ${renderSegmentNode({
                            segment,
                            baselineDuration: 0,
                            isSelected: ctx.compareSet
                                ? ctx.compareSet.has(uniqueId)
                                : false,
                            isInspected,
                            cacheStatus,
                            hasParsedData,
                            isStale,
                            isNew,
                            onClick: (e) =>
                                handleSegmentClick(
                                    e,
                                    segment,
                                    track.id, // Inject Track ID scope
                                    ctx.streamId,
                                    ctx.segmentFormat,
                                    ctx.clickMode,
                                    ctx.compareSet,
                                    useSegmentCacheStore.getState().set
                                ),
                        })}
                        ${hasSidx
                            ? html`<div
                                  class="absolute bottom-1 left-1/2 -translate-x-1/2 w-3 h-0.5 bg-cyan-400/50 rounded-full pointer-events-none"
                              ></div>`
                            : ''}
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
