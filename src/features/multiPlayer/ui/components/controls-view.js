import { html, render } from 'lit-html';
import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import { eventBus } from '@/application/event-bus';
import { multiPlayerService } from '../../application/multiPlayerService';

const RESOLUTION_OPTIONS = [
    { label: 'Auto (Unlimited)', value: Infinity },
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

const TrackSelectionRow = (player) => {
    const shakaPlayer = multiPlayerService.players.get(player.streamId);
    if (!shakaPlayer) return html``;

    const videoTracks = shakaPlayer.getVariantTracks();
    const audioTracks = shakaPlayer.getAudioLanguagesAndRoles();
    const activeVideo = videoTracks.find((t) => t.active);
    const activeAudio = audioTracks.find((t) => t.active);

    const handleVideoTrackChange = (e) => {
        const value = e.target.value;
        if (value === '') {
            // This is the "Auto (ABR)" option.
            eventBus.dispatch('ui:multi-player:set-global-abr', {
                enabled: true,
            });
        } else {
            // This is a specific track selection.
            eventBus.dispatch('ui:multi-player:select-video-track', {
                streamId: player.streamId,
                trackId: parseInt(value, 10),
            });
        }
    };

    return html`
        <tr class="border-b border-gray-700">
            <td class="p-2 font-semibold text-gray-300">
                ${player.streamName}
            </td>
            <td class="p-2">
                <select
                    class="bg-gray-700 text-white rounded-md p-1 text-xs w-full"
                    @change=${handleVideoTrackChange}
                    .value=${useMultiPlayerStore.getState().globalAbrEnabled
                        ? ''
                        : activeVideo?.id || ''}
                >
                    <option value="">Auto (ABR)</option>
                    ${videoTracks.map(
                        (t) =>
                            html`<option value=${t.id}>
                                ${t.height}p @
                                ${(t.bandwidth / 1000000).toFixed(2)}Mbps
                            </option>`
                    )}
                </select>
            </td>
            <td class="p-2">
                <select
                    class="bg-gray-700 text-white rounded-md p-1 text-xs w-full"
                    @change=${(e) =>
                        eventBus.dispatch(
                            'ui:multi-player:select-audio-track',
                            {
                                streamId: player.streamId,
                                language: e.target.value,
                            }
                        )}
                    .value=${activeAudio?.language || ''}
                >
                    ${audioTracks.map(
                        (t) =>
                            html`<option value=${t.language}>
                                ${t.label || t.language}
                            </option>`
                    )}
                </select>
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

        const template = html`
            <div class="space-y-8">
                <div>
                    <h4 class="text-lg font-bold mb-3">
                        Global Player Controls
                    </h4>
                    <div
                        class="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-800 p-4 rounded-lg border border-gray-700"
                    >
                        <div class="flex items-center justify-between">
                            <label
                                for="global-abr-toggle"
                                class="font-semibold text-gray-300"
                                >Enable ABR</label
                            >
                            <button
                                @click=${() =>
                                    eventBus.dispatch(
                                        'ui:multi-player:set-global-abr',
                                        { enabled: !globalAbrEnabled }
                                    )}
                                role="switch"
                                aria-checked=${globalAbrEnabled}
                                id="global-abr-toggle"
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
                            <label
                                for="global-resolution-cap"
                                class="block font-semibold text-gray-300 mb-1"
                                >Max Resolution</label
                            >
                            <select
                                id="global-resolution-cap"
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
                            <label
                                for="global-buffer-goal"
                                class="block font-semibold text-gray-300 mb-1"
                                >Buffer Goal</label
                            >
                            <select
                                id="global-buffer-goal"
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
                    <h4 class="text-lg font-bold mb-3">
                        Per-Stream Track Selection
                    </h4>
                    <div
                        class="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden"
                    >
                        <table class="w-full text-left text-sm">
                            <thead class="bg-gray-900/50">
                                <tr>
                                    <th class="p-2">Stream</th>
                                    <th class="p-2">Video Track</th>
                                    <th class="p-2">Audio Track</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${Array.from(players.values()).map((p) =>
                                    TrackSelectionRow(p)
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
