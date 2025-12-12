import { qualityActions } from '@/state/qualityStore';
import * as icons from '@/ui/icons';
// import { tooltipTriggerClasses } from '@/ui/shared/constants';
import { formatBitrate } from '@/ui/shared/format';
import { html, render } from 'lit-html';
import {
    ANALYSIS_LAYERS,
    LAYER_PRESETS,
    SCAN_SPEEDS,
} from '../../domain/analysis-config.js';

class QcConfig extends HTMLElement {
    constructor() {
        super();
        this.activeLayers = new Set();
        this._duration = 30;
        this._offset = 0;
        this._scanSpeed = 'deep';
        this._streams = [];
        this._selectedStreamIds = new Set();
        this._onStart = null;
        this._onCancel = null;

        this._trackSelections = new Map();
        this._configuringStreamId = null;
        this._maxStreamDuration = 600; // Initialize to default safe value
    }

    connectedCallback() {
        this.classList.add('block', 'h-full', 'w-full', 'overflow-hidden');
        this.render();
    }

    set data(val) {
        if (!val) return;
        this.activeLayers = val.activeLayers;
        this._duration = val.scanDuration;
        this._offset = val.scanStartOffset;
        this._scanSpeed = val.scanSpeed || 'deep';
        this._streams = val.streams || [];
        this._maxStreamDuration = val.streamDuration || 600; // Update from data
        this._onStart = val.onStart;
        this._onCancel = val.onCancel;

        if (this._selectedStreamIds.size === 0 && this._streams.length > 0) {
            this._streams.forEach((s) => this._selectedStreamIds.add(s.id));
        }

        // Default track selections (Targeting 720p)
        // Default track selections (Targeting 720p for video, first track for audio)
        const TARGET_HEIGHT = 720;
        this._streams.forEach((stream) => {
            if (!this._trackSelections.has(stream.id)) {
                const videoTracks = stream.manifest?.summary?.videoTracks || [];
                const audioTracks = stream.manifest?.summary?.audioTracks || [];

                let videoTrackId = null;
                let audioTrackId = null;

                if (videoTracks.length > 0) {
                    // Find closest to 720p
                    const bestTrack = videoTracks.reduce((prev, curr) => {
                        const prevH = prev.height || 0;
                        const currH = curr.height || 0;
                        const prevDiff = Math.abs(prevH - TARGET_HEIGHT);
                        const currDiff = Math.abs(currH - TARGET_HEIGHT);

                        if (prevDiff === currDiff) {
                            // Break ties with bandwidth (higher is usually better quality for QC)
                            return (curr.bandwidth || 0) > (prev.bandwidth || 0)
                                ? curr
                                : prev;
                        }
                        return currDiff < prevDiff ? curr : prev;
                    }, videoTracks[0]);
                    videoTrackId = bestTrack.id;
                }

                if (audioTracks.length > 0) {
                    audioTrackId = audioTracks[0].id;
                }

                if (videoTrackId || audioTrackId) {
                    this._trackSelections.set(stream.id, {
                        videoTrackId,
                        audioTrackId,
                    });
                }
            }
        });

        this.render();
    }

    toggleLayer(id) {
        const layer = Object.values(ANALYSIS_LAYERS).find((l) => l.id === id);
        const currentSpeed = SCAN_SPEEDS[this._scanSpeed.toUpperCase()];
        if (layer.requiresSequential && currentSpeed.interval > 1) return;
        const isActive = this.activeLayers.has(id);
        qualityActions.setLayerActive(id, !isActive);
    }

    toggleBulk(layers) {
        const ids = layers.map((l) => l.id);
        const allActive = ids.every((id) => this.activeLayers.has(id));
        qualityActions.setBulkLayersActive(ids, !allActive);
    }

    applyLayerPreset(preset) {
        qualityActions.setBulkLayersActive(
            Object.values(ANALYSIS_LAYERS).map((l) => l.id),
            false
        );
        qualityActions.setBulkLayersActive(preset.layers, true);
    }

    updateConfig(updates) {
        let { scanStartOffset, scanDuration } = {
            scanStartOffset: this._offset,
            scanDuration: this._duration,
            ...updates,
        };
        const total = this._maxStreamDuration;
        const maxStart = Math.max(0, total - 1);
        scanStartOffset = Math.max(0, Math.min(scanStartOffset, maxStart));
        const maxDuration = Math.max(1, total - scanStartOffset);
        scanDuration = Math.max(1, Math.min(scanDuration, maxDuration));
        qualityActions.setConfig({ scanStartOffset, scanDuration });
    }

    setPreset(type) {
        const total = this._maxStreamDuration;
        let newOffset = this._offset;
        let newDuration = this._duration;
        switch (type) {
            case 'start':
                newOffset = 0;
                break;
            case 'middle':
                newOffset = Math.floor(total / 2) - this._duration / 2;
                break;
            case 'end':
                newOffset = Math.max(0, total - this._duration);
                break;
            case 'short':
                newDuration = 10;
                break;
            case 'long':
                newDuration = 60;
                break;
            case 'full':
                newOffset = 0;
                newDuration = total;
                break;
        }
        this.updateConfig({
            scanStartOffset: newOffset,
            scanDuration: newDuration,
        });
    }

    toggleStreamSelection(id) {
        if (this._selectedStreamIds.has(id)) {
            this._selectedStreamIds.delete(id);
        } else {
            this._selectedStreamIds.add(id);
        }
        this.render();
    }

    toggleAllStreams() {
        if (this._selectedStreamIds.size === this._streams.length) {
            this._selectedStreamIds.clear();
        } else {
            this._streams.forEach((s) => this._selectedStreamIds.add(s.id));
        }
        this.render();
    }

    toggleConfiguringStream(streamId) {
        if (this._configuringStreamId === streamId) {
            this._configuringStreamId = null;
        } else {
            this._configuringStreamId = streamId;
        }
        this.render();
    }

    setStreamTrack(streamId, type, trackId) {
        const currentSelection = this._trackSelections.get(streamId) || {};
        const newSelection = { ...currentSelection };
        if (type === 'video') newSelection.videoTrackId = trackId;
        if (type === 'audio') newSelection.audioTrackId = trackId;
        if (!trackId) {
            if (type === 'video') delete newSelection.videoTrackId;
            if (type === 'audio') delete newSelection.audioTrackId;
        }
        this._trackSelections.set(streamId, newSelection);
        this.render();
    }

    renderSpeedSelector() {
        const speeds = Object.values(SCAN_SPEEDS);
        return html`
            <div
                class="flex flex-col gap-2 bg-slate-900/50 p-1.5 rounded-xl border border-slate-800/50"
            >
                ${speeds.map((speed) => {
                    const isActive = this._scanSpeed === speed.id;
                    return html`
                        <button
                            @click=${() =>
                                qualityActions.setConfig({
                                    scanSpeed: speed.id,
                                })}
                            class="relative p-3 rounded-lg text-left transition-all duration-200 group ${isActive
                                ? 'bg-slate-800 ring-1 ring-slate-700 shadow-sm'
                                : 'hover:bg-slate-800/50'}"
                        >
                            <div
                                class="flex justify-between items-center mb-0.5"
                            >
                                <span
                                    class="text-xs font-bold ${isActive
                                        ? 'text-white'
                                        : 'text-slate-400'}"
                                    >${speed.label}</span
                                >
                                ${isActive
                                    ? html`<span
                                          class="text-emerald-400 scale-75"
                                          >${icons.checkCircle}</span
                                      >`
                                    : ''}
                            </div>
                            <div
                                class="text-[10px] ${isActive
                                    ? 'text-slate-400'
                                    : 'text-slate-600'}"
                            >
                                Every ${speed.interval}
                                frame${speed.interval > 1 ? 's' : ''}
                            </div>
                        </button>
                    `;
                })}
            </div>
        `;
    }

    renderModuleCard(layer) {
        const isActive = this.activeLayers.has(layer.id);
        const currentSpeed = SCAN_SPEEDS[this._scanSpeed.toUpperCase()];
        const isDisabled =
            layer.requiresSequential && currentSpeed.interval > 1;

        const baseClass =
            'relative flex items-center p-3 rounded-lg border cursor-pointer transition-all select-none h-full';
        const stateClass = isDisabled
            ? 'bg-slate-900/50 border-slate-800 opacity-40 grayscale cursor-not-allowed'
            : isActive
              ? 'bg-emerald-900/10 border-emerald-500/50 shadow-sm'
              : 'bg-slate-900 border-slate-800 hover:border-slate-600 hover:bg-slate-800/80';

        let icon = icons.activity;
        if (layer.id.includes('luma') || layer.id === 'black_frame')
            icon = icons.sun;
        if (layer.id.includes('audio') || layer.id === 'silence')
            icon = icons.volumeUp;
        if (layer.id === 'freeze' || layer.id === 'metric_motion')
            icon = icons.history;
        if (layer.id === 'broadcast_safe') icon = icons.shieldCheck;

        return html`
            <div
                @click=${() => this.toggleLayer(layer.id)}
                class="${baseClass} ${stateClass}"
            >
                <div
                    class="flex items-center justify-center w-10 h-10 rounded-md bg-slate-950 border border-slate-800 mr-3 ${isActive
                        ? 'text-emerald-400'
                        : 'text-slate-500'}"
                >
                    ${icon}
                </div>
                <div class="min-w-0 flex-1">
                    <div class="flex justify-between items-center mb-0.5">
                        <div
                            class="font-bold text-xs text-slate-200 truncate pr-2"
                        >
                            ${layer.label}
                        </div>
                        ${isActive
                            ? html`<div
                                  class="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_currentColor]"
                              ></div>`
                            : ''}
                    </div>
                    <div
                        class="text-[10px] text-slate-500 leading-tight line-clamp-2"
                        title="${isDisabled
                            ? 'Requires Deep Scan'
                            : layer.description}"
                    >
                        ${isDisabled ? 'Requires Deep Scan' : layer.description}
                    </div>

                    <div class="flex gap-2 mt-2">
                        <span
                            class="text-[9px] font-mono text-slate-600 bg-black/20 px-1 rounded border border-white/5 uppercase"
                            >${layer.cost} CPU</span
                        >
                    </div>
                </div>
            </div>
        `;
    }

    renderSelectAllBtn(layers, label = 'All') {
        const ids = layers.map((l) => l.id);
        const allSelected = ids.every((id) => this.activeLayers.has(id));
        const someSelected = ids.some((id) => this.activeLayers.has(id));
        const icon = allSelected
            ? icons.checkCircle
            : someSelected
              ? icons.minusCircle
              : icons.circle;
        const color = allSelected
            ? 'text-blue-400'
            : 'text-slate-500 hover:text-slate-300';
        return html`
            <button
                @click=${() => this.toggleBulk(layers)}
                class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${color} transition-colors"
            >
                <span class="scale-75">${icon}</span>
                ${allSelected ? 'Clear' : 'Select All'}
            </button>
        `;
    }

    renderStreamTrackSelector(stream) {
        const isConfiguring = this._configuringStreamId === stream.id;
        if (!isConfiguring) return '';
        const selection = this._trackSelections.get(stream.id) || {};
        const videoTracks = stream.manifest?.summary?.videoTracks || [];
        const audioTracks = stream.manifest?.summary?.audioTracks || [];

        return html`
            <div
                class="p-4 bg-slate-950/50 border-t border-slate-800/50 animate-slideInDown text-xs shadow-inner"
            >
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                        <div
                            class="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-2"
                        >
                            ${icons.clapperboard} Video Track
                        </div>
                        <div class="flex flex-wrap gap-2">
                            <button
                                @click=${(e) => {
                                    e.stopPropagation();
                                    this.setStreamTrack(
                                        stream.id,
                                        'video',
                                        null
                                    );
                                }}
                                class="px-3 py-1.5 rounded-full border transition-all text-[11px] font-medium ${!selection.videoTrackId
                                    ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-900/20'
                                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'}"
                            >
                                Auto
                            </button>
                            ${videoTracks.map((t) => {
                                const isSelected =
                                    selection.videoTrackId === t.id;
                                const res =
                                    t.resolutions?.[0]?.value || 'Unknown';
                                return html`
                                    <button
                                        @click=${(e) => {
                                            e.stopPropagation();
                                            this.setStreamTrack(
                                                stream.id,
                                                'video',
                                                t.id
                                            );
                                        }}
                                        class="px-3 py-1.5 rounded-full border transition-all text-[11px] font-medium ${isSelected
                                            ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-900/20'
                                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'}"
                                    >
                                        ${t.label || res}
                                        <span
                                            class="opacity-60 ml-1 font-normal"
                                            >${t.label
                                                ? res
                                                : formatBitrate(
                                                      t.bandwidth
                                                  )}</span
                                        >
                                    </button>
                                `;
                            })}
                        </div>
                    </div>
                    <div>
                        <div
                            class="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-2"
                        >
                            ${icons.audioLines} Audio Track
                        </div>
                        <div class="flex flex-wrap gap-2">
                            ${audioTracks.map((t) => {
                                const isSelected =
                                    selection.audioTrackId === t.id;
                                return html`
                                    <button
                                        @click=${(e) => {
                                            e.stopPropagation();
                                            this.setStreamTrack(
                                                stream.id,
                                                'audio',
                                                t.id
                                            );
                                        }}
                                        class="px-3 py-1.5 rounded-full border transition-all text-[11px] font-medium ${isSelected
                                            ? 'bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-900/20'
                                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'}"
                                    >
                                        ${t.label ||
                                        t.lang?.toUpperCase() ||
                                        'UND'}
                                    </button>
                                `;
                            })}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderStreamSelector() {
        const allSelected =
            this._streams.length > 0 &&
            this._selectedStreamIds.size === this._streams.length;

        return html`
            <div class="mb-8">
                <div class="flex items-center justify-between mb-3">
                    <span
                        class="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"
                    >
                        ${icons.server} Target Streams
                    </span>
                    <button
                        @click=${() => this.toggleAllStreams()}
                        class="text-[10px] font-bold text-blue-400 hover:text-white uppercase tracking-wider transition-colors"
                    >
                        ${allSelected ? 'Select None' : 'Select All'}
                    </button>
                </div>

                <div class="flex flex-col gap-2">
                    ${this._streams.map((s) => {
                        const isSelected = this._selectedStreamIds.has(s.id);
                        const isConfiguring =
                            this._configuringStreamId === s.id;
                        const selection = this._trackSelections.get(s.id);
                        // const hasCustomTrack = selection && (selection.videoTrackId || selection.audioTrackId);
                        const isLive = s.manifest?.type === 'dynamic';

                        // --- BADGE LOGIC ---
                        let videoText = 'Auto';
                        let audioText = 'Default';

                        if (selection?.videoTrackId) {
                            const t = s.manifest?.summary?.videoTracks.find(
                                (vt) => vt.id === selection.videoTrackId
                            );
                            if (t)
                                videoText =
                                    t.label ||
                                    t.resolutions?.[0]?.value ||
                                    t.height ||
                                    '?p';
                        }

                        if (selection?.audioTrackId) {
                            const t = s.manifest?.summary?.audioTracks.find(
                                (at) => at.id === selection.audioTrackId
                            );
                            if (t)
                                audioText =
                                    t.label || t.lang?.toUpperCase() || 'UND';
                            else
                                audioText =
                                    selection.audioTrackId.toUpperCase();
                        }
                        // -------------------

                        return html`
                            <div
                                class="flex flex-col rounded-lg border transition-all overflow-hidden ${isSelected
                                    ? 'bg-blue-900/10 border-blue-500/50 shadow-sm'
                                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'}"
                            >
                                <div class="flex items-center p-3 gap-4 group">
                                    <!-- Checkbox Area -->
                                    <div
                                        class="flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer transition-colors ${isSelected
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'bg-slate-950 border border-slate-800 text-transparent hover:border-slate-600'}"
                                        @click=${() =>
                                            this.toggleStreamSelection(s.id)}
                                    >
                                        <span class="scale-75"
                                            >${icons.checkCircle}</span
                                        >
                                    </div>

                                    <!-- Stream Info -->
                                    <div
                                        class="min-w-0 grow cursor-pointer"
                                        @click=${() =>
                                            this.toggleStreamSelection(s.id)}
                                    >
                                        <div
                                            class="flex items-center gap-2 mb-0.5"
                                        >
                                            <span
                                                class="text-sm font-bold text-slate-200 truncate"
                                                >${s.name}</span
                                            >
                                            ${isLive
                                                ? html`<span
                                                      class="text-[9px] font-black text-red-400 bg-red-900/20 px-1.5 py-0.5 rounded border border-red-500/30 tracking-wide"
                                                      >LIVE</span
                                                  >`
                                                : ''}
                                            <span
                                                class="text-[9px] font-mono text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 uppercase"
                                                >${s.protocol}</span
                                            >
                                        </div>
                                        <div
                                            class="text-[10px] text-slate-500 font-mono truncate opacity-70"
                                        >
                                            ${new URL(s.originalUrl).hostname}
                                        </div>
                                    </div>

                                    <!-- Configuration Summary & Toggle -->
                                    <div
                                        class="flex items-center gap-3 pl-4 border-l border-slate-800/50 cursor-pointer hover:bg-white/5 self-stretch -my-3 py-3 pr-3 transition-colors"
                                        @click=${(e) => {
                                            e.stopPropagation();
                                            this.toggleConfiguringStream(s.id);
                                        }}
                                    >
                                        <div
                                            class="flex flex-col items-end gap-0.5"
                                        >
                                            <div
                                                class="flex items-center gap-1.5 text-[10px] font-medium ${selection?.videoTrackId
                                                    ? 'text-blue-400'
                                                    : 'text-slate-500'}"
                                            >
                                                ${icons.clapperboard}
                                                ${videoText}
                                            </div>
                                            <div
                                                class="flex items-center gap-1.5 text-[10px] font-medium ${selection?.audioTrackId
                                                    ? 'text-purple-400'
                                                    : 'text-slate-500'}"
                                            >
                                                ${icons.audioLines} ${audioText}
                                            </div>
                                        </div>
                                        <div
                                            class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 transition-all ${isConfiguring
                                                ? 'bg-slate-800 text-white rotate-180'
                                                : 'hover:bg-slate-800 hover:text-slate-300'}"
                                        >
                                            ${icons.chevronDown}
                                        </div>
                                    </div>
                                </div>

                                ${this.renderStreamTrackSelector(s)}
                            </div>
                        `;
                    })}
                </div>
            </div>
        `;
    }

    renderTimelineStrip() {
        const maxStreamDuration = this._maxStreamDuration;
        const startPct = (this._offset / maxStreamDuration) * 100;
        const widthPct = (this._duration / maxStreamDuration) * 100;
        const formatTime = (secs) =>
            new Date(secs * 1000).toISOString().substr(11, 8);
        const maxStart = Math.max(0, maxStreamDuration - 1);
        const maxDuration = Math.max(1, maxStreamDuration - this._offset);

        const styleBlock = html`<style>
            .no-spinner::-webkit-inner-spin-button,
            .no-spinner::-webkit-outer-spin-button {
                -webkit-appearance: none;
                margin: 0;
            }
            .no-spinner {
                -moz-appearance: textfield;
            }
        </style>`;

        const renderTimelineControl = ({
            label,
            valStr,
            highlightColor,
            inputValue,
            min,
            max,
            onChange,
            onAdjust,
        }) => html`
            <div
                class="flex-1 bg-slate-800/40 rounded-xl p-2 border border-slate-700/50 flex flex-col justify-center relative group hover:border-${highlightColor.replace(
                    'text-',
                    ''
                )}/30 transition-colors min-w-[200px]"
            >
                <div class="flex justify-between items-center px-2 mb-1">
                    <label
                        class="text-[10px] font-bold text-slate-500 uppercase tracking-wider"
                        >${label}</label
                    >
                    <span class="font-mono text-[10px] ${highlightColor}"
                        >${valStr}</span
                    >
                </div>
                <div class="flex items-center gap-3 px-1">
                    <input
                        type="number"
                        min="${min}"
                        max="${max}"
                        .value=${inputValue}
                        @change=${onChange}
                        class="font-mono text-lg font-bold text-white bg-transparent outline-none w-16 text-center focus:${highlightColor} transition-colors no-spinner"
                    />
                    <div class="flex items-center gap-2 grow">
                        <button
                            @click=${() => onAdjust(-1)}
                            class="w-6 h-6 flex items-center justify-center rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors text-xs font-bold"
                        >
                            ${icons.arrowLeft}
                        </button>
                        <input
                            type="range"
                            min="${min}"
                            max="${max}"
                            .value=${inputValue}
                            @input=${onChange}
                            class="grow h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-${highlightColor.replace(
                                'text-',
                                ''
                            )} hover:opacity-80"
                        />
                        <button
                            @click=${() => onAdjust(1)}
                            class="w-6 h-6 flex items-center justify-center rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors text-xs font-bold"
                        >
                            ${icons.arrowRight}
                        </button>
                    </div>
                </div>
            </div>
        `;

        const isDisabled = this._selectedStreamIds.size === 0;

        return html`
            ${styleBlock}
            <div
                class="bg-slate-900/95 border-t border-slate-800 p-0 backdrop-blur-md absolute bottom-0 left-0 right-0 z-20 shadow-2xl"
            >
                <div
                    class="relative h-2 w-full bg-slate-950 border-b border-slate-800"
                >
                    <div
                        class="absolute top-0 bottom-0 bg-gradient-to-r from-blue-600 to-emerald-500 opacity-50"
                        style="left: ${startPct}%; width: ${widthPct}%;"
                    ></div>
                </div>
                <div
                    class="flex flex-col xl:flex-row items-center justify-between p-4 max-w-7xl mx-auto gap-6"
                >
                    <div class="flex gap-3 shrink-0 w-full xl:w-auto">
                        <!-- CANCEL BUTTON (Visible if callback present) -->
                        ${this._onCancel
                            ? html`
                                  <button
                                      @click=${this._onCancel}
                                      class="px-6 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-sm transition-colors flex-1 xl:flex-none"
                                  >
                                      Cancel
                                  </button>
                              `
                            : ''}

                        <button
                            @click=${() =>
                                this._onStart(
                                    Array.from(this._selectedStreamIds),
                                    this._trackSelections
                                )}
                            ?disabled=${isDisabled}
                            class="px-8 py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-700 text-white rounded-xl font-black uppercase tracking-wider text-sm shadow-lg shadow-blue-900/40 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 group flex-1 xl:flex-none"
                        >
                            <span
                                class="bg-white/20 p-1.5 rounded-full group-hover:bg-white/30 transition-colors"
                                >${icons.play}</span
                            >
                            <span
                                >Start Scan
                                ${isDisabled
                                    ? ''
                                    : `(${this._selectedStreamIds.size})`}</span
                            >
                        </button>
                    </div>

                    <div
                        class="h-px w-full xl:h-12 xl:w-px bg-slate-800 hidden xl:block"
                    ></div>

                    <div class="flex flex-wrap gap-4 grow w-full">
                        ${renderTimelineControl({
                            label: 'Start Time',
                            valStr: formatTime(this._offset),
                            highlightColor: 'text-blue-400',
                            inputValue: this._offset,
                            min: 0,
                            max: maxStart,
                            onChange: (e) =>
                                this.updateConfig({
                                    scanStartOffset: Number(e.target.value),
                                }),
                            onAdjust: (delta) =>
                                this.updateConfig({
                                    scanStartOffset: this._offset + delta,
                                }),
                        })}
                        ${renderTimelineControl({
                            label: 'Duration',
                            valStr: `Limit: ${formatTime(maxDuration)}`,
                            highlightColor: 'text-emerald-400',
                            inputValue: this._duration,
                            min: 1,
                            max: maxDuration,
                            onChange: (e) =>
                                this.updateConfig({
                                    scanDuration: Number(e.target.value),
                                }),
                            onAdjust: (delta) =>
                                this.updateConfig({
                                    scanDuration: this._duration + delta,
                                }),
                        })}
                    </div>

                    <div
                        class="h-px w-full xl:h-12 xl:w-px bg-slate-800 hidden xl:block"
                    ></div>

                    <!-- PRESETS -->
                    <div
                        class="flex flex-col gap-1 shrink-0 w-full xl:w-auto min-w-[100px]"
                    >
                        <div
                            class="text-[9px] font-bold text-slate-600 uppercase tracking-widest xl:text-right mb-1"
                        >
                            Presets
                        </div>
                        <div class="grid grid-cols-6 xl:grid-cols-3 gap-1">
                            <button
                                @click=${() => this.setPreset('short')}
                                class="px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                            >
                                10s
                            </button>
                            <button
                                @click=${() => this.setPreset('long')}
                                class="px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                            >
                                60s
                            </button>
                            <button
                                @click=${() => this.setPreset('full')}
                                class="px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                            >
                                Max
                            </button>
                            <button
                                @click=${() => this.setPreset('start')}
                                class="px-2 py-1 text-[10px] font-bold text-slate-500 hover:text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors border border-slate-800"
                            >
                                Head
                            </button>
                            <button
                                @click=${() => this.setPreset('middle')}
                                class="px-2 py-1 text-[10px] font-bold text-slate-500 hover:text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors border border-slate-800"
                            >
                                Mid
                            </button>
                            <button
                                @click=${() => this.setPreset('end')}
                                class="px-2 py-1 text-[10px] font-bold text-slate-500 hover:text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors border border-slate-800"
                            >
                                Tail
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    render() {
        const layers = Object.values(ANALYSIS_LAYERS);
        const metricLayers = layers.filter((l) => l.category === 'Metrics');
        const anomalyLayers = layers.filter((l) => l.category === 'Anomalies');

        const template = html`
            <div class="flex h-full">
                <!-- LEFT RAIL -->
                <div
                    class="w-64 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col p-5 z-10 overflow-y-auto custom-scrollbar"
                >
                    <div class="mb-8">
                        <h2
                            class="text-xl font-black text-white tracking-tight mb-1"
                        >
                            QC Config
                        </h2>
                        <p class="text-xs text-slate-500">
                            Configure engine parameters.
                        </p>
                    </div>
                    <div class="mb-6">
                        <label
                            class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 block"
                            >Mission Profiles</label
                        >
                        <div class="flex flex-col gap-2">
                            ${LAYER_PRESETS.map((preset) => {
                                const isMatched =
                                    preset.layers.every((id) =>
                                        this.activeLayers.has(id)
                                    ) &&
                                    this.activeLayers.size ===
                                        preset.layers.length;
                                return html`
                                    <button
                                        @click=${() =>
                                            this.applyLayerPreset(preset)}
                                        class="w-full text-left p-3 rounded-lg border transition-all ${isMatched
                                            ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'}"
                                    >
                                        <div
                                            class="flex justify-between items-center mb-0.5"
                                        >
                                            <span
                                                class="font-bold text-xs uppercase tracking-wide"
                                                >${preset.label}</span
                                            >
                                            ${isMatched
                                                ? html`<span class="scale-75"
                                                      >${icons.checkCircle}</span
                                                  >`
                                                : ''}
                                        </div>
                                        <div class="text-[10px] opacity-70">
                                            ${preset.description}
                                        </div>
                                    </button>
                                `;
                            })}
                        </div>
                    </div>
                    <div class="mb-6">
                        <label
                            class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 block"
                            >Sampling</label
                        >
                        ${this.renderSpeedSelector()}
                    </div>
                </div>

                <!-- MAIN STAGE -->
                <div
                    class="grow relative bg-slate-950 overflow-hidden flex flex-col"
                >
                    <div
                        class="absolute inset-0 top-0 overflow-y-auto custom-scrollbar p-8 pb-48"
                    >
                        ${this.renderStreamSelector()}
                        <div class="flex justify-end mb-4">
                            ${this.renderSelectAllBtn(layers, 'Global')}
                        </div>
                        <div class="mb-8">
                            <div class="flex items-center justify-between mb-5">
                                <div class="flex items-center gap-3">
                                    <span
                                        class="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"
                                        >${icons.barChart} Measurement
                                        Metrics</span
                                    >
                                </div>
                                <div class="h-px grow bg-slate-800 mx-4"></div>
                                ${this.renderSelectAllBtn(metricLayers)}
                            </div>
                            <div
                                class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
                            >
                                ${metricLayers.map((l) =>
                                    this.renderModuleCard(l)
                                )}
                            </div>
                        </div>
                        <div>
                            <div class="flex items-center justify-between mb-5">
                                <div class="flex items-center gap-3">
                                    <span
                                        class="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"
                                        >${icons.alertTriangle} Anomaly
                                        Detection</span
                                    >
                                </div>
                                <div class="h-px grow bg-slate-800 mx-4"></div>
                                ${this.renderSelectAllBtn(anomalyLayers)}
                            </div>
                            <div
                                class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
                            >
                                ${anomalyLayers.map((l) =>
                                    this.renderModuleCard(l)
                                )}
                            </div>
                        </div>
                    </div>
                    <div class="absolute bottom-0 left-0 right-0 z-20">
                        ${this.renderTimelineStrip()}
                    </div>
                </div>
            </div>
        `;
        render(template, this);
    }
}
customElements.define('qc-config', QcConfig);
export const qcConfigTemplate = (data) =>
    html`<qc-config .data=${data}></qc-config>`;
