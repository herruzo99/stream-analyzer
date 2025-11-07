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

const individualPollingControls = (liveStreams) => {
    const handleToggle = (streamId, isCurrentlyPolling) => {
        analysisActions.setStreamPolling(streamId, !isCurrentlyPolling);
    };

    return html`
        <div class="space-y-2">
            ${liveStreams.map(
                (stream) => html`
                    <div
                        class="flex items-center justify-between p-2 bg-slate-900/50 rounded-md"
                    >
                        <span
                            class="text-sm font-medium text-slate-300 truncate"
                            title=${stream.name}
                            >${stream.name}</span
                        >
                        <button
                            @click=${() =>
                                handleToggle(stream.id, stream.isPolling)}
                            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${stream.isPolling
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
            @click=${() => {
                onSelect(stream);
                setTimeout(closeDropdown, 0);
            }}
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
        if (!targetStreamId || !targetFeatureName) {
            eventBus.dispatch('ui:show-status', {
                message: 'Please select a stream and a feature.',
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
                                (stream) => {
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
                            formattedOptionsDropdownTemplate(
                                applicableFeatures.map((f) => ({
                                    id: f.name,
                                    label: f.name,
                                    description: f.desc,
                                })),
                                targetFeatureName,
                                (feature) => {
                                    uiActions.setConditionalPollingTarget({
                                        targetFeatureName: feature.id,
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
                class="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-md text-sm"
            >
                ${icons.locateFixed} Start "Seek to Feature"
            </button>
        </form>
    `;
};

export const pollingDropdownPanelTemplate = () => {
    const { streams } = useAnalysisStore.getState();
    const { inactivityTimeoutOverride } = useUiStore.getState();
    const liveStreams = streams.filter((s) => s.manifest?.type === 'dynamic');
    const isAnyPolling = liveStreams.some((s) => s.isPolling);
    const activeTimeout =
        INACTIVITY_TIMEOUT_OPTIONS.find(
            (opt) => opt.id === inactivityTimeoutOverride
        ) || INACTIVITY_TIMEOUT_OPTIONS[0];

    return html`
        <div
            class="dropdown-panel bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-80 p-3 space-y-4"
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
            ${individualPollingControls(liveStreams)}
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
                                (option) => {
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
