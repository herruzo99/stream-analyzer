import { html } from 'lit-html';
import { formatBitrate } from '@/ui/shared/format';
import * as icons from '@/ui/icons';

export class MetricsHudComponent extends HTMLElement {
    set data(player) {
        this._player = player;
        this.render();
    }

    render() {
        if (!this._player || !this._player.stats) return;
        const { stats, error, state, streamType, variantTracks } = this._player;

        // Error State Visual
        if (state === 'error') {
            this.innerHTML = '';
            const errorTemplate = html`
                <div
                    class="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-sm text-center p-6 animate-fadeIn z-50"
                >
                    <div
                        class="bg-red-500/20 p-4 rounded-full mb-3 text-red-500 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                    >
                        ${icons.alertTriangle}
                    </div>
                    <h3
                        class="text-red-400 font-bold uppercase tracking-wider text-sm mb-2"
                    >
                        Playback Error
                    </h3>
                    <p class="text-white text-xs leading-relaxed max-w-[250px]">
                        ${error || 'Unknown Error'}
                    </p>
                </div>
            `;
            import('lit-html').then(({ render }) =>
                render(errorTemplate, this)
            );
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
        const bufferHealth = Math.min(buffer.seconds * 5, 100); // Cap at 20s visual

        // Dynamic Buffer Color Logic
        let bufferColorClass = '';
        if (bufferHealth < 25) {
            bufferColorClass = 'bg-gradient-to-r from-red-600 to-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]';
        } else if (bufferHealth < 50) {
            bufferColorClass = 'bg-gradient-to-r from-orange-600 to-orange-500';
        } else if (bufferHealth < 75) {
            bufferColorClass = 'bg-gradient-to-r from-yellow-500 to-yellow-400';
        } else {
            bufferColorClass = 'bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)]';
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
                            <div class="text-2xl font-black text-white leading-none tracking-tight font-mono">
                                ${playbackQuality.resolution || 'Init...'}
                            </div>
                            <div class="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">
                                ${icons.activity} ${playbackQuality.droppedFrames > 0
                                    ? html`<span class="text-red-400">${playbackQuality.droppedFrames} Dropped</span>`
                                    : 'Stable'}
                            </div>
                        </div>
                        <div class="flex flex-col items-end gap-1">
                            <span
                                class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${streamType === 'live'
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
                            <div class="flex justify-between text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
                                <span>Bitrate / BW</span>
                                <span class="${bandwidthUsage > 90 ? 'text-yellow-400' : 'text-emerald-400'}">
                                    ${formatBitrate(abr.currentVideoBitrate)}
                                </span>
                            </div>
                            <div class="h-1.5 bg-slate-800 rounded-full overflow-hidden relative">
                                <!-- Bandwidth Usage Bar -->
                                <div 
                                    class="absolute top-0 left-0 bottom-0 rounded-full transition-all duration-500 ${bandwidthUsage > 90 ? 'bg-yellow-500' : 'bg-blue-500'}"
                                    style="width: ${Math.min(bandwidthUsage, 100)}%"
                                ></div>
                            </div>
                            <div class="flex justify-between mt-1">
                                <span class="text-[9px] text-slate-600 font-mono">EST: ${formatBitrate(abr.estimatedBandwidth)}</span>
                                <span class="text-[9px] text-slate-600 font-mono">${bandwidthUsage.toFixed(0)}% Load</span>
                            </div>
                        </div>

                        <!-- Buffer Health -->
                        <div>
                            <div class="flex justify-between text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
                                <span>Buffer</span>
                                <span class="${buffer.seconds < 5 ? 'text-red-400' : 'text-emerald-400'}">
                                    ${buffer.seconds.toFixed(1)}s
                                </span>
                            </div>
                            <div class="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                    class="h-full rounded-full transition-all duration-300 ${bufferColorClass}"
                                    style="width: ${bufferHealth}%"
                                ></div>
                            </div>
                        </div>

                        <!-- Bottom Stats Row -->
                         <div class="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                            <div class="bg-slate-900/50 rounded p-1.5 text-center border border-white/5">
                                <div class="text-[9px] text-slate-500 font-bold uppercase">Stalls</div>
                                <div class="text-sm font-mono font-bold ${playbackQuality.totalStalls > 0 ? 'text-red-400' : 'text-slate-300'}">
                                    ${playbackQuality.totalStalls}
                                </div>
                            </div>
                            <div class="bg-slate-900/50 rounded p-1.5 text-center border border-white/5">
                                <div class="text-[9px] text-slate-500 font-bold uppercase">Latency</div>
                                <div class="text-sm font-mono font-bold text-slate-300">
                                    ${buffer.label === 'Live Latency' ? buffer.seconds.toFixed(1) + 's' : 'N/A'}
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

        import('lit-html').then(({ render }) => render(template, this));
    }
}

customElements.define('metrics-hud', MetricsHudComponent);