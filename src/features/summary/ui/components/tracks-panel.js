import * as icons from '@/ui/icons';
import { html, render } from 'lit-html';
import { formatBitrate } from '@/ui/shared/format';
import { tooltipTriggerClasses } from '@/ui/shared/constants';
import { renderCodecInfo } from './shared.js';

const formatFrameRate = (fr) => {
    if (!fr) return 'N/A';
    if (typeof fr === 'number') return fr.toFixed(2);
    if (typeof fr === 'string') {
        if (fr.includes('/')) {
            const [num, den] = fr.split('/').map(Number);
            if (den) return (num / den).toFixed(2);
        }
        const num = parseFloat(fr);
        return isNaN(num) ? 'N/A' : num.toFixed(2);
    }
    return 'N/A';
};

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
        const activeTab = this.activeTab;

        // --- Tab Button Helper ---
        const renderTabButton = (id, label, icon) => {
            const isActive = activeTab === id;
            const activeClasses =
                'bg-blue-500/10 text-blue-400 border-blue-500/30';
            const inactiveClasses =
                'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-900/80';

            return html`
                <button
                    @click=${() => this.setActiveTab(id)}
                    class="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all flex items-center gap-2 ${isActive
                    ? activeClasses
                    : inactiveClasses}"
                >
                    ${icon} ${label}
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
                <div class="col-span-4 pl-2">Label</div>
                <div class="col-span-2">Bitrate</div>
                <div class="col-span-2">Resolution</div>
                <div class="col-span-1">Frame Rate</div>
                <div class="col-span-1">Video Codec(s)</div>
                <div class="col-span-1">Muxed Audio</div>
                <div class="col-span-1">Roles / Info</div>
            `;
            content = vm.videoTracks.map((track, index) => {
                const isEven = index % 2 === 0;

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
                            class="block text-[10px] text-amber-400 ${tooltipTriggerClasses}"
                            data-tooltip="The manifest @bandwidth is ${manifestBitrate}, but the effective max bitrate from the 'btrt' box in the init segment is ${effectiveBitrate}. The effective rate is shown."
                            >(Manifest: ${manifestBitrate})</span
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
                        class="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400"
                        >Trick Play</span
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
                if (track.scanType)
                    extraProps.push(
                        html`<span
                            class="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-800 text-[10px]"
                            >${track.scanType}</span
                        >`
                    );
                if (track.hdcpLevel)
                    extraProps.push(
                        html`<span
                            class="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] flex items-center gap-1"
                            >${icons.hdcp} ${track.hdcpLevel}</span
                        >`
                    );
                if (track.sar)
                    extraProps.push(
                        html`<span
                            class="px-1.5 py-0.5 bg-slate-800 text-slate-400 border border-slate-800 text-[10px]"
                            title="Sample Aspect Ratio"
                            >SAR ${track.sar}</span
                        >`
                    );
                if (track.codingDependency)
                    extraProps.push(
                        html`<span
                            class="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px]"
                            >Dependent</span
                        >`
                    );
                if (track.maxPlayoutRate)
                    extraProps.push(
                        html`<span
                            class="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px]"
                            >${track.maxPlayoutRate}x</span
                        >`
                    );

                return html`
                    <div
                        class="grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-800/50 hover:bg-slate-900/30 transition-colors text-sm items-center group ${isEven
                        ? 'bg-slate-900/5'
                        : ''}"
                    >
                        <!-- Label -->
                        <div class="col-span-4 flex items-center gap-3 pl-2">
                            <div
                                class="p-1.5 rounded bg-slate-900/50 text-slate-400 border border-slate-800/50 group-hover:border-blue-500/30 transition-colors"
                            >
                                ${icons.film}
                            </div>
                            <span
                                class="font-mono font-bold text-slate-100 truncate"
                                title="${track.label || track.id}"
                                >${track.label || track.id}</span
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
                            class="col-span-1 font-mono text-slate-100"
                        >
                            ${formatFrameRate(track.frameRate)}
                        </div>
                        <!-- Video Codecs -->
                        <div
                            class="col-span-1 font-mono text-slate-100 space-y-1"
                        >
                            ${(track.codecs || [])
                        .filter((c) => isVideoCodec(c.value))
                        .map((c) => html`<div>${renderCodecInfo(c)}</div>`)}
                        </div>
                        <!-- Muxed Audio -->
                        <div
                            class="col-span-1 font-mono text-slate-100 space-y-1"
                        >
                            ${track.muxedAudio?.codecs?.length > 0
                        ? track.muxedAudio.codecs.map(
                            (c) =>
                                html`<div>
                                          ${renderCodecInfo(c)}
                                      </div>`
                        )
                        : html`<span
                                      class="text-slate-400"
                                      >N/A</span
                                  >`}
                        </div>
                        <!-- Roles -->
                        <div
                            class="col-span-1 font-mono text-slate-400 flex flex-col gap-1 whitespace-nowrap overflow-hidden"
                        >
                            <div>${roles}</div>
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
                <div class="col-span-3 pl-2">Rendition ID</div>
                <div class="col-span-1">Language</div>
                <div class="col-span-1">Format</div>
                <div class="col-span-2">Ch / Hz</div>
                <div class="col-span-2">Bitrate</div>
                <div class="col-span-2">Codecs</div>
                <div class="col-span-1">Roles</div>
            `;

            content = (vm.audioTracks || []).map((track, index) => {
                const isEven = index % 2 === 0;
                const roleValues = (track.roles || [])
                    .map((r) => r.value)
                    .filter(Boolean);
                const roles =
                    roleValues.length > 0 ? roleValues.join(', ') : 'N/A';

                return html`
                    <div
                        class="grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-800/50 hover:bg-slate-900/30 transition-colors text-sm items-center group ${isEven
                        ? 'bg-slate-900/5'
                        : ''}"
                    >
                        <!-- Label -->
                        <div class="col-span-3 flex items-center gap-3 pl-2">
                            <div
                                class="p-1.5 rounded bg-slate-900/50 text-slate-400 border border-slate-800/50 group-hover:border-blue-500/30 transition-colors"
                            >
                                ${icons.audioLines}
                            </div>
                            <span
                                class="font-mono font-bold text-slate-100 truncate"
                                title="${track.label || track.id}"
                                >${track.label || track.id}</span
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
                <div class="col-span-4 pl-2">Rendition ID</div>
                <div class="col-span-2">Language</div>
                <div class="col-span-2">Format</div>
                <div class="col-span-3">Codecs</div>
                <div class="col-span-1">Roles</div>
            `;
            content = (vm.textTracks || []).map((track, index) => {
                const isEven = index % 2 === 0;
                const roleValues = (track.roles || [])
                    .map((r) => r.value)
                    .filter(Boolean);
                const roles =
                    roleValues.length > 0 ? roleValues.join(', ') : 'N/A';

                return html`
                    <div
                        class="grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-800/50 hover:bg-slate-900/30 transition-colors text-sm items-center group ${isEven
                        ? 'bg-slate-900/5'
                        : ''}"
                    >
                        <!-- Label -->
                        <div class="col-span-4 flex items-center gap-3 pl-2">
                            <div
                                class="p-1.5 rounded bg-slate-900/50 text-slate-400 border border-slate-800/50 group-hover:border-blue-500/30 transition-colors"
                            >
                                ${icons.fileText}
                            </div>
                            <span
                                class="font-mono font-bold text-slate-100 truncate"
                                title="${track.label || track.id}"
                                >${track.label || track.id}</span
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
                <div
                    class="p-8 text-center text-slate-400 italic"
                >
                    No ${activeTab} tracks found.
                </div>
            `;
        }

        const template = html`
            <div class="flex flex-col h-full w-full">
                <!-- Header with Tabs -->
                <div
                    class="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-800/10 shrink-0"
                >
                    <div class="flex items-center gap-4">
                        <h3
                            class="text-lg font-bold text-slate-100 flex items-center gap-2"
                        >
                            <div
                                class="p-1.5 rounded-lg bg-blue-500/10 text-blue-400"
                            >
                                ${icons.film}
                            </div>
                            Track Details
                        </h3>
                        <div class="h-6 w-px bg-slate-800"></div>
                        <div class="flex items-center gap-2">
                            ${renderTabButton('video', 'Video', icons.film)}
                            ${renderTabButton(
            'audio',
            'Audio',
            icons.audioLines
        )}
                            ${renderTabButton(
            'text',
            'Text',
            icons.fileText
        )}
                        </div>
                    </div>
                </div>

                <!-- Scrollable Content Area -->
                <div class="grow overflow-hidden relative flex flex-col">
                    <div class="absolute inset-0 overflow-auto custom-scrollbar">
                        <!-- Sticky Table Header -->
                        <div
                            class="sticky top-0 z-10 grid ${gridCols} gap-4 px-6 py-3 bg-slate-800/90 backdrop-blur-md border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider"
                        >
                            ${header}
                        </div>

                        <!-- Table Body -->
                        <div class="flex flex-col pb-4 h-full">
                            ${content}
                        </div>
                    </div>
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
