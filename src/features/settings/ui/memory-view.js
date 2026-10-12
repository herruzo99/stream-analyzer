import { formatBytes } from '@/features/interactiveManifest/ui/components/smart-tokens.js';
import {
    MEMORY_PRESETS,
    settingsActions,
    useSettingsStore,
} from '@/state/settingsStore';
import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';
import { memoryService } from '../domain/memory-service.js';

class MemoryView extends HTMLElement {
    constructor() {
        super();
        this.stats = null;
        this.interval = null;
        this.unsubscribe = null;
    }

    connectedCallback() {
        this.updateStats();
        this.render();
        this.interval = setInterval(() => {
            this.updateStats();
            this.render();
        }, 1000);

        this.unsubscribe = useSettingsStore.subscribe(() => this.render());
    }

    disconnectedCallback() {
        if (this.interval) clearInterval(this.interval);
        if (this.unsubscribe) this.unsubscribe();
    }

    updateStats() {
        this.stats = memoryService.getStats();
    }

    handleClear(type) {
        if (type === 'network') memoryService.clearNetwork();
        if (type === 'segments') memoryService.clearSegments();
        if (type === 'decryption') memoryService.clearDecryption();
        if (type === 'all') memoryService.flushAll();
        this.updateStats();
        this.render();
    }

    handleLimitChange(key, e) {
        const val = parseInt(e.target.value, 10);
        if (!isNaN(val)) {
            settingsActions.updateSetting(key, val);
        }
    }

    handlePreset(level) {
        settingsActions.applyPreset(level);
    }

    render() {
        const { networkLogLimit, segmentCacheLimit, systemHealth } =
            useSettingsStore.getState();

        const defaultStats = {
            app: {
                segments: { count: 0, bytes: 0 },
                network: { count: 0, bytes: 0 },
                manifests: { count: 0, bytes: 0 },
                logs: { count: 0, bytes: 0 },
                totalBytes: 0,
                breakdown: {
                    mediaBuffers: 0,
                    networkBodies: 0,
                    parsedStructs: 0,
                    manifestAst: 0,
                    historyDiffs: 0,
                    logs: 0,
                    manifestRaw: 0,
                },
            },
            meta: { browserName: 'Initializing...' },
            browser: null,
        };

        const { browser, app, meta } = this.stats || defaultStats;
        const bd = app.breakdown;

        const metrics = [
            {
                label: 'Media Buffers',
                value: bd.mediaBuffers,
                color: 'bg-emerald-500',
                textColor: 'text-emerald-400',
            },
            {
                label: 'Network Bodies',
                value: bd.networkBodies,
                color: 'bg-emerald-500/10',
                textColor: 'text-emerald-200',
            },
            {
                label: 'Parsed Objects',
                value: bd.parsedStructs,
                color: 'bg-white/5',
                textColor: 'text-slate-300',
            },
            {
                label: 'Manifest AST',
                value: bd.manifestAst,
                color: 'bg-teal-500',
                textColor: 'text-teal-300',
            },
            {
                label: 'History/Diffs',
                value: bd.historyDiffs,
                color: 'bg-amber-500',
                textColor: 'text-amber-400',
            },
            {
                label: 'Logs & Meta',
                value: bd.logs + bd.manifestRaw,
                color: 'bg-slate-400',
                textColor: 'text-[#94a3b8]',
            },
        ]
            .filter((m) => m.value > 0)
            .sort((a, b) => b.value - a.value);

        // --- Visual Components ---
        const dashboardCard = (title, value, subtext, icon, colorClass) => html`
            <div class="bg-white/5 border border-white/10 rounded-3xl p-5 flex items-center gap-5 relative overflow-hidden group hover:border-emerald-400/50 transition-all">
                <div class="p-3 rounded-full bg-white/5 text-[#94a3b8] group-hover:text-[#f1f5f9] transition-colors">
                    ${icon}
                </div>
                <div>
                    <div class="text-[10px] font-bold text-[#94a3b8] mb-1">
                        ${title}
                    </div>
                    <div class="text-2xl font-mono font-bold text-[#f1f5f9]">
                        ${value}
                    </div>
                    <div class="text-xs text-[#94a3b8] mt-1">
                        ${subtext}
                    </div>
                </div>
                <div class="absolute left-0 top-4 bottom-4 w-1 rounded-r-full ${colorClass}"></div>
            </div>
        `;

        const usageBar = (current, max, colorClass) => {
            const pct = Math.min(100, (current / max) * 100);
            return html`
                <div class="h-1.5 bg-white/5 rounded-full overflow-hidden mt-3 border border-white/10">
                    <div class="h-full ${colorClass} transition-all duration-500" style="width: ${pct}%"></div>
                </div>
            `;
        };

        const cacheRow = (label, count, bytes, max, color, onDelete) => html`
            <div class="p-4 flex items-center gap-4 border-b border-white/10 last:border-0 hover:bg-white/5 transition-colors group">
                <div class="p-2 rounded-md bg-white/5 border border-white/10 text-[#94a3b8]">
                    ${icons.binary}
                </div>
                <div class="grow">
                    <div class="flex justify-between items-baseline mb-1">
                        <span class="font-bold text-[#f1f5f9] text-sm">${label}</span>
                        <span class="font-mono text-xs text-[#94a3b8]">${count} / ${max} items &bull; ${formatBytes(bytes)}</span>
                    </div>
                    ${usageBar(count, max, color)}
                </div>
                <button
                    @click=${onDelete}
                    class="p-2 bg-white/5 hover:bg-red-500/20 text-[#94a3b8] hover:text-red-400 rounded-md transition-colors border border-transparent hover:border-red-500/30"
                    title="Clear Cache"
                >
                    ${icons.trash}
                </button>
            </div>
        `;

        const rangeControl = (label, key, value, min, max, step, desc) => html`
            <div class="flex items-center gap-4 py-4 border-b border-white/10 last:border-0 group">
                <div class="grow">
                    <div class="flex items-baseline justify-between mb-1">
                        <div class="text-sm font-bold text-[#94a3b8] group-hover:text-[#f1f5f9] transition-colors">
                            ${label}
                        </div>
                        <div class="font-mono text-xs text-emerald-200 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-400/25">
                            ${value}
                        </div>
                    </div>
                    <div class="text-[10px] text-[#94a3b8] mb-3">
                        ${desc}
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="text-[10px] font-mono text-[#94a3b8]">${min}</span>
                        <input
                            type="range"
                            class="grow h-1.5 bg-white/5 rounded-md appearance-none cursor-pointer accent-emerald-400 hover:accent-[#60a5fa]"
                            .value=${value}
                            min=${min}
                            max=${max}
                            step=${step}
                            @input=${(e) => this.handleLimitChange(key, e)}
                        />
                        <span class="text-[10px] font-mono text-[#94a3b8]">${max}</span>
                    </div>
                </div>
            </div>
        `;

        const renderPresetBtn = (level, label) => {
            const p = MEMORY_PRESETS[level];
            const isMatch = p.networkLogLimit === networkLogLimit && p.segmentCacheLimit === segmentCacheLimit;
            const activeClass = 'bg-emerald-500/10 text-white border-emerald-400/25 ';
            const inactiveClass = 'bg-white/5 text-[#94a3b8] border-white/10 hover:border-slate-400 hover:text-[#f1f5f9]';

            return html`
                <button
                    @click=${() => this.handlePreset(level)}
                    class="flex-1 py-1.5 text-[10px] font-bold rounded-md border transition-all ${isMatch ? activeClass : inactiveClass}"
                >
                    ${label}
                </button>
            `;
        };

        const template = html`
            <div class="flex flex-col h-full min-h-0">
                <!-- Custom Header (was modal-frame header slot) -->
                <div class="flex items-center justify-between w-full mr-4">
                    <h2 class="text-xl font-bold text-[#f1f5f9] flex items-center gap-2">
                        ${icons.hardDrive} System Resources
                    </h2>
                    <button
                        @click=${() => this.handleClear('all')}
                        class="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-red-500/20 text-[#94a3b8] hover:text-red-400 border border-white/10 hover:border-red-500/30 rounded-md transition-all text-xs font-bold r"
                    >
                        ${icons.trash} Flush All
                    </button>
                </div>

                <div class="p-8 space-y-8">
                    <!-- Warnings -->
                    ${systemHealth.status !== 'nominal' ? html`
                        <div class="p-3 rounded-md border flex items-center gap-3 ${systemHealth.status === 'critical' ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-amber-500/20 border-amber-500/40 text-amber-400' }">
                            <div class="scale-90">${systemHealth.status === 'critical' ? icons.alertTriangle : icons.info}</div>
                            <div class="text-xs font-bold">${systemHealth.message}</div>
                        </div>
                    ` : ''}
                    
                    <!-- Live Stats -->
                    <section>
                        <div class="flex items-center justify-between mb-4">
                            <div class="flex items-center gap-2 text-[#94a3b8]">
                                ${icons.activity}
                                <h4 class="text-xs font-bold">Live Usage</h4>
                            </div>
                            ${!browser ? html`<div class="text-[10px] text-[#94a3b8] italic">Detailed Heap API unavailable in ${meta.browserName}</div>` : ''}
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            ${dashboardCard('JS Heap', browser ? formatBytes(browser.usedJSHeapSize) : 'Unavailable', browser ? `Limit: ${formatBytes(browser.jsHeapSizeLimit)}` : 'Browser security restriction', icons.cpu, 'bg-white/5')}
                            ${dashboardCard('Managed Data', formatBytes(app.totalBytes || 0), 'Application internal stores', icons.database, 'bg-emerald-500/10')}
                        </div>

                        <div class="bg-white/5 rounded-md border border-white/10 p-4">
                            <div class="text-[10px] font-bold text-[#94a3b8] mb-3">Managed Data Breakdown</div>
                            <div class="flex h-4 w-full rounded-full overflow-hidden bg-white/5 border border-white/10">
                                ${metrics.map(m => {
                    const width = (m.value / app.totalBytes) * 100;
                    return html`<div class="h-full ${m.color} hover:brightness-110 transition-all" style="width: ${width}%" title="${m.label}: ${formatBytes(m.value)}"></div>`;
                })}
                            </div>
                            <div class="flex flex-wrap gap-3 mt-3">
                                ${metrics.map(m => html`
                                    <div class="flex items-center gap-1.5">
                                        <div class="w-2 h-2 rounded-full ${m.color}"></div>
                                        <span class="text-[10px] font-bold text-[#94a3b8]">${m.label}</span>
                                        <span class="text-[10px] font-mono ${m.textColor}">${formatBytes(m.value)}</span>
                                    </div>
                                `)}
                            </div>
                        </div>
                    </section>

                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <!-- Cache Management -->
                        <section>
                            <div class="flex items-center gap-2 mb-4 text-[#94a3b8]">
                                ${icons.layers}
                                <h4 class="text-xs font-bold">Cache Management</h4>
                            </div>
                            <div class="bg-white/5 rounded-md border border-white/10 overflow-hidden">
                                ${cacheRow('Media Segments', app.segments.count, app.segments.bytes, segmentCacheLimit, 'bg-emerald-500', () => this.handleClear('segments'))}
                                ${cacheRow('Network Logs', app.network.count, app.network.bytes, networkLogLimit, 'bg-emerald-500/10', () => this.handleClear('network'))}
                                <div class="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors">
                                    <div class="p-2 rounded-md bg-white/5 border border-white/10 text-[#94a3b8]">${icons.key}</div>
                                    <div class="grow">
                                        <div class="font-bold text-[#f1f5f9] text-sm">Decryption Keys</div>
                                        <div class="text-xs text-[#94a3b8] mt-0.5">Cached EME licenses</div>
                                    </div>
                                    <div class="text-xs font-mono text-[#94a3b8] bg-white/5 px-2 py-1 rounded border border-white/10 mr-2">Sensitive Data</div>
                                    <button @click=${() => this.handleClear('decryption')} class="p-2 bg-white/5 hover:bg-red-500/20 text-[#94a3b8] hover:text-red-400 rounded-md transition-colors border border-transparent hover:border-red-500/30" title="Flush Keys">${icons.trash}</button>
                                </div>
                            </div>
                        </section>

                        <!-- Limits -->
                        <section>
                            <div class="flex items-center justify-between mb-4">
                                <div class="flex items-center gap-2 text-[#94a3b8]">
                                    ${icons.slidersHorizontal}
                                    <h4 class="text-xs font-bold">Governor Settings</h4>
                                </div>
                            </div>
                            <div class="bg-white/5 rounded-md border border-white/10 px-5 pt-5 pb-2">
                                <div class="flex gap-2 mb-6">
                                    ${renderPresetBtn('low', 'Conservative')}
                                    ${renderPresetBtn('medium', 'Balanced')}
                                    ${renderPresetBtn('high', 'Performance')}
                                </div>
                                ${rangeControl('Network Retention', 'networkLogLimit', networkLogLimit, 50, 2000, 50, 'Max HTTP requests stored in history.')}
                                ${rangeControl('Segment Cache Cap', 'segmentCacheLimit', segmentCacheLimit, 10, 500, 10, 'Max segments kept for inspection.')}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        `;

        render(template, this);
    }
}

customElements.define('settings-memory-view', MemoryView);
export const memoryViewTemplate = () => html`<settings-memory-view></settings-memory-view>`;
