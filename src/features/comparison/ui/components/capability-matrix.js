import * as icons from '@/ui/icons';
import { html } from 'lit-html';

const CAPABILITIES = [
    {
        id: 'isLowLatency',
        label: 'Low Latency',
        icon: icons.zap,
        path: 'lowLatency.isLowLatency',
    },
    {
        id: 'isEncrypted',
        label: 'DRM Protected',
        icon: icons.lockClosed,
        path: 'security.isEncrypted',
    },
    {
        id: 'hasSubtitles',
        label: 'Subtitles',
        icon: icons.fileText,
        path: (s) => s.content.totalTextTracks > 0,
    },
    {
        id: 'hasAltAudio',
        label: 'Alt Audio',
        icon: icons.audioLines,
        path: (s) => s.content.totalAudioTracks > 1,
    },
    {
        id: 'has4k',
        label: '4K / UHD',
        icon: icons.monitor,
        path: (s) =>
            s.videoTracks.some(
                (t) =>
                    t.resolutions[0]?.value.includes('3840') ||
                    t.resolutions[0]?.value.includes('4096')
            ),
    },
    {
        id: 'hasHdr',
        label: 'HDR / 10-bit',
        icon: icons.sun,
        path: (s) =>
            s.videoTracks.some((t) => t.videoRange && t.videoRange !== 'SDR'),
    },
    {
        id: 'hasTrickPlay',
        label: 'Trick Play',
        icon: icons.fastForward,
        path: (s) =>
            s.hls?.iFramePlaylists > 0 ||
            s.videoTracks.some((t) => t.roles.some((r) => r.value === 'trick')),
    },
    {
        id: 'hasHevc',
        label: 'HEVC',
        icon: icons.cpu,
        path: (s) =>
            s.videoTracks.some((t) =>
                t.codecs.some(
                    (c) => c.value.includes('hvc') || c.value.includes('hev')
                )
            ),
    },
];

const getValue = (summary, cap) => {
    if (!summary) return false;
    if (typeof cap.path === 'function') return cap.path(summary);
    return cap.path.split('.').reduce((o, i) => o?.[i], summary);
};

const renderCapabilityCell = (hasCapability) => {
    if (hasCapability) {
        return html`
            <div
                class="flex justify-center items-center h-full text-emerald-400"
            >
                ${icons.checkCircle}
            </div>
        `;
    }
    return html`
        <div class="flex justify-center items-center h-full text-slate-700/50">
            <div class="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
        </div>
    `;
};

export const capabilityMatrixTemplate = (streams) => {
    // Grid columns: First column fixed width (labels), then 1fr for each stream
    const gridStyle = `grid-template-columns: 160px repeat(${streams.length}, minmax(120px, 1fr));`;

    return html`
        <div
            class="w-full h-full flex flex-col bg-slate-900 rounded-lg overflow-hidden border border-slate-700 shadow-lg relative"
        >
            <!-- Scrollable Container (Parent for Sticky Positioning) -->
            <div
                class="overflow-auto custom-scrollbar w-full h-full bg-slate-900"
            >
                <div class="grid gap-px" style="${gridStyle}">
                    <!-- Top-Left Header (Sticky on X and Y axes) -->
                    <div
                        class="sticky left-0 top-0 z-40 p-3 text-xs font-bold text-slate-400 uppercase tracking-wider flex items-end bg-slate-900 border-b border-r border-slate-800 shadow-[2px_2px_10px_rgba(0,0,0,0.2)]"
                    >
                        Capabilities
                    </div>

                    <!-- Stream Headers (Sticky Top) -->
                    ${streams.map(
                        (s) => html`
                            <div
                                class="sticky top-0 z-30 p-3 text-center border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm"
                            >
                                <div
                                    class="text-xs font-bold text-white truncate px-2"
                                    title="${s.name}"
                                >
                                    ${s.name}
                                </div>
                                <div
                                    class="text-[10px] text-slate-500 font-mono mt-0.5"
                                >
                                    ${s.id}
                                </div>
                            </div>
                        `
                    )}

                    <!-- Rows -->
                    ${CAPABILITIES.map((cap, idx) => {
                        // Render row content
                        const rowCells = streams.map((s) => {
                            const hasCap = getValue(s.manifest?.summary, cap);
                            return html`
                                <div
                                    class="flex items-center justify-center bg-slate-900/30 hover:bg-white/[0.02] transition-colors border-b border-slate-800/30 h-12"
                                >
                                    ${renderCapabilityCell(hasCap)}
                                </div>
                            `;
                        });

                        return html`
                            <!-- Row Label (Sticky Left) -->
                            <div
                                class="sticky left-0 z-20 p-3 flex items-center gap-3 text-xs font-medium text-slate-300 bg-slate-900 border-b border-r border-slate-800 hover:bg-slate-800/50 transition-colors h-12 shadow-[2px_0_5px_rgba(0,0,0,0.1)]"
                            >
                                <span class="text-slate-500 shrink-0"
                                    >${cap.icon}</span
                                >
                                <span class="truncate" title="${cap.label}"
                                    >${cap.label}</span
                                >
                            </div>

                            <!-- Data Cells -->
                            ${rowCells}
                        `;
                    })}
                </div>
            </div>
        </div>
    `;
};
