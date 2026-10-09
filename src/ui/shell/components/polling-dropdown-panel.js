import { formattedOptionsDropdownTemplate } from '@/features/playerSimulation/ui/components/formatted-options-dropdown.js';
import { dashFeatureDefinitions } from '@/infrastructure/parsing/dash/feature-definitions';
import { hlsFeatureDefinitions } from '@/infrastructure/parsing/hls/feature-definitions';
import { analysisActions, useAnalysisStore } from '@/state/analysisStore';
import { uiActions, useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { closeDropdown, toggleDropdown } from '@/ui/services/dropdownService';
import { toggleAllPolling } from '@/ui/services/streamActionsService';
import { html } from 'lit-html';

import { segmentPollingSelectorTemplate } from './segment-polling-selector';
import '@/ui/core/BaseDropdown.js';

const INACTIVITY_TIMEOUT_OPTIONS = [
    {
        id: 0,
        label: 'Disabled',
        description: 'Stop immediately on background.',
    },
    {
        id: 60000,
        label: '1 Minute',
        description: 'Stop after 1 min background.',
    },
    {
        id: null,
        label: 'Default (10 min)',
        description: 'Stop after 10 min background.',
    },
    {
        id: 3600000,
        label: '1 Hour',
        description: 'Stop after 1 hour background.',
    },
    {
        id: Infinity,
        label: 'Infinite',
        description: 'Never stop background polling.',
    },
];

const BASE_INTERVAL_OPTIONS = [
    { id: 2, label: '2 seconds' },
    { id: 5, label: '5 seconds' },
    { id: 10, label: '10 seconds' },
    { id: 30, label: '30 seconds' },
    { id: 60, label: '60 seconds' },
];

/**
 * Renders the interval selection dropdown (for both Global and Per-Stream contexts).
 */
const intervalSelectorTemplate = (
    currentValue,
    isGlobal,
    streamId = null,
    autoLabel = 'Auto (Manifest)'
) => {
    const perStreamOptions = [
        { id: null, label: autoLabel },
        ...BASE_INTERVAL_OPTIONS,
    ];

    const globalOptions = [
        {
            id: null,
            label: 'Use Per-Stream Setting',
            description: 'Respect individual stream configs.',
        },
        ...BASE_INTERVAL_OPTIONS.map((o) => ({
            ...o,
            description: 'Force all streams to this interval.',
        })),
    ];

    const options = isGlobal ? globalOptions : perStreamOptions;

    const handleSelect = (option, event) => {
        event.stopPropagation();
        if (isGlobal) {
            uiActions.setGlobalPollingIntervalOverride(option.id);
        } else {
            analysisActions.setStreamPollingIntervalOverride(
                streamId,
                option.id
            );
        }
    };

    return formattedOptionsDropdownTemplate(
        options.map((o) => ({
            ...o,
            description: o.description || `Poll every ${o.label}`,
        })),
        currentValue,
        handleSelect
    );
};

// --- Conditional Polling Logic ---
const getFeatureList = (protocol) => {
    const defs =
        protocol === 'dash' ? dashFeatureDefinitions : hlsFeatureDefinitions;
    return defs
        .filter((f) => f.isDynamic)
        .sort((a, b) => a.name.localeCompare(b.name));
};

const featureSelectionPanelTemplate = (
    features,
    activeFeatureName,
    onSelect
) => {
    const grouped = features.reduce((acc, f) => {
        const cat = f.category || 'Other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(f);
        return acc;
    }, {});

    return html`
        <base-dropdown class="w-80 max-h-[50vh]">
            <div class="p-3 space-y-4">
                ${Object.entries(grouped).map(
        ([cat, list]) => html`
                        <div class="mb-3 last:mb-0">
                            <h5
                                class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 px-1"
                            >
                                ${cat}
                            </h5>
                            <div class="space-y-1">
                                ${list.map(
            (f) => html`
                                        <button
                                            @click=${(e) => onSelect(f, e)}
                                            class="w-full text-left px-[1rem] py-2 rounded-xl hover:bg-slate-800 border border-transparent hover:border-slate-800/30 text-xs font-semibold transition-all duration-300 truncate ${f.name ===
                    activeFeatureName
                    ? 'text-blue-400 bg-blue-500/15 border-blue-500/30 shadow-[0_0_10px_#3b82f6]/10'
                    : 'text-slate-400'}"
                                            title="${f.desc}"
                                        >
                                            ${f.name}
                                        </button>
                                    `
        )}
                            </div>
                        </div>
                    `
    )}
            </div>
        </base-dropdown>
    `;
};

const conditionalPollingUI = (liveStreams) => {
    const { conditionalPolling } = useUiStore.getState();
    const { targetStreamId, targetFeatureName } = conditionalPolling;

    const activeTargetId = targetStreamId ?? liveStreams[0]?.id;
    const targetStream = liveStreams.find((s) => s.id === activeTargetId);
    const applicableFeatures = targetStream
        ? getFeatureList(targetStream.protocol)
        : [];

    const handleStart = (e) => {
        e.preventDefault();
        if (!targetStream || !targetFeatureName) return;
        uiActions.startConditionalPolling(targetStream.id, targetFeatureName);
        analysisActions.setStreamPolling(targetStream.id, true);
        closeDropdown();
    };

    const handleCancel = () => {
        if (conditionalPolling.streamId) {
            analysisActions.setStreamPolling(
                conditionalPolling.streamId,
                false
            );
        }
        uiActions.clearConditionalPolling();
    };

    if (conditionalPolling.status === 'active') {
        return html`
    <div
class="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-center"
    >
                <div class="flex items-center justify-center gap-2 mb-2">
                    <span class="animate-spin text-blue-400"
                        >${icons.spinner}</span
                    >
                    <span class="text-xs font-bold text-blue-400"
                        >Scanning...</span
                    >
                </div>
                <p class="text-[10px] text-slate-400 mb-3">
                    Searching for
                    <span class="text-slate-100"
                        >${conditionalPolling.featureName}</span
                    >
                </p>
                <button
                    @click=${handleCancel}
class="w-full py-1.5 bg-slate-800 hover:bg-slate-800 text-red-400 text-xs font-bold rounded transition-colors"
    >
    Cancel
                </button >
            </div >
    `;
    }

    if (conditionalPolling.status === 'found') {
        return html`
    <div
class="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-center"
    >
                <div class="flex items-center justify-center gap-2 mb-2">
                    <span class="text-emerald-400"
                        >${icons.checkCircle}</span
                    >
                    <span class="text-xs font-bold text-emerald-400"
                        >Feature Found!</span
                    >
                </div>
                <button
                    @click=${() => uiActions.clearConditionalPolling()}
class="w-full py-1.5 bg-slate-800 hover:bg-slate-800 text-slate-400 text-xs font-bold rounded transition-colors"
    >
    Reset
                </button >
            </div >
    `;
    }

    return html`
    <div class="space-y-2" >
        ${liveStreams.length > 1
            ? html`
                      <select
                          class="w-full bg-slate-800 border border-slate-800 rounded p-2 text-xs text-slate-100 appearance-none cursor-pointer hover:border-slate-400"
                          .value=${activeTargetId}
                          @change=${(e) =>
                    uiActions.setConditionalPollingTarget({
                        targetStreamId: parseInt(e.target.value),
                    })}
                      >
                          ${liveStreams.map(
                        (s) =>
                            html`<option value="${s.id}">
                                      ${s.name}
                                  </option>`
                    )}
                      </select>
                  `
            : ''
        }

<button
                @click=${(e) =>
            toggleDropdown(
                e.currentTarget,
                () =>
                    featureSelectionPanelTemplate(
                        applicableFeatures,
                        targetFeatureName,
                        (f, ev) => {
                            ev.stopPropagation();
                            uiActions.setConditionalPollingTarget({
                                targetFeatureName: f.name,
                            });
                            closeDropdown();
                        }
                    ),
                e
            )
        }
class="w-full flex items-center justify-between bg-slate-800 border border-slate-800 hover:border-slate-400 rounded p-2 text-xs text-slate-400 transition-colors"
    >
                <span class="truncate"
                    >${targetFeatureName || 'Select Feature...'}</span
                >
                <span class="text-slate-400 scale-75"
                    >${icons.chevronDown}</span
                >
            </button >

    <button
                @click=${handleStart}
                ?disabled = ${!targetFeatureName}
class="w-full py-2 bg-blue-500 hover:bg-[#60a5fa] disabled:opacity-50 disabled:cursor-not-allowed text-slate-100 text-xs font-bold rounded flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20"
    >
    ${icons.searchCode} Start Search
            </button >
        </div >
    `;
};

// --- Main Panel ---
export const pollingDropdownPanelTemplate = () => {
    const { streams } = useAnalysisStore.getState();
    const {
        inactivityTimeoutOverride,
        globalPollingIntervalOverride,
        pollingMode,
    } = useUiStore.getState();
    const liveStreams = streams.filter((s) => s.manifest?.type === 'dynamic');

    // STRICT DECOUPLING:
    // Only check if streams are flagged as polling.
    // Do not check player state, QC state, or any other inference.
    const isAnyPolling = liveStreams.some((s) => s.isPolling);
    const isSmart = pollingMode === 'smart';

    const autoLabelShort = isSmart ? 'Auto (Smart)' : 'Auto';
    const autoLabelLong = isSmart
        ? 'Auto (Smart / Adaptive)'
        : 'Auto (Manifest)';
    const globalLabelSuffix = isSmart ? 'Smart' : 'Fixed';

    const isGlobalOverride = globalPollingIntervalOverride !== null;
    const globalIntervalLabel = isGlobalOverride
        ? `${globalPollingIntervalOverride} s`
        : `Mixed(${globalLabelSuffix})`;

    const timeoutLabel =
        INACTIVITY_TIMEOUT_OPTIONS.find(
            (o) => o.id === inactivityTimeoutOverride
        )?.label || 'Default';

    return html`
        <base-dropdown class="w-80 max-h-[85vh]">
            <!--Master Switch-->
            <div
                slot="header"
                class="p-5 border-b border-slate-800/20 bg-slate-800 shrink-0"
            >
                <div class="flex items-center justify-between mb-3">
                    <h3
                        class="text-xs font-extrabold uppercase tracking-[0.2em] text-slate-100 flex items-center gap-2.5"
                    >
                        <span
                            class="text-blue-400 drop-shadow-[0_0_8px_#3b82f6]"
                            >${icons.refresh}</span
                        >
                        Live Polling
                    </h3>
                    <button
                        @click=${toggleAllPolling}
                        class="relative inline-flex h-5 w-10 items-center rounded-full transition-all duration-500 ${isAnyPolling
            ? 'bg-emerald-500 shadow-[0_0_12px_#10b981]/40'
            : 'bg-slate-800 border border-slate-800/30'}"
                    >
                        <span
                            class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-500 shadow-sm ${isAnyPolling
            ? 'translate-x-[22px]'
            : 'translate-x-[2px]'}"
                        ></span>
                    </button>
                </div>
                <p
                    class="text-[10px] text-slate-400/70 font-medium leading-relaxed"
                >
                    ${isAnyPolling
            ? 'The analyzer is actively monitoring and updating manifest state for all live sources.'
            : 'Manifest monitoring is currently suspended for all streams.'}
                </p>
            </div>

            <!-- Content Area (Scrollable via BaseDropdown) -->
            <div>
                <!-- Active Streams List -->
                ${liveStreams.length > 0
            ? html`
                          <div class="p-2 border-b border-slate-800">
                              <div
                                  class="flex items-center justify-between px-3 py-2 mb-2 bg-slate-800 rounded-xl border border-slate-800/10"
                              >
                                  <span
                                      class="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400/80"
                                      >Active Streams</span
                                  >

                                  <!-- Global Interval Control -->
                                  <button
                                      @click=${(e) =>
                    toggleDropdown(
                        e.currentTarget,
                        () =>
                            intervalSelectorTemplate(
                                globalPollingIntervalOverride,
                                true
                            ),
                        e
                    )}
                                      class="text-[10px] font-mono font-bold px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-800 text-slate-400 border border-slate-800/30 hover:border-blue-500/30 transition-all flex items-center gap-1.5 shadow-sm"
                                      title="Set Global Interval Override"
                                  >
                                      ${globalIntervalLabel}
                                      ${icons.chevronDown}
                                  </button>
                              </div>

                              <div class="space-y-1">
                                  ${liveStreams.map((stream) => {
                        const isPolling = stream.isPolling;
                        const interval =
                            stream.pollingIntervalOverride
                                ? `${stream.pollingIntervalOverride}s`
                                : autoLabelShort;

                        return html`
                                          <div
                                              class="flex items-center justify-between p-[1rem] mx-1 rounded-xl hover:bg-slate-800 border border-transparent hover:border-slate-800/20 transition-all duration-300 group"
                                          >
                                              <div
                                                  class="flex items-center gap-3.5 min-w-0"
                                              >
                                                  <button
                                                      @click=${() =>
                                analysisActions.setStreamPolling(
                                    stream.id,
                                    !isPolling
                                )}
                                                      class="relative flex h-3 w-3 outline-none cursor-pointer"
                                                      title="${isPolling
                                ? 'Pause'
                                : 'Resume'}"
                                                  >
                                                      <span
                                                          class="animate-ping absolute inline-flex h-full w-full rounded-full ${isPolling
                                ? 'bg-emerald-500 opacity-75'
                                : 'hidden'}"
                                                      ></span>
                                                      <span
                                                          class="relative inline-flex rounded-full h-3 w-3 ${isPolling
                                ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]/50'
                                : 'bg-slate-800 border border-slate-800/40 group-hover:border-slate-400'} transition-all duration-300"
                                                      ></span>
                                                  </button>
                                                  <span
                                                      class="text-xs font-semibold text-slate-400 truncate group-hover:text-slate-100 transition-colors"
                                                      title="${stream.name}"
                                                  >
                                                      ${stream.name}
                                                  </span>
                                              </div>

                                              <button
                                                  @click=${(e) =>
                                toggleDropdown(
                                    e.currentTarget,
                                    () =>
                                        intervalSelectorTemplate(
                                            stream.pollingIntervalOverride,
                                            false,
                                            stream.id,
                                            autoLabelLong
                                        ),
                                    e
                                )}
                                                  ?disabled=${isGlobalOverride}
                                                  class="text-[10px] font-mono font-bold text-slate-400/60 hover:text-blue-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-800 border border-transparent hover:border-blue-500/20"
                                                  title="Change Stream Interval"
                                              >
                                                  ${interval}
                                              </button>
                                          </div>
                                      `;
                    })}
                              </div>
                          </div>
                      `
            : html`
                          <div
                              class="p-6 text-center text-xs text-slate-400 italic border-b border-slate-800"
                          >
                              No live streams active.
                          </div>
                      `}

                <div
                    class="p-3 space-y-1.5 border-b border-slate-800/20 bg-slate-800/30"
                >
                    <button
                        @click=${(e) => {
            e.stopPropagation();
            uiActions.setPollingMode(
                isSmart ? 'fixed' : 'smart'
            );
        }}
                        class="w-full flex items-center gap-2 p-[1rem] rounded-xl hover:bg-slate-800 border border-transparent hover:border-slate-800/30 transition-all duration-300 group text-left"
                    >
                        <div
                            class="p-2.5 rounded-xl bg-slate-800 text-slate-400 group-hover:text-blue-400 group-hover:bg-slate-800 transition-all duration-500 shadow-sm"
                        >
                            ${isSmart ? icons.activity : icons.clock}
                        </div>
                        <div class="grow">
                            <div
                                class="font-extrabold text-[11px] uppercase tracking-wider text-slate-100 group-hover:text-slate-100"
                            >
                                Polling Strategy
                            </div>
                            <div
                                class="text-[10px] text-slate-400/70 group-hover:text-slate-400 font-medium mt-0.5"
                            >
                                ${isSmart
            ? 'Smart (Adaptive Backoff)'
            : 'Fixed Interval (Exact)'}
                            </div>
                        </div>
                        <div
                            class="relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-500 ${isSmart
            ? 'bg-blue-500 shadow-[0_0_8px_#3b82f6]/40'
            : 'bg-slate-800 border border-slate-800/30'}"
                        >
                            <span
                                class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-500 shadow-sm ${isSmart
            ? 'translate-x-[18px]'
            : 'translate-x-[2px]'}"
                            ></span>
                        </div>
                    </button>

                    <button
                        @click=${(e) =>
            toggleDropdown(
                e.currentTarget,
                segmentPollingSelectorTemplate,
                e
            )}
                        class="w-full flex items-center gap-2 p-[1rem] rounded-xl hover:bg-slate-800 border border-transparent hover:border-slate-800/30 transition-all duration-300 group text-left"
                    >
                        <div
                            class="p-2.5 rounded-xl bg-slate-800 text-slate-400 group-hover:text-purple-300 group-hover:bg-slate-800 transition-all duration-500 shadow-sm"
                        >
                            ${icons.download}
                        </div>
                        <div class="grow">
                            <div
                                class="font-extrabold text-[11px] uppercase tracking-wider text-slate-100 group-hover:text-slate-100"
                            >
                                Segment Polling
                            </div>
                            <div
                                class="text-[10px] text-slate-400/70 group-hover:text-slate-400 font-medium mt-0.5"
                            >
                                Auto-fetch new segments
                            </div>
                        </div>
                        <span
                            class="text-slate-400/50 group-hover:text-purple-300 group-hover:translate-x-0.5 transition-all duration-300"
                            >${icons.chevronRight}</span
                        >
                    </button>

                    <button
                        @click=${(e) =>
            toggleDropdown(
                e.currentTarget,
                () =>
                    formattedOptionsDropdownTemplate(
                        INACTIVITY_TIMEOUT_OPTIONS,
                        inactivityTimeoutOverride,
                        (opt) =>
                            uiActions.setInactivityTimeoutOverride(
                                opt.id
                            )
                    ),
                e
            )}
                        class="w-full flex items-center gap-2 p-[1rem] rounded-xl hover:bg-slate-800 border border-transparent hover:border-slate-800/30 transition-all duration-300 group text-left"
                    >
                        <div
                            class="p-2.5 rounded-xl bg-slate-800 text-slate-400 group-hover:text-blue-400 group-hover:bg-slate-800 transition-all duration-500 shadow-sm"
                        >
                            ${icons.moon}
                        </div>
                        <div class="grow">
                            <div
                                class="font-extrabold text-[11px] uppercase tracking-wider text-slate-100 group-hover:text-slate-100"
                            >
                                Background Behavior
                            </div>
                            <div
                                class="text-[10px] text-slate-400/70 group-hover:text-slate-400 font-medium mt-0.5"
                            >
                                Timeout: ${timeoutLabel}
                            </div>
                        </div>
                        <span
                            class="text-slate-400/50 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all duration-300"
                            >${icons.chevronRight}</span
                        >
                    </button>
                </div>

                <!--Conditional Polling-->
                <div class="p-5 bg-slate-800 rounded-b-2xl">
                    <div class="flex items-center gap-2.5 mb-4">
                        <span
                            class="text-purple-300 scale-90 drop-shadow-[0_0_5px_#a855f7]"
                            >${icons.locateFixed}</span
                        >
                        <h4
                            class="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400/80"
                        >
                            Conditional Stop
                        </h4>
                    </div>
                    ${conditionalPollingUI(liveStreams)}
                </div>
            </div>
        </base-dropdown>
    `;
};
