import { html } from 'lit-html';
import { formatBitrate } from '@/ui/shared/format';

export const throughputChartTemplate = (data) => {
    if (!data || data.length === 0) {
        return html`<div
            class="h-48 bg-gray-800 rounded-lg flex items-center justify-center text-gray-500"
        >
            No throughput data to display.
        </div>`;
    }

    const maxThroughput = Math.max(...data.map((d) => d.throughput), 1);
    const maxTime = Math.max(...data.map((d) => d.time), 1);

    const width = 800;
    const height = 150;
    const margin = { top: 10, right: 20, bottom: 20, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const xScale = (t) => (t / maxTime) * chartWidth;
    const yScale = (bw) => chartHeight - (bw / maxThroughput) * chartHeight;

    const pathData = data
        .map((d) => `${xScale(d.time)},${yScale(d.throughput)}`)
        .join(' ');

    const yAxisTicks = [0, maxThroughput / 2, maxThroughput].map((tick) => ({
        value: tick,
        y: yScale(tick),
        label: formatBitrate(tick),
    }));

    return html`
        <div class="bg-gray-800 p-4 rounded-lg">
            <h4 class="font-bold text-gray-300 mb-2">Throughput Over Time</h4>
            <svg viewBox="0 0 ${width} ${height}" class="w-full h-auto">
                <g transform="translate(${margin.left},${margin.top})">
                    <!-- Y-Axis Ticks and Labels -->
                    ${yAxisTicks.map(
                        (tick) => html`
                            <g transform="translate(0, ${tick.y})">
                                <line
                                    x1="-5"
                                    x2="${chartWidth}"
                                    y1="0"
                                    y2="0"
                                    stroke="rgba(75, 85, 99, 0.5)"
                                ></line>
                                <text
                                    x="-10"
                                    y="4"
                                    text-anchor="end"
                                    fill="#9CA3AF"
                                    font-size="10"
                                    >${tick.label}</text
                                >
                            </g>
                        `
                    )}

                    <!-- X-Axis Line -->
                    <line
                        x1="0"
                        x2="${chartWidth}"
                        y1="${chartHeight}"
                        y2="${chartHeight}"
                        stroke="#4B5563"
                    ></line>
                    <text
                        x="${chartWidth / 2}"
                        y="${chartHeight + 15}"
                        text-anchor="middle"
                        fill="#9CA3AF"
                        font-size="10"
                    >
                        Time (s)
                    </text>

                    <!-- Throughput Path -->
                    <polyline
                        fill="none"
                        stroke="#2563EB"
                        stroke-width="2"
                        points="${pathData}"
                    />
                </g>
            </svg>
        </div>
    `;
};
