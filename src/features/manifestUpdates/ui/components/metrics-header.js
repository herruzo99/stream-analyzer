import * as icons from '@/ui/icons';
import { html } from 'lit-html';

const sparkline = (data, colorClass, height = 24, width = 100) => {
    if (data.length < 2) return '';
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    const points = data
        .map((val, i) => {
            const x = (i / (data.length - 1)) * width;
            const y = height - ((val - min) / range) * height;
            return `${x},${y}`;
        })
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
        class="flex flex-col justify-between bg-slate-800/40 rounded-xl border border-slate-700/50 p-4 min-w-[160px] relative overflow-hidden hover:bg-slate-800/60 transition-colors group"
    >
        <div class="flex justify-between items-start z-10">
            <div>
                <div
                    class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 group-hover:text-slate-400 transition-colors"
                >
                    ${label}
                </div>
                <div
                    class="text-2xl font-mono font-bold text-slate-200 tracking-tight"
                >
                    ${value}
                </div>
                ${subtext
                    ? html`<div class="text-xs text-slate-400 mt-1 font-medium">
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
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-900 border-b border-slate-800 shrink-0 shadow-sm z-20"
        >
            <!-- Pulse Status -->
            <div
                class="flex items-center gap-5 bg-slate-950/50 rounded-xl border border-slate-800 p-4"
            >
                <div
                    class="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center border border-slate-700 shadow-inner relative"
                >
                    <span
                        class="${isLive
                            ? 'text-blue-400 animate-pulse scale-110'
                            : 'text-slate-500'}"
                        >${icons.activity}</span
                    >
                    ${isLive
                        ? html`<span
                              class="absolute top-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full shadow-lg shadow-emerald-500/50"
                          ></span>`
                        : ''}
                </div>
                <div>
                    <div class="text-base font-bold text-white mb-0.5">
                        Stream Pulse
                    </div>
                    <div
                        class="text-xs font-medium text-slate-400 flex items-center gap-2"
                    >
                        <span
                            class="w-2 h-2 rounded-full ${isLive
                                ? 'bg-emerald-500'
                                : 'bg-slate-600'}"
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
                'text-blue-500'
            )}
            ${statusCard(
                'Volatility',
                changeTrend[changeTrend.length - 1] || 0,
                'Latest Changes',
                changeTrend,
                'text-amber-500'
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
