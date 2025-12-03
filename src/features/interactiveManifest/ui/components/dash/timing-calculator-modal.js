import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';
import { calculateDashSegment } from '../../../domain/dash-timing.js';

const formatLargeNum = (n) => Math.round(n).toLocaleString();

const formatDurationSimple = (seconds) => {
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
        this._manualTime = null; // Stores user-selected time when paused
        this.rafId = null;
    }

    set data(val) {
        this._data = val;
        if (this.isConnected) this.render();
    }

    connectedCallback() {
        this.render();
        this.startLoop();
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
        const date = new Date(e.target.value);
        if (!isNaN(date.getTime())) {
            this._isLive = false;
            this._manualTime = date.getTime();
            this.render();
        }
    }

    syncToNow() {
        this._isLive = true;
        this._manualTime = null;
        this.render();
    }

    render() {
        if (!this._data) return;

        const {
            ast,
            periodStart,
            timescale,
            duration,
            startNumber,
            pto,
            mediaTemplate,
        } = this._data;

        const now = this._isLive ? Date.now() : this._manualTime || Date.now();

        // Adjust for timezone offset for the datetime-local input
        const tzOffset = new Date().getTimezoneOffset() * 60000;
        const localIso = new Date(now - tzOffset).toISOString().slice(0, 23);

        const result = calculateDashSegment({
            now,
            availabilityStartTime: ast,
            periodStart,
            timescale,
            duration,
            startNumber,
            pto,
        });

        const segmentDurationSec = duration / timescale;
        const isError = result.error;

        // URL Preview Logic
        let urlPreview = mediaTemplate || '';
        if (!isError) {
            urlPreview = urlPreview
                .replace(/\$RepresentationID\$/g, 'rep1')
                .replace(/\$Bandwidth\$/g, '500000')
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

        // --- Math Visualization Steps ---
        const timeSinceAstMs = now - ast;
        const timeSinceAstSec = timeSinceAstMs / 1000;
        const periodRelativeTimeSec = timeSinceAstSec - periodStart;

        const step1_WallClock = html`
            <div class="flex items-center justify-between text-xs mb-1">
                <span class="text-slate-400">Now (Wall)</span>
                <span class="font-mono text-slate-300"
                    >${new Date(now).toLocaleTimeString()}</span
                >
            </div>
            <div
                class="flex items-center justify-between text-xs mb-1 border-b border-slate-700/50 pb-1"
            >
                <span class="text-slate-400">- AST</span>
                <span class="font-mono text-slate-500"
                    >${new Date(ast).toLocaleTimeString()}</span
                >
            </div>
            <div
                class="flex items-center justify-between text-xs font-bold text-blue-300"
            >
                <span>= Time Since AST</span>
                <span class="font-mono"
                    >${formatDurationSimple(timeSinceAstSec)}</span
                >
            </div>
        `;

        const step2_Period = html`
            <div class="flex items-center justify-between text-xs mb-1">
                <span class="text-slate-400">Time Since AST</span>
                <span class="font-mono text-slate-300"
                    >${formatDurationSimple(timeSinceAstSec)}</span
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
                    >${formatDurationSimple(periodRelativeTimeSec)}</span
                >
            </div>
        `;

        const step3_Index = html`
            <div class="flex items-center justify-between text-xs mb-1">
                <span class="text-slate-400">Period Time</span>
                <span class="font-mono text-slate-300"
                    >${periodRelativeTimeSec.toFixed(2)}s</span
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
                    >${(periodRelativeTimeSec / segmentDurationSec).toFixed(
                        2
                    )}</span
                >
            </div>
        `;

        const template = html`
            <!-- Removed internal header to prevent double close buttons and truncation -->
            <div
                class="flex flex-col h-full w-full bg-slate-900 overflow-hidden"
            >
                <!-- Controls Bar -->
                <div
                    class="shrink-0 p-4 bg-slate-900 border-b border-slate-800 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end"
                >
                    <div class="w-full">
                        <label
                            class="flex items-center justify-between text-[10px] font-bold uppercase text-slate-500 mb-1.5 tracking-wider"
                        >
                            <span>Simulation Clock (UTC)</span>
                            ${this._isLive
                                ? html`<span
                                      class="flex items-center gap-1.5 text-red-400"
                                      ><span class="relative flex h-2 w-2"
                                          ><span
                                              class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"
                                          ></span
                                          ><span
                                              class="relative inline-flex rounded-full h-2 w-2 bg-red-500"
                                          ></span
                                      ></span>
                                      LIVE</span
                                  >`
                                : html`<span
                                      class="text-amber-400 flex items-center gap-1"
                                      >${icons.pause} PAUSED</span
                                  >`}
                        </label>
                        <input
                            type="datetime-local"
                            step="0.001"
                            .value=${localIso}
                            @input=${(e) => this.handleTimeChange(e)}
                            class="w-full bg-slate-950 border ${this._isLive
                                ? 'border-red-900/30 text-red-100/90'
                                : 'border-amber-900/30 text-amber-100/90'} rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-slate-600 transition-colors"
                        />
                    </div>

                    <div class="flex gap-2">
                        <button
                            @click=${() => this.toggleLive()}
                            class="px-4 py-2.5 rounded-lg font-bold text-xs transition-colors flex items-center gap-2 min-w-[100px] justify-center ${this
                                ._isLive
                                ? 'bg-slate-800 text-red-400 border border-red-900/20 hover:bg-red-900/10'
                                : 'bg-emerald-600 text-white hover:bg-emerald-500 border border-emerald-500'}"
                        >
                            ${this._isLive
                                ? html`${icons.pause} Stop`
                                : html`${icons.play} Resume`}
                        </button>

                        <button
                            @click=${() => this.syncToNow()}
                            class="px-4 py-2.5 rounded-lg font-bold text-xs bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors flex items-center gap-2"
                            title="Jump to current time"
                        >
                            ${icons.refresh} Sync Now
                        </button>
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
                            ${this.paramRow(
                                'Duration',
                                `${formatLargeNum(duration)} ticks`
                            )}
                            ${this.paramRow(
                                'Seg Duration',
                                `${segmentDurationSec.toFixed(3)}s`
                            )}
                            ${this.paramRow('Start Number', startNumber)}
                            ${this.paramRow('PTO', formatLargeNum(pto))}

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
                            </div>
                            <div class="pt-1">
                                <span
                                    class="text-[10px] text-slate-500 block mb-1 uppercase font-bold"
                                    >Period Start</span
                                >
                                <code
                                    class="block w-full bg-black/20 p-2 rounded text-[10px] font-mono text-slate-400 break-all border border-slate-800"
                                >
                                    ${formatDurationSimple(periodStart)}
                                </code>
                            </div>
                        </div>
                    </div>

                    <!-- Right: Output -->
                    <div
                        class="grow flex flex-col min-h-0 overflow-y-auto custom-scrollbar bg-slate-900 p-4 lg:p-6"
                    >
                        <!-- Logic Pipeline -->
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
                        </div>

                        <!-- Result Banner -->
                        <div
                            class="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-700 overflow-hidden shrink-0 shadow-xl"
                        >
                            <div
                                class="px-6 py-4 border-b border-slate-700/50 flex justify-between items-center bg-white/[0.02]"
                            >
                                <span
                                    class="text-xs font-bold text-slate-300 uppercase tracking-widest"
                                    >Segment Calculation</span
                                >
                                ${result.isAvailable
                                    ? html`<span
                                          class="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded border border-emerald-500/30 tracking-wide"
                                          >AVAILABLE</span
                                      >`
                                    : html`<span
                                          class="px-2 py-1 bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded border border-amber-500/30 tracking-wide"
                                          >FUTURE</span
                                      >`}
                            </div>

                            <div class="p-8 text-center">
                                <div
                                    class="text-[10px] text-slate-500 font-bold uppercase mb-3 tracking-widest"
                                >
                                    Index
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

                                <div class="mt-8 text-left max-w-3xl mx-auto">
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
                                </div>
                            </div>
                        </div>
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
