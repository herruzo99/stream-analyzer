import * as icons from '@/ui/icons';
import { html } from 'lit-html';

const sparkline = (data, colorClass, height = 24, width = 100) => {
    // Ensure data is array of numbers and filter out potential non-finite values
    const safeData = data.filter(n => Number.isFinite(n));
    if (safeData.length < 2) return '';

    const max = Math.max(...safeData);
    const min = Math.min(...safeData);
    let range = max - min;

    // Prevent division by zero if flat line
    if (range === 0) range = 1;

    const points = safeData
        .map((val, i) => {
            const x = (i / (safeData.length - 1)) * width;
            // Ensure val is number before math
            const y = height - ((val - min) / range) * height;
            // Final safety check
            if (!Number.isFinite(x) || !Number.isFinite(y)) return '';
            return `${x},${y}`;
        })
        .filter(p => p !== '') // Remove any failed points
        .join(' ');

    return html`
        <svg
            width="${width}"
            height="${height}"
            class="overflow-visible opacity-50"
        >
            <polyline
                points="${points}"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="${colorClass}"
            />
        </svg>
    `;
};

const statusCard = (label, value, subtext, chartData, chartColor) => html`
    <div
        class="flex flex-col justify-between bg-white/5 rounded-md border border-white/10 p-4 min-w-[160px] relative overflow-hidden hover:bg-white/10 transition-colors group"
    >
        <div class="flex justify-between items-start z-10">
            <div>
                <div
                    class="text-xs font-bold text-slate-400 r mb-1 group-hover:text-slate-100 transition-colors"
                >
                    ${label}
                </div>
                <div
                    class="text-2xl font-mono font-bold text-slate-100"
                >
                    ${value}
                </div>
                ${subtext
        ? html`<div
                          class="text-xs text-slate-400 mt-1 font-medium"
                      >
                          ${subtext}
                      </div>`
        : ''}
            </div>
        </div>
        ${chartData
        ? html`
                  <div
                      class="absolute bottom-3 right-3 z-0 scale-110 origin-bottom-right"
                  >
                      ${sparkline(chartData, chartColor)}
                  </div>
              `
        : ''}
    </div>
`;

export const metricsHeaderTemplate = (vm) => {
    const { stats, chartData, isLive } = vm;

    const intervalTrend = chartData.map((d) => d.interval);
    const changeTrend = chartData.map((d) => d.changes);

    const statusLabel = isLive
        ? stats.count > 0
            ? 'Monitoring Active'
            : 'Waiting for Signal'
        : 'Offline / VOD';

    return html`
        <div
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-transparent shrink-0 z-20 w-full"
        >
            <!-- Pulse Status -->
            <div
                class="flex items-center gap-5 bg-white/5 rounded-md border border-white/10 p-4"
            >
                <div
                    class="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10 relative"
                >
                    <span
                        class="${isLive ? 'text-emerald-200 animate-pulse scale-110' : 'text-slate-400'}"
                        >${icons.activity}</span
                    >
                    ${isLive
            ? html`<span
                              class="absolute top-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white/10 rounded-full shadow-emerald-500/50"
                          ></span>`
            : ''}
                </div>
                <div>
                    <div
                        class="text-base font-bold text-slate-100 mb-0.5"
                    >
                        Stream Pulse
                    </div>
                    <div
                        class="text-xs font-medium text-slate-400 flex items-center gap-2"
                    >
                        <span
                            class="w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-slate-400'}"
                        ></span>
                        ${statusLabel}
                    </div>
                </div>
            </div>

            ${statusCard(
                'Update Pacing',
                `${(stats.avgInterval / 1000).toFixed(1)}s`,
                'Avg Interval',
                intervalTrend,
                'text-emerald-200'
            )}
            ${statusCard(
                'Volatility',
                changeTrend[changeTrend.length - 1] || 0,
                'Latest Changes',
                changeTrend,
                'text-amber-400'
            )}
            ${statusCard(
                'Last Sync',
                stats.lastUpdate,
                `Count: ${stats.count}`,
                null,
                null
            )}
        </div>
    `;
};
