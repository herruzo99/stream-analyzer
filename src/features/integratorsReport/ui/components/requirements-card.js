import { html } from 'lit-html';
import { formatBitrate } from '@/ui/shared/format';
import * as icons from '@/ui/icons';

const chip = (text, color = 'bg-slate-700 text-slate-300') => html`
    <span
        class="px-2 py-1 rounded text-[10px] font-bold font-mono ${color} border border-white/5"
    >
        ${text}
    </span>
`;

export const requirementsCardTemplate = (vm) => {
    const { technical, overview } = vm;

    return html`
        <div
            class="bg-slate-800 rounded-xl border border-slate-700 p-5 flex flex-col gap-6 shadow-sm"
        >
            <!-- Section: Stream Identity -->
            <div>
                <h3
                    class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2"
                >
                    ${icons.server} Stream Profile
                </h3>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <p class="text-slate-400 text-xs">Protocol</p>
                        <p class="text-white font-semibold">
                            ${overview.protocol}
                        </p>
                    </div>
                    <div>
                        <p class="text-slate-400 text-xs">Type</p>
                        <div class="flex items-center gap-2">
                            <p class="text-white font-semibold">
                                ${overview.type}
                            </p>
                            ${overview.type === 'LIVE'
                                ? html`<span class="relative flex h-2 w-2"
                                      ><span
                                          class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"
                                      ></span
                                      ><span
                                          class="relative inline-flex rounded-full h-2 w-2 bg-red-500"
                                      ></span
                                  ></span>`
                                : ''}
                        </div>
                    </div>
                    <div>
                        <p class="text-slate-400 text-xs">Max Resolution</p>
                        <p class="text-white font-mono text-sm">
                            ${overview.maxResolution}
                        </p>
                    </div>
                    <div>
                        <p class="text-slate-400 text-xs">Max Bitrate</p>
                        <p class="text-white font-mono text-sm">
                            ${formatBitrate(overview.maxBandwidth)}
                        </p>
                    </div>
                </div>
            </div>

            <div class="h-px bg-slate-700/50"></div>

            <!-- Section: Codecs -->
            <div>
                <h3
                    class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2"
                >
                    ${icons.clapperboard} Media Formats
                </h3>
                <div class="space-y-3">
                    <div>
                        <p class="text-xs text-slate-400 mb-1.5">
                            Video Codecs
                        </p>
                        <div class="flex flex-wrap gap-1">
                            ${technical.videoCodecs.length
                                ? technical.videoCodecs.map((c) =>
                                      chip(
                                          c,
                                          'bg-blue-900/40 text-blue-200 border-blue-700/50'
                                      )
                                  )
                                : html`<span
                                      class="text-slate-500 italic text-xs"
                                      >None detected</span
                                  >`}
                        </div>
                    </div>
                    <div>
                        <p class="text-xs text-slate-400 mb-1.5">
                            Audio Codecs
                        </p>
                        <div class="flex flex-wrap gap-1">
                            ${technical.audioCodecs.length
                                ? technical.audioCodecs.map((c) =>
                                      chip(
                                          c,
                                          'bg-purple-900/40 text-purple-200 border-purple-700/50'
                                      )
                                  )
                                : html`<span
                                      class="text-slate-500 italic text-xs"
                                      >None detected</span
                                  >`}
                        </div>
                    </div>
                </div>
            </div>

            <div class="h-px bg-slate-700/50"></div>

            <!-- Section: Security -->
            <div>
                <h3
                    class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2"
                >
                    ${icons.shieldCheck} Security
                </h3>
                ${technical.isEncrypted
                    ? html`
                          <div class="flex flex-wrap gap-2 mb-2">
                              ${technical.drmSystems.map((s) =>
                                  chip(
                                      s,
                                      'bg-green-900/30 text-green-400 border-green-700/50'
                                  )
                              )}
                          </div>
                          <p class="text-xs text-slate-400">
                              Requires secure context (HTTPS) and EME support.
                          </p>
                      `
                    : html`
                          <div
                              class="flex items-center gap-2 text-slate-300 text-sm"
                          >
                              ${icons.lockOpen}
                              <span>Clear Content (No DRM)</span>
                          </div>
                      `}
            </div>
        </div>
    `;
};
