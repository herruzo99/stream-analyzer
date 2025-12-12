import { calculateDashSegment } from '@/features/interactiveManifest/domain/dash-timing.js';
import * as icons from '@/ui/icons';
import { formatBitrate } from '@/ui/shared/format';
import { html, render } from 'lit-html';

const formatLargeNum = (n) => Math.round(n).toLocaleString();

const formatDurationSimple = (seconds) => {
    if (seconds === undefined || seconds === null) return 'N/A';
    if (seconds < 60) return `${seconds.toFixed(3)}s`;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = (seconds % 60).toFixed(3);
    return `${h}h ${m}m ${s}s`;
};

class DashTimingCalculator extends HTMLElement {
    constructor() {
        super();
        this._data = null;
        this._isLive = true; // Default to Live mode
        this._isDynamicStream = true; // Actual stream type
        this._manualTime = null; // Stores user-selected time when paused
        this._selectedRepId = null; // Active track ID
        this.rafId = null;
    }

    set data(val) {
        this._data = val;
        if (this._data) {
            if (this._data.initialRepId) {
                this._selectedRepId = this._data.initialRepId;
            }
            this._isDynamicStream = !!this._data.isDynamic;
            
            // If VOD, force manual mode starting at 0
            if (!this._isDynamicStream) {
                this._isLive = false;
                this._manualTime = 0;
            } else {
                this._isLive = true;
                this._manualTime = null;
            }
        }
        if (this.isConnected) this.render();
    }

    connectedCallback() {
        this.render();
        // Only start loop if it's a live stream
        if (this._isDynamicStream) {
            this.startLoop();
        }
    }

    disconnectedCallback() {
        this.stopLoop();
    }

    startLoop() {
        if (this.rafId) return;
        const loop = () => {
            if (this._isLive) {
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
        }
        this.render();
    }

    handleTimeChange(e) {
        if (this._isDynamicStream) {
            const date = new Date(e.target.value);
            if (!isNaN(date.getTime())) {
                this._isLive = false;
                this._manualTime = date.getTime();
                this.render();
            }
        } else {
            // VOD Mode: Input is seconds
            const seconds = parseFloat(e.target.value);
            if (!isNaN(seconds)) {
                this._manualTime = seconds * 1000; // Store as ms for consistency
                this.render();
            }
        }
    }

    handleTrackChange(e) {
        this._selectedRepId = e.target.value;
        this.render();
    }

    syncToNow() {
        this._isLive = true;
        this._manualTime = null;
        this.render();
    }

    render() {
        if (!this._data || !this._data.tracks) return;

        const { ast, periodStart, tracks } = this._data;

        // Find selected track config
        const currentTrack = tracks.find(t => t.id === this._selectedRepId) || tracks[0];
        if (!currentTrack) return; // Safety

        const {
            timescale,
            duration,
            startNumber,
            pto,
            mediaTemplate,
            timeline
        } = currentTrack;

        // Determine "Now" based on mode
        let nowMs; 
        let effectiveAst;

        if (this._isDynamicStream) {
            nowMs = this._isLive ? Date.now() : this._manualTime || Date.now();
            effectiveAst = ast;
        } else {
            // VOD Mode: treat manualTime as offset from 0
            nowMs = this._manualTime || 0;
            effectiveAst = 0; // Force 0 AST for relative calculation
        }

        // Adjust for timezone offset for the datetime-local input (Live only)
        const tzOffset = new Date().getTimezoneOffset() * 60000;
        const localIso = this._isDynamicStream 
            ? new Date(nowMs - tzOffset).toISOString().slice(0, 23) 
            : '';

        const result = calculateDashSegment({
            now: nowMs,
            availabilityStartTime: effectiveAst,
            periodStart,
            timescale,
            duration,
            startNumber,
            pto,
            timeline,
        });

        const segmentDurationSec = result.segmentDurationSec || 0;
        const isError = !!result.error;
        const debug = result.debug || {};

        // URL Preview Logic
        let urlPreview = mediaTemplate || '';
        if (!isError) {
            urlPreview = urlPreview
                .replace(/\$RepresentationID\$/g, currentTrack.id)
                .replace(/\$Bandwidth\$/g, String(currentTrack.bandwidth))
                .replace(/\$Time\$/g, result.presentationTime);

            const numFormatMatch = urlPreview.match(/\$Number(%0(\d+)d)?\$/);
            if (numFormatMatch) {
                const pad = numFormatMatch[2] ? parseInt(numFormatMatch[2]) : 1;
                urlPreview = urlPreview.replace(
                    numFormatMatch[0],
                    String(result.segmentIndex).padStart(pad, '0')
                );
            }
        }

        // --- Math Visualization Steps (Only if no error) ---
        let step1_WallClock = html``;
        let step2_Period = html``;
        let step3_Index = html``;

        if (!isError && debug.timeSinceAstSec !== undefined) {
            step1_WallClock = html`
                <div class="flex items-center justify-between text-xs mb-1">
                    <span class="text-slate-400">${this._isDynamicStream ? 'Now (Wall)' : 'Playhead'}</span>
                    <span class="font-mono text-slate-300"
                        >${this._isDynamicStream ? new Date(nowMs).toLocaleTimeString() : (nowMs/1000).toFixed(3) + 's'}</span
                    >
                </div>
                <div
                    class="flex items-center justify-between text-xs mb-1 border-b border-slate-700/50 pb-1"
                >
                    <span class="text-slate-400">- AST</span>
                    <span class="font-mono text-slate-500"
                        >${this._isDynamicStream ? new Date(effectiveAst).toLocaleTimeString() : '0s'}</span
                    >
                </div>
                <div
                    class="flex items-center justify-between text-xs font-bold text-blue-300"
                >
                    <span>= Time Since AST</span>
                    <span class="font-mono"
                        >${formatDurationSimple(debug.timeSinceAstSec)}</span
                    >
                </div>
            `;

            step2_Period = html`
                <div class="flex items-center justify-between text-xs mb-1">
                    <span class="text-slate-400">Time Since AST</span>
                    <span class="font-mono text-slate-300"
                        >${formatDurationSimple(debug.timeSinceAstSec)}</span
                    >
                </div>
                <div
                    class="flex items-center justify-between text-xs mb-1 border-b border-slate-700/50 pb-1"
                >
                    <span class="text-slate-400">- Period Start</span>
                    <span class="font-mono text-slate-500"
                        >${formatDurationSimple(periodStart)}</span
                    >
                </div>
                <div
                    class="flex items-center justify-between text-xs font-bold text-purple-300"
                >
                    <span>= Period Time</span>
                    <span class="font-mono"
                        >${formatDurationSimple(result.timeInPeriodSec)}</span
                    >
                </div>
            `;

            step3_Index = html`
                <div class="flex items-center justify-between text-xs mb-1">
                    <span class="text-slate-400">Period Time</span>
                    <span class="font-mono text-slate-300"
                        >${result.timeInPeriodSec.toFixed(2)}s</span
                    >
                </div>
                <div
                    class="flex items-center justify-between text-xs mb-1 border-b border-slate-700/50 pb-1"
                >
                    <span class="text-slate-400">/ Seg Duration</span>
                    <span class="font-mono text-slate-500"
                        >${segmentDurationSec.toFixed(3)}s</span
                    >
                </div>
                <div
                    class="flex items-center justify-between text-xs font-bold text-emerald-400"
                >
                    <span>= Raw Index</span>
                    <span class="font-mono"
                        >${(result.timeInPeriodSec / segmentDurationSec).toFixed(2)}</span
                    >
                </div>
            `;
        }

        // --- Status Badge Logic ---
        let statusBadge;
        if (this._isDynamicStream) {
            statusBadge = this._isLive
            ? html`
                  <span
                      class="flex items-center gap-1.5 bg-red-900/20 text-red-400 px-2 py-0.5 rounded text-[9px] font-bold border border-red-500/20 uppercase tracking-wider"
                  >
                      <span class="relative flex h-1.5 w-1.5">
                          <span
                              class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"
                          ></span>
                          <span
                              class="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"
                          ></span>
                      </span>
                      Live Clock
                  </span>
              `
            : html`
                  <span
                      class="flex items-center gap-1.5 bg-amber-900/20 text-amber-400 px-2 py-0.5 rounded text-[9px] font-bold border border-amber-500/20 uppercase tracking-wider"
                  >
                      ${icons.pause} Paused
                  </span>
              `;
        } else {
            statusBadge = html`
                <span
                    class="flex items-center gap-1.5 bg-blue-900/20 text-blue-400 px-2 py-0.5 rounded text-[9px] font-bold border border-blue-500/20 uppercase tracking-wider"
                >
                    ${icons.fileText} Static (VOD)
                </span>
            `;
        }


        const timelineBadge = debug.usingTimeline
            ? html`<span
                  class="px-2 py-0.5 rounded bg-purple-900/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold uppercase tracking-wide mb-2 inline-block"
              >
                  SegmentTimeline Active
              </span>`
            : '';

        // --- Track Selection UI ---
        const trackSelector = html`
            <div class="mb-4">
                 <label class="block text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-1">Calculation Context</label>
                 <select 
                    class="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded px-2 py-1.5 focus:border-blue-500 outline-none font-mono"
                    .value=${this._selectedRepId}
                    @change=${(e) => this.handleTrackChange(e)}
                 >
                    ${tracks.map(t => html`
                        <option value="${t.id}">
                            [${t.contentType.toUpperCase()}] ${t.id} (${formatBitrate(t.bandwidth)})
                        </option>
                    `)}
                 </select>
            </div>
        `;

        // --- Input Controls (Dynamic vs VOD) ---
        const inputControls = this._isDynamicStream 
            ? html`
                <input
                    type="datetime-local"
                    step="0.001"
                    .value=${localIso}
                    @input=${(e) => this.handleTimeChange(e)}
                    class="w-full bg-slate-950 border ${this._isLive
                        ? 'border-red-900/30 text-red-100/90'
                        : 'border-amber-900/30 text-amber-100/90'} rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-slate-600 transition-colors"
                />`
            : html`
                <div class="relative">
                    <input
                        type="number"
                        step="1"
                        min="0"
                        .value=${(nowMs / 1000).toString()}
                        @input=${(e) => this.handleTimeChange(e)}
                        class="w-full bg-slate-950 border border-blue-900/30 text-blue-100/90 rounded-lg px-3 py-2.5 pl-12 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors"
                    />
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 uppercase">Secs</span>
                </div>
            `;

        const liveButtons = this._isDynamicStream ? html`
            <button
                @click=${() => this.toggleLive()}
                class="px-4 py-2.5 rounded-lg font-bold text-xs transition-colors flex items-center gap-2 min-w-[100px] justify-center ${this._isLive
                    ? 'bg-slate-800 text-red-400 border border-red-900/20 hover:bg-red-900/10'
                    : 'bg-emerald-600 text-white hover:bg-emerald-500 border border-emerald-500'}"
            >
                ${this._isLive
                    ? html`${icons.pause} Pause`
                    : html`${icons.play} Resume`}
            </button>

            <button
                @click=${() => this.syncToNow()}
                class="px-4 py-2.5 rounded-lg font-bold text-xs bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors flex items-center gap-2"
                title="Jump to current time"
            >
                ${icons.refresh} Sync Now
            </button>
        ` : html``;


        const template = html`
            <div
                class="flex flex-col h-full w-full bg-slate-900 overflow-hidden"
            >
                <!-- Controls Bar -->
                <div
                    class="shrink-0 p-4 bg-slate-900 border-b border-slate-800 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end"
                >
                    <div class="w-full">
                        <div class="flex items-center gap-3 mb-2">
                            <span
                                class="text-[10px] font-bold uppercase text-slate-500 tracking-wider"
                                >${this._isDynamicStream ? 'Simulation Clock (UTC)' : 'Playhead Position'}</span
                            >
                            ${statusBadge}
                        </div>
                        ${inputControls}
                    </div>

                    <div class="flex gap-2">
                        ${liveButtons}
                    </div>
                </div>

                <!-- Content Body -->
                <div
                    class="flex flex-col lg:flex-row grow min-h-0 overflow-hidden"
                >
                    <!-- Left: Parameters -->
                    <div
                        class="w-full lg:w-72 shrink-0 border-r border-slate-800 bg-slate-900/50 overflow-y-auto custom-scrollbar p-4"
                    >
                        ${trackSelector}

                        <h4
                            class="text-xs font-bold text-white uppercase tracking-wider mb-4 pb-2 border-b border-slate-800"
                        >
                            Manifest Params
                        </h4>
                        <div class="space-y-3">
                            ${this.paramRow(
                                'Timescale',
                                formatLargeNum(timescale)
                            )}
                            ${!debug.usingTimeline
                                ? this.paramRow(
                                      'Duration (Tpl)',
                                      `${formatLargeNum(duration)} ticks`
                                  )
                                : ''}
                            ${this.paramRow(
                                'Seg Duration',
                                `${segmentDurationSec.toFixed(3)}s`
                            )}
                            ${this.paramRow('Start Number', startNumber)}
                            ${this.paramRow('PTO', formatLargeNum(pto))}

                            ${this._isDynamicStream ? html`
                            <div class="pt-2">
                                <span
                                    class="text-[10px] text-slate-500 block mb-1 uppercase font-bold"
                                    >Availability Start</span
                                >
                                <code
                                    class="block w-full bg-black/20 p-2 rounded text-[10px] font-mono text-slate-400 break-all border border-slate-800"
                                >
                                    ${new Date(ast).toISOString()}
                                </code>
                            </div>` : ''}
                        </div>
                    </div>

                    <!-- Right: Output -->
                    <div
                        class="grow flex flex-col min-h-0 overflow-y-auto custom-scrollbar bg-slate-900 p-4 lg:p-6"
                    >
                        <!-- Logic Pipeline -->
                        ${!isError ? html`
                        <div
                            class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 shrink-0"
                        >
                            <div
                                class="bg-slate-800/40 rounded-xl border border-slate-700/50 p-3"
                            >
                                <h5
                                    class="text-[10px] font-bold text-blue-400 uppercase mb-2 pb-2 border-b border-slate-700/30"
                                >
                                    1. Time Offset
                                </h5>
                                ${step1_WallClock}
                            </div>
                            <div
                                class="bg-slate-800/40 rounded-xl border border-slate-700/50 p-3"
                            >
                                <h5
                                    class="text-[10px] font-bold text-purple-400 uppercase mb-2 pb-2 border-b border-slate-700/30"
                                >
                                    2. Period Relative
                                </h5>
                                ${step2_Period}
                            </div>
                            <div
                                class="bg-slate-800/40 rounded-xl border border-slate-700/50 p-3"
                            >
                                <h5
                                    class="text-[10px] font-bold text-emerald-400 uppercase mb-2 pb-2 border-b border-slate-700/30"
                                >
                                    3. Segmentation
                                </h5>
                                ${step3_Index}
                            </div>
                        </div>` : html``}

                        <!-- Result Banner -->
                        <div
                            class="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-700 overflow-hidden shrink-0 shadow-xl mb-8"
                        >
                            <div
                                class="px-6 py-4 border-b border-slate-700/50 flex justify-between items-center bg-white/[0.02]"
                            >
                                <span
                                    class="text-xs font-bold text-slate-300 uppercase tracking-widest"
                                    >Segment Calculation</span
                                >
                                ${result.isAvailable && !isError
                                    ? html`<span
                                          class="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded border border-emerald-500/30 tracking-wide"
                                          >AVAILABLE</span
                                      >`
                                    : html`<span
                                          class="px-2 py-1 bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded border border-amber-500/30 tracking-wide"
                                          >${isError ? 'ERROR' : 'FUTURE'}</span
                                      >`}
                            </div>

                            <div class="p-8 text-center">
                                ${isError ? html`
                                    <div class="flex flex-col items-center gap-4">
                                        <div class="text-red-500 text-4xl">${icons.alertTriangle}</div>
                                        <div class="text-xl font-bold text-red-400">${result.error}</div>
                                        <p class="text-slate-400 text-sm max-w-md">The calculator could not determine the segment for this timestamp. Check timescale or template parameters.</p>
                                    </div>
                                ` : html`
                                    ${timelineBadge}
                                    <div
                                        class="text-[10px] text-slate-500 font-bold uppercase mb-3 tracking-widest"
                                    >
                                        Index ($Number$)
                                    </div>
                                    <div
                                        class="text-6xl sm:text-7xl font-mono font-black text-white tracking-tighter mb-8 select-all drop-shadow-sm"
                                    >
                                        ${result.segmentIndex}
                                    </div>

                                    <div
                                        class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-lg mx-auto bg-slate-950/50 p-4 rounded-xl border border-slate-800/50 shadow-inner"
                                    >
                                        <div>
                                            <span
                                                class="text-[10px] text-slate-500 font-bold uppercase block mb-1"
                                                >$Time$ Value</span
                                            >
                                            <span
                                                class="font-mono text-sm text-blue-300"
                                                title="${result.presentationTime}"
                                                >${formatLargeNum(
                                                    result.presentationTime
                                                )}</span
                                            >
                                        </div>
                                        <div>
                                            <span
                                                class="text-[10px] text-slate-500 font-bold uppercase block mb-1"
                                                >Start Time (Wall)</span
                                            >
                                            <span
                                                class="font-mono text-sm text-emerald-300"
                                                >${new Date(
                                                    result.segmentStartWallMs
                                                ).toLocaleTimeString()}</span
                                            >
                                        </div>
                                    </div>
                                `}
                            </div>
                        </div>

                        <!-- Math Breakdown -->
                        ${!isError ? html`
                        <div
                            class="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4 mb-8"
                        >
                            <h5
                                class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"
                            >
                                ${icons.calculator} $Time$ Derivation Formula
                            </h5>
                            <div
                                class="font-mono text-xs space-y-2 text-slate-300 bg-slate-900/50 p-3 rounded-lg border border-slate-800/50"
                            >
                                ${debug.usingTimeline
                                    ? html`
                                          <div class="text-slate-400 italic">
                                              Calculated by traversing
                                              SegmentTimeline...
                                          </div>
                                      `
                                    : html`
                                          <div
                                              class="flex justify-between border-b border-slate-800 pb-2 mb-2"
                                          >
                                              <span class="text-slate-500"
                                                  >Index Diff</span
                                              >
                                              <span>
                                                  <span class="text-white"
                                                      >${result.segmentIndex}</span
                                                  >
                                                  -
                                                  <span class="text-slate-400"
                                                      >${startNumber}</span
                                                  >
                                                  =
                                                  <span class="text-emerald-400"
                                                      >${debug.indexDiff}</span
                                                  >
                                              </span>
                                          </div>
                                          <div
                                              class="flex justify-between border-b border-slate-800 pb-2 mb-2"
                                          >
                                              <span class="text-slate-500"
                                                  >Scaled Time</span
                                              >
                                              <span>
                                                  <span class="text-emerald-400"
                                                      >${debug.indexDiff}</span
                                                  >
                                                  ×
                                                  <span class="text-slate-400"
                                                      >${formatLargeNum(
                                                          duration
                                                      )}</span
                                                  >
                                                  =
                                                  <span class="text-purple-400"
                                                      >${formatLargeNum(
                                                          debug.scaledTime
                                                      )}</span
                                                  >
                                              </span>
                                          </div>
                                      `}
                                <div class="flex justify-between">
                                    <span class="text-slate-500"
                                        >Final $Time$</span
                                    >
                                    <span>
                                        <span class="text-purple-400"
                                            >${formatLargeNum(
                                                debug.scaledTime
                                            )}</span
                                        >
                                        +
                                        <span class="text-slate-400"
                                            >${formatLargeNum(pto)}</span
                                        >
                                        =
                                        <span class="text-blue-300 font-bold"
                                            >${formatLargeNum(
                                                result.presentationTime
                                            )}</span
                                        >
                                    </span>
                                </div>
                            </div>
                            <p
                                class="text-[10px] text-slate-500 mt-2 leading-relaxed"
                            >
                                The difference between <b>Index</b> and
                                <b>$Time$</b> is due to the
                                <code>timescale</code> multiplier (${formatLargeNum(
                                    timescale
                                )}).
                            </p>
                        </div>

                        <div class="text-left max-w-3xl mx-auto w-full">
                            <div
                                class="text-[10px] text-slate-500 font-bold uppercase mb-2 pl-1"
                            >
                                URL Preview
                            </div>
                            <div
                                class="bg-black/30 p-4 rounded-xl border border-slate-700/50 font-mono text-xs text-slate-300 break-all select-all shadow-inner"
                            >
                                ${urlPreview}
                            </div>
                        </div>` : html``}
                    </div>
                </div>
            </div>
        `;

        render(template, this);
    }

    paramRow(label, value) {
        return html`
            <div
                class="flex justify-between items-baseline text-xs border-b border-slate-800/50 pb-1.5 last:border-0"
            >
                <span class="text-slate-500">${label}</span>
                <span class="font-mono text-slate-300 text-right"
                    >${value}</span
                >
            </div>
        `;
    }
}

customElements.define('dash-timing-calculator-modal', DashTimingCalculator);

export const dashTimingCalculatorTemplate = (data) =>
    html`<dash-timing-calculator-modal
        .data=${data}
    ></dash-timing-calculator-modal>`;