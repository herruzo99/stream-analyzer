import { analyzeShakaError } from '@/infrastructure/player/shaka-error';
import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import * as icons from '@/ui/icons';
import { formatBitrate } from '@/ui/shared/format';
import { html, render } from 'lit-html';

export class MetricsHudComponent extends HTMLElement {
    set data(player) {
        this._player = player;
        this.render();
    }

    render() {
        if (!this._player || !this._player.stats) return;
        const { stats, error, state, streamType, variantTracks, retryCount } =
            this._player;
        const { isAutoResetEnabled } = useMultiPlayerStore.getState();

        // --- Rich Error State Visual ---
        if (state === 'error') {
            this.innerHTML = '';
            const errInfo = analyzeShakaError(error);

            const retryMessage =
                isAutoResetEnabled && retryCount > 0
                    ? html`<div
                          class="mt-3 pt-3 border-t border-white/10 text-[10px] text-yellow-400 font-mono animate-pulse flex items-center justify-center gap-1"
                      >
                          ${icons.refresh} Retrying (${retryCount}/5)
                      </div>`
                    : html``;

            const errorTemplate = html`
                <div
                    class="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4 animate-fadeIn z-50"
                >
                    <div
                        class="bg-slate-900 border border-red-500/30 rounded-xl p-4 w-full max-w-[280px] shadow-xl"
                    >
                        <div class="flex items-start gap-3 mb-3">
                            <div class="text-red-500 shrink-0 scale-110">
                                ${icons.alertTriangle}
                            </div>
                            <div class="min-w-0">
                                <h3
                                    class="text-white font-bold text-sm leading-tight truncate"
                                    title="${errInfo.title}"
                                >
                                    ${errInfo.title}
                                </h3>
                                <div class="flex gap-1 mt-1">
                                    <span
                                        class="text-[9px] font-mono bg-red-900/40 text-red-300 px-1.5 rounded border border-red-500/20"
                                    >
                                        ${errInfo.code}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <p
                            class="text-slate-400 text-xs leading-relaxed line-clamp-3"
                            title="${errInfo.description}"
                        >
                            ${errInfo.description}
                        </p>
                        ${retryMessage}
                    </div>
                </div>
            `;
            render(errorTemplate, this);
            return;
        }

        const { playbackQuality, abr, buffer } = stats;
        const isStalling = state === 'buffering';
        const codec =
            variantTracks[0]?.videoCodec?.split('.')[0]?.toUpperCase() ||
            'UNKNOWN';

        // Calculations
        const bandwidthUsage =
            abr.estimatedBandwidth > 0
                ? (abr.currentVideoBitrate / abr.estimatedBandwidth) * 100
                : 0;

        // SAFEGUARD: Use null coalescing to prevent undefined.toFixed() crash
        const bufferValue = buffer.forwardBuffer ?? 0;
        const bufferSeconds = buffer.seconds ?? 0;

        const bufferHealthPercent = Math.min(bufferValue * 5, 100);

        // Dynamic Buffer Color Logic
        let bufferColorClass = '';
        let bufferTextColor = 'text-emerald-400';

        if (bufferValue < 2) {
            bufferColorClass =
                'bg-gradient-to-r from-red-600 to-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]';
            bufferTextColor = 'text-red-400';
        } else if (bufferValue < 5) {
            bufferColorClass = 'bg-gradient-to-r from-orange-600 to-orange-500';
            bufferTextColor = 'text-orange-400';
        } else if (bufferValue < 10) {
            bufferColorClass = 'bg-gradient-to-r from-yellow-500 to-yellow-400';
            bufferTextColor = 'text-yellow-400';
        } else {
            bufferColorClass =
                'bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)]';
        }

        const template = html`
            <!-- Main HUD Container -->
            <div
                class="absolute top-3 left-3 z-20 flex flex-col gap-2 pointer-events-none select-none animate-fadeIn min-w-[200px]"
            >
                <!-- Glass Panel -->
                <div
                    class="bg-slate-950/80 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                >
                    <!-- Header: Res & Badges -->
                    <div
                        class="flex justify-between items-start p-3 border-b border-white/5 bg-white/[0.02]"
                    >
                        <div>
                            <div
                                class="text-2xl font-black text-white leading-none tracking-tight font-mono"
                            >
                                ${playbackQuality.resolution || 'Init...'}
                            </div>
                            <div
                                class="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1"
                            >
                                ${icons.activity}
                                ${playbackQuality.droppedFrames > 0
                                    ? html`<span class="text-red-400"
                                          >${playbackQuality.droppedFrames}
                                          Dropped</span
                                      >`
                                    : 'Stable'}
                            </div>
                        </div>
                        <div class="flex flex-col items-end gap-1">
                            <span
                                class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${streamType ===
                                'live'
                                    ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                    : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}"
                            >
                                ${streamType}
                            </span>
                            <span
                                class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-800 text-slate-400 border border-slate-700"
                            >
                                ${codec}
                            </span>
                        </div>
                    </div>

                    <!-- Metrics Grid -->
                    <div class="p-3 space-y-3">
                        <!-- Network Efficiency -->
                        <div>
                            <div
                                class="flex justify-between text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider"
                            >
                                <span>Bitrate / BW</span>
                                <span
                                    class="${bandwidthUsage > 90
                                        ? 'text-yellow-400'
                                        : 'text-emerald-400'}"
                                >
                                    ${formatBitrate(abr.currentVideoBitrate)}
                                </span>
                            </div>
                            <div
                                class="h-1.5 bg-slate-800 rounded-full overflow-hidden relative"
                            >
                                <!-- Bandwidth Usage Bar -->
                                <div
                                    class="absolute top-0 left-0 bottom-0 rounded-full transition-all duration-500 ${bandwidthUsage >
                                    90
                                        ? 'bg-yellow-500'
                                        : 'bg-blue-500'}"
                                    style="width: ${Math.min(
                                        bandwidthUsage,
                                        100
                                    )}%"
                                ></div>
                            </div>
                            <div class="flex justify-between mt-1">
                                <span
                                    class="text-[9px] text-slate-600 font-mono"
                                    >EST:
                                    ${formatBitrate(
                                        abr.estimatedBandwidth
                                    )}</span
                                >
                                <span
                                    class="text-[9px] text-slate-600 font-mono"
                                    >${bandwidthUsage.toFixed(0)}% Load</span
                                >
                            </div>
                        </div>

                        <!-- Buffer Health -->
                        <div>
                            <div
                                class="flex justify-between text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider"
                            >
                                <span>Buffer</span>
                                <span class="${bufferTextColor}">
                                    ${bufferValue.toFixed(1)}s
                                </span>
                            </div>
                            <div
                                class="h-1.5 bg-slate-800 rounded-full overflow-hidden"
                            >
                                <div
                                    class="h-full rounded-full transition-all duration-300 ${bufferColorClass}"
                                    style="width: ${bufferHealthPercent}%"
                                ></div>
                            </div>
                        </div>

                        <!-- Bottom Stats Row -->
                        <div
                            class="grid grid-cols-2 gap-2 pt-2 border-t border-white/5"
                        >
                            <div
                                class="bg-slate-900/50 rounded p-1.5 text-center border border-white/5"
                            >
                                <div
                                    class="text-[9px] text-slate-500 font-bold uppercase"
                                >
                                    Stalls
                                </div>
                                <div
                                    class="text-sm font-mono font-bold ${playbackQuality.totalStalls >
                                    0
                                        ? 'text-red-400'
                                        : 'text-slate-300'}"
                                >
                                    ${playbackQuality.totalStalls}
                                </div>
                            </div>
                            <div
                                class="bg-slate-900/50 rounded p-1.5 text-center border border-white/5"
                            >
                                <div
                                    class="text-[9px] text-slate-500 font-bold uppercase"
                                >
                                    Latency
                                </div>
                                <div
                                    class="text-sm font-mono font-bold text-slate-300"
                                >
                                    ${buffer.label === 'Live Latency'
                                        ? bufferSeconds.toFixed(1) + 's'
                                        : 'N/A'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Centered Stall Spinner -->
            ${isStalling
                ? html`
                      <div
                          class="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] z-40 animate-fadeIn"
                      >
                          <div
                              class="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-3"
                          ></div>
                          <div
                              class="text-xs font-bold text-blue-200 uppercase tracking-widest animate-pulse"
                          >
                              Buffering
                          </div>
                      </div>
                  `
                : ''}
        `;

        render(template, this);
    }
}

customElements.define('metrics-hud', MetricsHudComponent);
