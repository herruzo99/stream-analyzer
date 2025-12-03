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

        // Fix: Provide full default structure to prevent TS access errors on initial render
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

        // Calculate Breakdown Percentages
        // TS Note: app.breakdown is guaranteed to exist via defaultStats above
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
                color: 'bg-blue-500',
                textColor: 'text-blue-400',
            },
            {
                label: 'Parsed Objects',
                value: bd.parsedStructs,
                color: 'bg-purple-500',
                textColor: 'text-purple-400',
            },
            {
                label: 'Manifest AST',
                value: bd.manifestAst,
                color: 'bg-pink-500',
                textColor: 'text-pink-400',
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
                color: 'bg-slate-500',
                textColor: 'text-slate-400',
            },
        ]
            .filter((m) => m.value > 0)
            .sort((a, b) => b.value - a.value);

        // --- Visual Components ---

        const dashboardCard = (title, value, subtext, icon, colorClass) => html`
            <div
                class="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-5 relative overflow-hidden group shadow-sm hover:border-slate-700 transition-all"
            >
                <div
                    class="p-3 rounded-full bg-slate-800 text-slate-400 group-hover:text-white transition-colors"
                >
                    ${icon}
                </div>
                <div>
                    <div
                        class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1"
                    >
                        ${title}
                    </div>
                    <div
                        class="text-2xl font-mono font-black text-white tracking-tight"
                    >
                        ${value}
                    </div>
                    <div class="text-xs text-slate-500 mt-1">${subtext}</div>
                </div>
                <div
                    class="absolute left-0 top-4 bottom-4 w-1 rounded-r-full ${colorClass}"
                ></div>
            </div>
        `;

        const usageBar = (current, max, colorClass) => {
            const pct = Math.min(100, (current / max) * 100);
            return html`
                <div
                    class="h-1.5 bg-slate-950 rounded-full overflow-hidden mt-3 border border-slate-800/50"
                >
                    <div
                        class="h-full ${colorClass} transition-all duration-500 shadow-[0_0_8px_currentColor]"
                        style="width: ${pct}%"
                    ></div>
                </div>
            `;
        };

        const cacheRow = (label, count, bytes, max, color, onDelete) => html`
            <div
                class="p-4 flex items-center gap-4 border-b border-slate-800/50 last:border-0 hover:bg-slate-900/40 transition-colors group"
            >
                <div
                    class="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400"
                >
                    ${icons.binary}
                </div>
                <div class="grow">
                    <div class="flex justify-between items-baseline mb-1">
                        <span class="font-bold text-slate-200 text-sm"
                            >${label}</span
                        >
                        <span class="font-mono text-xs text-slate-500"
                            >${count} / ${max} items &bull;
                            ${formatBytes(bytes)}</span
                        >
                    </div>
                    ${usageBar(count, max, color)}
                </div>
                <button
                    @click=${onDelete}
                    class="p-2 bg-slate-800 hover:bg-red-900/20 text-slate-500 hover:text-red-400 rounded-lg transition-colors border border-transparent hover:border-red-900/30"
                    title="Clear Cache"
                >
                    ${icons.trash}
                </button>
            </div>
        `;

        const rangeControl = (label, key, value, min, max, step, desc) => html`
            <div
                class="flex items-center gap-4 py-4 border-b border-slate-800/50 last:border-0 group"
            >
                <div class="grow">
                    <div class="flex items-baseline justify-between mb-1">
                        <div
                            class="text-sm font-bold text-slate-300 group-hover:text-white transition-colors"
                        >
                            ${label}
                        </div>
                        <div
                            class="font-mono text-xs text-blue-400 bg-blue-900/10 px-2 py-0.5 rounded border border-blue-500/20"
                        >
                            ${value}
                        </div>
                    </div>
                    <div class="text-[10px] text-slate-500 mb-3">${desc}</div>
                    <div class="flex items-center gap-3">
                        <span class="text-[10px] font-mono text-slate-600"
                            >${min}</span
                        >
                        <input
                            type="range"
                            class="grow h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-500"
                            .value=${value}
                            min=${min}
                            max=${max}
                            step=${step}
                            @input=${(e) => this.handleLimitChange(key, e)}
                        />
                        <span class="text-[10px] font-mono text-slate-600"
                            >${max}</span
                        >
                    </div>
                </div>
            </div>
        `;

        let warningBanner = html``;
        if (systemHealth.status !== 'nominal') {
            const color =
                systemHealth.status === 'critical'
                    ? 'bg-red-900/20 border-red-500/40 text-red-200'
                    : 'bg-amber-900/20 border-amber-500/40 text-amber-200';
            const icon =
                systemHealth.status === 'critical'
                    ? icons.alertTriangle
                    : icons.info;
            warningBanner = html`
                <div
                    class="mx-8 mt-6 mb-2 p-3 rounded-lg border flex items-center gap-3 ${color} animate-fadeIn"
                >
                    <div class="scale-90">${icon}</div>
                    <div class="text-xs font-bold">${systemHealth.message}</div>
                    <button
                        @click=${() => this.handleClear('all')}
                        class="ml-auto text-[10px] bg-black/20 hover:bg-black/40 px-2 py-1 rounded font-bold uppercase tracking-wider transition-colors"
                    >
                        Flush All
                    </button>
                </div>
            `;
        }

        const renderPresetBtn = (level, label) => {
            const p = MEMORY_PRESETS[level];
            const isMatch =
                p.networkLogLimit === networkLogLimit &&
                p.segmentCacheLimit === segmentCacheLimit;

            const activeClass =
                'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-900/20';
            const inactiveClass =
                'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600 hover:text-slate-200';

            return html`
                <button
                    @click=${() => this.handlePreset(level)}
                    class="flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg border transition-all ${isMatch
                        ? activeClass
                        : inactiveClass}"
                >
                    ${label}
                </button>
            `;
        };

        const template = html`
            <div class="flex flex-col bg-slate-950 text-slate-200">
                <!-- Header Section -->
                <div class="p-8 pb-4 flex justify-between items-start">
                    <div class="flex items-center gap-3 mb-2">
                        <div
                            class="p-2 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-900/20"
                        >
                            ${icons.hardDrive}
                        </div>
                        <div>
                            <h2
                                class="text-2xl font-bold text-white leading-none"
                            >
                                System Resources
                            </h2>
                            <p class="text-sm text-slate-500 mt-1">
                                Monitor memory usage and configure retention
                                policies.
                            </p>
                        </div>
                    </div>

                    <button
                        @click=${() => this.handleClear('all')}
                        class="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-red-900/20 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-900/30 rounded-lg transition-all group"
                    >
                        ${icons.trash}
                        <span class="text-xs font-bold uppercase tracking-wider"
                            >Flush All</span
                        >
                    </button>
                </div>

                ${warningBanner}

                <div class="px-8 pb-8 pt-4 space-y-8">
                    <!-- Live Stats -->
                    <section>
                        <div class="flex items-center justify-between mb-4">
                            <div class="flex items-center gap-2 text-slate-500">
                                ${icons.activity}
                                <h4
                                    class="text-xs font-bold uppercase tracking-widest"
                                >
                                    Live Usage
                                </h4>
                            </div>
                            ${!browser
                                ? html`<div
                                      class="text-[10px] text-slate-600 italic"
                                  >
                                      Detailed Heap API unavailable in
                                      ${meta.browserName}
                                  </div>`
                                : ''}
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            ${dashboardCard(
                                'JS Heap',
                                browser
                                    ? formatBytes(browser.usedJSHeapSize)
                                    : 'Unavailable',
                                browser
                                    ? `Limit: ${formatBytes(browser.jsHeapSizeLimit)}`
                                    : `Browser security restriction`,
                                icons.cpu,
                                'bg-purple-500'
                            )}
                            ${dashboardCard(
                                'Managed Data',
                                formatBytes(app.totalBytes || 0),
                                'Application internal stores',
                                icons.database,
                                'bg-blue-500'
                            )}
                        </div>

                        <!-- Breakdown Bar (Stacked) -->
                        <div
                            class="bg-slate-900 rounded-xl border border-slate-800 p-4"
                        >
                            <div
                                class="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3"
                            >
                                Managed Data Breakdown
                            </div>
                            <div
                                class="flex h-4 w-full rounded-full overflow-hidden bg-slate-950 border border-slate-800/50"
                            >
                                ${metrics.map((m) => {
                                    const width =
                                        (m.value / app.totalBytes) * 100;
                                    return html`<div
                                        class="h-full ${m.color} hover:brightness-110 transition-all"
                                        style="width: ${width}%"
                                        title="${m.label}: ${formatBytes(
                                            m.value
                                        )}"
                                    ></div>`;
                                })}
                            </div>
                            <div class="flex flex-wrap gap-3 mt-3">
                                ${metrics.map(
                                    (m) => html`
                                        <div class="flex items-center gap-1.5">
                                            <div
                                                class="w-2 h-2 rounded-full ${m.color}"
                                            ></div>
                                            <span
                                                class="text-[10px] font-bold text-slate-400 uppercase"
                                                >${m.label}</span
                                            >
                                            <span
                                                class="text-[10px] font-mono ${m.textColor}"
                                                >${formatBytes(m.value)}</span
                                            >
                                        </div>
                                    `
                                )}
                            </div>
                        </div>
                    </section>

                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <!-- Cache Management -->
                        <section>
                            <div
                                class="flex items-center gap-2 mb-4 text-slate-500"
                            >
                                ${icons.layers}
                                <h4
                                    class="text-xs font-bold uppercase tracking-widest"
                                >
                                    Cache Management
                                </h4>
                            </div>
                            <div
                                class="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden"
                            >
                                ${cacheRow(
                                    'Media Segments',
                                    app.segments.count,
                                    app.segments.bytes,
                                    segmentCacheLimit,
                                    'bg-emerald-500',
                                    () => this.handleClear('segments')
                                )}
                                ${cacheRow(
                                    'Network Logs',
                                    app.network.count,
                                    app.network.bytes,
                                    networkLogLimit,
                                    'bg-blue-500',
                                    () => this.handleClear('network')
                                )}
                                <div
                                    class="p-4 flex items-center gap-4 hover:bg-slate-900/40 transition-colors"
                                >
                                    <div
                                        class="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-500"
                                    >
                                        ${icons.key}
                                    </div>
                                    <div class="grow">
                                        <div
                                            class="font-bold text-slate-200 text-sm"
                                        >
                                            Decryption Keys
                                        </div>
                                        <div
                                            class="text-xs text-slate-500 mt-0.5"
                                        >
                                            Cached EME licenses
                                        </div>
                                    </div>
                                    <div
                                        class="text-xs font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-800 mr-2"
                                    >
                                        Sensitive Data
                                    </div>
                                    <button
                                        @click=${() =>
                                            this.handleClear('decryption')}
                                        class="p-2 bg-slate-800 hover:bg-red-900/20 text-slate-500 hover:text-red-400 rounded-lg transition-colors border border-transparent hover:border-red-900/30"
                                        title="Flush Keys"
                                    >
                                        ${icons.trash}
                                    </button>
                                </div>
                            </div>
                        </section>

                        <!-- Limits -->
                        <section>
                            <div class="flex items-center justify-between mb-4">
                                <div
                                    class="flex items-center gap-2 text-slate-500"
                                >
                                    ${icons.slidersHorizontal}
                                    <h4
                                        class="text-xs font-bold uppercase tracking-widest"
                                    >
                                        Governor Settings
                                    </h4>
                                </div>
                            </div>
                            <div
                                class="bg-slate-900/50 rounded-xl border border-slate-800 px-5 pt-5 pb-2"
                            >
                                <div class="flex gap-2 mb-6">
                                    ${renderPresetBtn('low', 'Conservative')}
                                    ${renderPresetBtn('medium', 'Balanced')}
                                    ${renderPresetBtn('high', 'Performance')}
                                </div>
                                ${rangeControl(
                                    'Network Retention',
                                    'networkLogLimit',
                                    networkLogLimit,
                                    50,
                                    2000,
                                    50,
                                    'Max HTTP requests stored in history.'
                                )}
                                ${rangeControl(
                                    'Segment Cache Cap',
                                    'segmentCacheLimit',
                                    segmentCacheLimit,
                                    10,
                                    500,
                                    10,
                                    'Max segments kept for inspection.'
                                )}
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
export const memoryViewTemplate = () =>
    html`<settings-memory-view></settings-memory-view>`;
