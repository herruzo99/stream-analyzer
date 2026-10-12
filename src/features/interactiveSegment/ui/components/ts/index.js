import { isDebugMode } from '@/shared/utils/env';
import { uiActions, useUiStore } from '@/state/uiStore';
import '@/ui/components/virtualized-list';
import * as icons from '@/ui/icons';
import {
    disposeChart,
    renderChart,
} from '@/ui/shared/charts/chart-renderer.js';
import { tsInspectorDetailsTemplate } from '@/ui/shared/ts-renderer.js';
import { getPacketColorIndex } from '@/shared/constants/ts-colors.js';
import { html, render } from 'lit-html';

// --- SYNTHETIC DATA GENERATOR FOR DEBUGGING ---
function generateSyntheticDescriptorPacket() {
    const mockBaseOffset = 18800;

    // Helper to create a mock descriptor object structure matching the parser output
    const mkDesc = (tag, name, details) => ({
        tag,
        length: 0, // Mock
        name,
        details: Object.entries(details).reduce((acc, [k, v]) => {
            acc[k] = { value: v, offset: mockBaseOffset, length: 1 };
            return acc;
        }, {}),
    });

    const descriptors = [
        mkDesc(0x23, 'MultiplexBuffer Descriptor', {
            MB_buffer_size: '2048 bytes',
            TB_leak_rate: '4000 units (400 bits/s)',
        }),
        mkDesc(0x0a, 'ISO 639 Language Descriptor', {
            language: 'eng',
            audio_type: 'Clean effects',
        }),
        mkDesc(0x28, 'AVC Video Descriptor', {
            profile_idc: 100,
            constraint_set0_flag: 0,
            constraint_set1_flag: 1,
            AVC_compatible_flags: 0,
        }),
        mkDesc(0x05, 'Registration Descriptor', {
            format_identifier: '0x43554549 (CUEI)',
            additional_identification_info: 'none',
        }),
        mkDesc(0x38, 'HEVC Video Descriptor', {
            profile_space: 0,
            tier_flag: 0,
            profile_idc: 1,
            level_idc: 120,
        }),
        mkDesc(0x2a, 'AVC Timing and HRD Descriptor', {
            hrd_management_valid_flag: 1,
            picture_and_timing_info_present: 1,
            '90kHz_flag': 1,
            fixed_frame_rate_flag: 0,
        }),
    ];

    return {
        offset: mockBaseOffset,
        pid: 0x100,
        payloadType: 'DEBUG (Synthetic PMT)',
        header: {
            sync_byte: { value: 0x47 },
            transport_error_indicator: { value: 0 },
            payload_unit_start_indicator: { value: 1 },
            transport_priority: { value: 0 },
            pid: { value: 0x100 },
            transport_scrambling_control: { value: 0 },
            adaptation_field_control: { value: 1 },
            continuity_counter: { value: 0 },
        },
        psi: {
            type: 'PMT',
            pcr_pid: { value: 0x101 },
            program_descriptors: descriptors,
            streams: [
                {
                    stream_type: { value: '0x1b' },
                    elementary_PID: { value: 0x101 },
                    es_info_length: { value: 0 },
                    es_descriptors: [
                        mkDesc(0x02, 'Video Stream Descriptor', {
                            multiple_frame_rate_flag: 0,
                            frame_rate_code: 4,
                            MPEG_1_only_flag: 0,
                            profile_and_level_indication: 77,
                        }),
                    ],
                },
            ],
        },
    };
}

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
            axisLabel: { show: false },
            splitLine: { show: false },
        },
        yAxis: {
            type: 'value',
            name: 'Bytes',
            splitLine: { lineStyle: { color: '#334155', type: 'dashed' } },
            axisLabel: { color: '#64748b' },
            max: 512,
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
            'bg-white/5'
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

    calculateStats() {
        if (!this._data || !this._data.packets) return;

        const counts = new Map();
        this._data.packets.forEach((p) => {
            const pid = p.pid;
            if (!counts.has(pid)) {
                counts.set(pid, {
                    pid,
                    type: p.payloadType || 'Unknown',
                    count: 0,
                    errors: 0,
                });
            }
            const stat = counts.get(pid);
            stat.count++;
            if (p.header.transport_error_indicator.value === 1) {
                stat.errors++;
            }
        });

        this.stats = Array.from(counts.values()).sort(
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
        this.forceListUpdate();
    }

    _handleFilterClick(pid) {
        if (this.filterPid === String(pid)) {
            this.filterPid = 'all';
        } else {
            this.filterPid = String(pid);
        }
        this.applyFilter();
        this.render();
        this.updateChart();
    }

    forceListUpdate() {
        /** @type {any} */
        const list = this.querySelector('virtualized-list');
        if (list) {
            list.requestUpdate();
        }
    }

    updateChart() {
        if (!this.chartContainer) return;

        // Find a PID to show buffer for.
        // If filter is active, use that. Else use video PID if available.
        let targetPid = null;
        if (this.filterPid !== 'all') {
            targetPid = parseInt(this.filterPid, 10);
        } else if (this._data && this._data.pmt && this._data.pmt.videoPid) {
            targetPid = this._data.pmt.videoPid;
        }

        // Check if we have buffer history for this PID
        // Assuming _data.bufferHistory is { pid: [ {offset, fullness} ] }
        // If not available, hide chart.
        if (
            targetPid !== null &&
            this._data.bufferHistory &&
            this._data.bufferHistory[targetPid]
        ) {
            /** @type {HTMLElement} */ (this.chartContainer).style.display =
                'block';
            const history = this._data.bufferHistory[targetPid];
            const options = createBufferChartOptions(history, targetPid);

            renderChart(
                /** @type {HTMLElement} */(this.chartContainer),
                options
            );
        } else {
            /** @type {HTMLElement} */ (this.chartContainer).style.display =
                'none';
            disposeChart(/** @type {HTMLElement} */(this.chartContainer));
        }
    }

    _simulateDescriptors() {
        const synthetic = generateSyntheticDescriptorPacket();
        // Insert at top or replace? Let's just add to data for now.
        // Actually, let's just trigger the inspector with this packet to test rendering.
        uiActions.setInteractiveSegmentSelectedItem(synthetic);
    }

    _rowRenderer(p) {
        const { interactiveSegmentSelectedItem } = useUiStore.getState();
        const isSelected =
            interactiveSegmentSelectedItem?.item?.offset === p.offset;

        const handleSelect = (e) => {
            e.stopPropagation();
            uiActions.setInteractiveSegmentSelectedItem(p);
        };

        const handleHover = (isEnter) => {
            if (isEnter) {
                uiActions.setInteractiveSegmentHighlightedItem(p, 'Packet');
            } else {
                uiActions.setInteractiveSegmentHighlightedItem(null, null);
            }
        };

        const pType = p.payloadType || 'Unknown';
        const colorIndex = getPacketColorIndex(pType);
        // Full literal classes (ported: was CSS var names without
        // definitions; literals keep Tailwind generating the CSS).
        const CHART_TONES = [
            { text: 'text-slate-300', bg: 'bg-slate-500/10', border: 'border-slate-500/30' },
            { text: 'text-red-300', bg: 'bg-red-500/10', border: 'border-red-500/30' },
            { text: 'text-orange-300', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
            { text: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
            { text: 'text-yellow-300', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
            { text: 'text-lime-300', bg: 'bg-lime-500/10', border: 'border-lime-500/30' },
            { text: 'text-green-300', bg: 'bg-green-500/10', border: 'border-green-500/30' },
            { text: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
            { text: 'text-teal-300', bg: 'bg-teal-500/10', border: 'border-teal-500/30' },
            { text: 'text-cyan-300', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
            { text: 'text-sky-300', bg: 'bg-sky-500/10', border: 'border-sky-500/30' },
            { text: 'text-emerald-200', bg: 'bg-emerald-500/10', border: 'border-emerald-400/25' },
            { text: 'text-indigo-300', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30' },
            { text: 'text-violet-300', bg: 'bg-violet-500/10', border: 'border-violet-500/30' },
            { text: 'text-slate-300', bg: 'bg-white/5', border: 'border-white/10' },
            { text: 'text-fuchsia-300', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/30' },
            { text: 'text-pink-300', bg: 'bg-pink-500/10', border: 'border-pink-500/30' },
            { text: 'text-rose-300', bg: 'bg-rose-500/10', border: 'border-rose-500/30' },
        ];
        const tone = CHART_TONES[colorIndex] || CHART_TONES[0];
        const typeColor = tone.text;
        const typeBg = tone.bg;
        const typeBorder = tone.border;

        const bgClass = isSelected
            ? 'bg-[#3b82f6]/20 border-[#3b82f6]'
            : 'hover:bg-white/10 border-transparent';
        const isStart = p.header.payload_unit_start_indicator.value === 1;
        const hasPcr = !!p.adaptationField?.pcr;
        const cc = p.header.continuity_counter.value;
        const isPriority = p.header.transport_priority?.value === 1;

        // --- NEW: Check for Descriptors ---
        let hasDesc = false;
        if (p.psi) {
            // Check Program Descriptors
            if (
                p.psi.program_descriptors &&
                p.psi.program_descriptors.length > 0
            )
                hasDesc = true;

            // Check Elementary Stream Descriptors
            if (!hasDesc && p.psi.streams) {
                hasDesc = p.psi.streams.some(
                    (s) => s.es_descriptors && s.es_descriptors.length > 0
                );
            }

            // Check CAT/TSDT descriptors
            if (!hasDesc && p.psi.descriptors && p.psi.descriptors.length > 0)
                hasDesc = true;
        }

        // Check Adaptation Field Descriptors
        if (
            !hasDesc &&
            p.adaptationField?.extension?.af_descriptors?.length > 0
        ) {
            hasDesc = true;
        }

        return html`
            <div
                @click=${handleSelect}
                @mouseenter=${() => handleHover(true)}
                @mouseleave=${() => handleHover(false)}
                class="grid grid-cols-[60px_50px_140px_40px_1fr] gap-2 items-center px-3 h-[28px] cursor-pointer text-xs font-mono border-l-2 transition-colors ${bgClass}"
            >
                <span
                    class="opacity-50 text-[10px] text-slate-400"
                    >${p.offset
                .toString(16)
                .toUpperCase()
                .padStart(6, '0')}</span
                >
                <span class="font-bold ${typeColor}">${p.pid}</span>
                <div class="flex items-center gap-2 min-w-0">
                    <span
                        class="truncate px-1.5 py-0.5 rounded text-[10px] ${typeBg} ${typeColor} border ${typeBorder} w-full text-center block"
                        >${pType}</span
                    >
                </div>
                <span class="text-center text-slate-400"
                    >${cc}</span
                >
                <div class="flex gap-1 justify-end opacity-80">
                    ${hasDesc
                ? html`<span
                              class="text-[9px] bg-fuchsia-500/20 text-fuchsia-300 px-1 rounded font-bold border border-fuchsia-500/30"
                              title="Descriptors Present"
                              >DESC</span
                          >`
                : ''}
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

        const summary = this._data.summary || {};
        const { totalPackets = 0, pcrList } = summary;
        const displayedCount = this.filteredPackets.length;
        const headerClass =
            'grid grid-cols-[60px_50px_140px_40px_1fr] gap-2 px-3 py-2 bg-white/5 border-b border-white/10 text-[10px] font-bold text-slate-400  r select-none z-10 ';

        const pcrStats = pcrList || {
            interval: { min: 'N/A', max: 'N/A', avg: 'N/A' },
        };

        const debugButton = isDebugMode
            ? html`
                  <button
                      @click=${() => this._simulateDescriptors()}
                      class="px-2 py-1 bg-fuchsia-900/30 text-fuchsia-400 border border-fuchsia-500/30 rounded text-[10px] font-bold hover:bg-fuchsia-900/50 transition-colors ml-auto"
                      title="Simulate PSI Packet"
                  >
                      ${icons.debug} Sim Tags
                  </button>
              `
            : '';

        const template = html`
            <div
                class="flex flex-col h-full w-full overflow-hidden bg-white/5 border-r border-white/10"
            >
                <!-- Dashboard Header -->
                <div
                    class="shrink-0 p-4 bg-white/5 border-b border-white/10 space-y-3 z-20"
                >
                    <div class="flex justify-between items-start">
                        <div>
                            <h3
                                class="text-xs font-bold text-slate-100 flex items-center gap-2 r mb-1"
                            >
                                ${icons.layout} Stream Composition
                            </h3>
                            <span
                                class="text-[10px] text-slate-400 font-mono bg-white/5 px-2 py-0.5 rounded border border-white/10"
                            >
                                ${displayedCount.toLocaleString()} /
                                ${totalPackets.toLocaleString()} Packets
                            </span>
                        </div>
                        <div class="flex gap-2">
                            ${debugButton}
                            <div
                                class="flex gap-4 text-[10px] text-slate-400 bg-white/5 px-3 py-1 rounded border border-white/10"
                            >
                                <div>
                                    <span
                                        class="font-bold text-slate-400 block mb-0.5"
                                        >PCR Avg</span
                                    >
                                    <span
                                        class="font-mono text-emerald-200"
                                        >${pcrStats.interval.avg}</span
                                    >
                                </div>
                                <div
                                    class="border-l border-white/10 pl-4"
                                >
                                    <span
                                        class="font-bold text-slate-400 block mb-0.5"
                                        >PCR Range</span
                                    >
                                    <span
                                        class="font-mono text-slate-100"
                                        >${pcrStats.interval.min} -
                                        ${pcrStats.interval.max}</span
                                    >
                                </div>
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
                'border-white/10 text-slate-400 bg-white/5';
            if (isActive)
                colorClass +=
                    ' ring-1 ring-[#3b82f6] bg-white/5 border-[#3b82f6]/50 ';

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
                                            class="text-[10px] font-bold opacity-70 truncate max-w-[80px]"
                                            >${stat.type}</span
                                        >
                                        <span
                                            class="text-[9px] opacity-50 font-mono"
                                            >PID ${stat.pid}</span
                                        >
                                    </div>
                                    <div class="flex items-baseline gap-1">
                                        <span
                                            class="text-lg font-bold leading-none text-slate-100"
                                            >${stat.count}</span
                                        >
                                        <span class="text-[10px] opacity-60"
                                            >${pct}%</span
                                        >
                                    </div>
                                    ${stat.errors > 0
                    ? html`
                                              <div
                                                  class="mt-1 text-[9px] font-bold text-red-400 flex items-center gap-1 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20"
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
                    class="shrink-0 h-32 w-full bg-white/5 border-b border-white/10"
                    style="display:none;"
                ></div>

                <!-- Virtual List -->
                <div
                    class="flex flex-col grow min-h-0 bg-white/5 relative"
                >
                    <div class="${headerClass}">
                        <span>Offset</span><span>PID</span><span>Type</span
                        ><span class="text-center">CC</span
                        ><span class="text-right">Flags</span>
                    </div>
                    <div class="grow relative w-full min-h-0 custom-scrollbar">
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
