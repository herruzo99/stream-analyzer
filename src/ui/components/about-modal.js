import * as icons from '@/ui/icons';
import { html } from 'lit-html';
import { closeModal } from '@/ui/services/modalService';

const APP_VERSION = '1.2.0';

const capabilityRow = (icon, title, description) => html`
    <div class="flex gap-3 px-4 py-3 rounded-md border border-white/5 bg-white/[0.02]">
        <span class="shrink-0 p-1.5 rounded text-slate-500">${icon}</span>
        <div class="min-w-0">
            <h4 class="text-sm font-medium text-slate-100">${title}</h4>
            <p class="text-[13px] text-slate-500 leading-relaxed mt-0.5">
                ${description}
            </p>
        </div>
    </div>
`;

export const aboutModalTemplate = () => html`
    <div class="flex flex-col h-full min-h-0">
        <div
            class="flex flex-col h-full bg-[#0b111c] text-slate-200 overflow-hidden relative max-w-3xl mx-auto my-auto max-h-[85vh] w-full rounded-lg border border-white/10"
        >
            <div class="shrink-0 px-5 pt-4 pb-3 border-b border-white/5">
                <div class="flex justify-between items-start gap-3">
                    <div>
                        <p class="mono text-[11px] text-emerald-300">
                            $ about --version
                        </p>
                        <h2
                            class="text-xl font-bold text-slate-100 tracking-tight mt-1"
                        >
                            Stream Analyzer
                        </h2>
                        <p class="mono text-[11px] text-slate-500 mt-1">
                            v${APP_VERSION} · open source · runs locally
                        </p>
                    </div>
                    <button
                        @click=${closeModal}
                        class="p-2 text-slate-500 hover:text-slate-100 hover:bg-white/5 rounded-md transition-colors shrink-0"
                        aria-label="Close about dialog"
                    >
                        ${icons.x}
                    </button>
                </div>
            </div>

            <div class="grow overflow-y-auto custom-scrollbar p-5 space-y-5">
                <p class="text-[15px] text-slate-400 leading-relaxed">
                    A client-side debugging workbench for streaming
                    engineers. Parse, visualize, and validate
                    <span class="mono text-[13px] text-slate-200"
                        >MPEG-DASH</span
                    >
                    and
                    <span class="mono text-[13px] text-slate-200">HLS</span>
                    manifests in your browser — a second pair of eyes for
                    structural errors and segment internals, no command
                    line needed.
                </p>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    ${capabilityRow(
                        icons.fileText,
                        'Manifest inspection',
                        'Deep parsing of .mpd and .m3u8: syntax highlighting, tag explanations, live update diffing.'
                    )}
                    ${capabilityRow(
                        icons.binary,
                        'Segment analysis',
                        'Byte-level ISOBMFF boxes and MPEG-TS packets: frame sizes, GOP structures, SCTE-35 signals.'
                    )}
                    ${capabilityRow(
                        icons.play,
                        'Playback simulation',
                        'Embedded Shaka player to correlate manifest data with buffer health and ABR behavior.'
                    )}
                    ${capabilityRow(
                        icons.shieldCheck,
                        'Compliance checks',
                        'Heuristic rules against DASH-IF and HLS guidelines and best practices.'
                    )}
                </div>

                <div
                    class="rounded-md border border-white/5 bg-white/[0.02] p-4 flex gap-3"
                >
                    <span class="shrink-0 p-1.5 rounded text-emerald-300"
                        >${icons.lockClosed}</span
                    >
                    <div>
                        <h4 class="text-sm font-medium text-slate-100">
                            Stays in your browser
                        </h4>
                        <p
                            class="text-[13px] text-slate-500 leading-relaxed mt-0.5"
                        >
                            No manifest data, segment content, or DRM keys
                            leave your machine. Requests go only between
                            your browser and your content servers.
                        </p>
                    </div>
                </div>

                <div
                    class="mono rounded-md border border-white/5 bg-black/30 p-4 text-[11px] text-slate-500 space-y-2"
                >
                    <p class="flex items-center gap-2 text-slate-400">
                        ${icons.alertTriangle} No warranty, no
                        certification
                    </p>
                    <p>
                        Provided as-is. A pass here does not guarantee
                        playback on every device. Includes a PSSH parser;
                        it does not circumvent DRM.
                    </p>
                </div>
            </div>

            <div
                class="shrink-0 px-5 py-3 border-t border-white/5 flex flex-col sm:flex-row gap-2 sm:items-center bg-black/20"
            >
                <p class="mono text-[11px] text-slate-600 grow">
                    by Juan Herruzo Herrero
                </p>
                <div class="flex gap-2">
                    <a
                        href="https://github.com/herruzo99/stream-analyzer"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="flex items-center gap-2 px-3 py-2 rounded-md border border-white/10 text-xs font-medium text-slate-300 hover:border-white/25 hover:bg-white/5 transition-colors"
                    >
                        ${icons.github} Source
                    </a>
                    <a
                        href="https://github.com/herruzo99/stream-analyzer/issues"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="flex items-center gap-2 px-3 py-2 rounded-md border border-white/10 text-xs font-medium text-slate-300 hover:border-white/25 hover:bg-white/5 transition-colors"
                    >
                        ${icons.debug} Report issue
                    </a>
                </div>
            </div>
        </div>
    </div>
`;
