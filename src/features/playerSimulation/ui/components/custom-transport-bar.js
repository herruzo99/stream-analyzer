import { formatPlayerTime } from '@/ui/shared/time-format';
import { html } from 'lit-html';
import { playerService } from '../../application/playerService';

// Helper to calculate time from mouse position
const calculateHoverTime = (e, rect, duration, startOffset) => {
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    return startOffset + percent * duration;
};

// Helper to render buffered ranges on the timeline
const renderBufferedRanges = (videoEl, duration, seekableStart = 0) => {
    if (!videoEl || !duration) return [];
    const ranges = [];
    const buffered = videoEl.buffered;

    for (let i = 0; i < buffered.length; i++) {
        // Map buffer times to 0-100% relative to the seekable window/duration
        const start =
            Math.max(0, (buffered.start(i) - seekableStart) / duration) * 100;
        const end =
            Math.min(100, (buffered.end(i) - seekableStart) / duration) * 100;
        const width = Math.max(0, end - start);

        if (width > 0) {
            ranges.push(html`
                <div
                    class="absolute top-0 bottom-0 bg-white/20 rounded-full pointer-events-none transition-all duration-500"
                    style="left: ${start}%; width: ${width}%"
                ></div>
            `);
        }
    }
    return ranges;
};

export const customTransportBarTemplate = (playerState) => {
    const { currentStats, seekableRange } = playerState;
    const videoEl = playerService.player?.getMediaElement();

    if (!videoEl || !currentStats) return html``;

    const currentTime = videoEl.currentTime;
    const isLive = playerService.player.isLive();

    // For live streams, we use the seekable window as the timeline basis
    const seekableStart = isLive ? seekableRange.start : 0;
    const seekableEnd = isLive ? seekableRange.end : videoEl.duration;
    const timelineDuration = Math.max(1, seekableEnd - seekableStart);

    // Calculate progress percentage within the seekable window
    const progress = Math.max(
        0,
        Math.min(100, ((currentTime - seekableStart) / timelineDuration) * 100)
    );

    // --- Interaction Handlers ---
    const handleSeek = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const targetTime = calculateHoverTime(
            e,
            rect,
            timelineDuration,
            seekableStart
        );
        videoEl.currentTime = targetTime;
    };

    const handleMouseMove = (e) => {
        const bar = e.currentTarget;
        const rect = bar.getBoundingClientRect();
        const tooltip = bar.querySelector('.seek-tooltip');
        const ghost = bar.querySelector('.seek-ghost');

        if (tooltip && ghost) {
            const time = calculateHoverTime(
                e,
                rect,
                timelineDuration,
                seekableStart
            );
            const percent = ((time - seekableStart) / timelineDuration) * 100;

            // Update tooltip text
            let label = formatPlayerTime(time);
            if (isLive) {
                const behind = Math.max(0, seekableEnd - time);
                label = behind < 1 ? 'LIVE' : `-${formatPlayerTime(behind)}`;
            }
            tooltip.textContent = label;

            // Position elements
            // Clamp tooltip position to prevent overflow
            const tooltipPos = Math.max(5, Math.min(95, percent));
            tooltip.style.left = `${tooltipPos}%`;
            tooltip.style.opacity = '1';

            ghost.style.width = `${percent}%`;
            ghost.style.opacity = '1';
        }
    };

    const handleMouseLeave = (e) => {
        const bar = e.currentTarget;
        const tooltip = bar.querySelector('.seek-tooltip');
        const ghost = bar.querySelector('.seek-ghost');
        if (tooltip) tooltip.style.opacity = '0';
        if (ghost) ghost.style.opacity = '0';
    };

    const handleGoToLive = (e) => {
        e.stopPropagation();
        if (playerService.player) {
            playerService.player.goToLive();
        }
    };

    // --- Dynamic Labels ---
    const formatTimeDisplay = () => {
        if (!isLive) {
            return html`
                <span class="text-white font-bold"
                    >${formatPlayerTime(currentTime)}</span
                >
                <span class="mx-1 text-white/40">/</span>
                <span class="text-white/60"
                    >${formatPlayerTime(timelineDuration)}</span
                >
            `;
        }
        // Live Display
        const latency = Math.max(0, seekableEnd - currentTime);
        return html`
            <span class="text-white/80 font-medium">Latency:</span>
            <span
                class="ml-1 font-bold font-mono ${latency < 3
                    ? 'text-emerald-400'
                    : 'text-amber-400'}"
            >
                ${latency.toFixed(1)}s
            </span>
        `;
    };

    // Changed: Used group-hover to respond to parent container hover
    return html`
        <div
            class="absolute bottom-4 left-4 right-4 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col gap-2 pointer-events-none"
        >
            <!-- Floating Glass Capsule -->
            <!-- pointer-events-auto ensures interaction works despite wrapper being none -->
            <div
                class="bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-2xl p-3 shadow-2xl ring-1 ring-black/20 pointer-events-auto"
            >
                <!-- Upper Row: Time & Info -->
                <div class="flex justify-between items-end mb-3 px-1">
                    <div
                        class="flex items-center gap-3 text-xs tracking-wide select-none"
                    >
                        ${isLive
                            ? html`
                                  <button
                                      @click=${handleGoToLive}
                                      class="flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all ${Math.abs(
                                          seekableEnd - currentTime
                                      ) < 2
                                          ? 'bg-red-500/20 text-red-400 border border-red-500/30 cursor-default'
                                          : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 cursor-pointer border border-transparent'}"
                                  >
                                      <div
                                          class="w-1.5 h-1.5 rounded-full bg-current ${Math.abs(
                                              seekableEnd - currentTime
                                          ) < 2
                                              ? 'animate-pulse'
                                              : ''}"
                                      ></div>
                                      <span class="font-black">LIVE</span>
                                  </button>
                              `
                            : ''}
                        <div class="flex items-center">
                            ${formatTimeDisplay()}
                        </div>
                    </div>

                    <div
                        class="text-[10px] font-bold text-white/50 bg-black/20 px-2 py-0.5 rounded border border-white/5 uppercase tracking-wider"
                    >
                        ${currentStats.playbackQuality.resolution || 'AUTO'}
                    </div>
                </div>

                <!-- Interactive Progress Bar -->
                <div
                    class="relative h-2 w-full cursor-pointer group/bar py-2"
                    @click=${handleSeek}
                    @mousemove=${handleMouseMove}
                    @mouseleave=${handleMouseLeave}
                >
                    <!-- Hit Area Expansion -->
                    <div class="absolute inset-x-0 -top-2 -bottom-2"></div>

                    <!-- Tooltip (Floating) -->
                    <div
                        class="seek-tooltip absolute bottom-full mb-3 -translate-x-1/2 px-2 py-1 bg-black text-white text-[10px] font-bold font-mono rounded border border-white/20 opacity-0 transition-opacity duration-150 pointer-events-none whitespace-nowrap z-40 shadow-lg"
                    >
                        00:00
                    </div>

                    <!-- Rail -->
                    <div
                        class="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-1 bg-white/10 rounded-full overflow-hidden group-hover/bar:h-1.5 transition-all duration-200"
                    >
                        <!-- Buffered Regions -->
                        ${renderBufferedRanges(
                            videoEl,
                            timelineDuration,
                            seekableStart
                        )}
                    </div>

                    <!-- Ghost Track (Hover) -->
                    <div
                        class="seek-ghost absolute top-1/2 left-0 -translate-y-1/2 h-1 bg-white/20 rounded-l-full group-hover/bar:h-1.5 transition-all duration-75 pointer-events-none opacity-0"
                        style="width: 0%"
                    ></div>

                    <!-- Live Progress Fill -->
                    <div
                        class="absolute top-1/2 left-0 -translate-y-1/2 h-1 group-hover/bar:h-1.5 rounded-l-full transition-all duration-100 pointer-events-none flex items-center justify-end"
                        style="width: ${progress}%; background: linear-gradient(90deg, #3b82f6, #06b6d4);"
                    >
                        <!-- Glowing Thumb -->
                        <div
                            class="absolute -right-1.5 w-3 h-3 bg-white rounded-full shadow-[0_0_10px_rgba(6,182,212,0.8)] scale-0 group-hover/bar:scale-100 transition-transform duration-200 z-10"
                        ></div>
                    </div>
                </div>
            </div>
        </div>
    `;
};
