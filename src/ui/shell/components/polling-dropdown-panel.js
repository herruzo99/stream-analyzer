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
                                class="mono text-[10px] font-medium text-slate-600 mb-1 px-1"
                            >
                                ${String(cat).toLowerCase()}
                            </h5>
                            <div class="space-y-1">
                                ${list.map(
            (f) => html`
                                        <button
                                            @click=${(e) => onSelect(f, e)}
                                            class="w-full text-left px-3 py-2 rounded-md border transition-colors truncate text-[13px] ${f.name ===
                    activeFeatureName
                    ? 'text-emerald-200 bg-emerald-500/10 border-emerald-400/25'
                    : 'text-slate-400 border-transparent hover:bg-white/5'}"
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
                class="p-3 bg-white/[0.02] border border-white/10 rounded-md text-center"
            >
                <div class="flex items-center justify-center gap-2 mb-2">
                    <span class="animate-spin text-slate-400"
                        >${icons.spinner}</span
                    >
                    <span class="text-[13px] font-medium text-slate-200"
                        >Scanning</span
                    >
                </div>
                <p class="mono text-[10px] text-slate-500 mb-3">
                    looking for ${conditionalPolling.featureName}
                </p>
                <button
                    @click=${handleCancel}
                    class="w-full py-1.5 text-red-300 hover:text-red-200 mono text-[11px] rounded transition-colors"
                >
                    Cancel
                </button>
            </div>
        `;
    }

    if (conditionalPolling.status === 'found') {
        return html`
            <div
                class="p-3 bg-emerald-500/5 border border-emerald-500/25 rounded-md text-center"
            >
                <div class="flex items-center justify-center gap-2 mb-2">
                    <span class="text-emerald-300"
                        >${icons.checkCircle}</span
                    >
                    <span class="text-[13px] font-medium text-emerald-200"
                        >Feature found</span
                    >
                </div>
                <button
                    @click=${() => uiActions.clearConditionalPolling()}
                    class="w-full py-1.5 text-slate-400 hover:text-slate-100 mono text-[11px] rounded transition-colors"
                >
                    Reset
                </button>
            </div>
        `;
    }

    return html`
    <div class="space-y-2" >
        ${liveStreams.length > 1
            ? html`
                      <select
                          aria-label="Target stream"
                          class="w-full bg-[#06090f] border border-white/10 rounded-md p-2 text-[13px] text-slate-100 cursor-pointer hover:border-white/25 outline-none"
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
class="w-full flex items-center justify-between bg-[#06090f] border border-white/10 hover:border-white/25 rounded-md p-2 text-[13px] text-slate-300 transition-colors"
    >
                <span class="truncate"
                    >${targetFeatureName || 'Select feature'}</span
                >
                <span class="text-slate-500">${icons.chevronDown}</span>
            </button>

    <button
                @click=${handleStart}
                ?disabled = ${!targetFeatureName}
class="w-full py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed text-[13px] font-bold rounded-md flex items-center justify-center gap-2 transition-colors"
    >
    ${icons.searchCode} Start search
            </button>
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
            <div
                slot="header"
                class="px-4 py-3 border-b border-white/5 shrink-0"
            >
                <div class="flex items-center justify-between mb-1.5">
                    <h3
                        class="mono text-[11px] font-medium text-slate-200 flex items-center gap-2"
                    >
                        <span class="text-slate-500">${icons.refresh}</span>
                        live polling
                    </h3>
                    <button
                        @click=${toggleAllPolling}
                        role="switch"
                        aria-checked=${isAnyPolling}
                        aria-label="Toggle all live polling"
                        class="relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${isAnyPolling
                            ? 'bg-emerald-400'
                            : 'bg-white/10'}"
                    >
                        <span
                            class="inline-block h-4 w-4 rounded-full bg-slate-950 transition-transform ${isAnyPolling
                                ? 'translate-x-[22px]'
                                : 'translate-x-[2px]'}"
                        ></span>
                    </button>
                </div>
                <p class="text-[11px] text-slate-500 leading-relaxed">
                    ${isAnyPolling
                        ? `Monitoring ${liveStreams.length} live source${liveStreams.length === 1 ? '' : 's'}.`
                        : 'Monitoring suspended for all streams.'}
                </p>
            </div>

            <!-- Content Area (Scrollable via BaseDropdown) -->
            <div>
                <!-- Active Streams List -->
                ${liveStreams.length > 0
                    ? html`
                          <div class="p-2 border-b border-white/5">
                              <div
                                  class="flex items-center justify-between px-2 py-1.5 mb-1"
                              >
                                  <span
                                      class="mono text-[10px] font-medium text-slate-500"
                                      >streams</span
                                  >

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
                                      class="mono text-[10px] px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-400 border border-white/10 transition-colors flex items-center gap-1.5"
                                      title="Set global interval override"
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
                                              class="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-white/5 border border-transparent transition-colors"
                                          >
                                              <span
                                                  class="flex items-center gap-2.5 min-w-0 grow"
                                              >
                                                  <button
                                                      @click=${() =>
                                                          analysisActions.setStreamPolling(
                                                              stream.id,
                                                              !isPolling
                                                          )}
                                                      role="switch"
                                                      aria-checked=${isPolling}
                                                      aria-label="${isPolling ? 'Pause' : 'Resume'} polling for ${stream.name}"
                                                      class="relative inline-flex h-4 w-7 items-center rounded-full transition-colors shrink-0 ${isPolling
                                                          ? 'bg-emerald-400'
                                                          : 'bg-white/10'}"
                                                  >
                                                      <span
                                                          class="inline-block h-3 w-3 rounded-full bg-slate-950 transition-transform ${isPolling
                                                              ? 'translate-x-[14px]'
                                                              : 'translate-x-[2px]'}"
                                                      ></span>
                                                  </button>
                                                  <span
                                                      class="text-[13px] text-slate-300 truncate"
                                                      title="${stream.name}"
                                                  >
                                                      ${stream.name}
                                                  </span>
                                              </span>

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
                                                  class="mono text-[10px] text-slate-500 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10"
                                                  title="${isGlobalOverride ? 'Global override is on' : 'Change stream interval'}"
                                              >
                                                  ${interval}
                                              </button>
                                          </div>
                                      `;
                    })}
                              </div>
                          </div>
                      `
                    : html`<p
                          class="mono p-4 text-center text-[11px] text-slate-600 border-b border-white/5"
                      >
                          No live streams active.
                      </p>`}

                <div class="p-2 border-b border-white/5">
                    <button
                        @click=${(e) => {
                            e.stopPropagation();
                            uiActions.setPollingMode(
                                isSmart ? 'fixed' : 'smart'
                            );
                        }}
                        role="switch"
                        aria-checked=${isSmart}
                        aria-label="Polling strategy: ${isSmart ? 'smart' : 'fixed'}"
                        class="w-full flex items-center gap-2.5 p-2.5 rounded-md hover:bg-white/5 border border-transparent transition-colors text-left"
                    >
                        <span class="text-slate-500">
                            ${isSmart ? icons.activity : icons.clock}
                        </span>
                        <span class="grow">
                            <span
                                class="block text-[13px] font-medium text-slate-100"
                            >
                                Polling strategy
                            </span>
                            <span
                                class="mono block text-[10px] text-slate-500 mt-0.5"
                            >
                                ${isSmart
                                    ? 'smart (adaptive backoff)'
                                    : 'fixed interval (exact)'}
                            </span>
                        </span>
                        <span
                            class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${isSmart
                                ? 'bg-emerald-400'
                                : 'bg-white/10'}"
                        >
                            <span
                                class="inline-block h-3.5 w-3.5 rounded-full bg-slate-950 transition-transform ${isSmart
                                    ? 'translate-x-[18px]'
                                    : 'translate-x-[2px]'}"
                            ></span>
                        </span>
                    </button>

                    <button
                        @click=${(e) =>
                            toggleDropdown(
                                e.currentTarget,
                                segmentPollingSelectorTemplate,
                                e
                            )}
                        class="w-full flex items-center gap-2.5 p-2.5 rounded-md hover:bg-white/5 border border-transparent transition-colors text-left"
                    >
                        <span class="text-slate-500">${icons.download}</span>
                        <span class="grow">
                            <span
                                class="block text-[13px] font-medium text-slate-100"
                            >
                                Segment polling
                            </span>
                            <span
                                class="mono block text-[10px] text-slate-500 mt-0.5"
                            >
                                auto-fetch new segments
                            </span>
                        </span>
                        <span class="text-slate-600"
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
                        class="w-full flex items-center gap-2.5 p-2.5 rounded-md hover:bg-white/5 border border-transparent transition-colors text-left"
                    >
                        <span class="text-slate-500">${icons.moon}</span>
                        <span class="grow">
                            <span
                                class="block text-[13px] font-medium text-slate-100"
                            >
                                Background behavior
                            </span>
                            <span
                                class="mono block text-[10px] text-slate-500 mt-0.5"
                            >
                                timeout: ${timeoutLabel.toLowerCase()}
                            </span>
                        </span>
                        <span class="text-slate-600"
                            >${icons.chevronRight}</span
                        >
                    </button>
                </div>

                <div class="p-3">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="text-slate-500"
                            >${icons.locateFixed}</span
                        >
                        <h4
                            class="mono text-[11px] font-medium text-slate-400"
                        >
                            conditional stop
                        </h4>
                    </div>
                    ${conditionalPollingUI(liveStreams)}
                </div>
            </div>
        </base-dropdown>
    `;
};
