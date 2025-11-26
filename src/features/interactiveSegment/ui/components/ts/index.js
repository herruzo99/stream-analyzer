import { html, render } from 'lit-html';
import { useUiStore, uiActions } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import '@/ui/components/virtualized-list';
import { tsInspectorDetailsTemplate } from '@/ui/shared/ts-renderer.js';

// --- Main Panel (Inspector) ---

export const inspectorPanelTemplate = ({ data }) => {
    const { interactiveSegmentSelectedItem } = useUiStore.getState();
    const packet = interactiveSegmentSelectedItem?.item;
    // Use the shared TS renderer
    return tsInspectorDetailsTemplate(packet);
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

        // Observe the container resize to force virtual list updates if needed
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

        let typeColor = 'text-slate-500';
        let typeBg = 'bg-slate-800/20';
        let typeBorder = 'border-slate-700/50';

        // Packet coloring logic
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

        return html`
            <div
                @click=${handleSelect}
                class="grid grid-cols-[60px_50px_140px_40px_1fr] gap-2 items-center px-3 h-[28px] cursor-pointer text-xs font-mono border-l-2 transition-colors ${bgClass}"
                data-packet-offset="${p.offset}"
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
                    >
                        ${p.payloadType}
                    </span>
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
                    ${p.header.transport_scrambling_control.value
                        ? html`<span
                              class="text-[9px] text-amber-500 px-1"
                              title="Scrambled"
                              >🔒</span
                          >`
                        : ''}
                </div>
            </div>
        `;
    }

    render() {
        if (!this._data) return;

        const { totalPackets } = this._data.summary;
        const displayedCount = this.filteredPackets.length;

        const statCard = (stat) => {
            const isActive = this.filterPid === String(stat.pid);
            const pct =
                totalPackets > 0
                    ? ((stat.count / totalPackets) * 100).toFixed(1)
                    : '0.0';

            let colorClass = 'border-slate-700 text-slate-400 bg-slate-800/50';
            if (stat.type.includes('Video'))
                colorClass = 'border-blue-500/30 text-blue-300 bg-blue-900/20';
            else if (stat.type.includes('Audio'))
                colorClass =
                    'border-purple-500/30 text-purple-300 bg-purple-900/20';
            else if (stat.type.includes('PAT') || stat.type.includes('PMT'))
                colorClass =
                    'border-yellow-500/30 text-yellow-300 bg-yellow-900/20';

            if (isActive)
                colorClass +=
                    ' ring-1 ring-white/50 bg-opacity-100 border-white/20';

            return html`
                <button
                    @click=${() => this._handleFilterClick(stat.pid)}
                    class="flex flex-col p-2 rounded border transition-all hover:scale-105 active:scale-95 min-w-[100px] text-left ${colorClass}"
                >
                    <div class="flex justify-between w-full mb-1">
                        <span
                            class="text-[10px] font-bold uppercase opacity-70 truncate max-w-[80px]"
                            title="${stat.type}"
                            >${stat.type}</span
                        >
                        <span class="text-[9px] opacity-50 font-mono"
                            >PID ${stat.pid}</span
                        >
                    </div>
                    <div class="flex items-baseline gap-1">
                        <span class="text-lg font-bold leading-none"
                            >${stat.count}</span
                        >
                        <span class="text-[10px] opacity-60">${pct}%</span>
                    </div>
                    ${stat.errors > 0
                        ? html`<div
                              class="mt-1 text-[9px] text-red-400 flex items-center gap-1"
                          >
                              <span>●</span> ${stat.errors} CC Errs
                          </div>`
                        : ''}
                </button>
            `;
        };

        const headerClass =
            'grid grid-cols-[60px_50px_140px_40px_1fr] gap-2 px-3 py-2 bg-slate-900 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider select-none z-10';

        const template = html`
            <!-- Outer Container (fill height) -->
            <div
                class="flex flex-col h-full w-full overflow-hidden bg-slate-950 border-r border-slate-800"
            >
                <!-- Dashboard Header -->
                <div
                    class="shrink-0 p-4 bg-slate-900 border-b border-slate-800 space-y-3 shadow-sm z-20"
                >
                    <div class="flex justify-between items-center">
                        <h3
                            class="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wider"
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

                    <!-- Composition Bar -->
                    <div
                        class="flex h-1.5 w-full rounded-full overflow-hidden bg-slate-800"
                    >
                        ${this.stats.map((s) => {
                            let bg = 'bg-slate-600';
                            if (s.type.includes('Video')) bg = 'bg-blue-500';
                            else if (s.type.includes('Audio'))
                                bg = 'bg-purple-500';
                            else if (
                                s.type.includes('PAT') ||
                                s.type.includes('PMT')
                            )
                                bg = 'bg-yellow-400';
                            else if (s.type.includes('PES'))
                                bg = 'bg-indigo-500';
                            const width = (s.count / totalPackets) * 100;
                            return html`<div
                                class="${bg}"
                                style="width: ${width}%"
                                title="${s.type}: ${width.toFixed(1)}%"
                            ></div>`;
                        })}
                    </div>

                    <!-- Stat Cards -->
                    <div class="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        ${this.stats.map(statCard)}
                    </div>
                </div>

                <!-- Virtual List Container -->
                <div class="flex flex-col grow min-h-0 bg-slate-950 relative">
                    <div class="${headerClass}">
                        <span>Offset</span>
                        <span>PID</span>
                        <span>Type</span>
                        <span class="text-center">CC</span>
                        <span class="text-right">Flags</span>
                    </div>

                    <!-- Scrollable Area -->
                    <div class="grow relative w-full min-h-0">
                        ${this.filteredPackets.length > 0
                            ? html`
                                  <virtualized-list
                                      .items=${this.filteredPackets}
                                      .rowTemplate=${this._rowRenderer}
                                      .rowHeight=${28}
                                      .itemId=${(p) => p.offset}
                                      class="absolute inset-0 h-full w-full"
                                  ></virtualized-list>
                              `
                            : html`
                                  <div
                                      class="absolute inset-0 flex flex-col items-center justify-center text-slate-500 italic text-sm"
                                  >
                                      <div class="mb-2 opacity-50 scale-150">
                                          ${icons.filter}
                                      </div>
                                      <p>
                                          No packets match filter (PID:
                                          ${this.filterPid}).
                                      </p>
                                      <button
                                          @click=${() =>
                                              this._handleFilterClick(
                                                  parseInt(this.filterPid, 10)
                                              )}
                                          class="mt-4 text-blue-400 hover:underline cursor-pointer"
                                      >
                                          Clear Filter
                                      </button>
                                  </div>
                              `}
                    </div>
                </div>
            </div>
        `;
        render(template, this);

        // Force update in next frame to catch layout changes
        requestAnimationFrame(() => this.forceListUpdate());
    }
}

customElements.define('ts-structure-viewer', TsStructureViewer);

export const structureContentTemplate = ({ data }) => {
    return html`<ts-structure-viewer .data=${data}></ts-structure-viewer>`;
};
