import { html, render } from 'lit-html';
import { renderChart, disposeChart } from '@/ui/shared/charts/chart-renderer';
import * as icons from '@/ui/icons';

class ComplianceScorecard extends HTMLElement {
    constructor() {
        super();
        this._data = null;
    }

    set data(val) {
        this._data = val;
        this.render();
        this.updateCharts();
    }

    connectedCallback() {
        this.render();
        window.addEventListener('resize', this.handleResize.bind(this));
    }

    disconnectedCallback() {
        window.removeEventListener('resize', this.handleResize.bind(this));
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

        const option = {
            backgroundColor: 'transparent',
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

        renderChart(container, option);
    }

    render() {
        // ... (render method remains unchanged from previous, reusing logic)
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
