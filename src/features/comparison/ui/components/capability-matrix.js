import * as icons from '@/ui/icons';
import { html } from 'lit-html';

const CAPABILITIES = [
    {
        id: 'isLowLatency',
        label: 'low latency',
        icon: icons.zap,
        path: 'lowLatency.isLowLatency',
    },
    {
        id: 'isEncrypted',
        label: 'drm protected',
        icon: icons.lockClosed,
        path: 'security.isEncrypted',
    },
    {
        id: 'hasSubtitles',
        label: 'subtitles',
        icon: icons.fileText,
        path: (s) => (s.content?.totalTextTracks ?? 0) > 0,
    },
    {
        id: 'hasAltAudio',
        label: 'alt audio',
        icon: icons.audioLines,
        path: (s) => (s.content?.totalAudioTracks ?? 0) > 1,
    },
    {
        id: 'has4k',
        label: '4k / uhd',
        icon: icons.monitor,
        path: (s) =>
            (s.videoTracks || []).some((t) =>
                (t.resolutions || []).some(
                    (r) =>
                        typeof r.value === 'string' &&
                        (r.value.includes('3840') || r.value.includes('4096'))
                )
            ),
    },
    {
        id: 'hasHdr',
        label: 'hdr / 10-bit',
        icon: icons.sun,
        path: (s) =>
            (s.videoTracks || []).some(
                (t) => t.videoRange && t.videoRange !== 'SDR'
            ),
    },
    {
        id: 'hasTrickPlay',
        label: 'trick play',
        icon: icons.fastForward,
        path: (s) =>
            s.hls?.iFramePlaylists > 0 ||
            (s.videoTracks || []).some((t) =>
                (t.roles || []).some((r) => r.value === 'trick')
            ),
    },
    {
        id: 'hasHevc',
        label: 'hevc',
        icon: icons.cpu,
        path: (s) =>
            (s.videoTracks || []).some((t) =>
                (t.codecs || []).some(
                    (c) =>
                        typeof c.value === 'string' &&
                        (c.value.includes('hvc') || c.value.includes('hev'))
                )
            ),
    },
];

const getValue = (summary, cap) => {
    if (!summary) return false;
    try {
        if (typeof cap.path === 'function') return !!cap.path(summary);
        return !!cap.path.split('.').reduce((o, i) => o?.[i], summary);
    } catch {
        return false;
    }
};

const renderCapabilityCell = (hasCapability) =>
    hasCapability
        ? html`<span
              class="inline-flex items-center justify-center text-emerald-300"
              title="supported"
              >${icons.checkCircle}</span
          >`
        : html`<span
              class="inline-block w-1.5 h-1.5 rounded-full bg-white/10"
              title="not present"
          ></span>`;

export const capabilityMatrixTemplate = (streams) => {
    if (!streams || streams.length === 0) {
        return html`<p
            class="mono text-[11px] text-slate-600 p-6 text-center"
        >
            No streams to compare.
        </p>`;
    }

    const gridStyle = `grid-template-columns: 160px repeat(${streams.length}, minmax(120px, 1fr));`;

    return html`
        <div class="w-full h-full flex flex-col">
            <div class="overflow-auto custom-scrollbar w-full h-full p-3">
                <div class="grid gap-px" style="${gridStyle}">
                    <div
                        class="sticky left-0 top-0 z-40 p-2.5 mono text-[10px] text-slate-600 bg-[#0b111c]"
                    >
                        capability
                    </div>

                    ${streams.map(
                        (s) => html`
                            <div
                                class="sticky top-0 z-30 p-2.5 text-center bg-[#0b111c]"
                            >
                                <div
                                    class="text-[13px] font-medium text-slate-100 truncate"
                                    title="${s.name}"
                                >
                                    ${s.name}
                                </div>
                                <div class="mono text-[10px] text-slate-600">
                                    stream ${s.id}
                                </div>
                            </div>
                        `
                    )}
                    ${CAPABILITIES.map(
                        (cap) => html`
                            <div
                                class="sticky left-0 z-20 p-2.5 flex items-center gap-2.5 text-[13px] text-slate-200 bg-[#0b111c]"
                            >
                                <span class="text-slate-500 shrink-0"
                                    >${cap.icon}</span
                                >
                                <span class="truncate" title="${cap.label}"
                                    >${cap.label}</span
                                >
                            </div>
                            ${streams.map((s) => {
                                const hasCap = getValue(
                                    s.manifest?.summary,
                                    cap
                                );
                                return html`
                                    <div
                                        class="flex items-center justify-center bg-white/[0.015] rounded-md h-11"
                                    >
                                        ${renderCapabilityCell(hasCap)}
                                    </div>
                                `;
                            })}
                        `
                    )}
                </div>
            </div>
        </div>
    `;
};
