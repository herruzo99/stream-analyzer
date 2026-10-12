import { analyzeShakaError } from '@/infrastructure/player/shaka-error';
import * as icons from '@/ui/icons';
import { formatBitrate } from '@/ui/shared/format';
import { html } from 'lit-html';

export const hudOverlayTemplate = (
    stats,
    isVisible,
    stream = null,
    error = null,
    retryCount = 0,
    isAutoResetEnabled = false
) => {
    if (!isVisible) return html``;

    // Error Overlay
    if (error) {
        const errInfo = analyzeShakaError(error);
        const retryMessage =
            isAutoResetEnabled && retryCount > 0
                ? html`<div
                      class="mt-4 text-xs text-amber-400 font-mono animate-pulse flex items-center justify-center gap-2"
                  >
                      ${icons.refresh} Auto-Retrying (${retryCount}/5)...
                  </div>`
                : html``;

        return html`
            <div
                class="absolute inset-0 flex flex-col items-center justify-center bg-white/5 p-6 z-40"
            >
                <div
                    class="bg-white/5 border border-red-500/30 rounded-md p-6 max-w-md w-full shadow-red-500/20 relative overflow-hidden"
                >
                    <div
                        class="absolute top-0 left-0 right-0 h-1 bg-red-500"
                    ></div>
                    <div class="flex items-center gap-3 mb-4">
                        <div
                            class="p-2 bg-red-500/20 rounded-md text-red-400 border border-red-500/20"
                        >
                            ${icons.alertTriangle}
                        </div>
                        <div class="flex-1 min-w-0">
                            <h3
                                class="text-slate-100 font-bold text-lg truncate leading-tight"
                            >
                                ${errInfo.title}
                            </h3>
                            <div class="flex gap-2 mt-1">
                                <span
                                    class="text-[10px] font-mono bg-white/5 text-slate-400 px-1.5 py-0.5 rounded border border-white/10"
                                >
                                    ${errInfo.category}
                                </span>
                                <span
                                    class="text-[10px] font-mono bg-red-500/30 text-red-400 px-1.5 py-0.5 rounded border border-red-500/30"
                                >
                                    CODE: ${errInfo.code}
                                </span>
                            </div>
                        </div>
                    </div>
                    <p
                        class="text-slate-100 text-sm leading-relaxed mb-4"
                    >
                        ${errInfo.description}
                    </p>
                    ${errInfo.details
                        ? html`
                              <div
                                  class="bg-white/5 rounded-md p-3 border border-white/10 mb-2"
                              >
                                  <div
                                      class="text-[10px] font-bold text-slate-400 mb-1"
                                  >
                                      Technical Details
                                  </div>
                                  <p
                                      class="text-xs font-mono text-red-400 break-all leading-relaxed"
                                  >
                                      ${errInfo.details}
                                  </p>
                              </div>
                          `
                        : ''}
                    ${retryMessage}
                </div>
            </div>
        `;
    }

    if (!stats) return html``;

    const { playbackQuality, abr, buffer } = stats;
    const isLive = stream?.manifest?.type === 'dynamic';
    const protocol = stream?.protocol?.toUpperCase() || 'UNK';

    const codec =
        stream?.manifest?.summary?.videoTracks?.[0]?.codecs?.[0]?.value
            ?.split('.')[0]
            ?.toUpperCase() || 'VIDEO';

    const bandwidthUsage =
        abr.estimatedBandwidth > 0
            ? (abr.currentVideoBitrate / abr.estimatedBandwidth) * 100
            : 0;

    // SAFEGUARD: Use null coalescing to prevent undefined.toFixed() crash
    const bufferValue = buffer.forwardBuffer ?? 0;
    const bufferHealthPercent = Math.min(bufferValue * 5, 100); // 20s = 100%

    // Dynamic Buffer Color Logic (flat: solid data-driven hues, no gradients)
    let bufferColorClass = 'bg-emerald-400';
    let bufferTextColor = 'text-emerald-400';

    if (bufferValue < 2) {
        // Critical (< 2s)
        bufferColorClass = 'bg-red-400';
        bufferTextColor = 'text-red-400';
    } else if (bufferValue < 5) {
        // Warning (< 5s)
        bufferColorClass = 'bg-amber-400';
        bufferTextColor = 'text-amber-400';
    } else if (bufferValue < 10) {
        // Low (< 10s)
        bufferColorClass = 'bg-amber-400';
        bufferTextColor = 'text-amber-400';
    } else {
        // Healthy
        bufferColorClass = 'bg-emerald-400';
    }

    return html`
        <div
            class="absolute top-4 left-4 z-20 pointer-events-none select-none min-w-[240px]"
        >
            <div
                class="bg-white/5 border border-white/10 rounded-md overflow-hidden"
            >
                <!-- Header -->
                <div
                    class="flex justify-between items-start p-4 border-b border-white/10 bg-white/5"
                >
                    <div>
                        <div
                            class="text-3xl font-bold text-slate-100 leading-none font-mono drop-"
                        >
                            ${playbackQuality.resolution || 'N/A'}
                        </div>
                        <div
                            class="text-[10px] font-bold text-slate-400 mt-1.5 flex items-center gap-1.5"
                        >
                            <span
                                class="${playbackQuality.droppedFrames > 0 ? 'text-red-400' : 'text-emerald-400'}"
                            >
                                ●
                            </span>
                            ${playbackQuality.droppedFrames > 0
                                ? `${playbackQuality.droppedFrames} Dropped Frames`
                                : 'Stable Playback'}
                        </div>
                    </div>
                    <div class="flex flex-col items-end gap-1.5">
                        <div class="flex gap-1">
                            <span
                                class="px-1.5 py-0.5 rounded text-[9px] font-bold border bg-white/5 text-slate-100 border-white/10"
                            >
                                ${protocol}
                            </span>
                            <span
                                class="px-1.5 py-0.5 rounded text-[9px] font-bold border ${isLive ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-emerald-500/10 text-emerald-200 border-emerald-400/25'}"
                            >
                                ${isLive ? 'LIVE' : 'VOD'}
                            </span>
                        </div>
                        <span
                            class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/5 text-slate-400 border border-white/10 font-mono"
                        >
                            ${codec}
                        </span>
                    </div>
                </div>

                <!-- Metrics Area -->
                <div class="p-4 space-y-4">
                    <!-- Network Stats -->
                    <div class="space-y-1.5">
                        <div
                            class="flex justify-between text-[10px] font-bold text-slate-400 r"
                        >
                            <span>Bitrate / Capacity</span>
                            <span
                                class="${bandwidthUsage > 90 ? 'text-amber-400' : 'text-emerald-200'}"
                            >
                                ${formatBitrate(abr.currentVideoBitrate)}
                            </span>
                        </div>
                        <div
                            class="h-2 bg-white/5 rounded-full overflow-hidden relative"
                        >
                            <div
                                class="absolute top-0 left-0 bottom-0 rounded-full transition-all duration-500 ${bandwidthUsage > 90 ? 'bg-amber-400' : 'bg-emerald-400'}"
                                style="width: ${Math.min(bandwidthUsage, 100)}%"
                            ></div>
                        </div>
                        <div class="flex justify-between items-center">
                            <span
                                class="text-[9px] text-slate-400 font-mono"
                                >Est:
                                ${formatBitrate(abr.estimatedBandwidth)}</span
                            >
                            <span
                                class="text-[9px] text-slate-400 font-mono"
                                >${bandwidthUsage.toFixed(0)}% Utilization</span
                            >
                        </div>
                    </div>

                    <!-- Buffer Stats -->
                    <div class="space-y-1.5">
                        <div
                            class="flex justify-between text-[10px] font-bold text-slate-400 mb-1 r"
                        >
                            <span>Buffer</span>
                            <span class="${bufferTextColor}">
                                ${bufferValue.toFixed(2)}s
                            </span>
                        </div>
                        <div
                            class="h-2 bg-white/5 rounded-full overflow-hidden relative"
                        >
                            <div
                                class="absolute top-0 left-0 bottom-0 rounded-full transition-all duration-300 ${bufferColorClass}"
                                style="width: ${bufferHealthPercent}%"
                            ></div>
                        </div>
                    </div>

                    <!-- Grid Stats -->
                    <div
                        class="grid grid-cols-2 gap-3 pt-2 border-t border-white/10"
                    >
                        <div
                            class="bg-white/5 rounded-md p-2 text-center border border-white/10"
                        >
                            <div
                                class="text-[9px] text-slate-400 font-bold mb-0.5"
                            >
                                Stalls
                            </div>
                            <div
                                class="text-base font-mono font-bold ${playbackQuality.totalStalls > 0 ? 'text-red-400' : 'text-slate-100'}"
                            >
                                ${playbackQuality.totalStalls}
                            </div>
                        </div>
                        <div
                            class="bg-white/5 rounded-md p-2 text-center border border-white/10"
                        >
                            <div
                                class="text-[9px] text-slate-400 font-bold mb-0.5"
                            >
                                Dropped
                            </div>
                            <div
                                class="text-base font-mono font-bold ${playbackQuality.droppedFrames > 0 ? 'text-amber-400' : 'text-slate-100'}"
                            >
                                ${playbackQuality.droppedFrames}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
};
