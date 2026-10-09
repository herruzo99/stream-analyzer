import { eventBus } from '@/application/event-bus';
import { useMultiPlayerStore } from '@/state/multiPlayerStore';
import { useUiStore, uiActions } from '@/state/uiStore';
import { EVENTS } from '@/types/events';
import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';
import { multiPlayerService } from '../../application/multiPlayerService';

class MultiPlayerBottomPanel extends HTMLElement {
    constructor() {
        super();
        this.unsubscribe = null;
        this.unsubscribeUi = null;

        // Local state for dropdowns
        this.activeDropdown = null; // 'grid', 'actions', 'config' | null
        this._handleClickOutside = this._handleClickOutside.bind(this);
    }

    connectedCallback() {
        this.unsubscribe = useMultiPlayerStore.subscribe(() => this.render());
        this.unsubscribeUi = useUiStore.subscribe(() => this.render());
        document.addEventListener('click', this._handleClickOutside);
        this.render();
    }

    disconnectedCallback() {
        if (this.unsubscribe) this.unsubscribe();
        if (this.unsubscribeUi) this.unsubscribeUi();
        document.removeEventListener('click', this._handleClickOutside);
    }

    _handleClickOutside(event) {
        if (this.activeDropdown && !this.contains(event.target)) {
            this.activeDropdown = null;
            this.render();
        }
    }

    toggleDropdown(name, event) {
        event.stopPropagation();
        this.activeDropdown = this.activeDropdown === name ? null : name;
        this.render();
    }

    toggleLog() {
        const { activeSidebar } = useUiStore.getState();
        if (activeSidebar === 'contextual') {
            uiActions.setActiveSidebar(null);
        } else {
            uiActions.setActiveSidebar('contextual');
        }
    }

    renderDropdownMenu(items, positionClass = 'bottom-full mb-2 left-0') {
        const glassMenuStyle = `
            position: absolute;
            background: #1e293b;
            backdrop-filter: blur(20px);
            
            border-radius: 0.75rem;
            box-shadow: 0 8px 30px rgb(0 0 0 / 0.35);
            padding: 0.5rem;
            min-width: 200px;
            z-index: 50;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            gap: 2px;
            animation: fadeIn 0.15s ease-out;
        `;

        return html`
            <div class="${positionClass}" style="${glassMenuStyle}">
                ${items.map(item => html`
                    <button
                        @click=${(e) => {
                e.stopPropagation();
                item.action();
                this.activeDropdown = null;
                this.render();
            }}
                        class="
                            w-full text-left px-3 py-2 rounded-md text-sm font-medium
                            text-slate-400
                            hover:text-slate-100
                            hover:bg-slate-800
                            transition-colors duration-150
                            flex items-center gap-2
                        "
                    >
                        ${item.icon ? html`<span class="opacity-70">${item.icon}</span>` : ''}
                        ${item.label}
                    </button>
                    ${item.divider ? html`<div class="h-px bg-slate-800 my-1 opacity-50"></div>` : ''}
                `)}
            </div>
        `;
    }

    render() {
        const {
            players,
            gridColumns,
            showGlobalHud,
            globalMute,
            focusedStreamId,
        } = useMultiPlayerStore.getState();

        const { activeSidebar } = useUiStore.getState();
        const isLogOpen = activeSidebar === 'contextual';

        const playersList = Array.from(players.values());
        const selectedCount = playersList.filter(p => p.selectedForAction).length;
        const allPlaying = playersList.every(p => p.state === 'playing');
        const anyPlaying = playersList.some(p => p.state === 'playing');
        const mainIcon = allPlaying ? icons.pause : (anyPlaying ? icons.pause : icons.play);

        // --- STYLES ---
        const islandClass = `
            h-14 flex items-center px-4 gap-3
            bg-slate-800
            transition-all duration-300
            hover:bg-slate-800
            pointer-events-auto
            relative
        `;

        const islandStyle = `
            
            border-radius: 0.75rem;
            backdrop-filter: blur(12px);
            box-shadow: 0 8px 30px rgb(0 0 0 / 0.35);
        `;

        const btnBase = `
            relative flex items-center justify-center
            min-w-[40px] h-10 px-2 rounded-full
            text-slate-400
            transition-all duration-200
            hover:text-slate-100
            hover:bg-slate-800
            active:scale-95
            disabled:opacity-40 disabled:cursor-not-allowed
        `;

        const btnPrimary = `
            relative flex items-center justify-center
            w-14 h-14 rounded-full
            bg-blue-500 text-slate-200
            shadow-[0_0_20px_-5px_#3b82f6]
            hover:bg-[#60a5fa]
            transition-all duration-200
            hover:scale-105 active:scale-95
        `;

        const divider = `w-px h-6 bg-slate-800 opacity-50`;

        // --- DROPDOWN ITEMS DEFINITION ---

        // 1. Grid Options
        const gridOptions = [
            { label: 'Auto Layout', icon: icons.layout, action: () => useMultiPlayerStore.getState().setGridColumns('auto') },
            { divider: true },
            { label: '1 x 1 View', icon: icons.stop, action: () => useMultiPlayerStore.getState().setGridColumns('1') },
            { label: '2 x 2 Grid', icon: icons.grid, action: () => useMultiPlayerStore.getState().setGridColumns('2') },
            { label: '3 x 3 Grid', icon: icons.grid, action: () => useMultiPlayerStore.getState().setGridColumns('3') },
            { label: '4 x 4 Grid', icon: icons.grid, action: () => useMultiPlayerStore.getState().setGridColumns('4') },
        ];

        // 2. Selection Actions
        const selectionActions = [
            { label: 'Play Selected', icon: icons.play, action: () => multiPlayerService.applyActionToSelected({ type: 'play' }) },
            { label: 'Pause Selected', icon: icons.pause, action: () => multiPlayerService.applyActionToSelected({ type: 'pause' }) },
            { divider: true },
            { label: 'Mute Selected', icon: icons.volumeOff, action: () => multiPlayerService.applyActionToSelected({ type: 'mute' }) },
            { label: 'Unmute Selected', icon: icons.volumeUp, action: () => multiPlayerService.applyActionToSelected({ type: 'unmute' }) },
            { divider: true },
            { label: 'Sync to Live', icon: icons.radio, action: () => multiPlayerService.applyActionToSelected({ type: 'syncLive' }) },
            { label: 'Reset Players', icon: icons.refresh, action: () => multiPlayerService.resetSelectedPlayers() },
            { divider: true },
            {
                label: 'Remove Selected', icon: icons.trash, action: () => {
                    const selected = playersList.filter(p => p.selectedForAction);
                    selected.forEach(p => multiPlayerService.removePlayer(p.streamId));
                }
            },
        ];

        // 3. Configuration Actions (Bulk)
        const configActions = [
            { label: 'Enable ABR', icon: icons.activity, action: () => multiPlayerService.applyConfigToSelected({ abrEnabled: true }) },
            { label: 'Disable ABR', icon: icons.activity, action: () => multiPlayerService.applyConfigToSelected({ abrEnabled: false }) },
            { divider: true },
            { label: 'Limit: 1080p', icon: icons.monitor, action: () => multiPlayerService.applyConfigToSelected({ maxHeight: 1080 }) },
            { label: 'Limit: 720p', icon: icons.monitor, action: () => multiPlayerService.applyConfigToSelected({ maxHeight: 720 }) },
            { label: 'Limit: 480p', icon: icons.monitor, action: () => multiPlayerService.applyConfigToSelected({ maxHeight: 480 }) },
            { divider: true },
            { label: 'Cap: 5 Mbps', icon: icons.network, action: () => multiPlayerService.applyConfigToSelected({ maxBandwidth: 5000000 }) },
            { label: 'Cap: 2 Mbps', icon: icons.network, action: () => multiPlayerService.applyConfigToSelected({ maxBandwidth: 2000000 }) },
        ];


        const template = html`
            <style>
                @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
            </style>
            <div class="w-full h-full flex items-center justify-between pointer-events-none px-[0.75rem] pb-2">
                
                <!-- LEFT ISLAND: Selection & Grid -->
                <div class="${islandClass}" style="${islandStyle}">
                    <!-- Select All Toggle -->
                     <button
                        @click=${() => useMultiPlayerStore.getState().toggleSelectAll()}
                        class="${btnBase} !w-10 !px-0"
                        data-tooltip="Select All"
                    >
                         <div class="flex items-center justify-center w-6 h-6 rounded-full ${selectedCount > 0 ? 'bg-blue-500 text-white' : 'bg-slate-800'}">
                            ${icons.check}
                         </div>
                    </button>

                    <!-- Selection Count -->
                    <div class="flex flex-col leading-tight mr-2">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Selected</span>
                        <span class="text-slate-100 font-black text-sm">${selectedCount}</span>
                    </div>

                    <div class="${divider}"></div>

                    <!-- Actions Dropdown -->
                    <div class="relative">
                        <button
                            @click=${(e) => this.toggleDropdown('actions', e)}
                            class="${btnBase} ${this.activeDropdown === 'actions' ? 'bg-slate-800 text-blue-400' : ''}"
                            data-tooltip="Selection Actions"
                            ?disabled=${selectedCount === 0}
                        >
                            ${icons.layers}
                            <span class="ml-1 opacity-50 scale-75">${icons.chevronDown}</span>
                        </button>
                        ${this.activeDropdown === 'actions' ? this.renderDropdownMenu(selectionActions) : ''}
                    </div>

                    <!-- Config Dropdown -->
                    <div class="relative">
                        <button
                            @click=${(e) => this.toggleDropdown('config', e)}
                            class="${btnBase} ${this.activeDropdown === 'config' ? 'bg-slate-800 text-blue-400' : ''}"
                            data-tooltip="Deep Config"
                            ?disabled=${selectedCount === 0}
                        >
                            ${icons.slidersHorizontal}
                            <span class="ml-1 opacity-50 scale-75">${icons.chevronDown}</span>
                        </button>
                        ${this.activeDropdown === 'config' ? this.renderDropdownMenu(configActions) : ''}
                    </div>

                    <div class="${divider}"></div>

                    <!-- Grid Layout Dropdown -->
                    <div class="relative">
                        <button
                            @click=${(e) => this.toggleDropdown('grid', e)}
                            class="${btnBase} pl-3 pr-2 ${this.activeDropdown === 'grid' ? 'bg-slate-800 text-blue-400' : ''}"
                            data-tooltip="Layout Mode"
                        >
                            <span class="mr-2 text-xs font-semibold uppercase tracking-wide opacity-80">
                                ${gridColumns === 'auto' ? 'Auto' : `${gridColumns}x${gridColumns}`}
                            </span>
                             <span class="opacity-70">${icons.chevronDown}</span>
                        </button>
                         ${this.activeDropdown === 'grid' ? this.renderDropdownMenu(gridOptions) : ''}
                    </div>
                </div>

                <!-- CENTER ISLAND: Transport -->
                <div class="${islandClass} !h-20 !px-10 !gap-6 !rounded-full transform hover:-translate-y-1 z-10" style="${islandStyle}">
                     <button
                        @click=${() => eventBus.dispatch(EVENTS.UI.MP_SEEK_RELATIVE, { offset: -10 })}
                        class="${btnBase}"
                        data-tooltip="-10s"
                    >
                        ${icons.frameBackward}
                    </button>

                    <button
                        @click=${() => allPlaying ? multiPlayerService.pauseAll() : multiPlayerService.playAll()}
                        class="${btnPrimary}"
                        data-tooltip="${allPlaying ? 'Pause All' : 'Play All'}"
                    >
                        <div class="scale-125">${mainIcon}</div>
                    </button>

                    <button
                        @click=${() => eventBus.dispatch(EVENTS.UI.MP_SEEK_RELATIVE, { offset: 10 })}
                        class="${btnBase}"
                        data-tooltip="+10s"
                    >
                        ${icons.frameForward}
                    </button>
                </div>

                <!-- RIGHT ISLAND: Global Tools -->
                <div class="${islandClass}" style="${islandStyle}">
                    <button
                        @click=${() => eventBus.dispatch(EVENTS.UI.MP_SYNC_ALL_TO, { streamId: focusedStreamId })}
                        class="${btnBase} ${!focusedStreamId ? '' : 'text-blue-400'}"
                        data-tooltip="Sync All to Focused"
                        ?disabled=${!focusedStreamId}
                    >
                        ${icons.sync}
                    </button>
                    
                    <button
                        @click=${() => globalMute ? multiPlayerService.unmuteAll() : multiPlayerService.muteAll()}
                        class="${btnBase} ${globalMute ? 'text-red-400' : ''}"
                        data-tooltip="Global Mute"
                    >
                        ${globalMute ? icons.volumeOff : icons.volumeUp}
                    </button>

                    <div class="${divider}"></div>

                    <button
                        @click=${() => useMultiPlayerStore.getState().toggleGlobalHud()}
                        class="${btnBase} ${showGlobalHud ? '!bg-blue-500 !text-white' : ''}"
                        data-tooltip="Toggle Metrics HUD"
                    >
                       ${icons.activity}
                    </button>

                    <button
                        @click=${() => this.toggleLog()}
                        class="${btnBase} ${isLogOpen ? '!bg-blue-500 !text-white' : ''}"
                         data-tooltip="Result Log"
                    >
                        ${icons.terminal}
                    </button>
                    
                     <button
                        @click=${() => uiActions.toggleFabSideMenu()}
                        class="${btnBase}"
                         data-tooltip="Settings"
                    >
                        ${icons.settings}
                    </button>
                </div>

            </div>
        `;

        render(template, this);
    }
}

customElements.define('multi-player-bottom-panel', MultiPlayerBottomPanel);
