import { html } from 'lit-html';

const SVG_WIDTH = 800;
const SVG_HEIGHT = 150;
const MARGIN = { top: 20, right: 20, bottom: 30, left: 70 };
const CHART_WIDTH = SVG_WIDTH - MARGIN.left - MARGIN.right;
const CHART_HEIGHT = SVG_HEIGHT - MARGIN.top - MARGIN.bottom;

export const bufferHistoryGraphTemplate = (history, bufferingGoal) => {
    if (!history || history.length < 2) {
        return html`<div
            class="h-full flex items-center justify-center text-gray-500 text-sm"
        >
            Awaiting playback data for buffer graph...
        </div>`;
    }

    const maxBuffer = Math.max(
        ...history.map((h) => h.bufferHealth),
        bufferingGoal,
        1
    );
    const minTime = history[0].time;
    const maxTime = history[history.length - 1].time;
    const duration = maxTime - minTime;

    const xScale = (t) =>
        duration > 0 ? ((t - minTime) / duration) * CHART_WIDTH : 0;
    const yScale = (b) => CHART_HEIGHT - (b / maxBuffer) * CHART_HEIGHT;

    const pathData = history
        .map((h) => `${xScale(h.time)},${yScale(h.bufferHealth)}`)
        .join(' ');

    const yAxisTicks = [0, maxBuffer / 2, maxBuffer].map((tick) => ({
        value: tick,
        y: yScale(tick),
        label: `${tick.toFixed(1)}s`,
    }));

    const xAxisTicks = [minTime, minTime + duration / 2, maxTime].map(
        (tick) => ({
            value: tick,
            x: xScale(tick),
            label: `${tick.toFixed(1)}s`,
        })
    );

    const bufferingGoalY = yScale(bufferingGoal);

    return html`
        <div class="bg-gray-900/50 p-4 rounded-lg border border-gray-700/50">
            <h4 class="font-bold text-gray-300 mb-2">Buffer Health History</h4>
            <div class="flex items-center gap-4 text-xs mb-2">
                <div class="flex items-center gap-1">
                    <div class="w-3 h-3 bg-blue-500"></div>
                    <span>Buffer Level</span>
                </div>
                <div class="flex items-center gap-1">
                    <div
                        class="w-3 h-0.5 border-t-2 border-dashed border-green-500"
                    ></div>
                    <span>Buffering Goal (${bufferingGoal}s)</span>
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

                    <!-- Buffering Goal Line -->
                    <line
                        x1="0"
                        x2="${CHART_WIDTH}"
                        y1="${bufferingGoalY}"
                        y2="${bufferingGoalY}"
                        stroke="#22c55e"
                        stroke-width="2"
                        stroke-dasharray="4 4"
                    />

                    <!-- Data Path -->
                    <polyline
                        fill="none"
                        stroke="#3b82f6"
                        stroke-width="2"
                        points="${pathData}"
                    />
                </g>
            </svg>
        </div>
    `;
};
