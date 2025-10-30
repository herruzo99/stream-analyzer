import { html, render } from 'lit-html';
import { eventBus } from '@/application/event-bus';
import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import * as icons from '@/ui/icons';
import './labeled-control.js';

const RESOLUTION_OPTIONS = [
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

const setOverride = (streamId, override) => {
    eventBus.dispatch('ui:multi-player:set-stream-override', {
        streamId,
        override,
    });
};

const overrideControl = ({ label, value, onReset, children }) => {
    const isOverridden = value !== null;
    return html`
        <div class="grid grid-cols-12 gap-2 items-center">
            <label class="col-span-4 text-gray-400">${label}</label>
            <div class="col-span-7">${children}</div>
            <div class="col-span-1">
                <button
                    @click=${onReset}
                    title="Reset to Global Default"
                    class="text-gray-500 hover:text-blue-400 disabled:text-gray-700 disabled:cursor-not-allowed"
                    .disabled=${!isOverridden}
                >
                    ${icons.xCircle}
                </button>
            </div>
        </div>
    `;
};

const playerControlCardTemplate = (player, isLastInGroup) => {
    const hasOverrides =
        player.abrOverride !== null ||
        player.maxHeightOverride !== null ||
        player.bufferingGoalOverride !== null;

    return html`
        <details
            class="group bg-gray-800 rounded-lg border ${player.selectedForAction
                ? 'border-blue-500'
                : 'border-gray-700'}"
            @mouseover=${() =>
                useMultiPlayerStore
                    .getState()
                    .setHoveredStreamId(player.streamId)}
            @mouseout=${() =>
                useMultiPlayerStore.getState().setHoveredStreamId(null)}
        >
            <summary
                class="flex items-center p-2 gap-2 list-none cursor-pointer"
            >
                <input
                    type="checkbox"
                    .checked=${player.selectedForAction}
                    @click=${(e) => e.stopPropagation()}
                    @change=${() =>
                        eventBus.dispatch('ui:multi-player:toggle-selection', {
                            streamId: player.streamId,
                        })}
                    class="rounded bg-gray-600 border-gray-500 text-blue-500 focus:ring-blue-600 h-5 w-5"
                />
                <div class="grow font-semibold text-gray-300 truncate">
                    ${player.streamName}
                </div>
                ${hasOverrides
                    ? html`<span
                          class="text-xs bg-blue-900/50 text-blue-300 px-2 py-1 rounded-full"
                          >Overrides</span
                      >`
                    : ''}
                <span
                    class="text-gray-400 p-1 rounded-full transition-transform group-open:rotate-180"
                    title="Configure Overrides"
                >
                    ${icons.chevronDown}
                </span>
                <button
                    @click=${(e) => {
                        e.preventDefault();
                        eventBus.dispatch('ui:multi-player:duplicate-stream', {
                            streamId: player.streamId,
                        });
                    }}
                    class="text-blue-400 hover:text-blue-300 p-1 rounded-full hover:bg-gray-600"
                    title="Duplicate Stream"
                >
                    ${icons.clipboardCopy}
                </button>
                <button
                    @click=${(e) => {
                        e.preventDefault();
                        eventBus.dispatch('ui:multi-player:remove-stream', {
                            streamId: player.streamId,
                        });
                    }}
                    class="text-red-400 hover:text-red-300 p-1 rounded-full hover:bg-gray-600 disabled:text-gray-600 disabled:cursor-not-allowed"
                    title=${isLastInGroup
                        ? 'Cannot remove the last player for this stream'
                        : 'Remove Player'}
                    .disabled=${isLastInGroup}
                >
                    ${icons.xCircle}
                </button>
            </summary>
            <div class="p-3 text-xs space-y-3 bg-gray-900/50 rounded-b-lg">
                ${overrideControl({
                    label: 'ABR',
                    value: player.abrOverride,
                    onReset: () => setOverride(player.streamId, { abr: null }),
                    children: html`
                        <select
                            class="bg-gray-700 text-white rounded-md p-1 text-xs w-full border border-gray-600"
                            @change=${(e) =>
                                setOverride(player.streamId, {
                                    abr: e.target.value === 'true',
                                })}
                            .value=${player.abrOverride !== null
                                ? String(player.abrOverride)
                                : 'true'}
                        >
                            <option value="true">Enabled</option>
                            <option value="false">Disabled</option>
                        </select>
                    `,
                })}
                ${overrideControl({
                    label: 'Max Res',
                    value: player.maxHeightOverride,
                    onReset: () =>
                        setOverride(player.streamId, { maxHeight: null }),
                    children: html`
                        <select
                            class="bg-gray-700 text-white rounded-md p-1 text-xs w-full border border-gray-600"
                            @change=${(e) =>
                                setOverride(player.streamId, {
                                    maxHeight: parseInt(e.target.value),
                                })}
                            .value=${player.maxHeightOverride !== null
                                ? String(player.maxHeightOverride)
                                : '1080'}
                        >
                            ${RESOLUTION_OPTIONS.map(
                                (opt) =>
                                    html`<option value=${opt.value}>
                                        ${opt.label}
                                    </option>`
                            )}
                        </select>
                    `,
                })}
                ${overrideControl({
                    label: 'Buffer',
                    value: player.bufferingGoalOverride,
                    onReset: () =>
                        setOverride(player.streamId, { bufferingGoal: null }),
                    children: html`
                        <select
                            class="bg-gray-700 text-white rounded-md p-1 text-xs w-full border border-gray-600"
                            @change=${(e) =>
                                setOverride(player.streamId, {
                                    bufferingGoal: parseInt(e.target.value),
                                })}
                            .value=${player.bufferingGoalOverride !== null
                                ? String(player.bufferingGoalOverride)
                                : '10'}
                        >
                            ${BUFFER_GOAL_OPTIONS.map(
                                (opt) =>
                                    html`<option value=${opt.value}>
                                        ${opt.label}
                                    </option>`
                            )}
                        </select>
                    `,
                })}
            </div>
        </details>
    `;
};

export class PlayerControlCardComponent extends HTMLElement {
    constructor() {
        super();
        this._player = null;
        this._isLastInGroup = false;
    }

    set player(newPlayer) {
        if (this._player === newPlayer) return;
        this._player = newPlayer;
        this.render();
    }

    get player() {
        return this._player;
    }

    set isLastInGroup(value) {
        if (this._isLastInGroup === value) return;
        this._isLastInGroup = value;
        this.render();
    }

    get isLastInGroup() {
        return this._isLastInGroup;
    }

    connectedCallback() {
        this.render();
    }

    render() {
        if (!this._player) return;
        render(
            playerControlCardTemplate(this._player, this._isLastInGroup),
            this
        );
    }
}

customElements.define('player-control-card', PlayerControlCardComponent);
