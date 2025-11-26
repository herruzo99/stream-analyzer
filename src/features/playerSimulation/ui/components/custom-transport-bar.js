import { html } from 'lit-html';
import { playerService } from '../../application/playerService';
import { formatPlayerTime } from '@/ui/shared/time-format';
import { eventBus } from '@/application/event-bus';

// Helper to render buffered ranges on the timeline
const renderBufferedRanges = (videoEl, duration) => {
    if (!videoEl || !duration) return [];
    const ranges = [];
    const buffered = videoEl.buffered;
    for (let i = 0; i < buffered.length; i++) {
        const start = (buffered.start(i) / duration) * 100;
        const end = (buffered.end(i) / duration) * 100;
        const width = end - start;
        ranges.push(html`
            <div
                class="absolute top-0 bottom-0 bg-slate-500/40 rounded-sm pointer-events-none"
                style="left: ${start}%; width: ${width}%"
            ></div>
        `);
    }
    return ranges;
};

export const customTransportBarTemplate = (playerState) => {
    const { currentStats, playbackState } = playerState;
    const videoEl = playerService.player?.getMediaElement();

    if (!videoEl || !currentStats) return html``;

    const currentTime = videoEl.currentTime;
    const duration = videoEl.duration;
    const isLive = !isFinite(duration);
    const progress = isLive ? 100 : (currentTime / duration) * 100;

    const handleSeek = (e) => {
        if (isLive) return; // Todo: Live seeking logic
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = Math.max(0, Math.min(1, x / rect.width));
        videoEl.currentTime = percent * duration;
    };

    return html`
        <div
            class="group absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-4 pt-8 pb-3 opacity-0 hover:opacity-100 transition-opacity duration-300 flex flex-col gap-2 z-30"
        >
            <!-- Progress Bar -->
            <div
                class="relative h-1.5 w-full bg-slate-700/50 rounded-full cursor-pointer group/slider hover:h-2.5 transition-all"
                @click=${handleSeek}
            >
                <!-- Buffer Regions -->
                ${!isLive ? renderBufferedRanges(videoEl, duration) : ''}

                <!-- Playhead Progress -->
                <div
                    class="absolute top-0 left-0 bottom-0 bg-blue-500 rounded-full relative"
                    style="width: ${progress}%"
                >
                    <div
                        class="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md scale-0 group-hover/slider:scale-100 transition-transform"
                    ></div>
                </div>
            </div>

            <!-- Controls Row -->
            <div class="flex justify-between items-center text-white">
                <div class="flex items-center gap-4">
                    <span class="font-mono text-xs font-medium"
                        >${formatPlayerTime(currentTime)} /
                        ${formatPlayerTime(duration)}</span
                    >
                    ${isLive
                        ? html`<span
                              class="text-[10px] font-bold bg-red-600 px-1.5 py-0.5 rounded animate-pulse"
                              >LIVE</span
                          >`
                        : ''}
                </div>
                <div class="text-xs text-slate-400 font-medium">
                    ${currentStats.playbackQuality.resolution}
                </div>
            </div>
        </div>
    `;
};
