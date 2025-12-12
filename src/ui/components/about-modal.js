import * as icons from '@/ui/icons';
import { html } from 'lit-html';

const featureCard = (icon, title, description, colorClass) => html`
    <div
        class="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-colors"
    >
        <div class="flex items-center gap-3 mb-2">
            <div
                class="p-2 rounded-lg bg-slate-900 border border-slate-700 ${colorClass}"
            >
                ${icon}
            </div>
            <h4 class="font-bold text-slate-200 text-sm">${title}</h4>
        </div>
        <p class="text-xs text-slate-400 leading-relaxed">${description}</p>
    </div>
`;

export const aboutModalTemplate = () => html`
    <div
        class="flex flex-col h-full bg-slate-950 text-slate-300 overflow-hidden"
    >
        <!-- Header -->
        <div
            class="shrink-0 p-8 pb-6 text-center border-b border-slate-800 bg-slate-900/50"
        >
            <div
                class="inline-flex p-4 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl mb-4 shadow-xl border border-slate-700/50"
            >
                <img
                    src="/icon.png"
                    class="w-12 h-12 object-contain drop-shadow-md opacity-90"
                    alt="Logo"
                />
            </div>
            <h2 class="text-3xl font-black text-white tracking-tight mb-2">
                Stream Analyzer
            </h2>
            <p class="text-sm text-slate-400 font-medium">
                v1.1.0 <span class="mx-2 text-slate-600">•</span> Open Source
                Inspection Workbench
            </p>
        </div>

        <!-- Scrollable Content -->
        <div class="grow overflow-y-auto p-6 sm:p-8 custom-scrollbar space-y-8">
            <!-- Intro -->
            <section class="max-w-2xl mx-auto text-center">
                <p class="text-base text-slate-300 leading-relaxed">
                    A <strong>client-side debugging workbench</strong> for
                    streaming engineers. It parses, visualizes, and validates
                    DASH and HLS manifests directly in your browser. Designed as
                    a "second pair of eyes" to identify structural errors,
                    visualize bitrate ladders, and inspect low-level segment
                    structures without command-line tools.
                </p>
            </section>

            <!-- Capabilities Grid -->
            <section>
                <h3
                    class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 text-center"
                >
                    Core Capabilities
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${featureCard(
    icons.fileText,
    'Manifest Inspection',
    'Deep parsing of MPEG-DASH (.mpd) and HLS (.m3u8). Syntax highlighting, tag explanations, and live update diffing.',
    'text-blue-400'
)}
                    ${featureCard(
    icons.binary,
    'Segment Analysis',
    'Byte-level inspection of ISOBMFF boxes and MPEG-TS packets. Visualize frame sizes, GOP structures, and SCTE-35 signals.',
    'text-purple-400'
)}
                    ${featureCard(
    icons.play,
    'Playback Simulation',
    'Embedded Shaka Player instance for correlating manifest data with real-world playback behavior, buffer health, and ABR logic.',
    'text-emerald-400'
)}
                    ${featureCard(
    icons.shieldCheck,
    'Compliance Checks',
    'Automated heuristic rules engine to detect violations of DASH-IF and HLS guidelines and best practices.',
    'text-amber-400'
)}
                </div>
            </section>

            <!-- Data Privacy -->
            <section
                class="bg-blue-900/10 border border-blue-500/20 rounded-xl p-5 flex gap-4 items-start"
            >
                <div class="text-blue-400 shrink-0 mt-0.5">
                    ${icons.lockClosed}
                </div>
                <div>
                    <h4 class="text-sm font-bold text-blue-100 mb-1">
                        Data & Privacy
                    </h4>
                    <p class="text-xs text-blue-200/70 leading-relaxed">
                        This application runs
                        <strong>entirely in your browser</strong>. No manifest
                        data, segment content, or DRM keys are sent to any
                        external backend server controlled by this project.
                        Network requests occur strictly between your browser and
                        your content servers.
                    </p>
                </div>
            </section>

            <!-- Disclaimer -->
            <section class="border-t border-slate-800 pt-6">
                <h4
                    class="text-xs font-bold text-red-400 uppercase tracking-wider mb-3"
                >
                    Liability & Disclaimer
                </h4>
                <div
                    class="text-[11px] text-slate-500 space-y-2 font-mono bg-slate-900/50 p-4 rounded-lg border border-slate-800"
                >
                    <p>
                        THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF
                        ANY KIND, EXPRESS OR IMPLIED.
                    </p>
                    <ul class="list-disc pl-4 space-y-1">
                        <li>
                            <strong>No Certification:</strong> This is a
                            debugging tool. A "Pass" does not guarantee playback
                            on all devices. It is a static analysis tool, not a
                            certification authority.
                        </li>
                        <li>
                            <strong>DRM & Security:</strong> While this tool
                            includes a PSSH parser, it does not circumvent DRM.
                            You are responsible for handling keys/licenses
                            according to your content's terms.
                        </li>
                        <li>
                            <strong>Usage:</strong> The author accepts no
                            liability for data loss or production issues
                            resulting from the use of this tool.
                        </li>
                    </ul>
                </div>
            </section>
        </div>

        <!-- Footer -->
        <div
            class="shrink-0 p-6 border-t border-slate-800 bg-slate-900/50 text-center"
        >
            <p class="text-xs text-slate-500 mb-3">
                Created by
                <strong class="text-slate-300">Juan Herruzo Herrero</strong>
            </p>
            <div class="flex justify-center gap-3">
                <a
                    href="https://github.com/herruzo99/stream-analyzer"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-300 text-xs font-bold transition-all"
                >
                    ${icons.github} Source Code
                </a>
                <a
                    href="https://github.com/herruzo99/stream-analyzer/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-300 text-xs font-bold transition-all"
                >
                    ${icons.debug} Report Issue
                </a>
            </div>
        </div>
    </div>
`;
