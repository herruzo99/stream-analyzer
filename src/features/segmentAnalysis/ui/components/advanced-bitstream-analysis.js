import * as icons from '@/ui/icons';
import { disposeChart, renderChart } from '@/ui/shared/charts/chart-renderer';
import { tooltipTriggerClasses } from '@/ui/shared/constants';
import { html, render } from 'lit-html';

class AdvancedBitstreamAnalysis extends HTMLElement {
    constructor() {
        super();
        this._data = null;
    }

    set data(val) {
        this._data = val;
        this.render();
    }

    connectedCallback() {
        this.render();
    }

    disconnectedCallback() {
        const chart = this.querySelector('#bitstream-chart');
        if (chart) disposeChart(/** @type {HTMLElement} */ (chart));
    }

    getQualityScore(bpp) {
        if (bpp === undefined || bpp === null || bpp === 0)
            return { label: 'N/A', color: 'text-slate-500' };
        if (bpp < 0.05)
            return { label: 'Low (Blocky?)', color: 'text-red-400' };
        if (bpp < 0.1) return { label: 'Fair', color: 'text-yellow-400' };
        if (bpp < 0.25) return { label: 'Good', color: 'text-blue-400' };
        return { label: 'High (Pristine)', color: 'text-emerald-400' };
    }

    createTooltip(title, description, technical) {
        const content = `
            <div class="text-left min-w-[200px]">
                <div class="font-bold text-white text-sm mb-1 border-b border-slate-600 pb-1 flex items-center gap-2">
                    ${title}
                </div>
                <div class="text-xs text-slate-300 leading-relaxed mb-2">
                    ${description}
                </div>
                ${
                    technical
                        ? `<div class="text-[10px] font-mono text-blue-200 bg-blue-900/20 p-1.5 rounded border border-blue-500/20">
                       ${technical}
                   </div>`
                        : ''
                }
            </div>
        `;
        return btoa(content);
    }

    render() {
        if (!this._data || !this._data.frames) return;

        const {
            frames,
            bpp,
            iFrameRatio,
            variability,
            gopLength,
            gopStructure,
        } = this._data;

        const bppInfo = this.getQualityScore(bpp);

        // --- Tooltip Definitions ---

        const bppTooltip = this.createTooltip(
            'Bits Per Pixel (BPP)',
            'A heuristic for video quality. Measures the amount of data allocated to each pixel per frame. Higher values generally indicate fewer compression artifacts.',
            'Formula: Bitrate / (Width × Height × FPS)'
        );

        const efficiencyTooltip = this.createTooltip(
            'Compression Efficiency',
            'The size ratio between Intra-frames (key) and Predicted-frames. A higher ratio means P-frames are significantly smaller, indicating effective temporal compression.',
            'Metric: Avg I-Frame Size / Avg P-Frame Size'
        );

        const stabilityTooltip = this.createTooltip(
            'Bitrate Variability',
            'Measures how much frame sizes fluctuate. High variability (>100%) indicates aggressive VBR, which provides better quality for complex scenes but stresses player buffers.',
            'Metric: Coefficient of Variation (StdDev / Mean)'
        );

        const gopTooltip = this.createTooltip(
            'Group of Pictures (GOP)',
            'The distance between Keyframes (IDR). Shorter GOPs allow faster seeking and error recovery. Longer GOPs improve compression efficiency at low bitrates.',
            `Detected: ${gopStructure} Structure`
        );

        // --- Metric Card Component ---

        const metricCard = (
            title,
            value,
            subtext,
            color = 'text-white',
            tooltipB64
        ) => html`
            <div
                class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 flex flex-col items-center justify-center text-center relative group hover:bg-slate-800 hover:border-slate-600 transition-all duration-200 ${tooltipTriggerClasses}"
                data-tooltip-html-b64="${tooltipB64}"
            >
                <div
                    class="absolute top-2 right-2 text-slate-600 group-hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100"
                >
                    ${icons.info}
                </div>
                <span
                    class="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5"
                    >${title}</span
                >
                <span class="text-2xl font-mono font-black ${color} mb-1"
                    >${value}</span
                >
                ${subtext
                    ? html`<span class="text-[10px] text-slate-400 font-medium"
                          >${subtext}</span
                      >`
                    : ''}
            </div>
        `;

        const template = html`
            <div class="flex flex-col gap-6 h-full">
                <!-- Top Row: Key Metrics -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
                    ${metricCard(
                        'Encoding Quality',
                        bpp ? bpp.toFixed(3) : 'N/A',
                        `Quality: ${bppInfo.label}`,
                        bppInfo.color,
                        bppTooltip
                    )}
                    ${metricCard(
                        'Efficiency',
                        (iFrameRatio || 0).toFixed(1) + 'x',
                        'I vs P Frame Size',
                        (iFrameRatio || 0) > 5
                            ? 'text-yellow-400'
                            : 'text-emerald-400',
                        efficiencyTooltip
                    )}
                    ${metricCard(
                        'Stability',
                        ((variability || 0) * 100).toFixed(0) + '%',
                        'Bitrate Variance',
                        (variability || 0) > 0.5
                            ? 'text-red-400'
                            : 'text-blue-400',
                        stabilityTooltip
                    )}
                    ${metricCard(
                        'GOP Structure',
                        (gopLength || 0).toFixed(1),
                        `${gopStructure || '?'} GOP`,
                        'text-white',
                        gopTooltip
                    )}
                </div>

                <!-- Main Chart -->
                <div
                    class="grow bg-slate-900 rounded-xl border border-slate-800 p-1 shadow-sm relative min-h-[300px] flex flex-col"
                >
                    <div
                        class="absolute top-4 left-5 z-10 flex items-center gap-2 pointer-events-none"
                    >
                        <h3
                            class="text-sm font-bold text-white flex items-center gap-2"
                        >
                            ${icons.activity} Frame Size & Type
                        </h3>
                    </div>
                    <div id="bitstream-chart" class="w-full h-full"></div>
                </div>
            </div>
        `;
        render(template, this);

        requestAnimationFrame(() => {
            const container = this.querySelector('#bitstream-chart');
            if (container) this.initChart(container, frames);
        });
    }

    initChart(container, frames) {
        const data = frames.map((f, i) => {
            let color = '#64748b';
            if (f.isKeyFrame)
                color = '#ef4444'; // I
            else if (f.type === 'P' || f.type.includes('P'))
                color = '#3b82f6'; // P
            else color = '#6366f1'; // B

            return {
                value: f.size,
                itemStyle: { color, borderRadius: [2, 2, 0, 0] },
                frameIndex: f.index,
                type: f.type,
                nalTypes: f.nalTypes,
            };
        });

        const options = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                borderColor: '#334155',
                textStyle: { color: '#f8fafc', fontSize: 11 },
                formatter: (params) => {
                    const item = params[0];
                    const f = data[item.dataIndex];
                    const typeLabel =
                        f.type === 'I' ? 'I-Frame (Key)' : `${f.type}-Frame`;
                    const nals = f.nalTypes
                        ? `NALs: [${f.nalTypes.join(', ')}]`
                        : '';

                    return `
                        <div class="mb-2 border-b border-slate-600 pb-1">
                            <span class="font-bold text-white">Frame ${f.frameIndex}</span>
                            <span class="float-right text-[10px] text-slate-400 ml-4">${nals}</span>
                        </div>
                        <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                            <span class="text-slate-400">Type:</span>
                            <span style="color:${f.itemStyle.color}; font-weight:bold;">${typeLabel}</span>
                            
                            <span class="text-slate-400">Size:</span>
                            <span class="font-mono text-cyan-400">${(f.value / 1024).toFixed(2)} KB</span>
                            
                            <span class="text-slate-400">Bits:</span>
                            <span class="font-mono text-slate-300">${(f.value * 8).toLocaleString()}</span>
                        </div>
                    `;
                },
            },
            grid: { top: 60, right: 20, bottom: 30, left: 60 },
            xAxis: {
                type: 'category',
                data: frames.map((f) => f.index),
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: { show: false },
            },
            yAxis: {
                type: 'value',
                name: 'Size (Bytes)',
                nameTextStyle: { color: '#64748b', padding: [0, 0, 0, 20] },
                splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
                axisLabel: { color: '#64748b', fontSize: 10 },
            },
            dataZoom: [{ type: 'inside', start: 0, end: 100 }],
            series: [
                {
                    type: 'bar',
                    data: data,
                    barCategoryGap: '20%',
                    large: true,
                    markLine: {
                        symbol: 'none',
                        data: [{ type: 'average', name: 'Avg' }],
                        lineStyle: {
                            color: '#94a3b8',
                            type: 'dashed',
                            opacity: 0.5,
                        },
                        label: {
                            position: 'insideEndTop',
                            formatter: 'Avg Size',
                            color: '#94a3b8',
                            fontSize: 10,
                        },
                    },
                },
            ],
        };

        renderChart(container, options);
    }
}

customElements.define('advanced-bitstream-analysis', AdvancedBitstreamAnalysis);

export const advancedBitstreamAnalysisTemplate = (bitstreamData) =>
    html`<advanced-bitstream-analysis
        .data=${bitstreamData}
    ></advanced-bitstream-analysis>`;
