import { uiActions, useUiStore } from '@/state/uiStore';
import '@/ui/components/virtualized-list';
import * as icons from '@/ui/icons';
import {
    disposeChart,
    renderChart,
} from '@/ui/shared/charts/chart-renderer.js';
import { tsInspectorDetailsTemplate } from '@/ui/shared/ts-renderer.js';
import { html, render } from 'lit-html';

// --- Main Panel (Inspector) ---
export const inspectorPanelTemplate = ({ data }) => {
    const { interactiveSegmentSelectedItem } = useUiStore.getState();
    const packet = interactiveSegmentSelectedItem?.item;
    return tsInspectorDetailsTemplate(packet);
};

// --- Buffer Model Chart Options ---
const createBufferChartOptions = (historyData, pid) => {
    const data = historyData.map((pt) => [pt.offset, pt.fullness]);

    return {
        backgroundColor: 'transparent',
        title: {
            text: `T-STD Buffer Fullness (PID ${pid})`,
            textStyle: { color: '#94a3b8', fontSize: 12 },
            left: 'center',
        },
        tooltip: {
            trigger: 'axis',
            formatter: (params) => {
                const pt = params[0];
                return `Offset: ${pt.value[0]}<br/>Fullness: ${pt.value[1]} B`;
            },
        },
        grid: { top: 30, bottom: 25, left: 50, right: 20 },
        xAxis: {
            type: 'value',
            name: 'Offset',
            axisLabel: { show: false }, // Hide detailed offsets for cleanliness
            splitLine: { show: false },
        },
        yAxis: {
            type: 'value',
            name: 'Bytes',
            splitLine: { lineStyle: { color: '#334155', type: 'dashed' } },
            axisLabel: { color: '#64748b' },
            max: 512, // TBn limit
        },
        series: [
            {
                type: 'line',
                showSymbol: false,
                data: data,
                lineStyle: { color: '#38bdf8', width: 1 },
                areaStyle: { color: 'rgba(56, 189, 248, 0.1)' },
                markLine: {
                    data: [{ yAxis: 512, name: 'Limit' }],
                    lineStyle: { color: '#ef4444' },
                    silent: true,
                },
            },
        ],
    };
};

// --- Advanced Structure Viewer ---

class TsStructureViewer extends HTMLElement {
    constructor() {
        super();
        this.filterPid = 'all';
        this.filteredPackets = [];
        this.stats = [];
        this._data = null;
        this.resizeObserver = null;
        this.chartContainer = null;
        this.chart = null;

        this._handleFilterClick = this._handleFilterClick.bind(this);
        this._rowRenderer = this._rowRenderer.bind(this);
        this.forceListUpdate = this.forceListUpdate.bind(this);
    }

    set data(val) {
        this._data = val;
        if (this._data) {
            this.calculateStats();
            this.applyFilter();
        }
        this.render();
    }

    connectedCallback() {
        this.classList.add(
            'block',
            'h-full',
            'w-full',
            'overflow-hidden',
            'relative',
            'bg-slate-950'
        );
        this.render();

        this.resizeObserver = new ResizeObserver(() => {
            this.forceListUpdate();
        });
        this.resizeObserver.observe(this);
    }

    disconnectedCallback() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        if (this.chartContainer) {
            disposeChart(/** @type {HTMLElement} */ (this.chartContainer));
            this.chartContainer = null;
        }
    }

    forceListUpdate() {
        const list = this.querySelector('virtualized-list');
        if (list) {
            /** @type {any} */ (list).requestUpdate();
        }
    }

    calculateStats() {
        if (!this._data || !this._data.packets) return;
        const { packets, summary } = this._data;

        const pidMap = new Map();
        packets.forEach((p) => {
            if (!pidMap.has(p.pid)) {
                pidMap.set(p.pid, {
                    pid: p.pid,
                    type: p.payloadType,
                    count: 0,
                    // --- ARCHITECTURAL UPDATE: Pull specific PID errors from summary ---
                    errors: summary?.continuityCounters?.[p.pid]?.errors || 0,
                });
            }
            pidMap.get(p.pid).count++;
        });

        this.stats = Array.from(pidMap.values()).sort(
            (a, b) => b.count - a.count
        );
    }

    applyFilter() {
        if (!this._data || !this._data.packets) return;

        if (this.filterPid === 'all') {
            this.filteredPackets = this._data.packets;
        } else {
            const targetPid = parseInt(this.filterPid, 10);
            this.filteredPackets = this._data.packets.filter(
                (p) => p.pid === targetPid
            );
        }
        this.updateChart();
    }

    updateChart() {
        if (!this._data?.summary?.bufferHistory || !this.chartContainer) return;

        const bufferHistory = this._data.summary.bufferHistory;
        let targetPid = this.filterPid;

        // If 'all', pick the first PID with history (usually video/audio)
        if (targetPid === 'all') {
            targetPid = Object.keys(bufferHistory)[0];
        }

        const history = bufferHistory[targetPid];
        const containerEl = /** @type {HTMLElement} */ (this.chartContainer);

        if (history && history.length > 0) {
            renderChart(
                containerEl,
                createBufferChartOptions(history, targetPid)
            );
            containerEl.style.display = 'block';
        } else {
            containerEl.style.display = 'none';
        }
    }

    _handleFilterClick(pid) {
        this.filterPid = this.filterPid === String(pid) ? 'all' : String(pid);
        this.applyFilter();
        this.render();
    }

    _rowRenderer(p) {
        const { interactiveSegmentSelectedItem } = useUiStore.getState();
        const isSelected =
            interactiveSegmentSelectedItem?.item?.offset === p.offset;
        const handleSelect = (e) => {
            e.stopPropagation();
            uiActions.setInteractiveSegmentSelectedItem(p);
        };

        // ... (Colors logic same as previous) ...
        let typeColor = 'text-slate-500';
        let typeBg = 'bg-slate-800/20';
        let typeBorder = 'border-slate-700/50';

        if (p.payloadType.includes('PAT')) {
            typeColor = 'text-red-300';
            typeBg = 'bg-red-900/20';
            typeBorder = 'border-red-500/20';
        } else if (p.payloadType.includes('PMT')) {
            typeColor = 'text-yellow-300';
            typeBg = 'bg-yellow-900/20';
            typeBorder = 'border-yellow-500/20';
        } else if (p.payloadType.includes('Video')) {
            typeColor = 'text-blue-300';
            typeBg = 'bg-blue-900/20';
            typeBorder = 'border-blue-500/20';
        } else if (p.payloadType.includes('Audio')) {
            typeColor = 'text-purple-300';
            typeBg = 'bg-purple-900/20';
            typeBorder = 'border-purple-500/20';
        } else if (p.payloadType.includes('PES')) {
            typeColor = 'text-indigo-300';
            typeBg = 'bg-indigo-900/20';
            typeBorder = 'border-indigo-500/20';
        }

        const bgClass = isSelected
            ? 'bg-blue-600/20 border-blue-500'
            : 'hover:bg-white/[0.03] border-transparent';
        const isStart = p.header.payload_unit_start_indicator.value === 1;
        const hasPcr = !!p.adaptationField?.pcr;
        const cc = p.header.continuity_counter.value;
        // --- NEW: Visualize Priority Flag ---
        const isPriority = p.header.transport_priority?.value === 1;

        return html`
            <div
                @click=${handleSelect}
                class="grid grid-cols-[60px_50px_140px_40px_1fr] gap-2 items-center px-3 h-[28px] cursor-pointer text-xs font-mono border-l-2 transition-colors ${bgClass}"
            >
                <span class="opacity-50 text-[10px]"
                    >${p.offset
                        .toString(16)
                        .toUpperCase()
                        .padStart(6, '0')}</span
                >
                <span class="font-bold ${typeColor}">${p.pid}</span>
                <div class="flex items-center gap-2 min-w-0">
                    <span
                        class="truncate px-1.5 py-0.5 rounded text-[10px] ${typeBg} ${typeColor} border ${typeBorder} w-full text-center block"
                        >${p.payloadType}</span
                    >
                </div>
                <span class="text-center text-slate-400">${cc}</span>
                <div class="flex gap-1 justify-end opacity-80">
                    ${isStart
                        ? html`<span
                              class="text-[9px] bg-emerald-500/20 text-emerald-400 px-1 rounded font-bold border border-emerald-500/30"
                              >PUSI</span
                          >`
                        : ''}
                    ${hasPcr
                        ? html`<span
                              class="text-[9px] bg-cyan-500/20 text-cyan-300 px-1 rounded font-bold border border-cyan-500/30"
                              >PCR</span
                          >`
                        : ''}
                    ${isPriority
                        ? html`<span
                              class="text-[9px] bg-amber-500/20 text-amber-400 px-1 rounded font-bold border border-amber-500/30"
                              >PRI</span
                          >`
                        : ''}
                </div>
            </div>
        `;
    }

    render() {
        if (!this._data) return;

        const { totalPackets, pcrList } = this._data.summary;
        const displayedCount = this.filteredPackets.length;
        const headerClass =
            'grid grid-cols-[60px_50px_140px_40px_1fr] gap-2 px-3 py-2 bg-slate-900 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider select-none z-10';

        // --- NEW: PCR Stats in header ---
        const pcrStats = pcrList || {
            interval: { min: 'N/A', max: 'N/A', avg: 'N/A' },
        };

        const template = html`
            <div
                class="flex flex-col h-full w-full overflow-hidden bg-slate-950 border-r border-slate-800"
            >
                <!-- Dashboard Header -->
                <div
                    class="shrink-0 p-4 bg-slate-900 border-b border-slate-800 space-y-3 shadow-sm z-20"
                >
                    <div class="flex justify-between items-start">
                        <div>
                            <h3
                                class="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wider mb-1"
                            >
                                ${icons.layout} Stream Composition
                            </h3>
                            <span
                                class="text-[10px] text-slate-500 font-mono bg-black/20 px-2 py-0.5 rounded border border-slate-800"
                            >
                                ${displayedCount.toLocaleString()} /
                                ${totalPackets.toLocaleString()} Packets
                            </span>
                        </div>
                        <div
                            class="flex gap-4 text-[10px] text-slate-400 bg-slate-800/50 px-3 py-1 rounded border border-slate-700/50"
                        >
                            <div>
                                <span
                                    class="font-bold text-slate-500 uppercase block mb-0.5"
                                    >PCR Avg</span
                                >
                                <span class="font-mono text-cyan-300"
                                    >${pcrStats.interval.avg}</span
                                >
                            </div>
                            <div class="border-l border-slate-700 pl-4">
                                <span
                                    class="font-bold text-slate-500 uppercase block mb-0.5"
                                    >PCR Range</span
                                >
                                <span class="font-mono text-slate-300"
                                    >${pcrStats.interval.min} -
                                    ${pcrStats.interval.max}</span
                                >
                            </div>
                        </div>
                    </div>

                    <!-- Stat Cards -->
                    <div class="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        ${this.stats.map((stat) => {
                            const isActive =
                                this.filterPid === String(stat.pid);
                            const pct =
                                totalPackets > 0
                                    ? (
                                          (stat.count / totalPackets) *
                                          100
                                      ).toFixed(1)
                                    : '0.0';
                            let colorClass =
                                'border-slate-700 text-slate-400 bg-slate-800/50';
                            if (isActive)
                                colorClass +=
                                    ' ring-1 ring-white/50 bg-opacity-100 border-white/20';

                            return html`
                                <button
                                    @click=${() =>
                                        this._handleFilterClick(stat.pid)}
                                    class="flex flex-col p-2 rounded border transition-all hover:scale-105 active:scale-95 min-w-[100px] text-left ${colorClass}"
                                >
                                    <div
                                        class="flex justify-between w-full mb-1"
                                    >
                                        <span
                                            class="text-[10px] font-bold uppercase opacity-70 truncate max-w-[80px]"
                                            >${stat.type}</span
                                        >
                                        <span
                                            class="text-[9px] opacity-50 font-mono"
                                            >PID ${stat.pid}</span
                                        >
                                    </div>
                                    <div class="flex items-baseline gap-1">
                                        <span
                                            class="text-lg font-bold leading-none"
                                            >${stat.count}</span
                                        >
                                        <span class="text-[10px] opacity-60"
                                            >${pct}%</span
                                        >
                                    </div>
                                    ${stat.errors > 0
                                        ? html`
                                              <div
                                                  class="mt-1 text-[9px] font-bold text-red-400 flex items-center gap-1 bg-red-900/20 px-1.5 py-0.5 rounded border border-red-500/20"
                                              >
                                                  ${icons.alertTriangle}
                                                  ${stat.errors} Errors
                                              </div>
                                          `
                                        : ''}
                                </button>
                            `;
                        })}
                    </div>
                </div>

                <!-- Buffer Chart Container -->
                <div
                    id="buffer-chart-container"
                    class="shrink-0 h-32 w-full bg-slate-900 border-b border-slate-800"
                    style="display:none;"
                ></div>

                <!-- Virtual List -->
                <div class="flex flex-col grow min-h-0 bg-slate-950 relative">
                    <div class="${headerClass}">
                        <span>Offset</span><span>PID</span><span>Type</span
                        ><span class="text-center">CC</span
                        ><span class="text-right">Flags</span>
                    </div>
                    <div class="grow relative w-full min-h-0">
                        <virtualized-list
                            .items=${this.filteredPackets}
                            .rowTemplate=${this._rowRenderer}
                            .rowHeight=${28}
                            .itemId=${(p) => p.offset}
                            class="absolute inset-0 h-full w-full"
                        ></virtualized-list>
                    </div>
                </div>
            </div>
        `;
        render(template, this);

        if (!this.chartContainer) {
            this.chartContainer = this.querySelector('#buffer-chart-container');
            this.updateChart();
        }

        requestAnimationFrame(() => this.forceListUpdate());
    }
}

customElements.define('ts-structure-viewer', TsStructureViewer);
export const structureContentTemplate = ({ data }) =>
    html`<ts-structure-viewer .data=${data}></ts-structure-viewer>`;
