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
        <div
            class="dropdown-panel bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl w-80 p-3 ring-1 ring-black/50 max-h-[50vh] overflow-y-auto custom-scrollbar"
        >
            ${Object.entries(grouped).map(
                ([cat, list]) => html`
                    <div class="mb-3 last:mb-0">
                        <h5
                            class="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 px-1"
                        >
                            ${cat}
                        </h5>
                        <div class="space-y-1">
                            ${list.map(
                                (f) => html`
                                    <button
                                        @click=${(e) => onSelect(f, e)}
                                        class="w-full text-left px-2 py-1.5 rounded hover:bg-white/10 text-xs font-medium transition-colors truncate ${f.name ===
                                        activeFeatureName
                                            ? 'text-blue-400 bg-blue-400/10'
                                            : 'text-slate-300'}"
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
                    <span class="text-xs font-bold text-blue-200"
                        >Scanning...</span
                    >
                </div>
                <p class="text-[10px] text-slate-400 mb-3">
                    Searching for
                    <span class="text-white"
                        >${conditionalPolling.featureName}</span
                    >
                </p>
                <button
                    @click=${handleCancel}
                    class="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-red-300 text-xs font-bold rounded transition-colors"
                >
                    Cancel
                </button>
            </div>
        `;
    }

    if (conditionalPolling.status === 'found') {
        return html`
            <div
                class="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-center"
            >
                <div class="flex items-center justify-center gap-2 mb-2">
                    <span class="text-emerald-400">${icons.checkCircle}</span>
                    <span class="text-xs font-bold text-emerald-200"
                        >Feature Found!</span
                    >
                </div>
                <button
                    @click=${() => uiActions.clearConditionalPolling()}
                    class="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded transition-colors"
                >
                    Reset
                </button>
            </div>
        `;
    }

    return html`
        <div class="space-y-2">
            ${liveStreams.length > 1
                ? html`
                      <select
                          class="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white appearance-none cursor-pointer hover:border-slate-600"
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
                : ''}

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
                    )}
                class="w-full flex items-center justify-between bg-slate-950 border border-slate-700 hover:border-slate-500 rounded p-2 text-xs text-slate-300 transition-colors"
            >
                <span class="truncate"
                    >${targetFeatureName || 'Select Feature...'}</span
                >
                <span class="text-slate-500 scale-75"
                    >${icons.chevronDown}</span
                >
            </button>

            <button
                @click=${handleStart}
                ?disabled=${!targetFeatureName}
                class="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20"
            >
                ${icons.searchCode} Start Search
            </button>
        </div>
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
        ? `${globalPollingIntervalOverride}s`
        : `Mixed (${globalLabelSuffix})`;

    const timeoutLabel =
        INACTIVITY_TIMEOUT_OPTIONS.find(
            (o) => o.id === inactivityTimeoutOverride
        )?.label || 'Default';

    return html`
        <div
            class="dropdown-panel bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl w-80 ring-1 ring-black/50 flex flex-col max-h-[85vh]"
        >
            <!-- Master Switch -->
            <div class="p-4 border-b border-white/5 bg-white/[0.02] shrink-0">
                <div class="flex items-center justify-between mb-2">
                    <h3
                        class="text-sm font-bold text-white flex items-center gap-2"
                    >
                        ${icons.refresh} Live Polling
                    </h3>
                    <button
                        @click=${toggleAllPolling}
                        class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isAnyPolling
                            ? 'bg-green-600'
                            : 'bg-slate-600'}"
                    >
                        <span
                            class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${isAnyPolling
                                ? 'translate-x-4.5'
                                : 'translate-x-0.5'}"
                        ></span>
                    </button>
                </div>
                <p class="text-[10px] text-slate-400">
                    ${isAnyPolling
                        ? 'Analyzer is updating manifest state.'
                        : 'Analyzer is paused.'}
                </p>
            </div>

            <div class="overflow-y-auto custom-scrollbar grow">
                <!-- Active Streams List -->
                ${liveStreams.length > 0
                    ? html`
                          <div class="p-2 border-b border-white/5">
                              <div
                                  class="flex items-center justify-between px-2 py-1 mb-1"
                              >
                                  <span
                                      class="text-[10px] font-bold uppercase tracking-widest text-slate-500"
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
                                      class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1"
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
                                              class="flex items-center justify-between p-2 rounded hover:bg-white/5 transition-colors group"
                                          >
                                              <div
                                                  class="flex items-center gap-3 min-w-0"
                                              >
                                                  <button
                                                      @click=${() =>
                                                          analysisActions.setStreamPolling(
                                                              stream.id,
                                                              !isPolling
                                                          )}
                                                      class="relative flex h-2.5 w-2.5 outline-none cursor-pointer"
                                                      title="${isPolling
                                                          ? 'Pause'
                                                          : 'Resume'}"
                                                  >
                                                      <span
                                                          class="animate-ping absolute inline-flex h-full w-full rounded-full ${isPolling
                                                              ? 'bg-green-400 opacity-75'
                                                              : 'hidden'}"
                                                      ></span>
                                                      <span
                                                          class="relative inline-flex rounded-full h-2.5 w-2.5 ${isPolling
                                                              ? 'bg-green-500'
                                                              : 'bg-slate-600 group-hover:bg-slate-500'} transition-colors"
                                                      ></span>
                                                  </button>
                                                  <span
                                                      class="text-xs font-medium text-slate-300 truncate group-hover:text-white transition-colors"
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
                                                  class="text-[10px] font-mono text-slate-500 hover:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors px-1.5 rounded"
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
                              class="p-6 text-center text-xs text-slate-500 italic border-b border-white/5"
                          >
                              No live streams active.
                          </div>
                      `}

                <!-- Quick Settings -->
                <div class="p-2 space-y-1 border-b border-white/5">
                    <button
                        @click=${(e) => {
                            e.stopPropagation();
                            uiActions.setPollingMode(
                                isSmart ? 'fixed' : 'smart'
                            );
                        }}
                        class="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 transition-all group text-left"
                    >
                        <div
                            class="p-2 rounded-md bg-slate-800 text-slate-400 group-hover:text-white group-hover:bg-slate-700 transition-colors"
                        >
                            ${isSmart ? icons.activity : icons.clock}
                        </div>
                        <div class="grow">
                            <div
                                class="font-bold text-xs text-slate-200 group-hover:text-white"
                            >
                                Polling Strategy
                            </div>
                            <div
                                class="text-[10px] text-slate-500 group-hover:text-slate-400"
                            >
                                ${isSmart
                                    ? 'Smart (Adaptive Backoff)'
                                    : 'Fixed Interval (Exact)'}
                            </div>
                        </div>
                        <div
                            class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isSmart
                                ? 'bg-blue-600'
                                : 'bg-slate-700'}"
                        >
                            <span
                                class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${isSmart
                                    ? 'translate-x-4.5'
                                    : 'translate-x-0.5'}"
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
                        class="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 transition-all group text-left"
                    >
                        <div
                            class="p-2 rounded-md bg-slate-800 text-slate-400 group-hover:text-white group-hover:bg-slate-700 transition-colors"
                        >
                            ${icons.download}
                        </div>
                        <div class="grow">
                            <div
                                class="font-bold text-xs text-slate-200 group-hover:text-white"
                            >
                                Segment Polling
                            </div>
                            <div
                                class="text-[10px] text-slate-500 group-hover:text-slate-400"
                            >
                                Auto-fetch new segments
                            </div>
                        </div>
                        <span class="text-slate-600 group-hover:text-slate-400"
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
                        class="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 transition-all group text-left"
                    >
                        <div
                            class="p-2 rounded-md bg-slate-800 text-slate-400 group-hover:text-white group-hover:bg-slate-700 transition-colors"
                        >
                            ${icons.moon}
                        </div>
                        <div class="grow">
                            <div
                                class="font-bold text-xs text-slate-200 group-hover:text-white"
                            >
                                Background Behavior
                            </div>
                            <div
                                class="text-[10px] text-slate-500 group-hover:text-slate-400"
                            >
                                Timeout: ${timeoutLabel}
                            </div>
                        </div>
                        <span class="text-slate-600 group-hover:text-slate-400"
                            >${icons.chevronRight}</span
                        >
                    </button>
                </div>

                <!-- Conditional Polling -->
                <div class="p-4 bg-slate-950/30">
                    <div class="flex items-center gap-2 mb-3">
                        <span class="text-slate-500 scale-75"
                            >${icons.locateFixed}</span
                        >
                        <h4
                            class="text-xs font-bold uppercase tracking-widest text-slate-400"
                        >
                            Conditional Stop
                        </h4>
                    </div>
                    ${conditionalPollingUI(liveStreams)}
                </div>
            </div>
        </div>
    `;
};
