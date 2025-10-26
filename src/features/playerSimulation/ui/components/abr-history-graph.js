import { html } from 'lit-html';
import { formatBitrate } from '@/ui/shared/format';

const SVG_WIDTH = 800;
const SVG_HEIGHT = 200;
const MARGIN = { top: 20, right: 20, bottom: 30, left: 70 };
const CHART_WIDTH = SVG_WIDTH - MARGIN.left - MARGIN.right;
const CHART_HEIGHT = SVG_HEIGHT - MARGIN.top - MARGIN.bottom;

export const abrHistoryGraphTemplate = (history) => {
    if (!history || history.length < 2) {
        return html`<div
            class="h-full flex items-center justify-center text-gray-500 text-sm"
        >
            Awaiting playback data for ABR graph...
        </div>`;
    }

    const maxBandwidth = Math.max(
        ...history.map((h) => h.bandwidth),
        ...history.map((h) => h.bitrate),
        1
    );
    const minTime = history[0].time;
    const maxTime = history[history.length - 1].time;
    const duration = maxTime - minTime;

    const xScale = (t) =>
        duration > 0 ? ((t - minTime) / duration) * CHART_WIDTH : 0;
    const yScale = (bw) => CHART_HEIGHT - (bw / maxBandwidth) * CHART_HEIGHT;

    const bandwidthPath = history
        .map((h) => `${xScale(h.time)},${yScale(h.bandwidth)}`)
        .join(' ');

    // Create a step-chart path for bitrate
    let bitratePath = `M${xScale(history[0].time)},${yScale(history[0].bitrate)}`;
    for (let i = 1; i < history.length; i++) {
        bitratePath += ` L${xScale(history[i].time)},${yScale(history[i - 1].bitrate)}`;
        bitratePath += ` L${xScale(history[i].time)},${yScale(history[i].bitrate)}`;
    }

    const yAxisTicks = [0, maxBandwidth / 2, maxBandwidth].map((tick) => ({
        value: tick,
        y: yScale(tick),
        label: formatBitrate(tick),
    }));

    const xAxisTicks = [minTime, minTime + duration / 2, maxTime].map(
        (tick) => ({
            value: tick,
            x: xScale(tick),
            label: `${tick.toFixed(1)}s`,
        })
    );

    return html`
        <div class="bg-gray-900/50 p-4 rounded-lg border border-gray-700/50">
            <h4 class="font-bold text-gray-300 mb-2">
                ABR & Bandwidth History
            </h4>
            <div class="flex items-center gap-4 text-xs mb-2">
                <div class="flex items-center gap-1">
                    <div class="w-3 h-3 bg-cyan-500"></div>
                    <span>Est. Bandwidth</span>
                </div>
                <div class="flex items-center gap-1">
                    <div class="w-3 h-0.5 bg-yellow-400"></div>
                    <span>Video Bitrate</span>
                </div>
            </div>
            <svg viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" class="w-full h-auto">
                <g transform="translate(${MARGIN.left},${MARGIN.top})">
                    <!-- Axes and Gridlines -->
                    ${yAxisTicks.map(
                        (tick) => html`
                            <g transform="translate(0, ${tick.y})">
                                <line
                                    x1="-5"
                                    x2="${CHART_WIDTH}"
                                    y1="0"
                                    y2="0"
                                    stroke="rgba(75, 85, 99, 0.5)"
                                ></line>
                                <text
                                    x="-10"
                                    y="4"
                                    text-anchor="end"
                                    fill="#9CA3AF"
                                    font-size="12"
                                    >${tick.label}</text
                                >
                            </g>
                        `
                    )}
                    ${xAxisTicks.map(
                        (tick) => html`
                            <g
                                transform="translate(${tick.x}, ${CHART_HEIGHT})"
                            >
                                <text
                                    x="0"
                                    y="15"
                                    text-anchor="middle"
                                    fill="#9CA3AF"
                                    font-size="12"
                                    >${tick.label}</text
                                >
                            </g>
                        `
                    )}

                    <!-- Data Paths -->
                    <polyline
                        fill="none"
                        stroke="#06b6d4"
                        stroke-width="2"
                        points="${bandwidthPath}"
                    />
                    <path
                        d="${bitratePath}"
                        fill="none"
                        stroke="#f59e0b"
                        stroke-width="2"
                    />
                </g>
            </svg>
        </div>
    `;
};
