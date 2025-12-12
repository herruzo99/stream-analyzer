import { uiActions, useUiStore } from '@/state/uiStore';
import { disposeChart, renderChart } from '@/ui/shared/charts/chart-renderer';
import { html, render } from 'lit-html';

class ComplianceScorecard extends HTMLElement {
    constructor() {
        super();
        this._data = null;
        this.unsubscribe = null;
    }

    set data(val) {
        this._data = val;
        this.render();
        this.updateCharts();
    }

    connectedCallback() {
        this.render();
        window.addEventListener('resize', this.handleResize.bind(this));

        // Subscribe to UI store to re-render or update highlights if needed
        // For chart->table we use events, for table->chart we might want to emphasize
        this.unsubscribe = useUiStore.subscribe(
            ({ highlightedComplianceCategory }) => {
                // Optional: visual effect on chart when table row is hovered
                // ECharts doesn't support easy "highlight by axis" API, so we might just
                // rely on the tooltip synchronization if we wanted to go that deep.
                // For now, we will rely on chart internal hover state for chart->table.
            }
        );
    }

    disconnectedCallback() {
        window.removeEventListener('resize', this.handleResize.bind(this));
        if (this.unsubscribe) this.unsubscribe();
        const chartContainer = /** @type {HTMLElement} */ (
            this.querySelector('#compliance-radar')
        );
        if (chartContainer) {
            disposeChart(chartContainer);
        }
    }

    handleResize() {
        // Chart renderer handles internal resize logic via Observer
    }

    updateCharts() {
        if (!this._data || this._data.categories.length === 0) return;

        const container = /** @type {HTMLElement} */ (
            this.querySelector('#compliance-radar')
        );
        if (!container) return;

        const categoriesToShow = this._data.categories.slice(0, 6);
        const indicator = categoriesToShow.map((c) => ({
            name: c.name,
            max: 100,
        }));
        const dataValues = categoriesToShow.map((c) => c.score);

        // Map category data for the tooltip
        const categoryMap = new Map();
        categoriesToShow.forEach((c) => categoryMap.set(c.name, c));

        const option = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'item',
                confine: true,
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                borderColor: '#334155',
                textStyle: { color: '#f8fafc' },
                padding: 0,
                borderWidth: 1,
                // Using custom formatter to show rich details
                formatter: (params) => {
                    // For radar, params can be complex.
                    // However, we want to show details when hovering specific points if possible.
                    // ECharts radar tooltip usually shows all axes for the series.
                    // We can format it to list the breakdown.

                    let htmlContent = `
                        <div class="p-3 min-w-[200px]">
                            <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-700 pb-1">
                                Compliance Breakdown
                            </div>
                    `;

                    categoriesToShow.forEach((cat, idx) => {
                        const scoreColor =
                            cat.score === 100
                                ? 'text-emerald-400'
                                : cat.score > 70
                                  ? 'text-yellow-400'
                                  : 'text-red-400';
                        htmlContent += `
                            <div class="mb-2 last:mb-0">
                                <div class="flex justify-between items-center">
                                    <span class="text-sm font-semibold text-slate-200">${cat.name}</span>
                                    <span class="text-sm font-mono ${scoreColor}">${cat.score}</span>
                                </div>
                                <div class="flex gap-2 mt-0.5 text-[10px] font-mono">
                                    ${cat.errors > 0 ? `<span class="text-red-400 bg-red-900/20 px-1 rounded">${cat.errors} ERR</span>` : ''}
                                    ${cat.warnings > 0 ? `<span class="text-yellow-400 bg-yellow-900/20 px-1 rounded">${cat.warnings} WARN</span>` : ''}
                                    ${cat.infos > 0 ? `<span class="text-blue-400 bg-blue-900/20 px-1 rounded">${cat.infos} INFO</span>` : ''}
                                    ${cat.issues === 0 ? '<span class="text-slate-500">No Issues</span>' : ''}
                                </div>
                            </div>
                        `;
                    });

                    htmlContent += `</div>`;
                    return htmlContent;
                },
            },
            radar: {
                indicator: indicator,
                shape: 'circle',
                splitNumber: 4,
                axisName: {
                    color: '#94a3b8',
                    backgroundColor: '#1e293b',
                    borderRadius: 3,
                    padding: [3, 5],
                    fontSize: 10,
                },
                splitLine: {
                    lineStyle: { color: 'rgba(255, 255, 255, 0.05)' },
                },
                splitArea: { show: false },
                axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } },
                triggerEvent: true, // Enable events on axes
            },
            series: [
                {
                    type: 'radar',
                    data: [
                        {
                            value: dataValues,
                            name: 'Category Score',
                            areaStyle: { color: 'rgba(59, 130, 246, 0.2)' },
                            lineStyle: { color: '#3b82f6', width: 2 },
                            itemStyle: { color: '#60a5fa' },
                        },
                    ],
                },
            ],
        };

        const handlers = {
            onMouseOver: (params) => {
                // Try to detect which axis is hovered if possible,
                // but ECharts radar hover is often series-based.
                // If the user hovers the axis label (triggerEvent: true), we get params.componentType === 'radar' && targetType === 'axisName'
                if (
                    params.componentType === 'radar' &&
                    params.targetType === 'axisLabel'
                ) {
                    // params.name contains the category name
                    uiActions.setHighlightedComplianceCategory(params.name);
                }
            },
            onMouseOut: () => {
                uiActions.setHighlightedComplianceCategory(null);
            },
        };

        // Note: We need to attach specific mouseover for axis names manually if the chart renderer doesn't expose it fully via config.
        // But renderChart supports custom handlers map.
        renderChart(container, option, handlers);

        // ECharts 'axisLabel' events are tricky. We might need to listen on the instance directly if the wrapper doesn't pass 'radar' component events.
        // However, the rich tooltip is the primary request, which is handled by formatter.
    }

    render() {
        if (!this._data) return;
        const { totalScore, label, summary } = this._data;

        let labelColor = 'text-green-400';
        let ringColor = 'text-green-500';

        if (label === 'FAIL') {
            labelColor = 'text-red-500';
            ringColor = 'text-red-600';
        } else if (label === 'WARNING') {
            labelColor = 'text-yellow-400';
            ringColor = 'text-yellow-500';
        }

        const radius = 70;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (totalScore / 100) * circumference;

        const template = html`
            <div
                class="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6 bg-slate-900 rounded-xl border border-slate-700 p-6 shadow-xl relative overflow-hidden"
            >
                <div
                    class="absolute top-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"
                ></div>

                <!-- Score Section -->
                <div
                    class="flex flex-col items-center justify-center border-r border-slate-800 pr-6 relative z-10"
                >
                    <div
                        class="relative w-40 h-40 flex items-center justify-center"
                    >
                        <svg class="w-full h-full transform -rotate-90">
                            <circle
                                cx="80"
                                cy="80"
                                r="${radius}"
                                stroke="currentColor"
                                stroke-width="8"
                                fill="transparent"
                                class="text-slate-800"
                            />
                            <circle
                                cx="80"
                                cy="80"
                                r="${radius}"
                                stroke="currentColor"
                                stroke-width="8"
                                fill="transparent"
                                stroke-dasharray="${circumference}"
                                stroke-dashoffset="${offset}"
                                stroke-linecap="round"
                                class="${ringColor} transition-all duration-1000 ease-out"
                            />
                        </svg>
                        <div class="absolute flex flex-col items-center">
                            <span class="text-5xl font-bold text-white"
                                >${totalScore}</span
                            >
                            <span
                                class="text-lg font-bold ${labelColor} uppercase tracking-widest mt-1 opacity-90"
                                >${label}</span
                            >
                        </div>
                    </div>
                </div>

                <!-- Metrics Section -->
                <div class="flex flex-col gap-4 min-w-0">
                    <div class="grid grid-cols-3 gap-4 mb-2">
                        <div
                            class="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 text-center"
                        >
                            <div class="text-2xl font-bold text-red-400">
                                ${summary.errors}
                            </div>
                            <div
                                class="text-xs text-slate-500 font-bold uppercase tracking-wider"
                            >
                                Errors
                            </div>
                        </div>
                        <div
                            class="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 text-center"
                        >
                            <div class="text-2xl font-bold text-yellow-400">
                                ${summary.warnings}
                            </div>
                            <div
                                class="text-xs text-slate-500 font-bold uppercase tracking-wider"
                            >
                                Warnings
                            </div>
                        </div>
                        <div
                            class="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 text-center"
                        >
                            <div class="text-2xl font-bold text-blue-400">
                                ${summary.info}
                            </div>
                            <div
                                class="text-xs text-slate-500 font-bold uppercase tracking-wider"
                            >
                                Notes
                            </div>
                        </div>
                    </div>
                    <div class="grow relative min-h-[200px]">
                        <div
                            id="compliance-radar"
                            class="absolute inset-0 w-full h-full"
                        ></div>
                        ${this._data.categories.length === 0
                            ? html`<div
                                  class="absolute inset-0 flex items-center justify-center text-slate-600 text-sm italic"
                              >
                                  No issues found.
                              </div>`
                            : ''}
                    </div>
                </div>
            </div>
        `;

        render(template, this);
    }
}

customElements.define('compliance-scorecard', ComplianceScorecard);
