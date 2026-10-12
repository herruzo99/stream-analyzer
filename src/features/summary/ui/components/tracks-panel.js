import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';
import { formatBitrate } from '@/ui/shared/format';
import { tooltipTriggerClasses } from '@/ui/shared/constants';
import { renderCodecInfo } from './shared.js';

const formatFrameRate = (fr) => {
    if (!fr) return 'N/A';
    if (typeof fr === 'number')
        return Number.isFinite(fr) ? fr.toFixed(2) : 'N/A';
    if (typeof fr === 'string') {
        if (fr.includes('/')) {
            const [num, den] = fr.split('/').map(Number);
            if (
                Number.isFinite(num) &&
                Number.isFinite(den) &&
                den !== 0
            ) {
                return (num / den).toFixed(2);
            }
            return 'N/A';
        }
        const num = parseFloat(fr);
        return Number.isFinite(num) ? num.toFixed(2) : 'N/A';
    }
    return 'N/A';
};

const trackTitle = (track) => track.label || track.id || 'Untitled track';

const isVideoCodec = (codecString) => {
    if (!codecString) return false;
    const lowerCodec = codecString.toLowerCase();
    const videoPrefixes = [
        'avc1',
        'avc3',
        'hvc1',
        'hev1',
        'mp4v',
        'dvh1',
        'dvhe',
        'av01',
        'vp09',
        'mjpg',
    ];
    return videoPrefixes.some((prefix) => lowerCodec.startsWith(prefix));
};

class SummaryTracksPanel extends HTMLElement {
    constructor() {
        super();
        this.activeTab = 'video';
        this._vm = null;
        this._streamKey = null;
    }

    set vm(val) {
        this._vm = val;
        this.render();
    }

    setActiveTab(tab) {
        this.activeTab = tab;
        this.render();
    }

    render() {
        if (!this._vm) {
            return;
        }

        const vm = this._vm;
        // Reset to a tab that actually has tracks when the stream changes,
        // but keep the user's tab across store re-renders of the same stream.
        const streamKey = vm.streamKey || 'default';
        if (this._streamKey !== streamKey) {
            this._streamKey = streamKey;
            const counts = {
                video: (vm.videoTracks || []).length,
                audio: (vm.audioTracks || []).length,
                text: (vm.textTracks || []).length,
            };
            if ((counts[this.activeTab] || 0) === 0) {
                this.activeTab =
                    (['video', 'audio', 'text'].find(
                        (t) => counts[t] > 0
                    ) || 'video');
            }
        }
        const activeTab = this.activeTab;

        // --- Tab Button Helper ---
        const counts = {
            video: (vm.videoTracks || []).length,
            audio: (vm.audioTracks || []).length,
            text: (vm.textTracks || []).length,
        };
        const renderTabButton = (id, label, icon) => {
            const isActive = activeTab === id;
            return html`
                <button
                    @click=${() => this.setActiveTab(id)}
                    aria-pressed=${isActive}
                    class="px-3 py-1.5 rounded-md mono text-[11px] border transition-colors flex items-center gap-1.5 ${isActive
                        ? 'bg-emerald-500/10 text-emerald-200 border-emerald-400/25'
                        : 'bg-transparent text-slate-500 border-white/10 hover:text-slate-200 hover:border-white/25'}"
                >
                    ${icon} ${label.toLowerCase()}
                    <span class="text-slate-600">${counts[id]}</span>
                </button>
            `;
        };

        // --- Render Content Based on Tab ---
        let content;
        let header;
        let gridCols;

        if (activeTab === 'video') {
            gridCols = 'grid-cols-12';
            header = html`
                <div class="col-span-3">label</div>
                <div class="col-span-2">bitrate</div>
                <div class="col-span-2">resolution</div>
                <div class="col-span-1">fps</div>
                <div class="col-span-2">codecs</div>
                <div class="col-span-2">roles</div>
            `;
            content = (vm.videoTracks || []).map((track, index) => {

                // Bitrate
                const effectiveBitrate = formatBitrate(track.bandwidth);
                const manifestBitrate = formatBitrate(track.manifestBandwidth);
                let bitrate;
                if (
                    track.manifestBandwidth &&
                    track.bandwidth !== track.manifestBandwidth
                ) {
                    bitrate = html`${effectiveBitrate}
                        <span
                            class="mono block text-[10px] text-amber-300/90 ${tooltipTriggerClasses}"
                            data-tooltip="The manifest @bandwidth is ${manifestBitrate}, but the effective max bitrate from the 'btrt' box in the init segment is ${effectiveBitrate}. The effective rate is shown."
                            >(manifest: ${manifestBitrate})</span
                        >`;
                } else {
                    bitrate = effectiveBitrate;
                }

                // Resolution
                let resolution = 'N/A';
                if (track.resolutions && track.resolutions.length > 0) {
                    resolution = track.resolutions
                        .map((r) => r.value)
                        .join(', ');
                } else if (track.width?.value && track.height?.value) {
                    resolution = `${track.width.value}x${track.height.value}`;
                }

                // Roles
                const roleValues = (track.roles || [])
                    .map((r) => r.value)
                    .filter(Boolean);
                let roles;
                const isTrickPlay = roleValues.includes('trick');
                if (isTrickPlay) {
                    const otherRoles = roleValues.filter((r) => r !== 'trick');
                    const trickBadge = html`<span
                        class="mono text-[10px] px-1.5 py-px rounded border bg-white/5 text-slate-400 border-white/10"
                        >trick play</span
                    >`;
                    roles =
                        otherRoles.length > 0
                            ? html`${otherRoles.join(', ')} ${trickBadge}`
                            : trickBadge;
                } else {
                    roles =
                        roleValues.length > 0 ? roleValues.join(', ') : 'N/A';
                }

                // Extra Props
                let extraProps = [];
                const propChip = (text, title) => html`<span
                    class="mono px-1.5 py-px bg-white/5 text-slate-500 border border-white/10 rounded text-[10px]"
                    title=${title || text}
                    >${text}</span
                >`;
                if (track.scanType)
                    extraProps.push(propChip(track.scanType));
                if (track.hdcpLevel)
                    extraProps.push(
                        propChip(`hdcp ${track.hdcpLevel}`, 'HDCP level')
                    );
                if (track.sar)
                    extraProps.push(
                        propChip(`sar ${track.sar}`, 'Sample aspect ratio')
                    );
                if (track.codingDependency)
                    extraProps.push(propChip('dependent'));
                if (track.maxPlayoutRate)
                    extraProps.push(propChip(`${track.maxPlayoutRate}x rate`));

                const videoCodecList = (track.codecs || []).filter((c) =>
                    isVideoCodec(c.value)
                );
                const muxedCodecList = track.muxedAudio?.codecs?.length > 0
                    ? track.muxedAudio.codecs
                    : [];
                return html`
                    <div
                        class="grid grid-cols-12 gap-3 px-4 py-2.5 border-b border-white/5 hover:bg-white/[0.02] transition-colors text-[13px] items-center"
                    >
                        <!-- Label -->
                        <div class="col-span-3 flex items-center gap-2.5 min-w-0">
                            <span class="text-slate-600 shrink-0"
                                >${icons.film}</span
                            >
                            <span
                                class="font-mono text-[13px] text-slate-100 truncate"
                                title="${trackTitle(track)}"
                                >${trackTitle(track)}</span
                            >
                        </div>
                        <!-- Bitrate -->
                        <div
                            class="col-span-2 font-mono text-slate-100"
                        >
                            ${bitrate}
                        </div>
                        <!-- Resolution -->
                        <div
                            class="col-span-2 font-mono text-slate-100"
                        >
                            ${resolution}
                        </div>
                        <!-- Frame Rate -->
                        <div
                            class="col-span-1 font-mono text-[12px] text-slate-400"
                        >
                            ${formatFrameRate(track.frameRate)}
                        </div>
                        <!-- Codecs: video first, muxed audio below -->
                        <div
                            class="col-span-2 font-mono text-slate-100 space-y-1 min-w-0"
                        >
                            ${videoCodecList.map(
                                (c) => html`<div class="truncate">${renderCodecInfo(c)}</div>`
                            )}
                            ${muxedCodecList.map(
                                (c) => html`<div class="truncate text-slate-400">${renderCodecInfo(c)}</div>`
                            )}
                            ${videoCodecList.length === 0 && muxedCodecList.length === 0
                                ? html`<span class="text-slate-600">N/A</span>`
                                : ''}
                        </div>
                        <!-- Roles -->
                        <div
                            class="col-span-2 font-mono text-slate-400 min-w-0"
                        >
                            <div class="truncate" title="${typeof roles === 'string' ? roles : ''}">${roles}</div>
                            ${extraProps.length > 0
                                ? html`<div class="flex flex-wrap gap-1 mt-1">
                                      ${extraProps}
                                  </div>`
                                : ''}
                        </div>
                    </div>
                `;
            });
        } else if (activeTab === 'audio') {
            gridCols = 'grid-cols-12';
            // Audio Cols: Label (4), Lang (2), Format (1), Ch/Hz (2), Bitrate (1), Codecs (2) ... wait need to adjust for 12 cols
            // Let's use: Label(3), Lang(1), Format(1), Ch/Hz(2), Bitrate(2), Codecs(2), Roles(1) = 12
            header = html`
                <div class="col-span-3">id</div>
                <div class="col-span-1">lang</div>
                <div class="col-span-1">format</div>
                <div class="col-span-2">ch / hz</div>
                <div class="col-span-2">bitrate</div>
                <div class="col-span-2">codecs</div>
                <div class="col-span-1">roles</div>
            `;

            content = (vm.audioTracks || []).map((track, index) => {
                const roleValues = (track.roles || [])
                    .map((r) => r.value)
                    .filter(Boolean);
                const roles =
                    roleValues.length > 0 ? roleValues.join(', ') : 'N/A';

                return html`
                    <div
                        class="grid grid-cols-12 gap-3 px-4 py-2.5 border-b border-white/5 hover:bg-white/[0.02] transition-colors text-[13px] items-center"
                    >
                        <!-- Label -->
                        <div class="col-span-3 flex items-center gap-3 pl-2">
                            <div
                                class="text-slate-600"
                            >
                                ${icons.audioLines}
                            </div>
                            <span
                                class="font-mono text-[13px] text-slate-100 truncate"
                                title="${trackTitle(track)}"
                                >${trackTitle(track)}</span
                            >
                        </div>
                        <!-- Lang -->
                        <div
                            class="col-span-1 font-mono text-slate-100"
                        >
                            ${track.lang || 'N/A'}
                        </div>
                        <!-- Format -->
                        <div
                            class="col-span-1 font-mono text-slate-100"
                        >
                            ${track.format || 'Unknown'}
                        </div>
                        <!-- Ch / Hz -->
                        <div
                            class="col-span-2 font-mono text-slate-100 space-y-1"
                        >
                            <div>${track.channels || 'N/A'}</div>
                            ${track.sampleRate
                        ? html`<div
                                      class="text-[10px] text-slate-400"
                                  >
                                      ${track.sampleRate} Hz
                                  </div>`
                        : ''}
                        </div>
                        <!-- Bitrate -->
                        <div
                            class="col-span-2 font-mono text-slate-100"
                        >
                            ${formatBitrate(track.bandwidth)}
                        </div>
                        <!-- Codecs -->
                        <div
                            class="col-span-2 font-mono text-slate-100 space-y-1"
                        >
                            ${(track.codecs || []).map(
                            (c) => html`<div>${renderCodecInfo(c)}</div>`
                        )}
                        </div>
                        <!-- Roles -->
                        <div
                            class="col-span-1 font-mono text-slate-400 truncate"
                            title="${roles}"
                        >
                            ${roles}
                        </div>
                    </div>
                `;
            });
        } else {
            // Text Tracks
            gridCols = 'grid-cols-12';
            // Label(4), Lang(2), Format(2), Codecs(3), Roles(1)
            header = html`
                <div class="col-span-4">id</div>
                <div class="col-span-2">lang</div>
                <div class="col-span-2">format</div>
                <div class="col-span-3">codecs</div>
                <div class="col-span-1">roles</div>
            `;
            content = (vm.textTracks || []).map((track, index) => {
                const roleValues = (track.roles || [])
                    .map((r) => r.value)
                    .filter(Boolean);
                const roles =
                    roleValues.length > 0 ? roleValues.join(', ') : 'N/A';

                return html`
                    <div
                        class="grid grid-cols-12 gap-3 px-4 py-2.5 border-b border-white/5 hover:bg-white/[0.02] transition-colors text-[13px] items-center"
                    >
                        <!-- Label -->
                        <div class="col-span-4 flex items-center gap-3 pl-2">
                            <div
                                class="text-slate-600"
                            >
                                ${icons.fileText}
                            </div>
                            <span
                                class="font-mono text-[13px] text-slate-100 truncate"
                                title="${trackTitle(track)}"
                                >${trackTitle(track)}</span
                            >
                        </div>
                        <!-- Lang -->
                        <div
                            class="col-span-2 font-mono text-slate-100"
                        >
                            ${track.lang || 'N/A'}
                        </div>
                        <!-- Format -->
                        <div
                            class="col-span-2 font-mono text-slate-100"
                        >
                            ${track.format || 'Unknown'}
                        </div>
                        <!-- Codecs -->
                        <div
                            class="col-span-3 font-mono text-slate-100 space-y-1"
                        >
                            ${(track.codecsOrMimeTypes || []).map(
                            (c) => html`<div>${renderCodecInfo(c)}</div>`
                        )}
                        </div>
                        <!-- Roles -->
                        <div
                            class="col-span-1 font-mono text-slate-400 truncate"
                            title="${roles}"
                        >
                            ${roles}
                        </div>
                    </div>
                `;
            });
        }

        if (!content || content.length === 0) {
            content = html`
                <p
                    class="mono p-8 text-center text-[11px] text-slate-600"
                >
                    No ${activeTab} tracks in this manifest.
                </p>
            `;
        }

        const template = html`
            <div class="flex flex-col h-full w-full">
                <div
                    class="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-white/5 shrink-0"
                >
                    <h3 class="mono text-xs font-medium text-slate-300">
                        tracks
                    </h3>
                    <div class="flex items-center gap-1.5">
                        ${renderTabButton('video', 'Video', icons.film)}
                        ${renderTabButton('audio', 'Audio', icons.audioLines)}
                        ${renderTabButton('text', 'Text', icons.fileText)}
                    </div>
                </div>

                <div class="grow overflow-y-auto custom-scrollbar min-h-0">
                    <div
                        class="sticky top-0 z-10 grid ${gridCols} gap-4 px-4 py-2.5 bg-[#0b111c] border-b border-white/5 mono text-[10px] font-medium text-slate-500"
                    >
                        ${header}
                    </div>

                    <div class="flex flex-col pb-4">${content}</div>
                </div>
            </div>
        `;

        render(template, this);
    }
}

customElements.define('summary-tracks-panel', SummaryTracksPanel);

export const tracksPanelTemplate = (vm) =>
    html`<summary-tracks-panel
        .vm=${vm}
        class="block w-full h-full"
    ></summary-tracks-panel>`;
