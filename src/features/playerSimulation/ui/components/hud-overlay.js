import { html } from 'lit-html';
import { formatBitrate } from '@/ui/shared/format';
import * as icons from '@/ui/icons';

export const hudOverlayTemplate = (stats, isVisible, stream = null) => {
    if (!isVisible || !stats) return html``;

    const { playbackQuality, abr, buffer } = stats;
    const isLive = stream?.manifest?.type === 'dynamic';
    const protocol = stream?.protocol?.toUpperCase() || 'UNK';
    
    const codec = stream?.manifest?.summary?.videoTracks?.[0]?.codecs?.[0]?.value?.split('.')[0]?.toUpperCase() || 'VIDEO';

    const bandwidthUsage =
        abr.estimatedBandwidth > 0
            ? (abr.currentVideoBitrate / abr.estimatedBandwidth) * 100
            : 0;
    
    const bufferHealthPercent = Math.min(buffer.seconds * 5, 100);

    // Dynamic Buffer Color Logic
    let bufferColorClass = '';
    if (bufferHealthPercent < 25) {
        bufferColorClass = 'bg-gradient-to-r from-red-600 to-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]';
    } else if (bufferHealthPercent < 50) {
        bufferColorClass = 'bg-gradient-to-r from-orange-600 to-orange-500';
    } else if (bufferHealthPercent < 75) {
        bufferColorClass = 'bg-gradient-to-r from-yellow-500 to-yellow-400';
    } else {
        bufferColorClass = 'bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)]';
    }

    return html`
        <div
            class="absolute top-4 left-4 z-20 pointer-events-none select-none animate-fadeIn min-w-[240px]"
        >
            <div
                class="bg-slate-950/80 backdrop-blur-md border border-white/10 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden"
            >
                <!-- Header -->
                <div
                    class="flex justify-between items-start p-4 border-b border-white/5 bg-gradient-to-r from-white/[0.03] to-transparent"
                >
                    <div>
                        <div class="text-3xl font-black text-white leading-none tracking-tight font-mono drop-shadow-md">
                            ${playbackQuality.resolution || 'N/A'}
                        </div>
                         <div class="text-[10px] font-bold text-slate-400 mt-1.5 flex items-center gap-1.5">
                             <span class="${playbackQuality.droppedFrames > 0 ? 'text-red-400' : 'text-emerald-400'}">
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
                                class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border bg-slate-800 text-slate-300 border-slate-600"
                            >
                                ${protocol}
                            </span>
                            <span
                                class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${isLive
                                    ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                    : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}"
                            >
                                ${isLive ? 'LIVE' : 'VOD'}
                            </span>
                        </div>
                         <span
                            class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-black/40 text-slate-400 border border-white/5 font-mono"
                        >
                            ${codec}
                        </span>
                    </div>
                </div>

                <!-- Metrics Area -->
                <div class="p-4 space-y-4">
                    
                    <!-- Network Stats -->
                    <div class="space-y-1.5">
                        <div class="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <span>Bitrate / Capacity</span>
                            <span class="${bandwidthUsage > 90 ? 'text-yellow-400' : 'text-cyan-400'}">
                                ${formatBitrate(abr.currentVideoBitrate)}
                            </span>
                        </div>
                        <div class="h-2 bg-slate-800 rounded-full overflow-hidden relative shadow-inner">
                            <div 
                                class="absolute top-0 left-0 bottom-0 rounded-full transition-all duration-500 ${bandwidthUsage > 90 ? 'bg-gradient-to-r from-yellow-600 to-yellow-400' : 'bg-gradient-to-r from-blue-600 to-cyan-400'}"
                                style="width: ${Math.min(bandwidthUsage, 100)}%"
                            ></div>
                        </div>
                        <div class="flex justify-between items-center">
                             <span class="text-[9px] text-slate-500 font-mono">Est: ${formatBitrate(abr.estimatedBandwidth)}</span>
                             <span class="text-[9px] text-slate-500 font-mono">${bandwidthUsage.toFixed(0)}% Utilization</span>
                        </div>
                    </div>

                    <!-- Buffer Stats -->
                    <div class="space-y-1.5">
                         <div class="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <span>Buffer Health</span>
                            <span class="${buffer.seconds < 5 ? 'text-red-400' : 'text-emerald-400'}">
                                ${buffer.seconds.toFixed(2)}s
                            </span>
                        </div>
                         <div class="h-2 bg-slate-800 rounded-full overflow-hidden relative shadow-inner">
                            <div 
                                class="absolute top-0 left-0 bottom-0 rounded-full transition-all duration-300 ${bufferColorClass}"
                                style="width: ${bufferHealthPercent}%"
                            ></div>
                        </div>
                    </div>

                    <!-- Grid Stats -->
                    <div class="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                         <div class="bg-slate-900/50 rounded-lg p-2 text-center border border-white/5">
                             <div class="text-[9px] text-slate-500 font-bold uppercase mb-0.5">Stalls</div>
                             <div class="text-base font-mono font-bold ${playbackQuality.totalStalls > 0 ? 'text-red-400' : 'text-white'}">
                                 ${playbackQuality.totalStalls}
                             </div>
                         </div>
                         <div class="bg-slate-900/50 rounded-lg p-2 text-center border border-white/5">
                             <div class="text-[9px] text-slate-500 font-bold uppercase mb-0.5">Dropped</div>
                             <div class="text-base font-mono font-bold ${playbackQuality.droppedFrames > 0 ? 'text-yellow-400' : 'text-white'}">
                                 ${playbackQuality.droppedFrames}
                             </div>
                         </div>
                    </div>

                </div>
            </div>
        </div>
    `;
};