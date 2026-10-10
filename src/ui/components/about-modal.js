import * as icons from '@/ui/icons';
import { html } from 'lit-html';
import { closeModal } from '@/ui/services/modalService';

const featureCard = (icon, title, description, colorClass, delay) => html`
    <div
        class="group relative p-6 rounded-3xl bg-slate-800 border border-slate-800 hover:border-blue-500 transition-all duration-500 hover:shadow-[0_0_40px_-10px_#3b82f6] hover:-translate-y-1 overflow-hidden animate-slideUpFade backdrop-blur-3xl"
        style="animation-delay: ${delay}ms; animation-fill-mode: both;"
    >
        <div
            class="absolute inset-0 bg-gradient-to-br from-slate-800 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        ></div>
        <div class="relative z-10">
            <div class="flex items-center gap-4 mb-3">
                <div
                    class="p-3 rounded-2xl bg-slate-800 border border-slate-800 ${colorClass} shadow-sm group-hover:scale-110 transition-transform duration-300"
                >
                    ${icon}
                </div>
                <h4
                    class="font-bold text-[#f1f5f9] text-sm tracking-tight group-hover:text-blue-400 transition-colors"
                >
                    ${title}
                </h4>
            </div>
            <p
                class="text-xs text-[#94a3b8] leading-relaxed group-hover:text-[#f1f5f9]/80 transition-colors font-medium"
            >
                ${description}
            </p>
        </div>
    </div>
`;

// Wrap the content in <modal-frame plain> to get the backdrop and basic positioning,
// but keep the custom look.
export const aboutModalTemplate = () => html`
    <div class="flex flex-col h-full min-h-0">
        <div 
            style="border-radius: 0.75rem"
            class="flex flex-col h-full bg-slate-800 backdrop-blur-[blur(12px)] text-[#f1f5f9] overflow-hidden relative shadow-[0 8px 30px rgb(0 0 0 / 0.35)] max-w-5xl mx-auto my-auto max-h-[85vh]"
        >
            
            <!-- Header -->
            <div class="shrink-0 p-8 pb-6 text-center border-b border-slate-800 bg-slate-800 backdrop-blur-3xl relative z-10 shadow-[0_20px_50px_rgba(0,0,0,0.1)]">
                <button
                    @click=${closeModal}
                    class="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-slate-800 text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-slate-800 transition-all duration-300 border border-slate-800 hover:scale-110 z-50"
                >
                    ${icons.x}
                </button>
                <div class="relative inline-block mb-6 group">
                    <div
                        class="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-500 animate-pulse-slow"
                    ></div>
                    <div
                        class="relative p-6 bg-slate-800 rounded-3xl border border-slate-800 shadow-2xl"
                    >
                        <div
                            class="w-16 h-16 bg-blue-500 drop-shadow-lg"
                            style="mask-image: url(/icon.png); mask-size: contain; mask-position: center; mask-repeat: no-repeat; -webkit-mask-image: url(/icon.png); -webkit-mask-size: contain; -webkit-mask-position: center; -webkit-mask-repeat: no-repeat;"
                        ></div>
                    </div>
                </div>

                <h2
                    class="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-slate-100 to-slate-400 tracking-tighter mb-3 drop-shadow-sm"
                >
                    Stream Analyzer
                </h2>
                <div
                    class="flex items-center justify-center gap-3 text-sm font-medium"
                >
                    <span
                        class="px-3 py-1 rounded-full bg-slate-700 text-blue-400 border border-blue-500/20 shadow-[0_0_10px_#3b82f6]"
                        >v1.1.0</span
                    >
                    <span class="text-[#94a3b8]">•</span>
                    <span class="text-[#94a3b8]"
                        >Open Source Inspection Workbench</span
                    >
                </div>
            </div>

            <!-- Scrollable Content -->
            <div
                class="grow overflow-y-auto p-6 sm:p-10 custom-scrollbar space-y-12 relative z-0"
            >
                <!-- Intro -->
                <section class="max-w-3xl mx-auto text-center animate-fadeIn">
                    <p
                        class="text-xl text-[#f1f5f9]/90 leading-relaxed font-light"
                    >
                        A
                        <strong class="text-blue-400 font-black"
                            >client-side debugging workbench</strong
                        >
                        for streaming engineers. Parse, visualize, and validate
                        <span
                            class="font-mono text-xs bg-slate-800 px-2 py-1 rounded-lg border border-slate-800 text-purple-300 shadow-sm"
                            >MPEG-DASH</span
                        >
                        and
                        <span
                            class="font-mono text-xs bg-slate-800 px-2 py-1 rounded-lg border border-slate-800 text-purple-300 shadow-sm"
                            >HLS</span
                        >
                        manifests directly in your browser. Designed as a "second
                        pair of eyes" to identify structural errors and inspect
                        low-level segment structures without command-line tools.
                    </p>
                </section>

                <!-- Capabilities Grid -->
                <section>
                    <h3
                        class="text-xs font-black text-[#94a3b8] uppercase tracking-[0.2em] mb-8 text-center opacity-80"
                    >
                        Core Capabilities
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        ${featureCard(
    icons.fileText,
    'Manifest Inspection',
    'Deep parsing of MPEG-DASH (.mpd) and HLS (.m3u8). Syntax highlighting, tag explanations, and live update diffing.',
    'text-blue-400',
    100
)}
                        ${featureCard(
    icons.binary,
    'Segment Analysis',
    'Byte-level inspection of ISOBMFF boxes and MPEG-TS packets. Visualize frame sizes, GOP structures, and SCTE-35 signals.',
    'text-purple-300',
    200
)}
                        ${featureCard(
    icons.play,
    'Playback Simulation',
    'Embedded Shaka Player instance for correlating manifest data with real-world playback behavior, buffer health, and ABR logic.',
    'text-emerald-400',
    300
)}
                        ${featureCard(
    icons.shieldCheck,
    'Compliance Checks',
    'Automated heuristic rules engine to detect violations of DASH-IF and HLS guidelines and best practices.',
    'text-amber-400',
    400
)}
                    </div>
                </section>

                <!-- Data Privacy -->
                <section
                    class="relative overflow-hidden rounded-3xl border border-blue-500/20 bg-slate-700 p-8 animate-slideUpFade backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)]"
                    style="animation-delay: 500ms; animation-fill-mode: both;"
                >
                    <div
                        class="absolute top-0 right-0 p-8 opacity-10 text-blue-400 transform translate-x-1/4 -translate-y-1/4"
                    >
                        <div class="scale-[4]">${icons.lockClosed}</div>
                    </div>
                    <div class="relative z-10 flex gap-6 items-start">
                        <div
                            class="p-4 rounded-2xl bg-slate-700 text-blue-400 border border-blue-500/20 shrink-0 shadow-[0_0_20px_#3b82f6]"
                        >
                            ${icons.lockClosed}
                        </div>
                        <div>
                            <h4
                                class="text-xl font-black text-[#f1f5f9] mb-3"
                            >
                                Data & Privacy First
                            </h4>
                            <p
                                class="text-sm text-[#94a3b8] leading-relaxed max-w-2xl font-medium"
                            >
                                This application runs
                                <strong class="text-blue-400"
                                    >entirely in your browser</strong
                                >. No manifest data, segment content, or DRM keys
                                are sent to any external backend server. Network
                                requests occur strictly between your browser and
                                your content servers.
                            </p>
                        </div>
                    </div>
                </section>

                <!-- Disclaimer -->
                <section class="pt-8 border-t border-slate-800/50">
                    <div
                        class="text-[11px] text-[#94a3b8] space-y-3 font-mono bg-slate-800 p-6 rounded-2xl border border-slate-800/50 hover:border-red-500/30 transition-colors backdrop-blur-sm"
                    >
                        <div
                            class="flex items-center gap-2 text-red-400 mb-2"
                        >
                            ${icons.alertTriangle}
                            <span class="font-bold uppercase tracking-wider"
                                >Liability Disclaimer</span
                            >
                        </div>
                        <p>
                            THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF
                            ANY KIND.
                        </p>
                        <ul class="list-disc pl-4 space-y-1 opacity-80">
                            <li>
                                <strong>No Certification:</strong> This is a
                                debugging tool. A "Pass" does not guarantee playback
                                on all devices.
                            </li>
                            <li>
                                <strong>DRM & Security:</strong> This tool includes
                                a PSSH parser but does not circumvent DRM.
                            </li>
                        </ul>
                    </div>
                </section>
            </div>

            <!-- Footer -->
            <div
                class="shrink-0 p-6 border-t border-slate-800 bg-slate-800 backdrop-blur-3xl text-center relative z-10"
            >
                <p class="text-xs text-[#94a3b8] mb-4">
                    Created by
                    <strong
                        class="text-[#f1f5f9] hover:text-blue-400 transition-colors cursor-default"
                        >Juan Herruzo Herrero</strong
                    >
                </p>
                <div class="flex justify-center gap-4">
                    <a
                        href="https://github.com/herruzo99/stream-analyzer"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="group flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-100 border border-slate-800 hover:border-transparent text-[#f1f5f9] hover:text-[#1e293b] text-xs font-bold transition-all duration-300 shadow-lg hover:shadow-[0_0_30px_#3b82f6]"
                    >
                        ${icons.github} Source Code
                    </a>
                    <a
                        href="https://github.com/herruzo99/stream-analyzer/issues"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="group flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-800 hover:bg-red-500 border border-slate-800 hover:border-transparent text-[#f1f5f9] hover:text-[#f1f5f9] text-xs font-bold transition-all duration-300 shadow-lg hover:shadow-[0_0_30px_#ef4444]"
                    >
                        ${icons.debug} Report Issue
                    </a>
                </div>
            </div>
        </div>
    </div>
`;
