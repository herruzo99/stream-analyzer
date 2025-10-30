import { html, render } from 'lit-html';
import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import { eventBus } from '@/application/event-bus';
import { multiPlayerService } from '../../application/multiPlayerService';
import * as icons from '@/ui/icons';

const RESOLUTION_OPTIONS = [
    { label: 'Auto', value: Infinity },
    { label: '1080p', value: 1080 },
    { label: '720p', value: 720 },
    { label: '480p', value: 480 },
    { label: '360p', value: 360 },
];

const BUFFER_GOAL_OPTIONS = [
    { label: 'Default (10s)', value: 10 },
    { label: 'Low Latency (3s)', value: 3 },
    { label: 'Stable (30s)', value: 30 },
];

const OverrideSelect = ({ options, value, onchange, nullLabel }) => {
    return html`
        <select
            class="bg-gray-700 text-white rounded-md p-1 text-xs w-full"
            @change=${onchange}
            .value=${value === null ? 'global' : String(value)}
        >
            <option value="global">${nullLabel}</option>
            ${options.map(
                (opt) => html`<option value=${opt.value}>${opt.label}</option>`
            )}
        </select>
    `;
};

const StreamConfigRow = (player, isLast) => {
    const shakaPlayer = multiPlayerService.players.get(player.streamId);
    if (!shakaPlayer) return html``;

    return html`
        <tr class="border-b border-gray-700 hover:bg-gray-700/50">
            <td class="p-2 text-center">
                <input
                    type="checkbox"
                    .checked=${player.selectedForAction}
                    @change=${() =>
                        eventBus.dispatch('ui:multi-player:toggle-selection', {
                            streamId: player.streamId,
                        })}
                    class="rounded bg-gray-600 border-gray-500 text-blue-500 focus:ring-blue-600"
                />
            </td>
            <td class="p-2 font-semibold text-gray-300">
                ${player.streamName}
            </td>
            <td class="p-2">
                ${OverrideSelect({
                    options: [
                        { label: 'Enabled', value: 'true' },
                        { label: 'Disabled', value: 'false' },
                    ],
                    value: player.abrOverride,
                    onchange: (e) =>
                        eventBus.dispatch(
                            'ui:multi-player:set-stream-override',
                            {
                                streamId: player.streamId,
                                override: {
                                    abr:
                                        e.target.value === 'global'
                                            ? null
                                            : e.target.value === 'true',
                                },
                            }
                        ),
                    nullLabel: 'Global ABR',
                })}
            </td>
            <td class="p-2">
                ${OverrideSelect({
                    options: RESOLUTION_OPTIONS,
                    value: player.maxHeightOverride,
                    onchange: (e) =>
                        eventBus.dispatch(
                            'ui:multi-player:set-stream-override',
                            {
                                streamId: player.streamId,
                                override: {
                                    maxHeight:
                                        e.target.value === 'global'
                                            ? null
                                            : parseInt(e.target.value),
                                },
                            }
                        ),
                    nullLabel: 'Global Max Res',
                })}
            </td>
            <td class="p-2">
                ${OverrideSelect({
                    options: BUFFER_GOAL_OPTIONS,
                    value: player.bufferingGoalOverride,
                    onchange: (e) =>
                        eventBus.dispatch(
                            'ui:multi-player:set-stream-override',
                            {
                                streamId: player.streamId,
                                override: {
                                    bufferingGoal:
                                        e.target.value === 'global'
                                            ? null
                                            : parseInt(e.target.value),
                                },
                            }
                        ),
                    nullLabel: 'Global Buffer',
                })}
            </td>
            <td class="p-2 text-center">
                <button
                    @click=${() =>
                        eventBus.dispatch('ui:multi-player:duplicate-stream', {
                            streamId: player.streamId,
                        })}
                    class="text-blue-400 hover:text-blue-300 px-1"
                    title="Duplicate Stream"
                >
                    ${icons.clipboardCopy}
                </button>
                <button
                    @click=${() =>
                        eventBus.dispatch('ui:multi-player:remove-stream', {
                            streamId: player.streamId,
                        })}
                    class="text-red-400 hover:text-red-300 px-1 disabled:text-gray-600 disabled:cursor-not-allowed"
                    title=${isLast
                        ? 'Cannot remove the last player for this stream'
                        : 'Remove Player'}
                    ?disabled=${isLast}
                >
                    ${icons.xCircle}
                </button>
            </td>
        </tr>
    `;
};

export class ControlsViewComponent extends HTMLElement {
    constructor() {
        super();
        this.unsubscribe = null;
    }

    connectedCallback() {
        this.render();
        this.unsubscribe = useMultiPlayerStore.subscribe(() => this.render());
    }

    disconnectedCallback() {
        if (this.unsubscribe) this.unsubscribe();
    }

    render() {
        const {
            players,
            globalAbrEnabled,
            globalMaxHeight,
            globalBufferingGoal,
        } = useMultiPlayerStore.getState();

        const playersArray = Array.from(players.values());
        const isAllSelected = playersArray.every((p) => p.selectedForAction);

        const groupedPlayers = playersArray.reduce((acc, player) => {
            const key = player.sourceStreamId;
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(player);
            return acc;
        }, {});

        const handleToggleAll = () => {
            if (isAllSelected) {
                eventBus.dispatch('ui:multi-player:deselect-all');
            } else {
                eventBus.dispatch('ui:multi-player:select-all');
            }
        };

        const handleSeek = (delta) => {
            eventBus.dispatch('ui:multi-player:apply-to-selected', {
                action: { type: 'seek', delta },
            });
        };

        const template = html`
            <style>
                .control-button {
                    @apply bg-gray-700/50 hover:bg-gray-600/50 text-white font-bold p-2 rounded-md transition-colors flex-1 text-sm;
                }
            </style>
            <div class="space-y-8">
                <div>
                    <h4 class="text-lg font-bold mb-3">Global Defaults</h4>
                    <div
                        class="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-800 p-4 rounded-lg border border-gray-700"
                    >
                        <!-- Global Controls -->
                        <div class="flex items-center justify-between">
                            <label class="font-semibold text-gray-300"
                                >Enable ABR</label
                            >
                            <button
                                @click=${() =>
                                    eventBus.dispatch(
                                        'ui:multi-player:set-global-abr',
                                        { enabled: !globalAbrEnabled }
                                    )}
                                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${globalAbrEnabled
                                    ? 'bg-blue-600'
                                    : 'bg-gray-600'}"
                            >
                                <span
                                    class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${globalAbrEnabled
                                        ? 'translate-x-6'
                                        : 'translate-x-1'}"
                                ></span>
                            </button>
                        </div>
                        <div>
                            <label class="block font-semibold text-gray-300 mb-1"
                                >Max Resolution</label
                            >
                            <select
                                @change=${(e) =>
                                    eventBus.dispatch(
                                        'ui:multi-player:set-global-max-height',
                                        { height: parseInt(e.target.value) }
                                    )}
                                .value=${globalMaxHeight}
                                class="bg-gray-700 text-white rounded-md p-2 text-sm w-full"
                            >
                                ${RESOLUTION_OPTIONS.map(
                                    (opt) =>
                                        html`<option .value=${opt.value}>
                                            ${opt.label}
                                        </option>`
                                )}
                            </select>
                        </div>
                        <div>
                            <label class="block font-semibold text-gray-300 mb-1"
                                >Buffer Goal</label
                            >
                            <select
                                @change=${(e) =>
                                    eventBus.dispatch(
                                        'ui:multi-player:set-global-buffer-goal',
                                        { goal: parseInt(e.target.value) }
                                    )}
                                .value=${globalBufferingGoal}
                                class="bg-gray-700 text-white rounded-md p-2 text-sm w-full"
                            >
                                ${BUFFER_GOAL_OPTIONS.map(
                                    (opt) =>
                                        html`<option .value=${opt.value}>
                                            ${opt.label}
                                        </option>`
                                )}
                            </select>
                        </div>
                    </div>
                </div>

                <div>
                    <h4 class="text-lg font-bold mb-3">Group Time Controls</h4>
                    <div
                        class="bg-gray-800 p-4 rounded-lg border border-gray-700 flex items-center justify-center gap-4"
                    >
                        <button
                            @click=${() => handleSeek(-10)}
                            class="control-button"
                        >
                            -10s
                        </button>
                        <button
                            @click=${() =>
                                eventBus.dispatch(
                                    'ui:multi-player:apply-to-selected',
                                    {
                                        action: { type: 'pause' },
                                    }
                                )}
                            class="control-button"
                        >
                            ${icons.pause}
                        </button>
                        <button
                            @click=${() =>
                                eventBus.dispatch(
                                    'ui:multi-player:apply-to-selected',
                                    {
                                        action: { type: 'play' },
                                    }
                                )}
                            class="control-button"
                        >
                            ${icons.play}
                        </button>
                        <button
                            @click=${() => handleSeek(10)}
                            class="control-button"
                        >
                            +10s
                        </button>
                    </div>
                </div>

                <div>
                    <h4 class="text-lg font-bold mb-3">
                        Per-Stream Configuration
                    </h4>
                    <div
                        class="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden"
                    >
                        <table class="w-full text-left text-sm">
                            <thead class="bg-gray-900/50">
                                <tr>
                                    <th class="p-2 text-center w-12">
                                        <input
                                            type="checkbox"
                                            .checked=${isAllSelected}
                                            @change=${handleToggleAll}
                                            class="rounded bg-gray-600 border-gray-500 text-blue-500 focus:ring-blue-600"
                                            title="Select/Deselect All"
                                        />
                                    </th>
                                    <th class="p-2">Stream</th>
                                    <th class="p-2">ABR</th>
                                    <th class="p-2">Max Res</th>
                                    <th class="p-2">Buffer</th>
                                    <th class="p-2 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${Object.values(groupedPlayers).map(
                                    (group) =>
                                        group.map((p) =>
                                            StreamConfigRow(p, group.length <= 1)
                                        )
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        render(template, this);
    }
}