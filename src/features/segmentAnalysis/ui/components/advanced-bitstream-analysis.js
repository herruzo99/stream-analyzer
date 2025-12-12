import * as icons from '@/ui/icons';
import { disposeChart, renderChart } from '@/ui/shared/charts/chart-renderer';
import { tooltipTriggerClasses } from '@/ui/shared/constants';
import { html, render } from 'lit-html';

class AdvancedBitstreamAnalysis extends HTMLElement {
    constructor() {
        super();
        this._data = null;
        this.resizeObserver = null;
        this.charts = {
            main: null,
            dist: null,
            gop: null,
        };
    }

    set data(val) {
        // 1. Input Validation
        if (!val) return;

        // 2. Reference Check
        if (this._data === val) return;

        // 3. Normalization (Handle Flattened vs Nested Summary)
        const hasNestedSummary = !!val.summary;
        const metrics = hasNestedSummary ? val.summary : val;

        // ARCHITECTURAL FIX: Removed overly aggressive stability check.
        // Previously, we skipped updates if totalFrames/gopLength matched.
        // This caused the chart to freeze when switching between uniform segments
        // (e.g., Seg 1 and Seg 2 both have 60 frames and identical GOPs but different sizes).
        // We now rely on the parent component to only pass new references when data actually changes.

        this._data = val;
        this._metrics = metrics; // Store normalized metrics for render

        // 4. Trigger Render
        if (this.isConnected) {
            this.render();
            requestAnimationFrame(() => this.updateCharts());
        }
    }

    connectedCallback() {
        this.style.display = 'block';
        this.style.height = '100%';
        this.style.width = '100%';

        if (!this.resizeObserver) {
            this.resizeObserver = new ResizeObserver(() => {
                requestAnimationFrame(() => {
                    Object.values(this.charts).forEach((chart) =>
                        chart?.resize()
                    );
                });
            });
        }

        if (this._data) {
            this.render();
            requestAnimationFrame(() => this.updateCharts());
        }
    }

    disconnectedCallback() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        ['main', 'dist', 'gop'].forEach((key) => {
            const el = this.querySelector(`#chart-${key}`);
            if (el) disposeChart(/** @type {HTMLElement} */ (el));
        });
    }

    computeDistribution(frames) {
        if (!frames.length)
            return { categories: [], dataI: [], dataP: [], dataB: [] };

        const maxSize = Math.max(...frames.map((f) => f.size));
        const bucketCount = 20;
        const bucketSize = Math.ceil(maxSize / bucketCount);

        const buckets = new Array(bucketCount)
            .fill(0)
            .map(() => ({ I: 0, P: 0, B: 0 }));
        const categories = buckets.map((_, i) => {
            const start = ((i * bucketSize) / 1024).toFixed(0);
            const end = (((i + 1) * bucketSize) / 1024).toFixed(0);
            return `${start}-${end}KB`;
        });

        frames.forEach((f) => {
            const bucketIdx = Math.min(
                Math.floor(f.size / bucketSize),
                bucketCount - 1
            );
            let type = 'B';
            if (f.isKeyFrame) type = 'I';
            else if (f.type && f.type.includes('P')) type = 'P';

            buckets[bucketIdx][type]++;
        });

        return {
            categories,
            dataI: buckets.map((b) => b.I),
            dataP: buckets.map((b) => b.P),
            dataB: buckets.map((b) => b.B),
        };
    }

    computeGopMetrics(frames) {
        const gops = [];
        let currentGop = { size: 0, frames: 0, index: 0 };
        let gopIndex = 1;

        frames.forEach((f) => {
            if (f.isKeyFrame) {
                if (currentGop.frames > 0) {
                    gops.push(currentGop);
                }
                currentGop = { size: 0, frames: 0, index: gopIndex++ };
            }
            currentGop.size += f.size;
            currentGop.frames++;
        });
        if (currentGop.frames > 0) gops.push(currentGop);

        return gops;
    }

    updateCharts() {
        if (!this._data || !this._data.frames) return;
        if (!this.resizeObserver || !this.isConnected) return;

        const frames = this._data.frames;

        // 1. Main Chart
        const mainContainer = this.querySelector('#chart-main');
        if (mainContainer) {
            this.renderMainChart(mainContainer, frames);
            try {
                this.resizeObserver.observe(mainContainer);
            } catch (_e) {
                /* ignore */
            }
        }

        // 2. Distribution Chart
        const distContainer = this.querySelector('#chart-dist');
        if (distContainer) {
            const distData = this.computeDistribution(frames);
            this.renderDistChart(distContainer, distData);
            try {
                this.resizeObserver.observe(distContainer);
            } catch (_e) {
                /* ignore */
            }
        }

        // 3. GOP Chart
        const gopContainer = this.querySelector('#chart-gop');
        if (gopContainer) {
            const gopData = this.computeGopMetrics(frames);
            if (gopData.length > 0) {
                this.renderGopChart(gopContainer, gopData);
                try {
                    this.resizeObserver.observe(gopContainer);
                } catch (_e) {
                    /* ignore */
                }
            }
        }
    }

    renderMainChart(container, frames) {
        // Map data to [index, value] for category axis
        const frameIndices = frames.map((f) => f.index);

        const mapFrameData = (typeCheck) => {
            return frames.map((f, i) => {
                if (!typeCheck(f)) return null;
                // [index, size, type, nals]
                return {
                    value: f.size,
                    meta: {
                        type: f.type,
                        nals: f.nalTypes ? f.nalTypes.join(',') : '',
                    },
                };
            });
        };

        const dataI = mapFrameData((f) => f.isKeyFrame);
        const dataP = mapFrameData(
            (f) => f.type && f.type.includes('P') && !f.isKeyFrame
        );
        const dataB = mapFrameData(
            (f) => !f.isKeyFrame && !f.type.includes('P')
        );

        const options = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                borderColor: '#334155',
                textStyle: { color: '#f8fafc', fontSize: 11 },
                formatter: (params) => {
                    const item = params.find(
                        (p) => p.value !== undefined && p.value !== null
                    );
                    if (!item) return '';

                    const idx = item.dataIndex; // Since x-axis is category, dataIndex matches frame index
                    const size = item.value;
                    const meta = item.data.meta;

                    // --- Truncate NAL list for display stability ---
                    let nalStr = meta.nals;
                    if (nalStr.length > 40) {
                        nalStr = nalStr.substring(0, 40) + '...';
                    }

                    return `
                        <div class="font-bold border-b border-slate-600 mb-1 pb-1">Frame ${idx}</div>
                        <div class="grid grid-cols-2 gap-x-4 text-xs">
                            <span class="text-slate-400">Type</span> <span class="font-mono text-white font-bold">${meta.type}</span>
                            <span class="text-slate-400">Size</span> <span class="font-mono text-cyan-400">${(size / 1024).toFixed(2)} KB</span>
                            <span class="text-slate-400">NALs</span> <span class="font-mono text-slate-300">${nalStr}</span>
                        </div>
                    `;
                },
            },
            grid: { top: 30, right: 30, bottom: 25, left: 60 },
            dataZoom: [
                { type: 'inside', start: 0, end: 100 },
                {
                    type: 'slider',
                    bottom: 0,
                    height: 16,
                    borderColor: 'transparent',
                    backgroundColor: '#1e293b',
                },
            ],
            xAxis: {
                type: 'category',
                data: frameIndices,
                name: 'Frame Index',
                nameLocation: 'middle',
                nameGap: 25,
                nameTextStyle: { color: '#64748b', fontSize: 10 },
                axisLine: { lineStyle: { color: '#475569' } },
                axisLabel: { color: '#94a3b8', fontSize: 10 },
                splitLine: { show: false },
            },
            yAxis: {
                type: 'value',
                name: 'Size (Bytes)',
                nameTextStyle: { color: '#64748b', padding: [0, 20, 0, 0] },
                axisLabel: {
                    color: '#64748b',
                    fontSize: 10,
                    formatter: (val) => `${(val / 1024).toFixed(0)}k`,
                },
                splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
            },
            series: [
                {
                    name: 'I-Frames',
                    type: 'bar',
                    data: dataI,
                    itemStyle: { color: '#ef4444' },
                    barWidth: '80%',
                    stack: 'frames',
                    z: 10,
                },
                {
                    name: 'P-Frames',
                    type: 'bar',
                    data: dataP,
                    itemStyle: { color: '#3b82f6' },
                    barWidth: '80%',
                    stack: 'frames',
                    z: 5,
                },
                {
                    name: 'B-Frames',
                    type: 'bar',
                    data: dataB,
                    itemStyle: { color: '#6366f1' },
                    barWidth: '80%',
                    stack: 'frames',
                    z: 1,
                },
            ],
        };

        renderChart(container, options);
    }

    renderDistChart(container, { categories, dataI, dataP, dataB }) {
        const options = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                borderColor: '#334155',
                textStyle: { color: '#f8fafc' },
            },
            legend: {
                data: ['I', 'P', 'B'],
                textStyle: { color: '#94a3b8', fontSize: 9 },
                bottom: 0,
                itemWidth: 8,
                itemHeight: 8,
            },
            grid: { top: 30, right: 10, bottom: 30, left: 10 },
            xAxis: {
                type: 'category',
                data: categories,
                axisLabel: { color: '#64748b', fontSize: 9, rotate: 45 },
                axisLine: { lineStyle: { color: '#475569' } },
            },
            yAxis: {
                type: 'value',
                axisLabel: {
                    color: '#64748b',
                    fontSize: 9,
                    formatter: (v) =>
                        v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v,
                },
                splitLine: { show: false },
            },
            series: [
                {
                    name: 'I',
                    type: 'bar',
                    stack: 'total',
                    data: dataI,
                    itemStyle: { color: '#ef4444' },
                },
                {
                    name: 'P',
                    type: 'bar',
                    stack: 'total',
                    data: dataP,
                    itemStyle: { color: '#3b82f6' },
                },
                {
                    name: 'B',
                    type: 'bar',
                    stack: 'total',
                    data: dataB,
                    itemStyle: { color: '#6366f1' },
                },
            ],
        };
        renderChart(container, options);
    }

    renderGopChart(container, gops) {
        const sizes = gops.map((g) => g.size);
        const lengths = gops.map((g) => g.frames);
        // Use just the index number for X-axis labels to save space
        const indices = gops.map((g) => `${g.index}`);

        const options = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                borderColor: '#334155',
                textStyle: { color: '#f8fafc', fontSize: 11 },
            },
            legend: {
                data: ['Size', 'Length'],
                textStyle: { color: '#94a3b8', fontSize: 9 },
                bottom: 0,
                itemWidth: 8,
                itemHeight: 8,
            },
            grid: { top: 30, right: 30, bottom: 30, left: 40 },
            xAxis: {
                type: 'category',
                data: indices,
                axisLabel: {
                    show: true,
                    color: '#64748b',
                    fontSize: 9,
                    interval: 'auto', // ECharts will automatically hide labels if crowded
                },
                axisLine: { lineStyle: { color: '#475569' } },
            },
            yAxis: [
                {
                    type: 'value',
                    name: 'Size',
                    position: 'left',
                    nameTextStyle: {
                        color: '#10b981',
                        fontSize: 9,
                        padding: [0, 0, 0, 10],
                    },
                    axisLabel: {
                        color: '#10b981',
                        fontSize: 9,
                        formatter: (val) => `${(val / 1024).toFixed(0)}k`,
                    },
                    splitLine: { show: false },
                },
                {
                    type: 'value',
                    name: 'Len',
                    position: 'right',
                    nameTextStyle: { color: '#f59e0b', fontSize: 9 },
                    axisLabel: {
                        color: '#f59e0b',
                        fontSize: 9,
                    },
                    splitLine: {
                        show: true,
                        lineStyle: {
                            color: '#334155',
                            type: 'dashed',
                            opacity: 0.3,
                        },
                    },
                },
            ],
            series: [
                {
                    name: 'Size',
                    type: 'line',
                    yAxisIndex: 0,
                    data: sizes,
                    smooth: true,
                    lineStyle: { color: '#10b981', width: 2 },
                    symbol: 'circle',
                    symbolSize: 4,
                    itemStyle: { color: '#10b981' },
                    areaStyle: { color: 'rgba(16, 185, 129, 0.1)' },
                },
                {
                    name: 'Length',
                    type: 'line',
                    yAxisIndex: 1,
                    data: lengths,
                    step: 'middle',
                    lineStyle: { color: '#f59e0b', width: 2, type: 'dashed' },
                    symbol: 'rect',
                    symbolSize: 4,
                    itemStyle: { color: '#f59e0b' },
                },
            ],
        };
        renderChart(container, options);
    }

    createTooltip(title, description) {
        const content = `
            <div class="text-left min-w-[200px]">
                <div class="font-bold text-white text-sm mb-1 border-b border-slate-600 pb-1 flex items-center gap-2">
                    ${title}
                </div>
                <div class="text-xs text-slate-300 leading-relaxed">
                    ${description}
                </div>
            </div>
        `;
        return btoa(content);
    }

    render() {
        if (!this._data || !this._data.frames) return;

        const summary = this._metrics || {};

        const { bpp, iFrameRatio, variability, gopLength, gopStructure } =
            summary;

        const metricCard = (
            title,
            value,
            subtext,
            color = 'text-white',
            tooltipB64
        ) => html`
            <div
                class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-3 flex flex-col justify-between relative group hover:bg-slate-800 hover:border-slate-600 transition-all duration-200 ${tooltipTriggerClasses}"
                data-tooltip-html-b64="${tooltipB64}"
            >
                <span
                    class="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 flex justify-between"
                >
                    ${title}
                    <span
                        class="text-slate-600 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >${icons.info}</span
                    >
                </span>
                <div class="flex items-baseline gap-2">
                    <span class="text-xl font-mono font-black ${color}"
                        >${value}</span
                    >
                    ${subtext
                        ? html`<span
                              class="text-[9px] text-slate-400 font-medium truncate"
                              >${subtext}</span
                          >`
                        : ''}
                </div>
            </div>
        `;

        const bppTooltip = this.createTooltip(
            'Bits Per Pixel (BPP)',
            'A quality heuristic. Formula: Bitrate / (Width × Height × FPS). Higher is usually better.'
        );
        const effTooltip = this.createTooltip(
            'I/P Ratio',
            'Ratio of average I-frame size to P-frame size. Higher values indicate more efficient inter-frame compression.'
        );
        const varTooltip = this.createTooltip(
            'Variability',
            'Bitrate variance (Standard Deviation / Mean). High variability indicates aggressive VBR.'
        );
        const gopTooltip = this.createTooltip(
            'GOP Structure',
            `Group of Pictures length. Detected structure: ${gopStructure}`
        );

        const qualityVal =
            typeof bpp === 'number' && !isNaN(bpp) ? bpp.toFixed(3) : 'N/A';
        const efficiencyVal =
            typeof iFrameRatio === 'number' && !isNaN(iFrameRatio)
                ? iFrameRatio.toFixed(1) + 'x'
                : 'N/A';
        const stabilityVal =
            typeof variability === 'number' && !isNaN(variability)
                ? (variability * 100).toFixed(0) + '%'
                : 'N/A';
        const gopVal =
            typeof gopLength === 'number' && !isNaN(gopLength)
                ? gopLength.toFixed(1)
                : 'N/A';
        const gopStructVal = gopStructure || 'Unknown';

        const template = html`
            <div class="flex flex-col gap-4 h-full">
                <!-- Top Row: Metrics -->
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
                    ${metricCard(
                        'Quality',
                        qualityVal,
                        'BPP',
                        bpp < 0.1 && bpp > 0
                            ? 'text-yellow-400'
                            : 'text-emerald-400',
                        bppTooltip
                    )}
                    ${metricCard(
                        'Efficiency',
                        efficiencyVal,
                        'I/P Ratio',
                        'text-blue-400',
                        effTooltip
                    )}
                    ${metricCard(
                        'Stability',
                        stabilityVal,
                        'Variance',
                        variability > 0.5 ? 'text-orange-400' : 'text-white',
                        varTooltip
                    )}
                    ${metricCard(
                        'GOP',
                        gopVal,
                        gopStructVal,
                        'text-purple-400',
                        gopTooltip
                    )}
                </div>

                <!-- Main Content: Layout Grid -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 grow min-h-0">
                    <!-- Left: Hero Chart (Span 2) -->
                    <div
                        class="lg:col-span-2 bg-slate-900 rounded-xl border border-slate-800 p-1 flex flex-col shadow-sm relative overflow-hidden"
                    >
                        <div
                            class="absolute top-3 left-4 z-10 pointer-events-none"
                        >
                            <h3
                                class="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"
                            >
                                ${icons.activity} Bitstream DNA
                            </h3>
                        </div>
                        <div class="grow relative">
                            <div
                                id="chart-main"
                                class="absolute inset-0 w-full h-full"
                            ></div>
                        </div>
                    </div>

                    <!-- Right: Analysis Columns -->
                    <div class="flex flex-col gap-4 min-h-0">
                        <!-- Distribution -->
                        <div
                            class="flex-1 bg-slate-900 rounded-xl border border-slate-800 p-1 flex flex-col relative overflow-hidden"
                        >
                            <div
                                class="absolute top-3 left-4 z-10 pointer-events-none"
                            >
                                <h3
                                    class="text-xs font-bold text-slate-400 uppercase tracking-wider"
                                >
                                    Size Distribution
                                </h3>
                            </div>
                            <div class="grow relative">
                                <div
                                    id="chart-dist"
                                    class="absolute inset-0 w-full h-full"
                                ></div>
                            </div>
                        </div>

                        <!-- GOP Health -->
                        <div
                            class="flex-1 bg-slate-900 rounded-xl border border-slate-800 p-1 flex flex-col relative overflow-hidden"
                        >
                            <div
                                class="absolute top-3 left-4 z-10 pointer-events-none"
                            >
                                <h3
                                    class="text-xs font-bold text-slate-400 uppercase tracking-wider"
                                >
                                    GOP Consistency
                                </h3>
                            </div>
                            <div class="grow relative">
                                <div
                                    id="chart-gop"
                                    class="absolute inset-0 w-full h-full"
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        render(template, this);
    }
}

customElements.define('advanced-bitstream-analysis', AdvancedBitstreamAnalysis);

export const advancedBitstreamAnalysisTemplate = (bitstreamData) =>
    html`<advanced-bitstream-analysis
        .data=${bitstreamData}
    ></advanced-bitstream-analysis>`;
