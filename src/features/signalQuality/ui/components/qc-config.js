import * as icons from '@/ui/icons';
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
        this._hasInitialized = false;

        // UI State
        this._openDropdownId = null; // 'streamId-type' e.g. '1-video'

        // Timeline Interaction State
        this._dragState = null; // { mode: 'move'|'resize-l'|'resize-r'|'draw', startX, startOffset, startDuration, startTime }
        this._boundMouseMove = this._onMouseMove.bind(this);
        this._boundMouseUp = this._onMouseUp.bind(this);

        this._boundClickOutside = this._onClickOutside.bind(this);

        this._isEditingDuration = false;
    }

    connectedCallback() {
        this.classList.add('block', 'h-full', 'w-full', 'overflow-hidden');
        document.addEventListener('click', this._boundClickOutside);
        this.render();
    }

    disconnectedCallback() {
        window.removeEventListener('mousemove', this._boundMouseMove);
        window.removeEventListener('mouseup', this._boundMouseUp);
        document.removeEventListener('click', this._boundClickOutside);
    }

    _onClickOutside(e) {
        if (this._openDropdownId) {
            // If click is not inside a dropdown toggle or menu, close it
            const isDropdown = e.target.closest('.custom-dropdown-container');
            if (!isDropdown) {
                this._openDropdownId = null;
                this.render();
            }
        }
    }

    _extractTracks(manifest) {
        if (!manifest || !manifest.periods) return [];

        const tracks = [];
        // We typically only care about the first period for configuration
        // or we could aggregate across all. For now, let's look at the first period
        // that has adaptation sets.
        const period = manifest.periods[0];
        if (!period || !period.adaptationSets) return [];

        period.adaptationSets.forEach((as) => {
            const type = as.contentType; // 'video', 'audio', 'text'
            if (!['video', 'audio'].includes(type)) return;

            as.representations.forEach((rep) => {
                tracks.push({
                    id: rep.id,
                    type: type,
                    bandwidth: rep.bandwidth,
                    height: rep.height?.value,
                    width: rep.width?.value,
                    language: as.lang || rep.lang || 'und',
                    codecs: rep.codecs?.map((c) => c.value).join(', '),
                    frameRate: rep.frameRate,
                });
            });
        });

        return tracks;
    }

    _isLiveOnlySelection() {
        if (this._selectedStreamIds.size === 0) return false;

        let allLive = true;
        this._selectedStreamIds.forEach((id) => {
            const stream = this._streams.find((s) => s.id === id);
            if (stream && stream.manifest?.type !== 'dynamic') {
                allLive = false;
            }
        });
        return allLive;
    }

    set data(val) {
        if (!val) return;

        this._streams = val.streams || [];
        this._maxStreamDuration = val.streamDuration || 600;
        this._onStart = val.onStart;
        this._onCancel = val.onCancel;

        // Initialize defaults ONLY ONCE
        if (!this._hasInitialized) {
            if (val.activeLayers) {
                this.activeLayers = val.activeLayers;
            } else {
                // Default to Standard Audit if no layers provided
                const standardPreset = LAYER_PRESETS.find(p => p.id === 'standard');
                if (standardPreset) {
                    this.activeLayers = new Set(standardPreset.layers);
                }
            }

            if (val.scanDuration) this._duration = val.scanDuration;
            if (val.scanStartOffset) this._offset = val.scanStartOffset;
            if (val.scanSpeed) this._scanSpeed = val.scanSpeed || 'deep';

            if (
                this._selectedStreamIds.size === 0 &&
                this._streams.length > 0
            ) {
                this._streams.forEach((s) => this._selectedStreamIds.add(s.id));
            }
            this._hasInitialized = true;
        }

        // Always update track selections for NEW streams, but preserve existing ones
        this._streams.forEach((stream) => {
            if (!this._trackSelections.has(stream.id)) {
                const tracks = this._extractTracks(stream.manifest);
                const videoTracks = tracks.filter((t) => t.type === 'video');
                const audioTracks = tracks.filter((t) => t.type === 'audio');

                // Find 720p or closest
                let bestVideo = videoTracks[0];
                const targetHeight = 720;
                let minDiff = Infinity;

                for (const t of videoTracks) {
                    if (t.height) {
                        const diff = Math.abs(t.height - targetHeight);
                        if (diff < minDiff) {
                            minDiff = diff;
                            bestVideo = t;
                        }
                    }
                }
                // Fallback to highest bitrate if no height info
                if (!bestVideo && videoTracks.length > 0) {
                    bestVideo = videoTracks.sort(
                        (a, b) => b.bandwidth - a.bandwidth
                    )[0];
                }

                this._trackSelections.set(stream.id, {
                    video: bestVideo ? bestVideo.id : null,
                    audio: audioTracks[0] ? audioTracks[0].id : null,
                });
            }
        });

        this.render();
    }

    toggleLayer(layerId) {
        if (this.activeLayers.has(layerId)) {
            this.activeLayers.delete(layerId);
        } else {
            this.activeLayers.add(layerId);
        }
        this.activeLayers = new Set(this.activeLayers); // Trigger reactivity if needed
        this.render();
    }

    toggleStream(streamId) {
        if (this._selectedStreamIds.has(streamId)) {
            this._selectedStreamIds.delete(streamId);
        } else {
            this._selectedStreamIds.add(streamId);
        }

        // If switching to live-only, reset offset
        if (this._isLiveOnlySelection()) {
            this._offset = 0;
        }

        this.render();
    }

    setScanSpeed(speed) {
        this._scanSpeed = speed;

        // If speed is not 'deep', remove incompatible layers
        if (speed !== 'deep') {
            const incompatibleLayers = Object.values(ANALYSIS_LAYERS)
                .filter((l) => l.requiresSequential)
                .map((l) => l.id);

            incompatibleLayers.forEach((id) => this.activeLayers.delete(id));
            this.activeLayers = new Set(this.activeLayers);
        }

        this.render();
    }

    applyLayerPreset(preset) {
        const layers = new Set(preset.layers);
        const hasSequential = preset.layers.some((id) => {
            const layer = Object.values(ANALYSIS_LAYERS).find(
                (l) => l.id === id
            );
            return layer?.requiresSequential;
        });

        if (hasSequential && this._scanSpeed !== 'deep') {
            this._scanSpeed = 'deep';
        }

        this.activeLayers = layers;
        this.render();
    }

    handleStart() {
        console.log('[QcConfig] handleStart called');
        if (this._onStart) {
            // Build config object
            const streamConfigs = {};
            this._selectedStreamIds.forEach((id) => {
                const tracks = this._trackSelections.get(id);
                streamConfigs[id] = {
                    videoTrackId: tracks?.video,
                    audioTrackId: tracks?.audio,
                };
            });

            const payload = {
                activeLayers: this.activeLayers,
                scanDuration: this._duration,
                scanStartOffset: this._isLiveOnlySelection() ? 0 : this._offset,
                scanSpeed: this._scanSpeed,
                streamConfigs: streamConfigs,
            };

            console.log('[QcConfig] invoking onStart with payload:', payload);

            this._onStart(payload);
        } else {
            console.error('[QcConfig] _onStart callback is missing!');
        }
    }

    // --- Timeline Interaction Logic ---

    _getEventTime(e, rect) {
        const x = e.clientX - rect.left;
        const pct = Math.max(0, Math.min(1, x / rect.width));
        return Math.round(pct * this._maxStreamDuration);
    }

    _onTrackMouseDown(e) {
        if (this._isLiveOnlySelection()) return; // Disable for live only

        const rect = e.currentTarget.getBoundingClientRect();
        const startTime = this._getEventTime(e, rect);

        this._dragState = {
            mode: 'draw',
            startX: e.clientX,
            startTime: startTime,
            rect: rect,
        };

        this._offset = startTime;
        this._duration = 0;

        window.addEventListener('mousemove', this._boundMouseMove);
        window.addEventListener('mouseup', this._boundMouseUp);
        this.render();
    }

    _onSelectionMouseDown(e) {
        if (this._isLiveOnlySelection()) return; // Disable move for live only

        e.stopPropagation(); // Prevent track click
        const rect = e.currentTarget.parentElement.getBoundingClientRect();

        this._dragState = {
            mode: 'move',
            startX: e.clientX,
            startOffset: this._offset,
            rect: rect,
            secondsPerPixel: this._maxStreamDuration / rect.width,
        };

        window.addEventListener('mousemove', this._boundMouseMove);
        window.addEventListener('mouseup', this._boundMouseUp);
    }

    _onHandleMouseDown(e, side) {
        e.stopPropagation(); // Prevent selection/track click

        // Disable left handle resize (start time) for live only
        if (this._isLiveOnlySelection() && side === 'left') return;

        const rect =
            e.currentTarget.parentElement.parentElement.getBoundingClientRect();

        this._dragState = {
            mode: side === 'left' ? 'resize-l' : 'resize-r',
            startX: e.clientX,
            startOffset: this._offset,
            startDuration: this._duration,
            rect: rect,
            secondsPerPixel: this._maxStreamDuration / rect.width,
        };

        window.addEventListener('mousemove', this._boundMouseMove);
        window.addEventListener('mouseup', this._boundMouseUp);
    }

    _onMouseMove(e) {
        if (!this._dragState) return;

        const {
            mode,
            startX,
            startOffset,
            startDuration,
            startTime,
            rect,
            secondsPerPixel,
        } = this._dragState;
        const dxPixels = e.clientX - startX;

        if (mode === 'move') {
            const dt = Math.round(dxPixels * secondsPerPixel);
            let newOffset = startOffset + dt;

            // Clamp to bounds
            newOffset = Math.max(
                0,
                Math.min(newOffset, this._maxStreamDuration - this._duration)
            );
            this._offset = newOffset;
        } else if (mode === 'resize-r') {
            const dt = Math.round(dxPixels * secondsPerPixel);
            let newDuration = startDuration + dt;

            // Clamp duration (min 1s, max available space)
            newDuration = Math.max(
                1,
                Math.min(newDuration, this._maxStreamDuration - this._offset)
            );
            this._duration = newDuration;
        } else if (mode === 'resize-l') {
            const dt = Math.round(dxPixels * secondsPerPixel);
            let newOffset = startOffset + dt;
            let newDuration = startDuration - dt;

            // Clamp: Offset can't go below 0. Duration can't go below 1.
            if (newOffset < 0) {
                newDuration += newOffset; // Add back the overshoot
                newOffset = 0;
            }
            if (newDuration < 1) {
                newOffset = startOffset + startDuration - 1;
                newDuration = 1;
            }

            this._offset = newOffset;
            this._duration = newDuration;
        } else if (mode === 'draw') {
            const currentTime = this._getEventTime(e, rect);
            if (currentTime >= startTime) {
                this._offset = startTime;
                this._duration = Math.max(1, currentTime - startTime);
            } else {
                this._offset = currentTime;
                this._duration = Math.max(1, startTime - currentTime);
            }
        }

        this.render();
    }

    _onMouseUp(e) {
        this._dragState = null;
        window.removeEventListener('mousemove', this._boundMouseMove);
        window.removeEventListener('mouseup', this._boundMouseUp);
    }

    _handleDurationInput(e) {
        const value = parseInt(e.target.value, 10);
        const maxDuration = this._maxStreamDuration || 600;

        if (!isNaN(value)) {
            // Clamp value
            this._duration = Math.max(1, Math.min(value, maxDuration));
        }

        // Defer the render to avoid lit-html conflict during blur event
        setTimeout(() => {
            this._isEditingDuration = false;
            this.render();
        }, 0);
    }

    // --- Render Methods ---

    renderSpeedSelector() {
        return html`
            <div class="grid grid-cols-3 gap-2">
                ${Object.entries(SCAN_SPEEDS).map(([key, config]) => {
            const isSelected = this._scanSpeed === key.toLowerCase();
            return html`
                        <button
                            @click=${() => this.setScanSpeed(key.toLowerCase())}
                            class="relative p-2 rounded-xl border transition-all duration-300 group overflow-hidden ${isSelected
                    ? 'bg-blue-500/10 border-blue-500 shadow-[0_0_15px_rgba(59, 130, 246,0.2)]'
                    : 'bg-slate-800 border-slate-800 hover:border-slate-400 text-slate-400 hover:text-slate-100'}"
                        >
                            <div
                                class="relative z-10 flex flex-col items-center gap-1"
                            >
                                <div
                                    class="${isSelected
                    ? 'text-blue-400'
                    : 'text-current'} scale-90"
                                >
                                    ${key === 'FAST'
                    ? icons.zap
                    : key === 'BALANCED'
                        ? icons.activity
                        : icons.search}
                                </div>
                                <div
                                    class="text-[9px] font-bold uppercase tracking-wider text-current"
                                >
                                    ${config.label}
                                </div>
                                <div
                                    class="text-[8px] font-mono opacity-80"
                                >
                                    ${config.subtitle}
                                </div>
                            </div>
                        </button>
                    `;
        })}
            </div>
        `;
    }

    renderModuleCard(layer) {
        const isActive = this.activeLayers.has(layer.id);
        const isDisabled =
            layer.requiresSequential && this._scanSpeed !== 'deep';

        return html`
            <div
                @click=${() => !isDisabled && this.toggleLayer(layer.id)}
                class="group relative p-3 rounded-xl border transition-all duration-300 overflow-hidden flex items-center gap-3 ${isDisabled
                ? 'opacity-50 cursor-not-allowed bg-slate-800 border-slate-800/50'
                : isActive
                    ? 'cursor-pointer bg-slate-800 border-blue-500 shadow-[0_0_15px_rgba(59, 130, 246,0.1)]'
                    : 'cursor-pointer bg-slate-800 border-slate-800 hover:bg-slate-800 hover:border-slate-400/50'}"
            >
                <!-- Icon -->
                <div
                    class="p-2 rounded-lg shrink-0 ${isActive && !isDisabled
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-slate-800 text-slate-400'} transition-colors shadow-inner"
                >
                    ${layer.icon || icons.layers}
                </div>

                <!-- Content -->
                <div
                    class="relative z-10 grow min-w-0 flex flex-col justify-center"
                >
                    <div class="flex items-center justify-between gap-2">
                        <h3
                            class="text-xs font-bold ${isActive && !isDisabled
                ? 'text-slate-100'
                : 'text-slate-400'} truncate transition-colors"
                        >
                            ${layer.label}
                        </h3>
                        ${isActive && !isDisabled
                ? html`
                                  <div
                                      class="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-sm animate-scaleIn shrink-0"
                                  >
                                      ${icons.check}
                                  </div>
                              `
                : ''}
                        ${isDisabled
                ? html`
                                  <div
                                      class="text-slate-400 opacity-50 shrink-0"
                                      title="Requires Deep Scan"
                                  >
                                      ${icons.lockClosed}
                                  </div>
                              `
                : ''}
                    </div>
                    <p
                        class="text-[9px] text-slate-400 opacity-60 truncate mt-0.5"
                    >
                        ${isDisabled ? 'Requires Deep Scan' : layer.description}
                    </p>
                </div>

                <!-- Active Glow -->
                ${isActive && !isDisabled
                ? html`
                          <div
                              class="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent pointer-events-none"
                          ></div>
                      `
                : ''}
            </div>
        `;
    }

    renderCustomDropdown(streamId, type, options, selectedId, onSelect) {
        const dropdownId = `${streamId}-${type}`;
        const isOpen = this._openDropdownId === dropdownId;
        const selectedOption =
            options.find((o) => o.id === selectedId) || options[0];

        return html`
            <div class="relative custom-dropdown-container">
                <label
                    class="text-[8px] font-bold uppercase text-slate-400 mb-1 block tracking-wider opacity-80"
                    >${type}</label
                >

                <button
                    @click=${(e) => {
                e.stopPropagation();
                this._openDropdownId = isOpen ? null : dropdownId;
                this.render();
            }}
                    class="w-full flex items-center justify-between bg-slate-800 border border-slate-800 rounded-lg px-2 py-1.5 text-[10px] font-mono text-slate-100 hover:border-purple-500/50 transition-colors ${isOpen
                ? 'border-purple-500 ring-1 ring-purple-500/20'
                : ''}"
                >
                    <span class="truncate">
                        ${selectedOption
                ? html`
                                  ${type === 'video'
                        ? html`${selectedOption.height
                            ? `${selectedOption.height}p`
                            : 'Unknown'}
                                            <span class="opacity-50 mx-1"
                                                >|</span
                                            >
                                            ${formatBitrate(
                                selectedOption.bandwidth
                            )}`
                        : html`${selectedOption.language}
                                            <span class="opacity-50 mx-1"
                                                >|</span
                                            >
                                            ${formatBitrate(
                            selectedOption.bandwidth
                        )}`}
                              `
                : 'Select...'}
                    </span>
                    <span
                        class="text-slate-400 scale-75 transition-transform duration-200 ${isOpen
                ? 'rotate-180'
                : ''}"
                    >
                        ${icons.chevronDown}
                    </span>
                </button>

                ${isOpen
                ? html`
                          <div
                              class="absolute left-0 right-0 top-[calc(100%+4px)] z-50 bg-slate-800 backdrop-filter backdrop-blur-xl border border-slate-800 rounded-lg shadow-xl overflow-hidden max-h-[200px] overflow-y-auto custom-scrollbar animate-slideDown origin-top"
                          >
                              ${options.map((opt) => {
                    const isSelected = opt.id === selectedId;
                    return html`
                                      <button
                                          @click=${(e) => {
                            e.stopPropagation();
                            onSelect(opt.id);
                            this._openDropdownId = null;
                            this.render();
                        }}
                                          class="w-full text-left px-3 py-2 text-[10px] font-mono border-b border-slate-800/30 last:border-0 hover:bg-slate-800 transition-colors flex items-center justify-between group ${isSelected
                            ? 'bg-purple-500/10 text-purple-300'
                            : 'text-slate-100'}"
                                      >
                                          <span>
                                              ${type === 'video'
                            ? html`<span class="font-bold"
                                                            >${opt.height
                                    ? `${opt.height}p`
                                    : 'Unknown'}</span
                                                        >
                                                        <span
                                                            class="opacity-50 mx-1"
                                                            >|</span
                                                        >
                                                        ${formatBitrate(
                                        opt.bandwidth
                                    )}`
                            : html`<span
                                                            class="font-bold uppercase"
                                                            >${opt.language}</span
                                                        >
                                                        <span
                                                            class="opacity-50 mx-1"
                                                            >|</span
                                                        >
                                                        ${formatBitrate(
                                opt.bandwidth
                            )}`}
                                          </span>
                                          ${isSelected
                            ? html`<span class="scale-75"
                                                    >${icons.check}</span
                                                >`
                            : ''}
                                      </button>
                                  `;
                })}
                          </div>
                      `
                : ''}
            </div>
        `;
    }

    renderStreamSelector() {
        return html`
            <div class="space-y-2">
                ${this._streams.map((stream) => {
            const isSelected = this._selectedStreamIds.has(stream.id);
            const isConfiguring =
                this._configuringStreamId === stream.id;
            const tracks = this._trackSelections.get(stream.id) || {};
            const isLive = stream.manifest?.type === 'dynamic';

            // Extract tracks using the new helper
            const allTracks = this._extractTracks(stream.manifest);
            const videoTracks = allTracks.filter(
                (t) => t.type === 'video'
            );
            const audioTracks = allTracks.filter(
                (t) => t.type === 'audio'
            );

            const selectedVideoTrack = videoTracks.find(
                (t) => t.id === tracks.video
            );
            const selectedAudioTrack = audioTracks.find(
                (t) => t.id === tracks.audio
            );

            return html`
                        <div
                            class="relative group rounded-xl border transition-all duration-300 ${isSelected
                    ? 'bg-slate-800 border-purple-500/50 shadow-md'
                    : 'bg-slate-800 border-slate-800 hover:border-slate-400/30'}"
                        >
                            <!-- Main Row -->
                            <div
                                class="p-2.5 flex items-center gap-2.5 cursor-pointer"
                                @click=${() => this.toggleStream(stream.id)}
                            >
                                <!-- Checkbox -->
                                <div
                                    class="w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${isSelected
                    ? 'bg-purple-500 border-purple-500 text-[#1e293b]'
                    : 'border-slate-400/30 group-hover:border-slate-400'}"
                                >
                                    ${isSelected ? icons.check : ''}
                                </div>

                                <!-- Stream Info -->
                                <div class="grow min-w-0">
                                    <div class="flex items-center gap-2">
                                        <div
                                            class="text-[11px] font-bold text-slate-100 truncate"
                                        >
                                            ${stream.name}
                                        </div>
                                        ${isLive
                    ? html`
                                                  <div
                                                      class="px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[8px] font-bold uppercase tracking-wider"
                                                      title="Start time ignored for live streams"
                                                  >
                                                      LIVE
                                                  </div>
                                              `
                    : ''}
                                    </div>
                                    <div
                                        class="text-[9px] font-mono text-slate-400 opacity-60 truncate mb-1.5"
                                    >
                                        ${stream.id}
                                    </div>

                                    <!-- Track Badges -->
                                    <div
                                        class="flex items-center gap-1.5 flex-wrap"
                                    >
                                        ${selectedVideoTrack
                    ? html`
                                                  <div
                                                      class="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-800 text-[9px] font-mono text-slate-400 flex items-center gap-1.5 shadow-sm"
                                                  >
                                                      <span
                                                          class="text-blue-400 scale-75"
                                                          >${icons.display}</span
                                                      >
                                                      <span
                                                          class="font-bold text-slate-100"
                                                          >${selectedVideoTrack.height
                            ? `${selectedVideoTrack.height}p`
                            : 'Auto'}</span
                                                      >
                                                      <span
                                                          class="opacity-50 text-[8px] border-l border-slate-800 pl-1.5"
                                                          >${formatBitrate(
                                selectedVideoTrack.bandwidth
                            )}</span
                                                      >
                                                  </div>
                                              `
                    : ''}
                                        ${selectedAudioTrack
                    ? html`
                                                  <div
                                                      class="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-800 text-[9px] font-mono text-slate-400 flex items-center gap-1.5 shadow-sm"
                                                  >
                                                      <span
                                                          class="text-purple-300 scale-75"
                                                          >${icons.volumeUp}</span
                                                      >
                                                      <span
                                                          class="font-bold text-slate-100 uppercase"
                                                          >${selectedAudioTrack.language}</span
                                                      >
                                                      <span
                                                          class="opacity-50 text-[8px] border-l border-slate-800 pl-1.5"
                                                          >${formatBitrate(
                        selectedAudioTrack.bandwidth
                    )}</span
                                                      >
                                                  </div>
                                              `
                    : ''}
                                    </div>
                                </div>

                                <!-- Config Toggle -->
                                <button
                                    @click=${(e) => {
                    e.stopPropagation();
                    this._configuringStreamId =
                        isConfiguring ? null : stream.id;
                    this.render();
                }}
                                    class="p-1.5 rounded hover:bg-slate-800 text-slate-400 transition-colors ${isConfiguring
                    ? 'bg-slate-800 text-slate-100'
                    : ''}"
                                >
                                    ${icons.settings}
                                </button>
                            </div>

                            <!-- Config Panel (Slide Down) -->
                            ${isConfiguring
                    ? html`
                                      <div
                                          class="border-t border-slate-800/50 bg-slate-800 p-3 animate-slideDown"
                                      >
                                          <div class="space-y-3">
                                              <!-- Video Track Dropdown -->
                                              ${this.renderCustomDropdown(
                        stream.id,
                        'video',
                        videoTracks,
                        tracks.video,
                        (newId) => {
                            const newTracks = {
                                ...tracks,
                                video: newId,
                            };
                            this._trackSelections.set(
                                stream.id,
                                newTracks
                            );
                        }
                    )}

                                              <!-- Audio Track Dropdown -->
                                              ${this.renderCustomDropdown(
                        stream.id,
                        'audio',
                        audioTracks,
                        tracks.audio,
                        (newId) => {
                            const newTracks = {
                                ...tracks,
                                audio: newId,
                            };
                            this._trackSelections.set(
                                stream.id,
                                newTracks
                            );
                        }
                    )}
                                          </div>
                                      </div>
                                  `
                    : ''}
                        </div>
                    `;
        })}
            </div>
        `;
    }

    renderSelectAllBtn(layers) {
        const allSelected = layers.every((l) => this.activeLayers.has(l.id));
        return html`
            <button
                @click=${() => {
                if (allSelected) {
                    this.activeLayers.clear();
                } else {
                    layers.forEach((l) => this.activeLayers.add(l.id));
                }
                this.render();
            }}
                class="text-[10px] font-bold uppercase tracking-wider text-blue-400 hover:text-[#60a5fa] transition-colors bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20"
            >
                ${allSelected ? 'Deselect All' : 'Select All'}
            </button>
        `;
    }

    setPreset(position) {
        if (this._isLiveOnlySelection()) return; // Disable presets for live only

        if (position === 'start') {
            this._offset = 0;
        } else if (position === 'middle') {
            this._offset = Math.floor(this._maxStreamDuration / 2);
        } else if (position === 'end') {
            this._offset = Math.max(
                0,
                this._maxStreamDuration - this._duration
            );
        }
        this.render();
    }

    render() {
        // Group layers by category
        const layersByCategory = Object.values(ANALYSIS_LAYERS).reduce(
            (acc, layer) => {
                const cat = layer.category || 'Other';
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push(layer);
                return acc;
            },
            {}
        );

        // Define category order
        const categoryOrder = ['Metrics', 'Anomalies', 'Analysis', 'Other'];

        const template = html`
            <div
                class="h-full flex flex-col relative overflow-hidden text-slate-200"
            >
                <!-- Main Content Grid -->
                <div
                    class="grow overflow-hidden px-6 pb-6 z-10 flex flex-col lg:flex-row gap-[0.75rem] min-h-0 pt-6"
                >
                    <!-- Left Sidebar (Setup) -->
                    <div
                        class="w-full lg:w-[320px] shrink-0 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-1"
                    >
                        <!-- Target Streams -->
                        <div
                            class="bg-slate-800 backdrop-blur-3xl border border-slate-800/30 rounded-xl shadow-lg p-4 relative group"
                        >
                            <div
                                class="absolute inset-0 pointer-events-none rounded-xl ring-1 ring-inset ring-white/5"
                            ></div>
                            <div class="flex items-center justify-between mb-4">
                                <h3
                                    class="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"
                                >
                                    <span
                                        class="p-1.5 rounded-lg bg-slate-800 text-purple-300"
                                        >${icons.film}</span
                                    >
                                    Target Streams
                                </h3>
                                <span
                                    class="text-[10px] font-bold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20"
                                >
                                    ${this._selectedStreamIds.size}
                                </span>
                            </div>
                            ${this.renderStreamSelector()}
                        </div>

                        <!-- Scan Speed -->
                        <div
                            class="bg-slate-800 backdrop-blur-3xl border border-slate-800/30 rounded-xl shadow-lg p-4 relative"
                        >
                            <div
                                class="absolute inset-0 pointer-events-none rounded-xl ring-1 ring-inset ring-white/5"
                            ></div>
                            <h3
                                class="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-4"
                            >
                                <span
                                    class="p-1.5 rounded-lg bg-slate-800 text-teal-300"
                                    >${icons.gauge}</span
                                >
                                Scan Precision
                            </h3>
                            ${this.renderSpeedSelector()}
                        </div>

                        <!-- Presets -->
                        <div
                            class="bg-slate-800 backdrop-blur-3xl border border-slate-800/30 rounded-xl shadow-lg p-4 relative"
                        >
                            <div
                                class="absolute inset-0 pointer-events-none rounded-xl ring-1 ring-inset ring-white/5"
                            ></div>
                            <h3
                                class="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-4"
                            >
                                <span
                                    class="p-1.5 rounded-lg bg-slate-800 text-blue-400"
                                    >${icons.zap}</span
                                >
                                Quick Presets
                            </h3>
                            <div class="grid grid-cols-2 gap-2">
                                ${Object.values(LAYER_PRESETS).map(
            (preset) => html`
                                        <button
                                            @click=${() =>
                    this.applyLayerPreset(preset)}
                                            class="p-2 rounded-lg border border-slate-800 bg-slate-800 hover:bg-slate-800 hover:border-slate-400 transition-all text-left group"
                                        >
                                            <div
                                                class="text-[10px] font-bold text-slate-100 mb-0.5 group-hover:text-blue-400 transition-colors"
                                            >
                                                ${preset.label}
                                            </div>
                                            <div
                                                class="text-[8px] text-slate-400 leading-tight opacity-70 line-clamp-1"
                                            >
                                                ${preset.description}
                                            </div>
                                        </button>
                                    `
        )}
                            </div>
                        </div>
                    </div>

                    <!-- Main Area (Modules Grid) -->
                    <div
                        class="grow bg-slate-800 backdrop-blur-2xl border border-slate-800/40 rounded-xl shadow-lg overflow-hidden flex flex-col relative group"
                    >
                        <div
                            class="absolute inset-0 pointer-events-none rounded-xl ring-1 ring-inset ring-white/5"
                        ></div>

                        <!-- Header -->
                        <div
                            class="p-4 border-b border-slate-700/30 bg-slate-800 backdrop-blur-md flex items-center justify-between shrink-0"
                        >
                            <h3
                                class="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"
                            >
                                <span
                                    class="p-1.5 rounded-lg bg-slate-800 text-blue-400"
                                    >${icons.layers}</span
                                >
                                Active Modules
                            </h3>
                            ${this.renderSelectAllBtn(
            Object.values(ANALYSIS_LAYERS)
        )}
                        </div>

                        <!-- Grid -->
                        <div
                            class="p-6 overflow-y-auto custom-scrollbar grow space-y-6"
                        >
                            ${categoryOrder.map((category) => {
            const layers = layersByCategory[category];
            if (!layers || layers.length === 0) return '';

            return html`
                                    <div>
                                        <div
                                            class="flex items-center gap-2 mb-3"
                                        >
                                            <div
                                                class="h-px grow bg-slate-800/30"
                                            ></div>
                                            <span
                                                class="text-[9px] font-bold uppercase tracking-widest text-slate-400 opacity-70"
                                                >${category}</span
                                            >
                                            <div
                                                class="h-px grow bg-slate-800/30"
                                            ></div>
                                        </div>
                                        <div
                                            class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3"
                                        >
                                            ${layers.map((layer) =>
                this.renderModuleCard(layer)
            )}
                                        </div>
                                    </div>
                                `;
        })}
                        </div>
                    </div>
                </div>

            </div>
        `;
        render(template, this);

        // Dispatch UI Update for Bottom Bar
        this.dispatchEvent(new CustomEvent('config-ui-update', {
            detail: {
                bottomBarTemplate: this.renderTimelineStrip()
            },
            bubbles: true,
            composed: true
        }));
    }

    renderTimelineStrip() {
        const maxDuration = this._maxStreamDuration || 600;
        const progress = (this._offset / maxDuration) * 100;
        const width = (this._duration / maxDuration) * 100;
        const isLiveOnly = this._isLiveOnlySelection();

        return html`
            <div class="w-full h-full pointer-events-auto">
                <div
                    class="bg-slate-800 backdrop-blur-2xl border-t border-slate-700/50 p-4 flex items-center gap-6 w-full h-full"
                >
                    <!-- Start Button -->
                    <button
                        @click=${() => this.handleStart()}
                        class="shrink-0 px-8 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold uppercase tracking-widest text-xs shadow-lg hover:shadow-[0_0_20px_rgba(59, 130, 246,0.4)] hover:scale-105 transition-all duration-300 flex items-center gap-2"
                    >
                        ${icons.play} Start Scan
                    </button>

                    <!-- Timeline Slider Container -->
                    <div
                        class="grow relative h-12 bg-slate-800 rounded-xl border border-slate-700/30 overflow-hidden group select-none ${isLiveOnly
                ? 'cursor-not-allowed opacity-70'
                : 'cursor-crosshair'}"
                        @mousedown=${(e) =>
                isLiveOnly ? null : this._onTrackMouseDown(e)}
                    >
                        <!-- Ticks -->
                        <div
                            class="absolute inset-0 flex justify-between px-2 opacity-30 pointer-events-none"
                        >
                            ${Array.from({ length: 11 }).map(
                    (_, i) => html`
                                    <div
                                        class="w-px h-full bg-slate-400"
                                    ></div>
                                `
                )}
                        </div>

                        <!-- Selected Range (Draggable & Resizable) -->
                        <div
                            class="absolute top-0 bottom-0 bg-blue-500/20 border-x border-blue-500/50 backdrop-blur-sm ${isLiveOnly
                ? ''
                : 'cursor-move group-hover:border-blue-500'} transition-colors"
                            style="left: ${progress}%; width: ${width}%"
                            @mousedown=${(e) =>
                isLiveOnly
                    ? null
                    : this._onSelectionMouseDown(e)}
                        >
                            <!-- Inner Gradient -->
                            <div
                                class="absolute inset-0 bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none"
                            ></div>

                            <!-- Label -->
                            <div
                                class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-bold text-blue-400 whitespace-nowrap bg-slate-800 px-2 py-1 rounded border border-blue-500/30 shadow-sm pointer-events-none select-none"
                            >
                                ${isLiveOnly
                ? 'LIVE (Duration Only)'
                : `${this._offset}s - ${this._offset + this._duration}s`}
                            </div>

                            <!-- Left Handle (Disabled for Live) -->
                            ${!isLiveOnly
                ? html`
                                      <div
                                          class="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-blue-500/50 transition-colors z-10"
                                          @mousedown=${(e) =>
                        this._onHandleMouseDown(
                            e,
                            'left'
                        )}
                                      ></div>
                                  `
                : ''}

                            <!-- Right Handle -->
                            <div
                                class="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-blue-500/50 transition-colors z-10"
                                @mousedown=${(e) =>
                this._onHandleMouseDown(e, 'right')}
                            ></div>
                        </div>
                    </div>

                    <!-- Duration Input -->
                    <div
                        class="shrink-0 flex items-center gap-3 pl-4 border-l border-slate-700/30"
                    >
                        <div class="text-right">
                            <div
                                class="text-[9px] font-bold uppercase text-slate-400 tracking-wider"
                            >
                                Scan Duration
                            </div>
                            ${this._isEditingDuration
                ? html`
                                      <input
                                          type="number"
                                          class="w-16 bg-slate-800 text-slate-200 font-mono font-bold text-sm border border-blue-500 rounded px-1 py-0.5 focus:outline-none"
                                          .value=${this._duration}
                                          @blur=${(e) =>
                        this._handleDurationInput(e)}
                                          @keydown=${(e) => {
                        if (e.key === 'Enter') {
                            this._handleDurationInput(e);
                        }
                    }}
                                      />
                                  `
                : html`
                                      <div
                                          class="font-mono font-bold text-slate-200 cursor-pointer hover:text-blue-400 transition-colors"
                                          @click=${() => {
                        this._isEditingDuration = true;
                        this.render();
                        setTimeout(
                            () =>
                                                      /** @type {HTMLElement} */(
                                    this.querySelector(
                                        'input[type="number"]'
                                    )
                                )?.focus(),
                            0
                        );
                    }}
                                          title="Click to edit"
                                      >
                                          ${this._duration}s
                                      </div>
                                  `}
                        </div>
                        <div class="flex flex-col gap-1">
                            <button
                                @click=${() => {
                this._duration = Math.min(
                    this._duration + 10,
                    maxDuration
                );
                this.render();
            }}
                                class="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                            >
                                ${icons.chevronUp}
                            </button>
                            <button
                                @click=${() => {
                this._duration = Math.max(
                    this._duration - 10,
                    10
                );
                this.render();
            }}
                                class="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                            >
                                ${icons.chevronDown}
                            </button>
                        </div>
                    </div>

                    <!-- Quick Jump (Disabled for Live) -->
                    <div
                        class="shrink-0 flex gap-1 ${isLiveOnly
                ? 'opacity-50 pointer-events-none'
                : ''}"
                    >
                        <button
                            @click=${() => this.setPreset('start')}
                            class="px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-800/80 rounded transition-colors"
                        >
                            Start
                        </button>
                        <button
                            @click=${() => this.setPreset('middle')}
                            class="px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-800/80 rounded transition-colors"
                        >
                            Mid
                        </button>
                        <button
                            @click=${() => this.setPreset('end')}
                            class="px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-800/80 rounded transition-colors"
                        >
                            End
                        </button>
                    </div>
                </div>

                <!-- Live Warning -->
                ${isLiveOnly
                ? html`
                          <div
                              class="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-2 shadow-lg backdrop-blur-sm animate-fadeIn"
                          >
                              ${icons.alertTriangle} Live streams selected:
                              Start time forced to 0 (Duration only)
                          </div>
                      `
                : ''}
            </div>
        `;
    }
}

customElements.define('qc-config', QcConfig);

export const qcConfigTemplate = (props) => {
    return html`<qc-config .data=${props} @config-ui-update=${props.onConfigUpdate}></qc-config>`;
};
