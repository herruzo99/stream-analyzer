import { html } from 'lit-html';
import { useAnalysisStore, analysisActions } from '@/state/analysisStore';
import { useUiStore, uiActions } from '@/state/uiStore';
import { eventBus } from '@/application/event-bus';
import { toggleAllPolling } from '@/ui/services/streamActionsService';
import { toggleDropdown, closeDropdown } from '@/ui/services/dropdownService';
import { dashFeatureDefinitions } from '@/infrastructure/parsing/dash/feature-definitions';
import { hlsFeatureDefinitions } from '@/infrastructure/parsing/hls/feature-definitions';
import { tooltipTriggerClasses } from '@/ui/shared/constants';
import * as icons from '@/ui/icons';
import { formattedOptionsDropdownTemplate } from '@/features/playerSimulation/ui/components/formatted-options-dropdown.js';
import { segmentPollingSelectorTemplate } from './segment-polling-selector.js';

const POLLING_INTERVAL_OPTIONS_STREAM = [
    { id: null, label: 'Auto' },
    { id: 2, label: '2 seconds' },
    { id: 5, label: '5 seconds' },
    { id: 10, label: '10 seconds' },
    { id: 30, label: '30 seconds' },
    { id: 60, label: '60 seconds' },
];

const POLLING_INTERVAL_OPTIONS_GLOBAL = [
    { id: null, label: 'Disabled' },
    ...POLLING_INTERVAL_OPTIONS_STREAM.slice(1),
];

const pollingIntervalPanelTemplate = (stream, isGlobal = false) => {
    const handleSelect = (option, event) => {
        event.stopPropagation(); // Prevent the main dropdown from closing.
        if (isGlobal) {
            uiActions.setGlobalPollingIntervalOverride(option.id);
        } else {
            analysisActions.setStreamPollingIntervalOverride(stream.id, option.id);
        }
        // The formattedOptionsDropdownTemplate will call closeDropdown() itself.
    };

    const options = isGlobal ? POLLING_INTERVAL_OPTIONS_GLOBAL : POLLING_INTERVAL_OPTIONS_STREAM;
    const optionsWithDescriptions = options.map((opt) => {
        if (opt.id === null) {
            if (isGlobal) {
                return { ...opt, description: 'Each stream will use its own auto or individual setting.' };
            }
            let desc = 'Calculated from manifest.';
            if (stream) {
                const autoInterval = (
                    stream.manifest.minimumUpdatePeriod ||
                    stream.manifest.targetDuration ||
                    2
                ).toFixed(1);
                desc = `Calculated from manifest: ~${autoInterval}s`;
            }
            return { ...opt, description: desc };
        }
        return { ...opt, description: `Poll every ${opt.label}.` };
    });

    const activeInterval = isGlobal
        ? useUiStore.getState().globalPollingIntervalOverride
        : stream.pollingIntervalOverride;

    return formattedOptionsDropdownTemplate(
        optionsWithDescriptions,
        activeInterval,
        handleSelect
    );
};

const getFeatureList = () => {
    const dashFeatures = dashFeatureDefinitions.map((f) => ({
        ...f,
        protocol: 'dash',
    }));
    const hlsFeatures = hlsFeatureDefinitions.map((f) => ({
        ...f,
        protocol: 'hls',
    }));
    return [...dashFeatures, ...hlsFeatures].sort((a, b) =>
        a.name.localeCompare(b.name)
    );
};

const allFeatures = getFeatureList();

const INACTIVITY_TIMEOUT_OPTIONS = [
    {
        id: 0,
        label: 'Disabled',
        description:
            'Polling stops immediately when the tab is in the background.',
    },
    {
        id: 60000,
        label: '1 Minute',
        description:
            'Polling stops after 1 minute of the tab being in the background.',
    },
    {
        id: null,
        label: 'Default (10 min)',
        description:
            'Polling stops after 10 minutes of the tab being in the background.',
    },
    {
        id: 3600000,
        label: '1 Hour',
        description: 'Polling continues for up to 1 hour in the background.',
    },
    {
        id: 14400000,
        label: '4 Hours',
        description: 'Polling continues for up to 4 hours in the background.',
    },
    {
        id: 43200000,
        label: '12 Hours',
        description: 'Polling continues for up to 12 hours in the background.',
    },
    {
        id: Infinity,
        label: 'Infinite',
        description: 'Polling will never stop due to inactivity.',
    },
];

const individualPollingControls = (liveStreams, isGlobalOverrideActive) => {
    const handleToggle = (streamId, isCurrentlyPolling) => {
        analysisActions.setStreamPolling(streamId, !isCurrentlyPolling);
    };

    return html`
        <div class="space-y-2">
            ${liveStreams.map(
                (stream) => html`
                    <div
                        class="flex items-center justify-between p-2 bg-slate-900/50 rounded-md gap-2"
                    >
                        <div class="flex items-center gap-3 min-w-0">
                            <button
                                @click=${() =>
                                    handleToggle(stream.id, stream.isPolling)}
                                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${stream.isPolling
                                    ? 'bg-blue-600'
                                    : 'bg-slate-600'}"
                                title=${stream.isPolling ? 'Pause' : 'Resume'}
                            >
                                <span
                                    class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${stream.isPolling
                                        ? 'translate-x-6'
                                        : 'translate-x-1'}"
                                ></span>
                            </button>
                            <span
                                class="text-sm font-medium text-slate-300 truncate"
                                title=${stream.name}
                                >${stream.name}</span
                            >
                        </div>
                        <button
                            @click=${(e) => {
                                toggleDropdown(
                                    e.currentTarget,
                                    () => pollingIntervalPanelTemplate(stream),
                                    e
                                );
                            }}
                            ?disabled=${isGlobalOverrideActive}
                            class="text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded-md flex items-center gap-1.5 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                            title=${isGlobalOverrideActive
                                ? 'Disable Global Override to set per-stream intervals.'
                                : 'Set polling interval for this stream'}
                        >
                            <span
                                >${stream.pollingIntervalOverride == null
                                    ? `Auto (${(
                                          stream.manifest.minimumUpdatePeriod ||
                                          stream.manifest.targetDuration ||
                                          2
                                      ).toFixed(1)}s)`
                                    : `${stream.pollingIntervalOverride}s`}</span
                            >
                            ${icons.settings}
                        </button>
                    </div>
                `
            )}
        </div>
    `;
};

const getBadge = (text, colorClasses) => html`
    <span class="text-xs font-semibold px-2 py-0.5 rounded-full ${colorClasses}"
        >${text}</span
    >
`;

const renderPollingStreamCard = (stream, targetStreamId, onSelect) => {
    const isActive = stream.id === targetStreamId;
    const activeClasses = 'bg-blue-800 border-blue-600 ring-2 ring-blue-500';
    const baseClasses =
        'bg-gray-900/50 p-3 rounded-lg border border-gray-700 cursor-pointer transition-all duration-150 ease-in-out flex flex-col items-start';
    const hoverClasses =
        'hover:bg-gray-700 hover:border-gray-500 hover:scale-[1.03]';

    const protocolBadge =
        stream.protocol === 'dash'
            ? getBadge('DASH', 'bg-blue-800 text-blue-200')
            : getBadge('HLS', 'bg-purple-800 text-purple-200');

    const typeBadge =
        stream.manifest?.type === 'dynamic'
            ? getBadge('LIVE', 'bg-red-800 text-red-200')
            : getBadge('VOD', 'bg-green-800 text-green-200');

    const path = stream.originalUrl
        ? new URL(stream.originalUrl).pathname
        : stream.name;

    return html`
        <div
            @click=${(e) => onSelect(stream, e)}
            class="${baseClasses} ${hoverClasses} ${isActive
                ? activeClasses
                : ''}"
            data-stream-id="${stream.id}"
        >
            <span
                class="font-semibold text-gray-200 truncate w-full"
                title="${stream.name}"
                >${stream.name}</span
            >
            <span
                class="text-xs text-gray-400 font-mono truncate w-full mt-1"
                title="${path}"
                >${path}</span
            >
            <div class="shrink-0 flex flex-wrap items-center gap-2 mt-2">
                ${protocolBadge} ${typeBadge}
            </div>
        </div>
    `;
};

const streamSelectionPanelTemplate = (
    liveStreams,
    targetStreamId,
    onSelect
) => html`
    <div
        class="dropdown-panel bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-[40rem] p-2"
    >
        <div class="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-2">
            ${liveStreams.map((stream) =>
                renderPollingStreamCard(stream, targetStreamId, onSelect)
            )}
        </div>
    </div>
`;

const featureGridSelectionPanelTemplate = (
    applicableFeatures,
    activeFeatureName,
    onSelect
) => {
    const groupedFeatures = applicableFeatures.reduce((acc, feature) => {
        const category = feature.category || 'Other';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(feature);
        return acc;
    }, {});

    const featureButton = (feature) => {
        const isActive = feature.name === activeFeatureName;
        return html`
            <button
                type="button"
                @click=${(e) => onSelect(feature, e)}
                class="p-2 text-xs font-semibold rounded-md transition-colors text-left truncate ${isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}"
                title=${feature.desc}
            >
                ${feature.name}
            </button>
        `;
    };

    return html`
        <div
            class="dropdown-panel bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-[40rem] p-3 space-y-4 max-h-[60vh] overflow-y-auto"
        >
            ${Object.entries(groupedFeatures).map(
                ([category, features]) => html`
                    <div>
                        <h5
                            class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-1"
                        >
                            ${category}
                        </h5>
                        <div class="grid grid-cols-3 gap-2">
                            ${features.map(featureButton)}
                        </div>
                    </div>
                `
            )}
        </div>
    `;
};

const customDropdownButton = (label, onClick, disabled = false) => html`
    <button
        type="button"
        @click=${onClick}
        ?disabled=${disabled}
        class="w-full bg-slate-700 text-white rounded-md p-2 text-sm border border-slate-600 focus:ring-1 focus:ring-blue-500 flex justify-between items-center disabled:opacity-50"
    >
        <span class="truncate">${label}</span>
        <span class="shrink-0">${icons.chevronDown}</span>
    </button>
`;

const conditionalPollingControls = (liveStreams) => {
    const { conditionalPolling } = useUiStore.getState();
    const { targetStreamId, targetFeatureName } = conditionalPolling;

    const handleStart = (e) => {
        e.preventDefault();
        if (targetStreamId === null || !targetFeatureName) {
            eventBus.dispatch('ui:show-status', {
                message: 'Please select both a stream and a feature.',
                type: 'warn',
            });
            return;
        }
        uiActions.startConditionalPolling(targetStreamId, targetFeatureName);
        analysisActions.setStreamPolling(targetStreamId, true);
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

    const targetStream = liveStreams.find((s) => s.id === targetStreamId);
    const applicableFeatures = targetStream
        ? allFeatures.filter(
              (f) => f.protocol === targetStream.protocol && f.isDynamic
          )
        : [];

    if (conditionalPolling.status === 'active') {
        const activeStream = liveStreams.find(
            (s) => s.id === conditionalPolling.streamId
        );
        return html`
            <div class="text-center p-4 bg-slate-900/50 rounded-md">
                <div class="flex items-center justify-center gap-2">
                    <span class="animate-spin">${icons.spinner}</span>
                    <p class="text-sm font-semibold text-cyan-300">
                        Searching for Feature...
                    </p>
                </div>
                <p class="text-xs text-slate-400 mt-2">
                    Polling
                    <strong class="text-white"
                        >${activeStream?.name || '...'}</strong
                    >
                    for feature
                    <strong class="text-white"
                        >"${conditionalPolling.featureName}"</strong
                    >.
                </p>
                <button
                    @click=${handleCancel}
                    class="mt-3 text-xs bg-red-800 hover:bg-red-700 text-red-200 font-bold py-1 px-3 rounded-md"
                >
                    Cancel Search
                </button>
            </div>
        `;
    }

    if (conditionalPolling.status === 'found') {
        const foundStream = liveStreams.find(
            (s) => s.id === conditionalPolling.streamId
        );
        return html`
            <div class="text-center p-4 bg-slate-900/50 rounded-md">
                <div class="flex items-center justify-center gap-2">
                    <span class="text-green-400">${icons.checkCircle}</span>
                    <p class="text-sm font-semibold text-green-300">
                        Feature Found!
                    </p>
                </div>
                <p class="text-xs text-slate-400 mt-2">
                    Feature
                    <strong class="text-white"
                        >"${conditionalPolling.featureName}"</strong
                    >
                    was detected in
                    <strong class="text-white"
                        >${foundStream?.name || 'the stream'}</strong
                    >. Polling has stopped.
                </p>
                <button
                    @click=${() => uiActions.clearConditionalPolling()}
                    class="mt-3 text-xs bg-slate-600 hover:bg-slate-700 text-white font-bold py-1 px-3 rounded-md"
                >
                    Clear Status
                </button>
            </div>
        `;
    }

    return html`
        <form @submit=${handleStart} class="space-y-3">
            ${customDropdownButton(
                targetStream?.name || 'Select a Stream',
                (e) => {
                    toggleDropdown(
                        e.currentTarget,
                        () =>
                            streamSelectionPanelTemplate(
                                liveStreams,
                                targetStreamId,
                                (stream, event) => {
                                    event.stopPropagation();
                                    uiActions.setConditionalPollingTarget({
                                        targetStreamId: stream.id,
                                    });
                                }
                            ),
                        e
                    );
                }
            )}
            ${customDropdownButton(
                targetFeatureName || 'Select a Feature to Find',
                (e) => {
                    toggleDropdown(
                        e.currentTarget,
                        () =>
                            featureGridSelectionPanelTemplate(
                                applicableFeatures,
                                targetFeatureName,
                                (feature, event) => {
                                    event.stopPropagation();
                                    uiActions.setConditionalPollingTarget({
                                        targetFeatureName: feature.name,
                                    });
                                }
                            ),
                        e
                    );
                },
                !targetStream
            )}

            <button
                type="submit"
                class="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                ?disabled=${targetStreamId === null || !targetFeatureName}
                title=${targetStreamId === null || !targetFeatureName
                    ? 'Please select both a stream and a feature'
                    : 'Start polling the selected stream until the chosen feature appears'}
            >
                ${icons.locateFixed} Start Polling for Feature
            </button>
        </form>
    `;
};

export const pollingDropdownPanelTemplate = () => {
    const { streams } = useAnalysisStore.getState();
    const { inactivityTimeoutOverride, globalPollingIntervalOverride } =
        useUiStore.getState();
    const liveStreams = streams.filter((s) => s.manifest?.type === 'dynamic');
    const isAnyPolling = liveStreams.some((s) => s.isPolling);
    const activeTimeout =
        INACTIVITY_TIMEOUT_OPTIONS.find(
            (opt) => opt.id === inactivityTimeoutOverride
        ) || INACTIVITY_TIMEOUT_OPTIONS[0];

    const totalReps = liveStreams.reduce(
        (sum, s) => sum + s.segmentPollingReps.size,
        0
    );

    const isGlobalOverrideActive = globalPollingIntervalOverride !== null;

    return html`
        <div
            class="dropdown-panel bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-96 p-3 space-y-4"
        >
            <div>
                <button
                    @click=${toggleAllPolling}
                    class="w-full text-center text-sm font-bold py-2 px-3 rounded-md transition-colors ${isAnyPolling
                        ? 'bg-red-800 hover:bg-red-700 text-red-200'
                        : 'bg-green-800 hover:bg-green-700 text-green-200'}"
                >
                    ${isAnyPolling ? 'Pause All' : 'Resume All'}
                </button>
            </div>

            <div class="border-t border-slate-700 pt-3">
                <div
                    class="font-semibold text-slate-300 text-sm mb-3 flex items-center justify-between gap-2"
                >
                    <h5 class="flex items-center gap-2">
                        ${icons.timerReset} Individual Polling & Intervals
                    </h5>
                    <button
                        @click=${(e) => {
                            toggleDropdown(
                                e.currentTarget,
                                () => pollingIntervalPanelTemplate(null, true),
                                e
                            );
                        }}
                        class="text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded-md flex items-center gap-1.5"
                    >
                        <span>${
                            isGlobalOverrideActive
                                ? `Global: ${globalPollingIntervalOverride}s`
                                : `Global: Disabled`
                        }</span>
                        ${icons.settings}
                    </button>
                </div>
                ${individualPollingControls(liveStreams, isGlobalOverrideActive)}
            </div>

            <div class="border-t border-slate-700 pt-3">
                <h5
                    class="font-semibold text-slate-300 text-sm mb-2 flex items-center gap-2 ${tooltipTriggerClasses}"
                    data-tooltip="Actively download all new segments for selected representations to discover in-band events like SCTE-35."
                >
                    ${icons.download} Active Segment Polling
                </h5>
                ${customDropdownButton(
                    `Configure (${totalReps} active)`,
                    (e) => {
                        toggleDropdown(
                            e.currentTarget,
                            segmentPollingSelectorTemplate,
                            e
                        );
                    },
                    liveStreams.length === 0
                )}
            </div>
            <div class="border-t border-slate-700 pt-3">
                <h5
                    class="font-semibold text-slate-300 text-sm mb-2 flex items-center gap-2 ${tooltipTriggerClasses}"
                    data-tooltip="Override the default 10-minute timeout for stopping polling when the tab is in the background."
                >
                    ${icons.moon} Background Polling
                </h5>
                ${customDropdownButton(`Timeout: ${activeTimeout.label}`, (e) =>
                    toggleDropdown(
                        e.currentTarget,
                        () =>
                            formattedOptionsDropdownTemplate(
                                INACTIVITY_TIMEOUT_OPTIONS,
                                inactivityTimeoutOverride,
                                (option, event) => {
                                    event.stopPropagation();
                                    uiActions.setInactivityTimeoutOverride(
                                        option.id
                                    );
                                }
                            ),
                        e
                    )
                )}
            </div>
            <div class="border-t border-slate-700 pt-3">
                <h5
                    class="font-semibold text-slate-300 text-sm mb-2 flex items-center gap-2 ${tooltipTriggerClasses}"
                    data-tooltip="Automatically poll a live stream until a specific feature is detected in the manifest, then stop."
                >
                    ${icons.locateFixed} Conditional Polling
                </h5>
                ${conditionalPollingControls(liveStreams)}
            </div>
        </div>
    `;
};