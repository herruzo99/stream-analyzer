import { eventBus } from '@/application/event-bus';
import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import { formatPlayerTime } from '@/ui/shared/time-format';
import { html, render } from 'lit-html';
import { classMap } from 'lit-html/directives/class-map.js';
import { multiPlayerService } from '../../application/multiPlayerService.js';

class PlayerRosterComponent extends HTMLElement {
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

    _handleFocusPlayer(streamId) {
        const card = document.querySelector(
            `player-card-component[stream-id="${streamId}"]`
        );
        card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    _handleSeek(e, player) {
        const progressBar = e.currentTarget;
        const clickRect = progressBar.getBoundingClientRect();
        const clickX = e.clientX - clickRect.left;
        const normalizedPosition = clickX / clickRect.width;

        const { start, end } = player.seekableRange;
        const duration = end - start;

        if (isFinite(duration) && duration > 0) {
            const targetTime = start + normalizedPosition * duration;
            multiPlayerService.seek(targetTime, player.streamId);
        }
    }

    _handleToggleSelection(streamId) {
        eventBus.dispatch('ui:multi-player:toggle-selection', { streamId });
    }

    _handleToggleAll() {
        const { players } = useMultiPlayerStore.getState();
        const playersArray = Array.from(players.values());
        const isAllSelected =
            playersArray.length > 0 &&
            playersArray.every((p) => p.selectedForAction);

        if (isAllSelected) {
            eventBus.dispatch('ui:multi-player:deselect-all');
        } else {
            eventBus.dispatch('ui:multi-player:select-all');
        }
    }

    _handleMouseOver(streamId) {
        useMultiPlayerStore.getState().setHoveredStreamId(streamId);
    }

    _handleMouseOut() {
        useMultiPlayerStore.getState().setHoveredStreamId(null);
    }

    _renderRosterItem(player, isHovered) {
        const itemClasses = classMap({
            'p-3': true,
            'rounded-md': true,
            'cursor-pointer': true,
            'transition-colors': true,
            'hover:bg-slate-700/50': true,
            'ring-2': isHovered,
            'ring-purple-500': isHovered,
            'bg-slate-800/50': true,
        });

        const stateColors = {
            playing: 'bg-green-500',
            paused: 'bg-yellow-500',
            buffering: 'bg-blue-500 animate-pulse',
            ended: 'bg-slate-500',
            error: 'bg-red-500',
            loading: 'bg-slate-500 animate-pulse',
            idle: 'bg-slate-600',
        };

        const progressPercent = player.normalizedPlayheadTime * 100;

        const leftTimeLabel =
            player.streamType === 'live'
                ? formatPlayerTime(player.seekableRange.start)
                : formatPlayerTime(player.stats.playheadTime);

        const rightTimeLabel =
            player.streamType === 'live'
                ? 'LIVE'
                : formatPlayerTime(player.seekableRange.end);

        return html`
            <div
                class=${itemClasses}
                @click=${() => this._handleFocusPlayer(player.streamId)}
                @mouseover=${() => this._handleMouseOver(player.streamId)}
                @mouseout=${this._handleMouseOut}
            >
                <div class="flex items-center gap-3">
                    <input
                        type="checkbox"
                        .checked=${player.selectedForAction}
                        @click=${(e) => e.stopPropagation()}
                        @change=${() =>
                            this._handleToggleSelection(player.streamId)}
                        class="rounded bg-slate-600 border-slate-500 text-blue-500 focus:ring-blue-600 h-5 w-5 shrink-0"
                    />
                    <div
                        class="grow font-semibold text-slate-300 truncate text-sm"
                    >
                        ${player.streamName}
                    </div>
                    <div
                        class="w-3 h-3 rounded-full shrink-0 ${stateColors[
                            player.state
                        ] || 'bg-slate-600'}"
                        title="Status: ${player.state}"
                    ></div>
                </div>
                <div class="mt-2 pl-8">
                    <div
                        class="w-full bg-slate-700 rounded-full h-2 cursor-pointer relative"
                        @click=${(e) => this._handleSeek(e, player)}
                    >
                        <div
                            class="bg-slate-600 h-2 rounded-full absolute inset-0"
                        ></div>
                        <div
                            class="bg-blue-500 h-2 rounded-full absolute top-0 left-0"
                            style="width: ${progressPercent}%"
                        ></div>
                        <div
                            class="w-3 h-3 bg-blue-500 rounded-full absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-transform transform"
                            style="left: ${progressPercent}%"
                        ></div>
                    </div>
                    <div
                        class="flex justify-between text-xs text-slate-400 mt-1"
                    >
                        <span>${leftTimeLabel}</span>
                        <span>${rightTimeLabel}</span>
                    </div>
                </div>
            </div>
        `;
    }

    render() {
        const { players, hoveredStreamId } = useMultiPlayerStore.getState();
        const playersArray = Array.from(players.values());
        const isAllSelected =
            playersArray.length > 0 &&
            playersArray.every((p) => p.selectedForAction);

        const template = html`
            <div class="space-y-3">
                <div class="flex justify-between items-center">
                    <h4 class="text-md font-bold text-slate-300">
                        Player Roster
                    </h4>
                    <div class="flex items-center gap-2">
                        <label
                            for="select-all-toggle"
                            class="text-sm text-slate-400"
                            >Select All</label
                        >
                        <input
                            type="checkbox"
                            id="select-all-toggle"
                            .checked=${isAllSelected}
                            @change=${this._handleToggleAll}
                            class="rounded bg-slate-600 border-slate-500 text-blue-500 focus:ring-blue-600 h-5 w-5"
                        />
                    </div>
                </div>
                <div class="space-y-2">
                    ${playersArray.map((p) =>
                        this._renderRosterItem(
                            p,
                            p.streamId === hoveredStreamId
                        )
                    )}
                </div>
            </div>
        `;
        render(template, this);
    }
}

customElements.define('player-roster', PlayerRosterComponent);
