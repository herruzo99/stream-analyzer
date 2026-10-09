import { eventBus } from '@/application/event-bus';
import {
    calculateDashSegment,
    extractTimingConfig,
} from '@/features/interactiveManifest/domain/dash-timing.js';
import {
    findChildrenRecursive,
    getAttr,
} from '@/infrastructure/parsing/utils/recursive-parser';
import { fetchWithRetry } from '@/infrastructure/http/fetch';
import { workerService } from '@/infrastructure/worker/workerService';
import { useAnalysisStore } from '@/state/analysisStore';
// import { openModalWithContent } from '@/ui/services/modalService';
import { EVENTS } from '@/types/events';
import * as icons from '@/ui/icons';
import { formatBitrate } from '@/ui/shared/format';
import { html, render } from 'lit-html';
import { parseDuration } from '../../components/badges/utils.js';
import './time-controller'; // Import the new component

// --- Tooltip Utils ---
const encodeTooltip = (htmlContent) => {
    try {
        return btoa(
            encodeURIComponent(htmlContent).replace(/%([0-9A-F]{2})/g,
                function toSolidBytes(match, p1) {
                    return String.fromCharCode(parseInt(p1, 16));
                })
        );
    } catch {
        return '';
    }
};

const renderTooltipSection = (title, items) => {
    return `
        <div class="mb-2 pb-2 border-b border-slate-700 last:border-0 last:pb-0 last:mb-0">
            ${title ? `<div class="text-[10px] uppercase font-bold text-teal-300 tracking-wider mb-1 opacity-80">${title}</div>` : ''}
            <div class="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1">
                ${items.map(item => `
                    <div class="text-[10px] font-medium text-slate-400">${item.label}</div>
                    <div class="text-[10px] font-mono text-slate-200 text-right break-words">${item.value}</div>
                `).join('')}
            </div>
        </div>
    `;
};

// import { useSegmentCacheStore } from '@/state/segmentCacheStore';
import { getSegmentAnalysisTemplate } from '@/features/segmentAnalysis/ui/index.js';
import { segmentInspectionService } from '@/features/segmentAnalysis/application/segmentInspectionService.js';

// --- Sub-Components ---

const SegmentBlock = ({ segment, nowMs, pxPerSec, isSelected, onClick }) => {
    const {
        segmentStartWallMs,
        segmentDurationSec,
        segmentIndex,
        isAvailable,
    } = segment;
    // Log removed to reduce spam, will log in parent

    // Calculate position relative to center (nowMs)
    const startOffsetSec = (segmentStartWallMs - nowMs) / 1000;
    const leftPx = startOffsetSec * pxPerSec;

    // Use individual segment duration for width to support variable segment sizes (e.g. SegmentTimeline)
    const duration = segmentDurationSec || 0;
    const widthPx = duration * pxPerSec;

    // Styles
    let bgClass = 'bg-slate-800';
    let borderClass = 'border-slate-800';
    let textClass = 'text-slate-400';
    let opacity = 'opacity-100';

    if (isAvailable) {
        bgClass = 'bg-blue-500/20';
        borderClass = 'border-blue-500/50';
        textClass = 'text-blue-300';
    } else {
        bgClass = 'bg-slate-800';
        borderClass = 'border-slate-800';
        opacity = 'opacity-50';
    }

    if (isSelected) {
        bgClass = 'bg-blue-500';
        textClass = 'text-white';
        borderClass = 'border-white';
        opacity = 'opacity-100';
    }

    // --- Tooltip Removed as per User Request ---
    // const tooltipHtml = ...

    return html`
        <div
            class="absolute top-0 bottom-0 flex items-center justify-center pointer-events-none"
            style="left: calc(50% + ${leftPx}px); width: ${widthPx -
        2}px; transition: none !important;"
        >
            <div
                class="w-full h-16 rounded-md border ${bgClass} ${borderClass} ${textClass} ${opacity} flex flex-col items-center justify-center cursor-pointer pointer-events-auto transition-all duration-200 hover:scale-105 hover:z-10 hover:shadow-[0_0_20px_rgba(0,0,0,0.3)] backdrop-blur-sm"
                @click=${onClick}
            >
                <div class="text-xs font-bold">
                    ${segment.segmentLabel || '#' + segmentIndex}
                </div>
                ${!isAvailable
            ? html`<div
                          class="text-[9px] uppercase tracking-wider mt-1"
                      >
                          Wait
                      </div>`
            : ''}
            </div>
        </div>
    `;
};

const PeriodBlock = ({
    period,
    nowMs,
    pxPerSec,
    labelOffsetPx = 0,
    isActive,
}) => {
    const { start, duration, id } = period;
    const periodStartMs = (period.ast || 0) + start * 1000;
    const periodDurationMs = (duration || 0) * 1000;

    // Calculate position relative to center (nowMs)
    const startOffsetSec = (periodStartMs - nowMs) / 1000;
    const leftPx = startOffsetSec * pxPerSec;

    // If duration is infinite (or not set for last period), give it a large width
    const widthPx = periodDurationMs
        ? (periodDurationMs / 1000) * pxPerSec
        : 10000;

    // --- Generate Tooltip Content ---
    const tooltipHtml = `
        <div class="min-w-[180px]">
             <div class="flex items-center gap-2 mb-3 pb-2 border-b border-slate-700">
                <div class="p-1 rounded bg-teal-500/20 text-teal-300">
                   ${icons.activity || '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>'}
                </div>
                <div>
                    <div class="text-xs font-bold text-slate-200">Period ${id}</div>
                    <div class="text-[10px] text-slate-400">${isActive ? 'Active Period' : 'Inactive'}</div>
                </div>
            </div>

            ${renderTooltipSection('Timeline', [
        { label: 'Start (Relative)', value: start.toFixed(3) + 's' },
        { label: 'Duration', value: duration ? duration.toFixed(3) + 's' : 'Infinite/Unknown' },
        { label: 'Absolute Start', value: new Date(periodStartMs).toLocaleTimeString() }
    ])}
        </div>
    `;

    return html`
        <div
            class="absolute top-0 bottom-0 flex items-center pointer-events-none border-l-2 border-teal-500/50 ${isActive
            ? 'bg-teal-500/5'
            : ''}"
            style="left: calc(50% + ${leftPx}px); width: ${widthPx}px; transition: none !important;"
        >
            <div
                class="absolute top-2 text-[10px] font-bold uppercase text-teal-300 tracking-wider bg-slate-800/90 px-2 py-0.5 rounded backdrop-blur-sm whitespace-nowrap transition-all duration-75 border border-teal-500/30 shadow-sm z-10 pointer-events-auto cursor-help"
                style="left: ${2 + labelOffsetPx}px"
                data-tooltip-html-b64="${encodeTooltip(tooltipHtml)}"
            >
                ${id}
            </div>
            <!-- Period Duration Line -->
            <div
                class="absolute top-0 w-full h-0.5 bg-teal-500/30"
            ></div>
        </div>
    `;
};

const STagGroupBlock = ({ group, nowMs, pxPerSec }) => {
    const { startMs, sElementIndex, count, durationMs } = group;

    // Calculate position relative to center (nowMs)
    const startOffsetSec = (startMs - nowMs) / 1000;
    const leftPx = startOffsetSec * pxPerSec;

    const widthPx = (durationMs / 1000) * pxPerSec;

    const tooltipHtml = `
        <div class="min-w-[150px]">
            <div class="flex items-center gap-2 mb-2 pb-2 border-b border-slate-700">
                <div class="p-1 rounded bg-purple-500/20 text-purple-300">
                    <span class="font-mono font-bold text-[10px]">S</span>
                </div>
                 <div>
                    <div class="text-xs font-bold text-slate-200">S-Tag Group</div>
                    <div class="text-[10px] text-slate-400">S-Element Index: ${sElementIndex}</div>
                </div>
            </div>
             ${renderTooltipSection('Details', [
        { label: 'Repeat Count', value: count },
        { label: 'Total Duration', value: (durationMs / 1000).toFixed(3) + 's' },
        { label: 'Start Time', value: new Date(startMs).toLocaleTimeString() }
    ])}
        </div>
    `;

    return html`
        <div
            class="absolute top-[20%] bottom-[20%] border-2 border-dashed border-purple-500/30 rounded-lg pointer-events-none flex items-start justify-center overflow-hidden group hover:border-purple-500/60 transition-colors"
            style="left: calc(50% + ${leftPx}px); width: ${widthPx}px; transition: none !important;"
        >
            <div
                class="absolute top-0 left-0 right-0 bg-purple-500/10 text-purple-300 text-[9px] font-mono px-1 py-0.5 text-center border-b border-purple-500/20 backdrop-blur-sm"
            >
                S[${sElementIndex}] (${count})
            </div>
            <!-- Invisible hit area for tooltip on the whole box -->
             <div class="absolute inset-0 pointer-events-auto cursor-help" data-tooltip-html-b64="${encodeTooltip(tooltipHtml)}"></div>
        </div>
    `;
};

class DashTimingCalculator extends HTMLElement {
    // Port note: was `extends BaseModal` (a module that was never committed).
    // The base contributed no API used here (plain constructor + render/
    // connectedCallback below), so plain HTMLElement is faithful.
    static get styles() {
        return `
            :host {
                display: flex;
                flex-direction: column;
                height: 100%;
                width: 100%;
                overflow: hidden;
                box-sizing: border-box;
                padding: 0 !important;
                margin: 0 !important;
            }
            .main-layout {
                flex: 1;
                display: flex;
                flex-direction: column;
                height: 100%;
                width: 100%;
                overflow: hidden;
                background-color: transparent;
                font-family: 'Inter', sans-serif;
                color: #f1f5f9;
            }
            .viz-panel {
                height: 350px;
                flex-shrink: 0;
                position: relative;
                overflow: hidden;
                display: flex;
                align-items: center;
                justify-content: center;
                background-color: transparent;
                border-bottom: 1px solid #1e293b;
                z-index: 10;
            }
                background-color: transparent;
                margin: 0;
            }
            .whiteboard-panel {
                flex: 1;
                min-height: 0;
                display: grid;
                grid-template-rows: auto minmax(0, 1fr);
                overflow: hidden;
                position: relative;
                z-index: 20;
                background-color: #1e293b;
                border-top: 1px solid #1e293b;
                box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
            }
            .whiteboard-header {
                z-index: 30;
            }
            .whiteboard-scroll-area {
                overflow-y: auto;
                width: 100%;
                height: 100%;
                padding: 1rem;
                position: relative;
                z-index: 25;
            }
            .ambient-glow {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 5;
                background: linear-gradient(
                    180deg,
                    rgba(59, 130, 246, 0.05) 0%,
                    transparent 100%
                );
            }
            .custom-scrollbar::-webkit-scrollbar {
                width: 6px;
                height: 6px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
                background: transparent;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
                background: #1e293b;
                border-radius: 3px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: #94a3b8;
            }
        `;
    }

    constructor() {
        super();
        this.title = 'DASH Timing Calculator';
        this.size = '2xl';
        this._data = null;
        this._isLive = true;
        this._isDynamicStream = true;
        this._manualTime = null;
        this._selectedRepId = null;
        this._selectedPeriodId = null;
        this._periods = [];
        this._overrides = {};
        this.rafId = null;
        this._unsubscribe = null;
        this._isPlaying = false;
        this._manualTime = null;
        this._useSPD = true; // Default to using SPD if available
        this._renderCount = 0;
        this._selectedRepId = null; // Track selected representation ID

        // Panning State
        this._panOffset = 0;
        this._isLockedToNow = true;
        this._isDragging = false;
        this._lastMouseX = 0;
        this._zoomLevel = 50; // Default zoom level
    }

    handlePeriodChange(e) {
        const periodId = e.target.value;
        const period = this._periods.find((p) => p.id === periodId);
        if (period) {
            // Jump to period start
            const ast = this._data.ast || 0;
            const targetTime = ast + period.start * 1000;

            this._isLive = false;
            this._manualTime = targetTime;
            this.render();
        }
    }

    set data(val) {
        if (this._data === val) return;
        const oldIsDynamic = this._isDynamicStream;
        const oldStreamId = this._data?.streamId;
        this._data = val;

        if (this._data) {
            if (this._data.initialRepId && !this._selectedRepId) {
                this._selectedRepId = this._data.initialRepId;
            }
            this._isDynamicStream = !!this._data.isDynamic;

            if (oldIsDynamic !== this._isDynamicStream) {
                if (!this._isDynamicStream) {
                    this._isLive = false;
                    this._manualTime = 0;
                } else {
                    this._isLive = true;
                    this._manualTime = null;
                    this._isPlaying = true; // Live implies playing
                }
            }
        }
        if (this.isConnected) {
            this.render();
            // Only refresh if streamId changed to avoid infinite loop
            if (val.streamId !== oldStreamId) {
                this.refreshData();
                this._panOffset = 0; // Pixels
                this._inspectorData = null; // State for embedded inspector
            }
        }
    }

    connectedCallback() {
        // Port note: BaseComponent (never committed) bridged these; with
        // plain HTMLElement the native callbacks do it. Without this, the
        // `.data` setter skips its work while disconnected and the modal
        // stays blank.
        this.onMount();
    }

    disconnectedCallback() {
        this.onUnmount();
    }

    onMount() {
        if (this._isDynamicStream) this.startLoop();
        if (this._data && this._data.streamId) this.refreshData();
        // Guarantee first paint (covers data set while disconnected and
        // non-live streams with no loop running).
        this.render();
        this._unsubscribe = eventBus.subscribe(
            EVENTS.LIVESTREAM.MANIFEST_UPDATED,
            ({ streamId }) => {
                // DEBUG: Trace event reception
                console.log('[DashTimingCalculator] Event Received:', {
                    eventStreamId: streamId,
                    currentStreamId: this._data?.streamId,
                });

                if (this._data && this._data.streamId === streamId) {
                    this.refreshData();
                } else {
                    console.log(
                        '[DashTimingCalculator] Ignoring update for different stream'
                    );
                }
            }
        );
    }

    onUnmount() {
        this.stopLoop();
        if (this._unsubscribe) this._unsubscribe();
    }

    refreshData() {
        if (
            !this._data ||
            this._data.streamId === undefined ||
            this._data.streamId === null
        ) {
            return;
        }
        const { streams } = useAnalysisStore.getState();
        const stream = streams.find((s) => s.id === this._data.streamId);

        // Capture Manifest URL for URL resolution
        if (stream) {
            this._manifestUrl = stream.originalUrl || stream.baseUrl;
            this._stream = stream; // Keep reference for Init Segment lookup
        }

        console.log('[DashTimingCalculator] refreshData:', {
            targetStreamId: this._data.streamId,
            foundStream: !!stream,
            manifestType: stream?.manifest?.type,
            hasSPD: !!stream?.manifest?.suggestedPresentationDelay,
        });

        if (
            !stream ||
            !stream.manifest ||
            !stream.manifest.serializedManifest
        ) {
            return;
        }

        const manifest = stream.manifest.serializedManifest;
        const rawPeriods = findChildrenRecursive(manifest, 'Period');

        // Calculate Period Start Times
        this._periods = [];
        let currentStart = 0;

        rawPeriods.forEach((p, index) => {
            const id = getAttr(p, 'id') || `Period ${index + 1} `;
            const startAttr = getAttr(p, 'start');
            const durationAttr = getAttr(p, 'duration');

            let start = currentStart;
            if (startAttr) {
                start = parseDuration(startAttr)?.total || 0;
                currentStart = start; // Sync accumulator if explicit start is present
            }

            let duration = durationAttr
                ? parseDuration(durationAttr)?.total || 0
                : null;

            this._periods.push({
                id,
                index,
                start,
                duration,
                element: p,
            });

            // Advance accumulator
            if (duration) {
                currentStart += duration;
            }
        });

        // Calculate BaseURL
        const mpdUrl = stream.url || '';
        const mpdBase = mpdUrl
            ? mpdUrl.substring(0, mpdUrl.lastIndexOf('/') + 1)
            : '';
        const manifestBaseUrl = findChildrenRecursive(manifest, 'BaseURL')[0]?.[
            '#text'
        ];

        let effectiveBaseUrl = manifestBaseUrl;
        if (!effectiveBaseUrl) {
            effectiveBaseUrl = mpdBase;
        } else if (!effectiveBaseUrl.startsWith('http')) {
            try {
                effectiveBaseUrl = mpdBase;
            } catch {
                effectiveBaseUrl = mpdBase;
            }
        }
        this._effectiveBaseUrl = effectiveBaseUrl;

        // Parse tracks for ALL periods
        this._periods.forEach((periodObj) => {
            const periodTracks = [];
            const adaptationSets = findChildrenRecursive(
                periodObj.element,
                'AdaptationSet'
            );

            // DEBUG: Log structure when SCTE-35 might be present
            const hasInband = adaptationSets.some(
                (as) =>
                    findChildrenRecursive(as, 'InbandEventStream').length > 0
            );
            if (hasInband) {
                console.log(
                    '[DashTimingCalculator] SCTE-35/Inband detected in Period',
                    periodObj.id
                );
                console.log('AdaptationSets found:', adaptationSets.length);
            }

            for (const as of adaptationSets) {
                const representations = findChildrenRecursive(
                    as,
                    'Representation'
                );
                for (const rep of representations) {
                    const config = extractTimingConfig(
                        rep,
                        as,
                        periodObj.element,
                        effectiveBaseUrl
                    );
                    if (config) {
                        periodTracks.push(config);
                    } else if (hasInband) {
                        console.warn(
                            '[DashTimingCalculator] Failed to extract timing config for rep',
                            getAttr(rep, 'id')
                        );
                    }
                }
            }
            periodObj.tracks = periodTracks;
            if (hasInband) {
                console.log(
                    '[DashTimingCalculator] Tracks parsed for period:',
                    periodTracks.length
                );
            }
        });

        // SAFETY CHECK: If we parsed 0 periods, something is wrong with the update.
        // Abort to keep the previous valid state.
        if (this._periods.length === 0) {
            console.warn(
                '[DashTimingCalculator] refreshData: Parsed 0 periods. Ignoring update to prevent data loss.'
            );
            return;
        }

        // Default to last period if dynamic, first if static, or keep selection
        if (this._selectedPeriodId === null && this._periods.length > 0) {
            const isDynamic = getAttr(manifest, 'type') === 'dynamic';
            this._selectedPeriodId = isDynamic
                ? this._periods[this._periods.length - 1].id
                : this._periods[0].id;
        }

        // We don't need to select a single set of tracks here anymore,
        // as we will select them dynamically in render based on the active period.
        // However, we should ensure we have a valid selectedRepId.
        // Let's try to find a default one from the first period.
        if (
            !this._selectedRepId &&
            this._periods.length > 0 &&
            this._periods[0].tracks.length > 0
        ) {
            this._selectedRepId = this._periods[0].tracks[0].id;
        }

        const newData = {
            ...this._data,
            isDynamic: getAttr(manifest, 'type') === 'dynamic',
            ast: new Date(
                getAttr(manifest, 'availabilityStartTime') || 0
            ).getTime(),
            periods: this._periods, // Pass the full period objects with tracks
            spd:
                parseDuration(getAttr(manifest, 'suggestedPresentationDelay'))
                    ?.total ||
                parseDuration(getAttr(manifest, 'minBufferTime'))?.total ||
                0,
            timeShiftBufferDepth:
                parseDuration(getAttr(manifest, 'timeShiftBufferDepth'))
                    ?.total || 0,
            mediaDuration:
                parseDuration(getAttr(manifest, 'mediaPresentationDuration'))
                    ?.total || 0,
        };

        // Update data directly to avoid infinite loop with setter
        const oldIsDynamic = this._isDynamicStream;
        this._data = newData;
        this._isDynamicStream = !!this._data.isDynamic;

        // Handle dynamic stream change logic if needed (similar to setter)
        if (oldIsDynamic !== this._isDynamicStream) {
            if (!this._isDynamicStream) {
                this._isLive = false;
                this._manualTime = 0;
            } else {
                this._isLive = true;
                this._manualTime = null;
            }
        }

        this.render();
    }

    _constructSegmentUrl(result, currentTrack, effectiveBaseUrl) {
        if (!result || !currentTrack) return '';
        const { segmentIndex, presentationTime } = result;
        const { mediaTemplate } = currentTrack;

        // Construct URL
        let segmentUrl = mediaTemplate
            .replace('$Number$', segmentIndex)
            .replace('$RepresentationID$', currentTrack.id)
            .replace('$Time$', presentationTime)
            .replace('$Bandwidth$', currentTrack.bandwidth);

        // Prepend BaseURL if not absolute
        if (effectiveBaseUrl && !segmentUrl.startsWith('http')) {
            if (
                !effectiveBaseUrl.endsWith('/') &&
                !segmentUrl.startsWith('/')
            ) {
                segmentUrl = effectiveBaseUrl + '/' + segmentUrl;
            } else if (
                effectiveBaseUrl.endsWith('/') &&
                segmentUrl.startsWith('/')
            ) {
                segmentUrl = effectiveBaseUrl + segmentUrl.substring(1);
            } else {
                segmentUrl = effectiveBaseUrl + segmentUrl;
            }
        }
        return segmentUrl;
    }

    startLoop() {
        if (this.rafId) return;
        let lastTime = performance.now();
        const loop = () => {
            const now = performance.now();
            const delta = now - lastTime;
            lastTime = now;

            if (this._isLive) {
                this.render();
            } else if (this._isPlaying && this._manualTime !== null) {
                this._manualTime += delta;
                this.render();
            }
            this.rafId = requestAnimationFrame(loop);
        };
        this.rafId = requestAnimationFrame(loop);
    }

    stopLoop() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    toggleLive() {
        this._isLive = !this._isLive;
        if (!this._isLive && !this._manualTime) {
            this._manualTime = Date.now();
            this._useSPD = false; // Disable SPD when pausing/manual
            this._isPlaying = false; // Default to paused when switching to manual
        } else if (this._isLive) {
            this._manualTime = null;
            this._useSPD = true; // Enable SPD by default when live
            this._isPlaying = true; // Live implies playing
        }
        this.render();
    }

    handleTrackChange(e) {
        this._selectedRepId = e.target.value;
        this.render();
    }

    handleTimeControllerChange(e) {
        const { time, isLive, isPlaying } = e.detail;

        // 1. Handle Live State Change
        if (this._isLive !== isLive) {
            this._isLive = isLive;
            if (this._isLive) {
                this._manualTime = null;
                this._useSPD = true;
                this._isPlaying = true;
            } else {
                this._useSPD = false;
                // If pausing, use the provided time (which is the current sim time from controller)
                if (time !== null && time !== undefined) {
                    this._manualTime = time;
                }
                // If switching to manual, respect the requested playing state (default false if undefined)
                this._isPlaying = isPlaying !== undefined ? isPlaying : false;
            }
            this.render();
            return; // Exit early if mode changed
        }

        // 2. Handle Play/Pause State Change (only in manual mode)
        if (
            !this._isLive &&
            isPlaying !== undefined &&
            this._isPlaying !== isPlaying
        ) {
            this._isPlaying = isPlaying;
            this.render();
        }

        // 3. Handle Manual Time Seek (only if not live)
        if (!this._isLive && time !== null && time !== undefined) {
            // Clamp time
            const { min, max } = this._getStreamTimeRange();
            let newTime = time;
            if (newTime < min) newTime = min;
            if (newTime > max) newTime = max;

            this._manualTime = newTime;
            this.render();
        }
    }

    renderUrlExploder(result, currentTrack) {
        if (!result || result.error || !currentTrack.mediaTemplate) return '';

        const { segmentIndex, presentationTime } = result;
        const template = currentTrack.mediaTemplate;

        // Split template into parts for visualization
        // Simple parser to find tokens
        const parts = [];
        let lastIdx = 0;
        const regex = /\$(RepresentationID|Bandwidth|Number|Time)(%0\d+d)?\$/g;
        let match;

        while ((match = regex.exec(template)) !== null) {
            // Add static text before match
            if (match.index > lastIdx) {
                parts.push({
                    type: 'text',
                    value: template.slice(lastIdx, match.index),
                });
            }

            // Add token
            const token = match[1];
            const format = match[2];
            let value = '';
            let label = token;

            switch (token) {
                case 'RepresentationID':
                    value = currentTrack.id;
                    break;
                case 'Bandwidth':
                    value = String(currentTrack.bandwidth);
                    break;
                case 'Number':
                    value = String(segmentIndex);
                    if (format) {
                        const pad = parseInt(format.slice(2, -1));
                        value = value.padStart(pad, '0');
                    }
                    break;
                case 'Time':
                    value = String(presentationTime);
                    break;
            }

            parts.push({ type: 'token', token: match[0], value, label });
            lastIdx = regex.lastIndex;
        }

        // Add remaining text
        if (lastIdx < template.length) {
            parts.push({ type: 'text', value: template.slice(lastIdx) });
        }

        return html`
            <div
                class="bg-slate-800 border border-slate-800 rounded-xl p-4 h-full flex flex-col justify-center"
            >
                <h3
                    class="text-xs font-bold uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2"
                >
                    ${icons.link} URL Construction
                </h3>

                <div
                    class="flex flex-wrap items-center gap-1 font-mono text-sm bg-slate-800 p-4 rounded-xl border border-slate-800 shadow-inner"
                >
                    ${parts.map((part) => {
            if (part.type === 'text') {
                return html`<span
                                class="text-slate-400 opacity-70"
                                >${part.value}</span
                            >`;
            }
            return html`
                            <div class="relative group cursor-help"
                                data-tooltip-html-b64="${encodeTooltip(`
                                    <div class="min-w-[150px]">
                                        <div class="mb-2 pb-1 border-b border-slate-700">
                                            <div class="text-[9px] font-bold uppercase text-slate-400">Template Token</div>
                                            <div class="font-mono text-xs text-slate-200 break-all">${part.token}</div>
                                        </div>
                                         <div class="text-[10px] text-slate-400">
                                            Replaced by calculated <span class="text-blue-400 font-bold">${part.label}</span>
                                        </div>
                                    </div>
                                `)}"
                            >
                                <span
                                    class="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold"
                                >
                                    ${part.value}
                                </span>
                            </div>
                        `;
        })}
                </div>
            </div>
        `;
    }

    handleParamChange(e, param, isFloat = false) {
        const val = isFloat
            ? parseFloat(e.target.value)
            : parseInt(e.target.value, 10);
        if (isNaN(val)) return;
        if (!this._overrides[this._selectedRepId])
            this._overrides[this._selectedRepId] = {};
        this._overrides[this._selectedRepId][param] = val;
        this.render();
    }

    _getPeriodForTime(timeSinceAstSec) {
        const periods = this._data.periods;
        for (let i = 0; i < periods.length; i++) {
            const p = periods[i];
            const nextP = periods[i + 1];
            const pStart = p.start;
            const pEnd = nextP
                ? nextP.start
                : p.duration
                    ? pStart + p.duration
                    : Infinity;

            if (timeSinceAstSec >= pStart && timeSinceAstSec < pEnd) {
                return p;
            } else if (timeSinceAstSec < pStart) {
                // If before first period, return first
                if (i === 0) return p;
                // If gap, return previous? Or null?
                // For now, return p (closest future?) or previous.
                // Let's return the one that "should" cover it or the gap.
                // Actually, if we are in a gap, we might want to return null or the previous one to show "end of period".
                // But for simplicity, let's return the period that *would* contain it if it started earlier, or just the previous one.
                return periods[Math.max(0, i - 1)];
            }
        }
        return periods[periods.length - 1];
    }

    _getTrackForPeriod(period, repId) {
        if (!period || !period.tracks) return null;
        // Try to find track with same ID
        let track = period.tracks.find((t) => t.id === repId);
        // If not found, try to find one with same content type and similar bandwidth/index?
        // For now, fallback to first track if exact ID match fails, or maybe try to match by contentType.
        if (!track) {
            // Try to match by contentType of the originally selected track (if we had access to it)
            // But we only have repId.
            // Let's just pick the first one as a fallback, or maybe we can store "selectedContentType".
            track = period.tracks[0];
        }
        return track;
    }

    _getStreamTimeRange() {
        if (
            !this._data ||
            !this._data.periods ||
            this._data.periods.length === 0
        ) {
            return { min: 0, max: 0 };
        }

        const { ast, periods } = this._data;
        const firstPeriod = periods[0];
        const lastPeriod = periods[periods.length - 1];

        // Min time is always start of first period
        // For dynamic, it's AST + firstPeriod.start
        // For static, it's firstPeriod.start (usually 0)
        const min = (ast || 0) + firstPeriod.start * 1000;

        let max;
        if (this._isDynamicStream) {
            // For dynamic, max is effectively "now" (Live Edge) or end of last period if known?
            // Usually we want to allow going up to the live edge.
            // But if the last period has a duration, maybe we should cap it there?
            // Let's cap at Live Edge for now, or maybe Live Edge + some buffer?
            // Actually, if it's dynamic, the "available" range moves.
            // But the user asked to "cap the simulation time to always be inside those times for live".
            // "inside those times" likely means available periods.
            // So max should be the end of the last available period?
            // Or just the current wall clock time?
            // Let's use current wall clock time as the absolute max for "Live".
            max = Date.now();
        } else {
            // For VOD, max is end of last period
            if (this._data.mediaDuration) {
                max = (ast || 0) + this._data.mediaDuration * 1000;
            } else if (lastPeriod.duration) {
                max =
                    (ast || 0) +
                    (lastPeriod.start + lastPeriod.duration) * 1000;
            } else {
                // If last period has no duration in VOD, it's weird. Fallback to something?
                // Maybe calculate from media duration?
                // For now, let's assume it's known or use a large number if unknown?
                // Or maybe we can't cap it if it's unknown.
                max = (ast || 0) + lastPeriod.start * 1000 + 1000 * 60 * 60; // +1 hour fallback
            }
        }

        return { min, max };
    }

    _generateTunnelPeriods(periods, ast, nowMs) {
        // Return all periods, let CSS handle clipping (or optimize if needed)
        // We need to pass AST to calculate absolute time
        return periods.map((p) => ({ ...p, ast }));
    }

    _generateTunnelSegments(
        centerSegment,
        currentTrack,
        activePeriod,
        nowMs,
        wallClockTime
    ) {
        const shouldLog = this._renderCount % 100 === 0;
        if (shouldLog) {
            console.log('[_generateTunnelSegments] Input:', {
                centerSegment,
                currentTrack,
                activePeriod,
                nowMs,
                wallClockTime,
            });
        }

        if (!centerSegment || centerSegment.error) {
            return [];
        }

        const segments = [];

        // Dynamic Lookahead/Lookbehind Calculation
        // Use actual container width if available, otherwise fallback
        const containerWidth = this.offsetWidth || window.innerWidth || 1500;
        const visibleDurationSec = containerWidth / (this._zoomLevel || 50);

        // Estimate segment duration (default to 2s if unknown, or use center segment duration)
        const avgSegDur = centerSegment.duration || 2;

        // Calculate how many segments fit in half the screen (since center is in middle)
        // Add some buffer (+2)
        let count = Math.ceil(visibleDurationSec / 2 / avgSegDur) + 2;

        // Clamp count to reasonable limits
        const minCount = 5;
        const maxCount = 50; // Performance cap
        count = Math.max(minCount, Math.min(count, maxCount));

        const lookahead = count;
        const lookbehind = count;

        // Add Center Segment
        segments.push(centerSegment);

        // Generate Future Segments
        let nextTime = centerSegment.segmentEndWallMs + 10; // +10ms epsilon
        for (let i = 0; i < lookahead; i++) {
            // Calculate time relative to AST
            const timeSinceAstSec = (nextTime - this._data.ast) / 1000;
            const period = this._getPeriodForTime(timeSinceAstSec);
            const track = this._getTrackForPeriod(period, this._selectedRepId);

            if (period && track) {
                const res = calculateDashSegment(
                    track,
                    this._data.ast,
                    period.start,
                    nextTime,
                    wallClockTime,
                    this._data.spd || 0,
                    this._data.timeShiftBufferDepth || 0,
                    this._manifestUrl
                );
                if (res && !res.error) {
                    segments.push(res);
                    nextTime = res.segmentEndWallMs + 10;
                } else {
                    break;
                }
            } else {
                break;
            }
        }

        // Generate Past Segments
        let prevTime = centerSegment.segmentStartWallMs - 10; // -10ms epsilon
        for (let i = 0; i < lookbehind; i++) {
            // Calculate time relative to AST
            const timeSinceAstSec = (prevTime - this._data.ast) / 1000;
            const period = this._getPeriodForTime(timeSinceAstSec);
            const track = this._getTrackForPeriod(period, this._selectedRepId);

            if (period && track) {
                const res = calculateDashSegment(
                    track,
                    this._data.ast,
                    period.start,
                    prevTime,
                    wallClockTime,
                    this._data.spd || 0,
                    this._data.timeShiftBufferDepth || 0,
                    this._manifestUrl
                );
                if (res && !res.error) {
                    segments.unshift(res);
                    prevTime = res.segmentStartWallMs - 10;
                } else {
                    break;
                }
            } else {
                break;
            }
        }

        return segments;
    }

    _generateSTagGroups(segments) {
        if (!segments || segments.length === 0) return [];

        const groups = [];
        let currentGroup = null;

        segments.forEach((seg) => {
            if (seg.sElementIndex === undefined || seg.sElementIndex === -1)
                return;

            if (
                !currentGroup ||
                currentGroup.sElementIndex !== seg.sElementIndex
            ) {
                if (currentGroup) groups.push(currentGroup);
                currentGroup = {
                    sElementIndex: seg.sElementIndex,
                    startMs: seg.segmentStartWallMs,
                    endMs: seg.segmentEndWallMs,
                    durationMs: seg.segmentEndWallMs - seg.segmentStartWallMs,
                    count: 1,
                };
            } else {
                currentGroup.endMs = seg.segmentEndWallMs;
                currentGroup.durationMs +=
                    seg.segmentEndWallMs - seg.segmentStartWallMs;
                currentGroup.count++;
            }
        });

        if (currentGroup) groups.push(currentGroup);
        return groups;
    }

    handleVizClick(e) {
        if (this._isDragging) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const centerX = rect.width / 2;
        const pxPerSec = this._zoomLevel;
        const deltaX = clickX - centerX;

        // Calculate time at the clicked position
        // virtualCenterTime = nowMs - (panOffset / pxPerSec * 1000)
        // clickedTime = virtualCenterTime + (deltaX / pxPerSec * 1000)

        let nowMs;
        const wallClockTime = Date.now();
        // const { min, max } = this._getStreamTimeRange();
        const spd = this._data.spd || 0;

        if (this._isDynamicStream) {
            const delayMs = this._useSPD ? spd * 1000 : 0;
            nowMs = this._isLive
                ? wallClockTime - delayMs
                : this._manualTime || wallClockTime - delayMs;
            // Correct logic duplication from render()
            if (this._manualTime) nowMs = this._manualTime;
        } else {
            nowMs = this._manualTime || 0;
        }

        const virtualCenterTimeMs = nowMs - (this._panOffset / pxPerSec) * 1000;
        const clickedTimeMs = virtualCenterTimeMs + (deltaX / pxPerSec) * 1000;

        // Emit update
        this.handleTimeControllerChange({ detail: { time: clickedTimeMs } });
    }

    async handleInspect(url, repId) {
        eventBus.dispatch('ui:show-status', {
            message: 'Fetching and analyzing (Init + Media)...',
            type: 'info',
        });

        try {
            // 1. Fetch Init Segment (if possible)
            let initSegmentBoxes = null;
            if (this._stream && repId) {
                let initUrl = null;
                // Find Init Segment URL from Stream State
                if (this._stream.protocol === 'dash') {
                    // Search all period states for this rep
                    for (const [
                        key,
                        state,
                    ] of this._stream.dashRepresentationState.entries()) {
                        if (key.endsWith(`-${repId}`) && state.initSegment) {
                            initUrl = state.initSegment.resolvedUrl;
                            break;
                        }
                    }
                }

                if (initUrl) {
                    try {
                        const initResponse = await fetchWithRetry(initUrl);
                        if (initResponse.ok) {
                            const initBuffer = await initResponse.arrayBuffer();
                            // Parse Init Segment just to get boxes
                            const initParsed = await workerService.postTask(
                                'parse-segment-structure',
                                {
                                    data: initBuffer,
                                    url: initUrl,
                                    formatHint: 'isobmff',
                                }
                            ).promise;

                            if (
                                initParsed &&
                                initParsed.data &&
                                initParsed.data.boxes
                            ) {
                                initSegmentBoxes = initParsed.data.boxes;
                                // console.log('Init Segment parsed successfully', initSegmentBoxes);
                            }
                        }
                    } catch (e) {
                        console.warn('Failed to fetch/parse Init Segment:', e);
                    }
                }
            }

            // 2. Fetch Media Segment
            const response = await fetchWithRetry(url);
            if (!response.ok)
                throw new Error(`Fetch failed: ${response.status}`);
            const buffer = await response.arrayBuffer();

            // 4. Delegate Inspection Logic to Service (cached & analyzed)
            const { uniqueId, parsedData, analysisPromise } =
                await segmentInspectionService.inspect(url, buffer, {
                    initSegmentBoxes: initSegmentBoxes,
                });

            // 5. Open Embedded Inspector Immediately
            this._inspectorData = {
                parsedData: parsedData,
                parsedDataB: null,
                isIFrame: false,
                uniqueId: uniqueId,
                url: url,
            };
            this.render();

            // 6. Wait for Deep Analysis to complete (Reactive Update)
            analysisPromise.then((updatedParsedData) => {
                // Only update if we are still inspecting the same segment
                if (
                    this._inspectorData &&
                    this._inspectorData.uniqueId === uniqueId
                ) {
                    this._inspectorData = {
                        ...this._inspectorData,
                        parsedData: updatedParsedData,
                    };
                    this.render();
                }
            });
        } catch (e) {
            console.error(e);
            eventBus.dispatch('ui:show-status', {
                message: `Inspection failed: ${e.message}`,
                type: 'error',
            });
        }
    }

    render() {
        // Port note: BaseModal (never committed) provided this; it simply
        // renders the content template into the element.
        render(this.renderContent(), this);
    }

    renderInspector() {
        if (!this._inspectorData) return html``;

        return html`
            <div
                class="w-full h-full z-[100] bg-slate-900 flex flex-col animate-fadeIn"
            >
                <!-- Header -->
                <div
                    class="shrink-0 h-10 flex items-center gap-3 px-4 bg-slate-800 border-b border-slate-800 shadow-sm"
                >
                    <button
                        @click=${() => {
                this._inspectorData = null;
                this.render();
            }}
                        class="flex items-center gap-1 text-slate-400 hover:text-slate-100 transition-colors text-xs font-bold uppercase tracking-wider"
                    >
                        ${icons.arrowLeft} Back
                    </button>
                    <div class="h-4 w-px bg-slate-800"></div>
                    <span
                        class="text-xs font-mono text-slate-100 truncate max-w-[400px]"
                        title="${this._inspectorData.url}"
                    >
                        ${this._inspectorData.url}
                    </span>
                    <div class="ml-auto flex items-center gap-2">
                        <span
                            class="text-[9px] font-bold uppercase text-slate-400 tracking-wider opacity-50"
                            >Segment Inspector</span
                        >
                    </div>
                </div>

                <!-- Content -->
                <div class="grow relative min-h-0">
                    ${getSegmentAnalysisTemplate(
                this._inspectorData.parsedData,
                this._inspectorData.parsedDataB,
                this._inspectorData.isIFrame,
                this._inspectorData.uniqueId
            )}
                </div>
            </div>
        `;
    }

    renderContent() {
        if (
            !this._data ||
            !this._data.periods ||
            this._data.periods.length === 0
        ) {
            // Render a placeholder or return to avoid crash
            return html`<div
                    class="flex items-center justify-center h-full text-gray-500"
                >
                    Waiting for data...
                </div>`;
        }

        const { ast, periods, spd, timeShiftBufferDepth } = this._data;
        this._renderCount++;
        const shouldLog = this._renderCount % 100 === 0;

        if (shouldLog) {
            console.log('[DashTimingCalculator] Render start', {
                ast,
                periodsCount: periods?.length,
                spd,
                renderCount: this._renderCount,
            });
        }

        // 1. Determine Simulation Time
        let nowMs;
        let effectiveAst;
        const wallClockTime = Date.now();

        // Calculate valid range
        const { min, max } = this._getStreamTimeRange();

        if (this._isDynamicStream) {
            // If Live, use NOW - SPD. If Manual, use manualTime.
            const delayMs = this._useSPD ? (spd || 0) * 1000 : 0;

            if (this._isLive) {
                nowMs = wallClockTime - delayMs;
            } else {
                nowMs = this._manualTime || wallClockTime - delayMs;
            }
            effectiveAst = ast;
        } else {
            nowMs = this._manualTime || 0;
            effectiveAst = 0;
        }

        // Clamp nowMs to valid range
        if (nowMs < min) nowMs = min;
        if (nowMs > max) nowMs = max;

        // Calculate Virtual Center Time (for Panning)
        const virtualCenterTime =
            nowMs - (this._panOffset / this._zoomLevel) * 1000;

        // 2. Determine Active Period
        const timeSinceAstSec = (nowMs - effectiveAst) / 1000;
        let activePeriod = periods[0];

        // Find the period that covers the current simulation time
        for (let i = 0; i < periods.length; i++) {
            const p = periods[i];
            const nextP = periods[i + 1];
            const pStart = p.start;
            const pEnd = nextP
                ? nextP.start
                : p.duration
                    ? pStart + p.duration
                    : Infinity;

            if (timeSinceAstSec >= pStart && timeSinceAstSec < pEnd) {
                activePeriod = p;
                break;
            } else if (timeSinceAstSec < pStart) {
                if (i === 0) activePeriod = p;
                break;
            }
            activePeriod = p;
        }

        // 3. Select Track in Active Period
        const tracks = activePeriod.tracks || [];
        let currentTrack = tracks.find((t) => t.id === this._selectedRepId);

        if (!currentTrack) {
            currentTrack = tracks[0];
            if (currentTrack) {
                this._selectedRepId = currentTrack.id;
            }
        }

        if (!currentTrack) return;

        if (this._overrides && this._overrides[currentTrack.id]) {
            currentTrack = {
                ...currentTrack,
                ...this._overrides[currentTrack.id],
            };
        }

        // Calculate the actual segment at "Now" (for highlighting/logic)
        const centerSegment = calculateDashSegment(
            currentTrack,
            ast,
            activePeriod.start,
            nowMs,
            wallClockTime,
            spd || 0,
            timeShiftBufferDepth || 0,
            this._manifestUrl
        );

        // 5. Calculate Virtual Center Segment (for Visualization/Tunneling)
        const virtualTimeSinceAstSec = (virtualCenterTime - ast) / 1000;
        const virtualPeriod = this._getPeriodForTime(virtualTimeSinceAstSec);
        const virtualTrack = this._getTrackForPeriod(
            virtualPeriod,
            this._selectedRepId
        );

        let virtualCenterSegment = null;
        if (virtualPeriod && virtualTrack) {
            virtualCenterSegment = calculateDashSegment(
                virtualTrack,
                ast,
                virtualPeriod.start,
                virtualCenterTime,
                wallClockTime,
                spd || 0,
                timeShiftBufferDepth || 0,
                this._manifestUrl
            );
        }

        // 6. Generate Tunnel Segments (around Virtual Center)
        // Use virtualCenterSegment if valid, otherwise fallback to centerSegment (e.g. if panned into void)
        let renderCenterSegment =
            virtualCenterSegment && !virtualCenterSegment.error
                ? virtualCenterSegment
                : centerSegment;

        // FALLBACK: If centerSegment is "after end", find the LAST available segment to anchor the timeline.
        // This prevents the timeline from disappearing when simulation time > manifest end.
        if (
            renderCenterSegment &&
            renderCenterSegment.error &&
            renderCenterSegment.error.includes('after end')
        ) {
            // We need to find the last segment of the active period (or the last period).
            // Let's try to calculate the segment at the END of the active period.
            // const pEnd = activePeriod.duration ? activePeriod.start + activePeriod.duration : (Date.now() / 1000); // Rough estimate if infinite
            // Actually, we can just use a time slightly before "now" until we find a valid segment?
            // Or better, use the track's timeline last entry if available.

            // Try to get the last segment from the track config
            if (currentTrack.timeline && currentTrack.timeline.length > 0) {
                // Calculate time for the last entry
                // We can't easily reverse-engineer the exact time without iterating,
                // but we can try probing backwards from "now" in 2s steps?
                // Or just use the error's context if we added it?
                // Let's try probing backwards.
                let probeTime = nowMs;

                for (let i = 0; i < 10; i++) {
                    // Probe back up to 20-50s
                    probeTime -= currentTrack.duration
                        ? (currentTrack.duration / currentTrack.timescale) *
                        1000
                        : 2000;
                    const probeSeg = calculateDashSegment(
                        currentTrack,
                        ast,
                        activePeriod.start,
                        probeTime,
                        wallClockTime,
                        spd || 0,
                        timeShiftBufferDepth || 0,
                        this._manifestUrl
                    );
                    if (probeSeg && !probeSeg.error) {
                        renderCenterSegment = probeSeg;
                        // found = true;
                        break;
                    }
                }
            }
        }

        // We need to pass the period of the renderCenterSegment to _generateTunnelSegments
        // If we switched periods during pan, we need that period.
        const renderPeriod =
            virtualCenterSegment && !virtualCenterSegment.error
                ? virtualPeriod
                : activePeriod;

        // const localIso = this._isDynamicStream
        //    ? new Date(nowMs - tzOffset).toISOString().slice(0, 23)
        //    : '';

        if (this._inspectorData) {
            // Check if renderInspector needs to be wrapped or not.
            // renderInspector returns HTML
            return this.renderInspector();
        }

        const template = html`
            <div
                class="main-layout font-sans text-slate-100"
            >
                <div class="flex-none flex flex-col z-40 relative shadow-md">
                    <!-- Top Panel: Controls -->
                    <div
                        class="w-full bg-slate-800 border-b border-slate-800 p-4 flex flex-wrap items-center gap-6"
                    >
                        <!-- Group 1: Representation -->
                        <div class="flex flex-col gap-1 min-w-[200px]">
                            <label
                                class="text-[9px] font-bold uppercase text-slate-400 tracking-wider"
                                >Representation</label
                            >
                            <div class="relative">
                                <!-- Custom Representation Dashboard -->
                                ${this._renderRepresentationSelector(
            currentTrack,
            tracks
        )}
                            </div>
                        </div>

                        <!-- Group 2: Time Control -->
                        <div class="flex flex-col gap-1">
                            <time-controller
                                .data=${{
                min: min,
                max: max,
                nowMs: nowMs,
                isLive: this._isLive,
                isPlaying: this._isPlaying || this._isLive, // Live implies playing
                isDynamic: this._isDynamicStream,
                spd: spd,
            }}
                                @time-change=${(e) =>
                this.handleTimeControllerChange(e)}
                            ></time-controller>
                        </div>

                        <!-- Group 3: Active Period -->
                        <div class="flex flex-col gap-1">
                            <label
                                class="text-[9px] font-bold uppercase text-slate-400 tracking-wider"
                                >Active Period</label
                            >
                            <div
                                class="px-3 py-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-xs font-mono text-slate-100 flex items-center gap-2"
                            >
                                <span
                                    class="w-1.5 h-1.5 rounded-full bg-teal-500"
                                ></span>
                                ${activePeriod.id}
                            </div>
                        </div>

                        <!-- Group 4: Zoom & Lock -->
                        <div class="flex flex-col gap-1 ml-auto">
                            <div class="flex items-center justify-between">
                                <label
                                    class="text-[9px] font-bold uppercase text-slate-400 tracking-wider text-right"
                                    >Zoom Level</label
                                >
                                <!-- Lock Button -->
                                <button
                                    @click=${() => {
                this._isLockedToNow = true;
                this._panOffset = 0;
                this.render();
            }}
                                    class="ml-2 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border transition-all
                            ${this._isLockedToNow
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                : 'bg-slate-800 text-slate-400 border-slate-800 hover:text-slate-100'}"
                                    title="Lock to NOW"
                                >
                                    ${this._isLockedToNow ? 'Locked' : 'Unlock'}
                                </button>
                            </div>
                            <div
                                class="flex items-center gap-2 bg-slate-800 px-2 py-1 rounded-lg border border-slate-800"
                            >
                                <span
                                    class="text-[9px] font-mono text-slate-400 opacity-70"
                                    >Min</span
                                >
                                <input
                                    type="range"
                                    min="10"
                                    max="200"
                                    step="10"
                                    .value=${this._zoomLevel}
                                    @input=${(e) => {
                this._zoomLevel = parseInt(e.target.value);
                this.render();
            }}
                                    class="w-32 h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
                                    style="background-image: linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((this
                ._zoomLevel -
                10) /
                190) *
            100}%, #1e293b ${((this
                ._zoomLevel -
                10) /
                190) *
            100}%, #1e293b 100%);"
                                />
                                <span
                                    class="text-[9px] font-mono text-slate-400 opacity-70"
                                    >Max</span
                                >
                                <div
                                    class="w-8 text-right font-mono text-[10px] font-bold text-blue-400"
                                >
                                    ${this._zoomLevel}px
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Middle Panel: Visualization (Fixed Height) -->
                    <div
                        class="viz-panel cursor-grab active:cursor-grabbing"
                        @click=${(e) => this.handleVizClick(e)}
                        @mousedown=${(e) => {
                this._isDragging = true;
                this._lastMouseX = e.clientX;
            }}
                        @mousemove=${(e) => {
                if (this._isDragging) {
                    const delta = e.clientX - this._lastMouseX;
                    this._lastMouseX = e.clientX;
                    this._panOffset += delta;
                    this._isLockedToNow = false; // Unlock when panning
                    this.render();
                }
            }}
                        @mouseup=${() => {
                this._isDragging = false;
            }}
                        @mouseleave=${() => {
                this._isDragging = false;
            }}
                        @wheel=${(e) => {
                e.preventDefault();
                // Horizontal scroll (deltaX) or Vertical scroll (deltaY) can both pan
                const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
                this._panOffset -= delta;
                this._isLockedToNow = false;
                this.render();
            }}
                    >
                        <!-- Ambient Background -->
                        <div
                            class="absolute inset-0 bg-blue-500/5 blur-3xl pointer-events-none"
                        ></div>

                        <!-- Center Line (Playhead) -->
                        <div
                            class="absolute top-0 bottom-0 left-1/2 w-0.5 bg-blue-500 z-20 shadow-[0_0_10px_#3b82f6]"
                            style="transform: translateX(${this._panOffset}px)"
                        ></div>
                        <div
                            class="absolute top-4 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-blue-500 text-white text-[10px] font-bold uppercase tracking-wider z-20 shadow-lg"
                            style="transform: translateX(${this._panOffset}px)"
                        >
                            Playhead (Now)
                        </div>

                        <!-- Availability Horizon (Live Edge) -->
                        ${(() => {
                const horizonOffsetSec = (wallClockTime - nowMs) / 1000;
                const pxPerSec = this._zoomLevel;
                // Apply Pan Offset to everything
                const leftPx =
                    horizonOffsetSec * pxPerSec + this._panOffset;

                // SPD Marker
                const spd = this._data.spd || 0;
                const spdPx = leftPx - spd * pxPerSec;

                // DVR Window Start (Oldest)
                const dvrDepth = this._data.timeShiftBufferDepth || 0;
                const dvrPx = leftPx - dvrDepth * pxPerSec;

                return html`
                            <!-- DVR Window Start -->
                            ${dvrDepth > 0
                        ? html`
                                      <div
                                          class="absolute top-0 bottom-0 left-1/2 w-0.5 border-l-2 border-dashed border-amber-500 z-10 opacity-50"
                                          style="transform: translateX(${dvrPx}px)"
                                      ></div>
                                      <div
                                          class="absolute bottom-12 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-amber-500/20 border border-amber-500 text-amber-300 text-[10px] font-bold uppercase tracking-wider z-10 backdrop-blur-sm whitespace-nowrap"
                                          style="transform: translateX(${dvrPx}px)"
                                      >
                                          Availability Start (AST)
                                      </div>
                                  `
                        : ''}

                            <!-- SPD Marker -->
                            ${spd > 0
                        ? html`
                                      <div
                                          class="absolute top-0 bottom-0 left-1/2 w-0.5 border-l-2 border-dashed border-purple-500 z-10 opacity-50"
                                          style="transform: translateX(${spdPx}px)"
                                      ></div>
                                      <div
                                          class="absolute top-12 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-purple-500/20 border border-purple-500 text-purple-300 text-[10px] font-bold uppercase tracking-wider z-10 backdrop-blur-sm whitespace-nowrap"
                                          style="transform: translateX(${spdPx}px)"
                                      >
                                          SPD (Suggested Delay)
                                      </div>
                                  `
                        : ''}

                            <!-- Live Edge -->
                            <div
                                class="absolute top-0 bottom-0 left-1/2 w-0.5 border-l-2 border-dashed border-emerald-500 z-10 opacity-50"
                                style="transform: translateX(${leftPx}px)"
                            ></div>
                            <div
                                class="absolute bottom-4 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-emerald-500/20 border border-emerald-500 text-emerald-300 text-[10px] font-bold uppercase tracking-wider z-10 backdrop-blur-sm whitespace-nowrap"
                                style="transform: translateX(${leftPx}px)"
                            >
                                Live Edge
                            </div>
                        `;
            })()}

                    <!-- Periods -->
                    <div
                        class="absolute inset-0 w-full h-full pointer-events-none"
                    >
                        ${(() => {
                const pxPerSec = this._zoomLevel;
                // Use virtualCenterTime for periods rendering so they shift correctly
                const tunnelPeriods = this._generateTunnelPeriods(
                    periods,
                    ast,
                    virtualCenterTime
                );
                const viewportWidth = this.offsetWidth || 1000;
                const halfWidth = viewportWidth / 2;

                return tunnelPeriods.map((p) => {
                    const periodStartMs =
                        (p.ast || 0) + p.start * 1000;
                    // Calculate relative to virtualCenterTime
                    const startOffsetSec =
                        (periodStartMs - virtualCenterTime) / 1000;
                    const leftPx = startOffsetSec * pxPerSec;

                    let labelOffsetPx = 0;
                    if (leftPx < -halfWidth) {
                        labelOffsetPx = -halfWidth - leftPx;
                    }

                    const periodDurationMs =
                        (p.duration || 0) * 1000;
                    const widthPx = periodDurationMs
                        ? (periodDurationMs / 1000) * pxPerSec
                        : 10000;
                    if (labelOffsetPx > widthPx - 100) {
                        labelOffsetPx = Math.max(0, widthPx - 100);
                    }

                    return PeriodBlock({
                        period: p,
                        nowMs: virtualCenterTime, // Pass virtual center
                        pxPerSec,
                        labelOffsetPx,
                        isActive: p.id === activePeriod.id,
                    });
                });
            })()}
                    </div>

                    <!-- S-Tag Groups -->
                    <div
                        class="absolute inset-0 w-full h-full pointer-events-none top-8 bottom-8"
                    >
                        ${(() => {
                const pxPerSec = this._zoomLevel;
                // Use the same tunnelSegments as below, but we need to generate them first or memoize
                // For now, let's regenerate or move the generation up.
                // Actually, let's move the segment generation UP to the render scope so we can reuse it.
                // See below for segment generation.
                // Since we can't easily move it up without refactoring the whole render block,
                // let's just duplicate the call for now (it's cheap enough) or rely on the fact that we need to render segments anyway.
                // Better: Let's render segments first in a variable?
                // No, lit-html templates are evaluated in order.

                // Let's call _generateTunnelSegments here again.
                const tunnelSegments = this._generateTunnelSegments(
                    renderCenterSegment,
                    currentTrack,
                    renderPeriod,
                    virtualCenterTime,
                    wallClockTime
                );
                const groups =
                    this._generateSTagGroups(tunnelSegments);

                return groups.map((group) =>
                    STagGroupBlock({
                        group,
                        nowMs: virtualCenterTime,
                        pxPerSec,
                    })
                );
            })()}
                    </div>

                    <!-- Segments -->
                    <div class="absolute inset-0 w-full h-full top-12">
                        ${(() => {
                const pxPerSec = this._zoomLevel;
                // Use renderCenterSegment (based on virtualCenterTime) for generation
                const tunnelSegments = this._generateTunnelSegments(
                    renderCenterSegment,
                    currentTrack,
                    renderPeriod,
                    virtualCenterTime,
                    wallClockTime
                );

                return tunnelSegments.map((seg) =>
                    SegmentBlock({
                        segment: seg,
                        nowMs: virtualCenterTime, // Pass virtual center
                        pxPerSec,
                        isSelected:
                            seg.segmentIndex ===
                            centerSegment.segmentIndex, // Highlight the actual "Now" segment
                        onClick: () => {
                            const url = this._constructSegmentUrl(
                                seg,
                                currentTrack,
                                this._effectiveBaseUrl
                            );
                            if (url) {
                                const event = new CustomEvent(
                                    'ui:inspect-segment',
                                    {
                                        detail: {
                                            url,
                                            type: 'dash',
                                            mimeType:
                                                currentTrack.mimeType ||
                                                'video/mp4',
                                        },
                                        bubbles: true,
                                        composed: true,
                                    }
                                );
                                this.dispatchEvent(event);
                            }
                        },
                    })
                );
            })()}
                    </div>
                    <div
                        class="absolute bottom-4 right-4 bg-slate-800/90 backdrop-blur-md border border-slate-800 rounded-lg p-3 shadow-xl z-30 pointer-events-none"
                    >
                        <div
                            class="text-[9px] font-bold uppercase text-slate-400 tracking-wider mb-2"
                        >
                            Legend
                        </div>
                        <div class="grid grid-cols-2 gap-x-4 gap-y-2">
                            <div class="flex items-center gap-2">
                                <div
                                    class="w-3 h-0.5 bg-blue-500"
                                ></div>
                                <span
                                    class="text-[10px] text-slate-100"
                                    >Playhead (Now)</span
                                >
                            </div>
                            <div class="flex items-center gap-2">
                                <div
                                    class="w-3 h-0.5 border-t-2 border-dashed border-emerald-500"
                                ></div>
                                <span
                                    class="text-[10px] text-slate-100"
                                    >Live Edge</span
                                >
                            </div>
                            <div class="flex items-center gap-2">
                                <div
                                    class="w-3 h-3 rounded bg-blue-500/20 border border-blue-500/50"
                                ></div>
                                <span
                                    class="text-[10px] text-slate-100"
                                    >Available Segment</span
                                >
                            </div>
                            <div class="flex items-center gap-2">
                                <div
                                    class="w-3 h-3 rounded bg-slate-800 border border-slate-800 opacity-50"
                                ></div>
                                <span
                                    class="text-[10px] text-slate-100"
                                    >Unavailable/Wait</span
                                >
                            </div>
                            <div class="flex items-center gap-2">
                                <div
                                    class="w-3 h-3 rounded bg-blue-500 border border-white"
                                ></div>
                                <span
                                    class="text-[10px] text-slate-100"
                                    >Selected Segment</span
                                >
                            </div>
                            <div class="flex items-center gap-2">
                                <div
                                    class="w-3 h-0.5 border-t-2 border-dashed border-purple-500"
                                ></div>
                                <span
                                    class="text-[10px] text-slate-100"
                                    >SPD (Suggested Delay)</span
                                >
                            </div>
                            <div class="flex items-center gap-2">
                                <div
                                    class="w-0.5 h-3 border-l-2 border-dashed border-amber-500"
                                ></div>
                                <span
                                    class="text-[10px] text-slate-100"
                                    >Availability Start (AST)</span
                                >
                            </div>
                            <div class="flex items-center gap-2">
                                <div
                                    class="w-0.5 h-3 bg-amber-500/50"
                                ></div>
                                <span
                                    class="text-[10px] text-slate-100"
                                    >Period Boundary</span
                                >
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Bottom Panel: Whiteboard Debug -->
                </div> <!-- End Top + Viz Wrapper -->

                <!-- Bottom Panel: Whiteboard Debug -->
                <div class="whiteboard-panel custom-scrollbar">


                    <!-- Header -->
                    <div
                        class="whiteboard-header p-3 border-b border-slate-800 bg-slate-800/90 backdrop-blur-md flex items-center justify-between"
                    >
                        <div class="flex items-center gap-4">
                            <h4
                                class="text-xs font-bold uppercase tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-slate-400 drop-shadow-sm"
                            >
                                Calculus Whiteboard
                            </h4>

                            <!-- Legend -->
                            <div
                                class="flex items-center gap-3 text-[9px] opacity-80 bg-slate-800/50 px-2 py-0.5 rounded-full border border-slate-800/30"
                            >
                                <div class="flex items-center gap-1.5">
                                    <span
                                        class="w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]"
                                        style="background-color: #06b6d4"
                                    ></span>
                                    <span
                                        class="font-bold tracking-wide text-slate-400"
                                        >Input</span
                                    >
                                </div>
                                <div class="flex items-center gap-1.5">
                                    <span
                                        class="w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]"
                                        style="background-color: #f43f5e"
                                    ></span>
                                    <span
                                        class="font-bold tracking-wide text-slate-400"
                                        >Calc</span
                                    >
                                </div>
                                <div class="flex items-center gap-1.5">
                                    <span
                                        class="w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]"
                                        style="background-color: #84cc16"
                                    ></span>
                                    <span
                                        class="font-bold tracking-wide text-slate-400"
                                        >Result</span
                                    >
                                </div>
                                <div class="flex items-center gap-1.5">
                                    <span
                                        class="w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]"
                                        style="background-color: #d946ef"
                                    ></span>
                                    <span
                                        class="font-bold tracking-wide text-slate-400"
                                        >Check</span
                                    >
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Scrollable Content Area -->
                    <div
                        class="whiteboard-scroll-area custom-scrollbar space-y-3"
                    >
                        ${centerSegment &&
                centerSegment.debug &&
                centerSegment.debug.calculationSteps
                ? centerSegment.debug.calculationSteps.map(
                    (step, index) => {
                        // Determine step style based on type
                        // Determine step style based on type
                        // Using Charts 28-31 for Categories/Validation to avoid collision with Variables (1-27)
                        // Concrete accent styles per step type (no CSS
                        // variables; kept in sync with the chart palette).
                        const ACCENT_STYLES = {
                            input: {
                                hex: '#06b6d4',
                                badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
                                hoverBorder: 'hover:border-cyan-500/20',
                            },
                            calculation: {
                                hex: '#f43f5e',
                                badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                                hoverBorder: 'hover:border-rose-500/20',
                            },
                            output: {
                                hex: '#84cc16',
                                badge: 'bg-lime-500/10 text-lime-400 border-lime-500/20',
                                hoverBorder: 'hover:border-lime-500/20',
                            },
                            check: {
                                hex: '#d946ef',
                                badge: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20',
                                hoverBorder: 'hover:border-fuchsia-500/20',
                            },
                            default: {
                                hex: '#3b82f6',
                                badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                                hoverBorder: 'hover:border-blue-500/20',
                            },
                        };
                        const accent =
                            ACCENT_STYLES[step.type] || ACCENT_STYLES.default;
                        const borderColorClass = `border-slate-800`; // Base border (mapped below)

                        return html`
                            <div class="group relative bg-slate-800/40 backdrop-blur-sm border ${borderColorClass} rounded-lg overflow-hidden hover:bg-slate-800/60 transition-all duration-300 hover:shadow-md">
                                <!-- Left Accent Bar -->
                                <div class="absolute left-0 top-0 bottom-0 w-1" style="background-color: ${accent.hex}; box-shadow: 0 0 8px ${accent.hex}"></div>
                                
                                <div class="p-3 pl-5">
                                    <!-- Step Header (Compact) -->
                                    <div class="flex items-center gap-3 mb-2">
                                        <span class="text-lg font-black opacity-20 font-mono select-none" style="color: ${accent.hex}">${String(index + 1).padStart(2, '0')}</span>
                                        <h5 class="text-sm font-bold text-slate-100 tracking-wide whitespace-nowrap">${step.label}</h5>
                                        
                                        <!-- Note moved to header -->
                                        ${step.note
                                ? html`
                                                      <div
                                                          class="h-4 w-[1px] bg-slate-800/50 mx-1"
                                                      ></div>
                                                      </span>
                                                      <span
                                                          class="text-[10px] text-slate-400 italic opacity-70 truncate cursor-help border-b border-dashed border-slate-400/30"
                                                          data-tooltip-html-b64="${encodeTooltip(`<div class="max-w-[250px] text-xs font-medium text-slate-200">${step.note}</div>`)}"
                                                      >
                                                          ${step.note}
                                                      </span>
                                                  `
                                : ''
                            }
                                        
                                        <div class="ml-auto px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${accent.badge}">
                                            ${step.type}
                                        </div>
                                    </div>

                                    <!-- Content Grid (Multi-column) -->
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 grid-cols-[300px_auto]">
                                        
                                        <!-- Formula Section -->
                                        <div class="flex flex-col gap-1">
                                            <label class="text-[9px] font-bold uppercase tracking-widest text-slate-400 opacity-50 ml-1">Formula</label>
                                            <div class="bg-slate-800/50 border border-slate-800/50 rounded p-2.5 font-mono text-xs text-slate-100 shadow-inner h-full flex items-center">
                                                ${this._renderStyledFormula(step.formula)}
                                            </div>
                                        </div>

                                        <!-- Calculation & Result Section -->
                                        <div class="flex flex-col gap-1 min-w-0 relative">
                                            <div class="flex justify-between items-center">
                                                <label class="text-[9px] font-bold uppercase tracking-widest text-slate-400 opacity-50 ml-1">Result</label>
                                                ${step.action
                                ? html`
                                                              <div
                                                                  class="absolute right-0 top-0"
                                                              >
                                                                  <button
                                                                      @click=${() =>
                                        this.handleInspect(
                                            step
                                                .action
                                                .url,
                                            step
                                                .action
                                                .repId
                                        )}
                                                                      class="bg-slate-700 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded shadow-sm backdrop-blur-md mt-1 mr-1 text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1"
                                                                  >
                                                                      ${icons.search}
                                                                      ${step
                                        .action
                                        .label}
                                                                  </button>
                                                              </div>
                                                          `
                                : ''
                            }
                                            </div>
                                            <div class="bg-slate-800 border border-slate-800 rounded p-2.5 font-mono text-xs text-slate-400 shadow-sm transition-colors h-full flex items-center overflow-x-auto custom-scrollbar mt-1 ${accent.hoverBorder}">
                                                ${this._renderStyledValue(step.value)}
                                            </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }
                )
                : html`
                                  <div
                                      class="flex flex-col items-center justify-center h-full text-slate-400 opacity-50 gap-4 py-10"
                                  >
                                      <div
                                          class="w-10 h-10 rounded-full border-2 border-dashed border-current animate-spin-slow"
                                      ></div>
                                      <p class="font-mono text-xs">
                                          Waiting for calculation data...
                                      </p>
                                  </div>
                              `}

                        <!-- Bottom Padding for scrolling -->
                        <div class="h-6"></div>
                    </div>
                </div>
            </div>
        `;

        return template;
    }

    _renderRepresentationSelector(currentTrack, tracks) {
        return html`
            <div
                class="relative group"
                @mouseleave=${() => (this._isRepPanelOpen = false)}
            >
                <button
                    @click=${() => {
                this._isRepPanelOpen = !this._isRepPanelOpen;
                this.render();
            }}
                    class="w-full bg-slate-800 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 hover:border-blue-500 transition-all flex items-center justify-between shadow-sm min-w-[240px]"
                >
                    <div class="flex items-center gap-2">
                        <span
                            class="w-1.5 h-1.5 rounded-full ${currentTrack.contentType ===
                'video'
                ? 'bg-blue-500'
                : 'bg-purple-500'}"
                        ></span>
                        <span class="font-bold"
                            >[${currentTrack.contentType}]</span
                        >
                        <span class="opacity-80">${currentTrack.id}</span>
                        <span
                            class="opacity-50 text-[10px] border-l border-slate-800 pl-2 ml-1"
                            >${formatBitrate(currentTrack.bandwidth)}</span
                        >
                    </div>
                    <div
                        class="text-slate-400 transition-transform ${this
                ._isRepPanelOpen
                ? 'rotate-180'
                : ''}"
                    >
                        ${icons.chevronDown}
                    </div>
                </button>

                ${this._isRepPanelOpen
                ? html`
                          <div
                              class="absolute top-full left-0 mt-2 w-[320px] max-h-[400px] overflow-y-auto bg-slate-800/95 backdrop-blur-xl border border-slate-800 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] z-[100] custom-scrollbar p-2 animate-scaleIn origin-top-left"
                          >
                              <div
                                  class="sticky top-0 bg-slate-800/95 backdrop-blur z-10 px-2 py-1 mb-2 border-b border-slate-800 text-[9px] font-bold uppercase text-slate-400 tracking-widest"
                              >
                                  Select Representation
                              </div>
                              <div class="space-y-1">
                                  ${tracks.map((t) => {
                    const isSelected =
                        t.id === currentTrack.id;
                    const percent =
                        (t.bandwidth /
                            Math.max(
                                ...tracks.map(
                                    (tr) => tr.bandwidth
                                )
                            )) *
                        100;
                    return html`
                                          <button
                                              @click=${() => {
                            this.handleTrackChange({
                                target: { value: t.id },
                            });
                            this._isRepPanelOpen = false;
                        }}
                                              data-tooltip-html-b64="${encodeTooltip(`
                                                  <div class="min-w-[180px]">
                                                      <div class="flex items-center gap-2 mb-2 pb-2 border-b border-slate-700">
                                                          <div class="p-1 rounded bg-slate-800 text-slate-200">
                                                              ${t.contentType === 'video' ? (icons.film || 'VID') : (icons.audioLines || 'AUD')}
                                                          </div>
                                                          <div>
                                                              <div class="text-xs font-bold text-slate-200">${t.id}</div>
                                                              <div class="text-[10px] text-slate-400">${t.mimeType || 'Unknown MIME'}</div>
                                                          </div>
                                                      </div>
                                                      ${renderTooltipSection('Tech Specs', [
                            { label: 'Bandwidth', value: formatBitrate(t.bandwidth) },
                            { label: 'Codecs', value: t.codecs || 'N/A' },
                            ...(t.width ? [{ label: 'Resolution', value: `${t.width}x${t.height}` }] : []),
                            ...(t.frameRate ? [{ label: 'Frame Rate', value: t.frameRate }] : [])
                        ])}
                                                  </div>
                                              `)}"
                                              class="w-full text-left p-2 rounded-lg border transition-all group/item relative overflow-hidden
                                        ${isSelected
                            ? 'bg-blue-500/10 border-blue-500/30 shadow-sm'
                            : 'bg-transparent border-transparent hover:bg-slate-800 hover:border-slate-800'}"
                                          >
                                              <div
                                                  class="relative z-10 flex items-center justify-between mb-1"
                                              >
                                                  <div
                                                      class="flex items-center gap-2"
                                                  >
                                                      <span
                                                          class="text-xs font-bold ${isSelected
                            ? 'text-blue-400'
                            : 'text-slate-100'}"
                                                          >${t.id}</span
                                                      >
                                                      <span
                                                          class="text-[9px] uppercase px-1 rounded ${t.contentType ===
                            'video'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-purple-500/20 text-purple-400'}"
                                                          >${t.contentType}</span
                                                      >
                                                  </div>
                                                  <span
                                                      class="font-mono text-[10px] opacity-70"
                                                      >${formatBitrate(
                                t.bandwidth
                            )}</span
                                                  >
                                              </div>

                                              <!-- Bandwidth Bar -->
                                              <div
                                                  class="w-full h-1 bg-slate-900 rounded-full overflow-hidden mb-1"
                                              >
                                                  <div
                                                      class="h-full rounded-full ${isSelected
                            ? 'bg-blue-500'
                            : 'bg-slate-400'} opacity-50"
                                                      style="width: ${percent}%"
                                                  ></div>
                                              </div>

                                              <div
                                                  class="flex items-center gap-2 text-[9px] opacity-50 font-mono"
                                              >
                                                  ${t.width && t.height
                            ? html`<span
                                                            >${t.width}x${t.height}</span
                                                        >`
                            : ''}
                                                  ${t.frameRate
                            ? html`<span
                                                            >@${t.frameRate}fps</span
                                                        >`
                            : ''}
                                                  ${t.codecs
                            ? html`<span
                                                            class="truncate max-w-[100px]"
                                                            >${t.codecs}</span
                                                        >`
                            : ''}
                                              </div>
                                          </button>
                                      `;
                })}
                              </div>
                          </div>
                      `
                : ''}
            </div>
        `;
    }

    _getVarColor(varName) {
        // Use CSS Variables for Theme Consistency
        // Charts 1-27 assigned to unique variables
        const map = {
            // Inputs
            Playhead: '--chart-1',
            TargetPlayhead: '--chart-2',
            SimulationTime: '--chart-3',
            WallClock: '--chart-4',
            AvailabilityStart: '--chart-5',
            PeriodStart: '--chart-6',
            Timescale: '--chart-7',
            PTO: '--chart-8',
            DurationSec: '--chart-9',
            StartNumber: '--chart-10',
            TimeShiftBufferDepth: '--chart-11',
            LiveEdge: '--chart-12',
            SuggestedDelay: '--chart-13',

            // Calculations
            TimeSinceAST: '--chart-14',
            TimeInPeriod: '--chart-15',
            TargetTimeTicks: '--chart-16',
            SegmentIndex: '--chart-17',
            SegmentStartTicks: '--chart-18',
            PresentationTime: '--chart-19',
            SegmentEnd: '--chart-20',
            DVRWindowStart: '--chart-21',
            TemplateKey: '--chart-22',
            TemplateValue: '--chart-23',
            RelativeURL: '--chart-24',

            // Results
            WallClockStart: '--chart-25',
            IsAvailable: '--chart-26',
            IsWithinWindow: '--chart-27',
        };
        return map[varName] || null;
    }

    _getVarDescription(varName) {
        const descriptions = {
            // Inputs
            Playhead: 'Current playback position (Now) in seconds.',
            TargetPlayhead: 'Desired playback position based on user interaction or logic.',
            SimulationTime: 'The virtual time used for simulation (independent of wall clock).',
            WallClock: 'Current UTC time in the real world.',
            AvailabilityStart: 'AST (Availability Start Time). The anchor point for the timeline.',
            PeriodStart: 'Start time of the current Period relative to AST.',
            Timescale: 'Timescale of the current Representation (ticks per second).',
            PTO: 'Presentation Time Offset. Adjustment for period continuity.',
            DurationSec: 'Target duration of a single segment in seconds.',
            StartNumber: 'The index of the first segment in the timeline.',
            TimeShiftBufferDepth: 'DVR Window duration (TimeShiftBufferDepth).',
            LiveEdge: 'The theoretical latest available point in the stream.',
            SuggestedDelay: 'Suggested Presentation Delay (SPD) as defined in the MPD.',

            // Calculations
            TimeSinceAST: 'Time elapsed since the Availability Start Time.',
            TimeInPeriod: 'Time elapsed within the current Period.',
            TargetTimeTicks: 'Target time converted to timescale ticks.',
            SegmentIndex: 'Calculated index of the segment at the target time.',
            SegmentStartTicks: 'Start time of the segment in ticks (unscaled).',
            PresentationTime: 'Presentation Time (PT) of the segment in seconds.',
            SegmentEnd: 'End time of the segment in seconds.',
            DVRWindowStart: 'Start time of the available DVR window (Live Edge - Buffer Depth).',
            TemplateKey: 'The token found in the URL template (e.g. $Number$).',
            TemplateValue: 'The calculated value replacing the token.',
            RelativeURL: 'The constructed relative URL for the segment.',

            // Results
            WallClockStart: 'Absolute Wall Clock time when this segment becomes available.',
            IsAvailable: 'Whether the calculated WallClockStart is in the past.',
            IsWithinWindow: 'Whether the segment is inside the DVR window (not fallen off).',
        };
        return descriptions[varName] || 'Calculation variable';
    }

    _renderStyledFormula(formula) {
        // Split by operators and variables
        const parts = formula.split(
            /(\b(?:WallClock|SuggestedDelay|Playhead|TargetPlayhead|AvailabilityStart|TimeSinceAST|PeriodStart|TimeInPeriod|Timescale|PTO|SegmentStartTicks|PresentationTime|SegmentEnd|TimeShiftBufferDepth|DurationSec|StartNumber|LiveEdge|SegmentIndex|TargetTimeTicks|WallClockStart|IsAvailable|IsWithinWindow|DVRWindowStart|TemplateKey|TemplateValue|RelativeURL|SimulationTime)\b|=|\+|-|\*|\/|\(|\)|->)/g
        );

        return parts.map((part) => {
            const trimmed = part.trim();
            const colorVar = this._getVarColor(trimmed);

            if (colorVar) {
                return html`<span
                    class="border-b-2 mx-0.5 font-bold px-0.5 cursor-help"
                    style="border-color: var(${colorVar}); color: var(${colorVar})"
                    data-tooltip-html-b64="${encodeTooltip(`<div class="font-medium text-slate-200"><span style="color: var(${colorVar})">${trimmed}</span></div><div class="text-slate-400 text-[10px] mt-1">${this._getVarDescription(trimmed)}</div>`)}"
                    >${trimmed}</span
                >`;
            }

            if (trimmed === '=') {
                return html`<span
                    class="text-slate-100 font-bold mx-2"
                    >=</span
                >`;
            }
            if (trimmed === '->') {
                return html`<span class="text-slate-400 mx-1"
                    >→</span
                >`;
            }
            return part;
        });
    }

    _renderStyledValue(valueString) {
        const parts = valueString.split(/(@\{[^:]+:[^}]+\})/g);

        return parts.map((part) => {
            if (part.startsWith('@{')) {
                const content = part.slice(2, -1);
                const colonIndex = content.indexOf(':');
                if (colonIndex > -1) {
                    const varName = content.substring(0, colonIndex);
                    const value = content.substring(colonIndex + 1);

                    const colorVar = this._getVarColor(varName);
                    const style = colorVar
                        ? `border-color: var(${colorVar}); color: var(${colorVar})`
                        : 'border-color: #94a3b8; color: #94a3b8';

                    return html`<span
                        class="border-b-2 mx-0.5 font-bold px-0.5 cursor-help"
                        style="${style}"
                        data-tooltip-html-b64="${encodeTooltip(`<div class="font-medium text-slate-200"><span style="color: var(${colorVar || '--text-on-A-primary'})">${varName}</span> = ${value}</div><div class="text-slate-400 text-[10px] mt-1 text-wrap max-w-[200px]">${this._getVarDescription(varName)}</div>`)}"
                        >${value}</span
                    >`;
                }
            }

            if (part.trim() === '=') {
                return html`<span
                    class="text-slate-100 font-bold mx-2 opacity-50"
                    >=</span
                >`;
            }

            return part;
        });
    }
}

customElements.define('dash-timing-calculator-modal', DashTimingCalculator);

export const dashTimingCalculatorTemplate = (data) => html`
    <dash-timing-calculator-modal
        class="flex-1 min-h-0 w-full"
        .data=${data}
    ></dash-timing-calculator-modal>
`;
