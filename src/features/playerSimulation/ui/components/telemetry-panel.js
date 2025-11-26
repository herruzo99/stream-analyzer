import { html } from 'lit-html';
import { formatBitrate } from '@/ui/shared/format';
import * as icons from '@/ui/icons';
import { useAnalysisStore } from '@/state/analysisStore';

const metricTile = (label, value, unit = '', status = 'neutral') => {
    const statusColors = {
        neutral: 'bg-slate-800 border-slate-700 text-white',
        good: 'bg-emerald-900/20 border-emerald-500/30 text-emerald-100',
        warn: 'bg-amber-900/20 border-amber-500/30 text-amber-100',
        bad: 'bg-red-900/20 border-red-500/30 text-red-100',
    };

    return html`
        <div
            class="p-3 rounded-lg border flex flex-col justify-between ${statusColors[
                status
            ]} transition-colors"
        >
            <span
                class="text-[10px] uppercase font-bold opacity-60 tracking-wider mb-1"
                >${label}</span
            >
            <span
                class="font-mono font-bold text-lg truncate"
                title="${value}${unit}"
            >
                ${value}<span class="text-xs opacity-60 ml-0.5 font-sans"
                    >${unit}</span
                >
            </span>
        </div>
    `;
};

export const telemetryPanelTemplate = (stats) => {
    if (!stats)
        return html`<div class="p-8 text-center text-slate-500 italic">
            Waiting for playback...
        </div>`;

    const { playbackQuality, abr, buffer, session } = stats;
    const { activeStreamId, streams } = useAnalysisStore.getState();
    const activeStream = streams.find((s) => s.id === activeStreamId);
    const isLive = activeStream?.manifest?.type === 'dynamic';

    // --- VOD vs Live Metrics Logic ---
    // For VOD, "Latency" doesn't make sense. Show "Time Remaining" instead.
    let timeMetricLabel = 'Live Latency';
    let timeMetricValue = buffer.seconds;
    let timeMetricStatus = 'neutral';

    if (!isLive) {
        timeMetricLabel = 'Remaining';
        const remaining = Math.max(0, stats.manifestTime - stats.playheadTime);
        timeMetricValue = remaining.toFixed(0);
        // Status irrelevant for VOD remaining time
    } else {
        // Live Latency Status
        if (buffer.seconds < 3) timeMetricStatus = 'bad';
        else if (buffer.seconds < 8) timeMetricStatus = 'good';
        else timeMetricStatus = 'neutral';
    }

    // Determine Statuses for other metrics
    const bufferStatus =
        buffer.forwardBuffer < 2
            ? 'bad'
            : buffer.forwardBuffer < 10
              ? 'warn'
              : 'good';
    const droppedStatus = playbackQuality.droppedFrames > 0 ? 'warn' : 'good';
    const stallStatus = playbackQuality.totalStalls > 0 ? 'bad' : 'good';
    const bandwidthStatus = abr.estimatedBandwidth > 0 ? 'good' : 'neutral';

    return html`
        <div class="space-y-6">
            <section>
                <div class="flex items-center gap-2 mb-3 text-slate-400">
                    ${icons.activity}
                    <h4 class="text-xs font-bold uppercase tracking-wider">
                        Health & Timing
                    </h4>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    ${metricTile(
                        'Buffered Ahead',
                        buffer.forwardBuffer.toFixed(2),
                        's',
                        bufferStatus
                    )}
                    ${metricTile(
                        timeMetricLabel,
                        timeMetricValue,
                        's',
                        timeMetricStatus
                    )}
                    ${metricTile(
                        'Dropped Frames',
                        playbackQuality.droppedFrames,
                        '',
                        droppedStatus
                    )}
                    ${metricTile(
                        'Stalls',
                        playbackQuality.totalStalls,
                        '',
                        stallStatus
                    )}
                </div>
            </section>

            <section>
                <div class="flex items-center gap-2 mb-3 text-slate-400">
                    ${icons.network}
                    <h4 class="text-xs font-bold uppercase tracking-wider">
                        Network & Adaptation
                    </h4>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    ${metricTile(
                        'Video Bitrate',
                        formatBitrate(abr.currentVideoBitrate)
                    )}
                    ${metricTile(
                        'Est. Bandwidth',
                        formatBitrate(abr.estimatedBandwidth),
                        '',
                        bandwidthStatus
                    )}
                    ${metricTile(
                        'Segment Load',
                        (abr.loadLatency * 1000).toFixed(0),
                        'ms'
                    )}
                    ${metricTile('Resolution', playbackQuality.resolution)}
                </div>
            </section>

            <section>
                <div class="flex items-center gap-2 mb-3 text-slate-400">
                    ${icons.history}
                    <h4 class="text-xs font-bold uppercase tracking-wider">
                        Session Stats
                    </h4>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    ${metricTile(
                        'Play Time',
                        session.totalPlayTime.toFixed(0),
                        's'
                    )}
                    ${metricTile(
                        'Buffering',
                        session.totalBufferingTime.toFixed(2),
                        's'
                    )}
                    ${metricTile(
                        'Decoded Frames',
                        playbackQuality.decodedFrames
                    )}
                    ${metricTile(
                        'ABR Switches',
                        abr.switchesUp + abr.switchesDown
                    )}
                </div>
            </section>
        </div>
    `;
};
