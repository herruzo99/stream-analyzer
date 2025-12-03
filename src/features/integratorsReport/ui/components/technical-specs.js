import * as icons from '@/ui/icons';
import { formatBitrate } from '@/ui/shared/format';
import { html } from 'lit-html';

const specItem = (label, value, icon = null) => html`
    <div
        class="flex justify-between items-start py-2 border-b border-slate-700/50 last:border-0 hover:bg-slate-800/30 px-2 rounded transition-colors"
    >
        <div class="flex items-center gap-2 text-slate-400 font-medium text-xs">
            ${icon
                ? html`<span class="scale-75 opacity-70">${icon}</span>`
                : ''}
            ${label}
        </div>
        <div
            class="text-slate-200 font-mono text-xs text-right break-all max-w-[60%]"
        >
            ${value || '-'}
        </div>
    </div>
`;

const badgeList = (items, colorClass) => {
    if (!items || items.length === 0)
        return html`<span class="text-slate-500 text-[10px] italic pl-2"
            >None</span
        >`;
    return html`
        <div class="flex flex-wrap gap-1.5 mt-1 pl-2">
            ${items.map(
                (item) => html`
                    <span
                        class="px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${colorClass}"
                    >
                        ${item}
                    </span>
                `
            )}
        </div>
    `;
};

export const technicalSpecsTemplate = (vm) => {
    const { overview, specs, _securityInfo } = vm;

    return html`
        <div
            class="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-lg h-full flex flex-col"
        >
            <div
                class="p-4 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center"
            >
                <h3
                    class="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2"
                >
                    ${icons.settings} Technical Specs
                </h3>
                <div class="flex gap-1">
                    ${overview.badges.map(
                        (b) => html`
                            <span
                                class="px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full text-[9px] font-bold border border-slate-700"
                            >
                                ${b}
                            </span>
                        `
                    )}
                </div>
            </div>

            <div
                class="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 overflow-y-auto custom-scrollbar grow"
            >
                <!-- General -->
                <div>
                    <h4
                        class="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-2"
                    >
                        ${icons.server} Stream Profile
                    </h4>
                    <div
                        class="bg-slate-800/30 rounded-lg border border-slate-800"
                    >
                        ${specItem('Protocol', overview.protocol)}
                        ${specItem('Type', overview.type)}
                        ${specItem('Profile / Version', specs.profiles)}
                        ${specItem(
                            'Avg Seg Duration',
                            `${specs.avgSegmentDuration.toFixed(2)}s`
                        )}
                    </div>
                </div>

                <!-- Video -->
                <div>
                    <h4
                        class="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-2"
                    >
                        ${icons.clapperboard} Video
                    </h4>
                    <div
                        class="bg-slate-800/30 rounded-lg border border-slate-800 mb-2"
                    >
                        ${specItem('Max Resolution', overview.maxResolution)}
                        ${specItem(
                            'Bitrate Range',
                            `${formatBitrate(overview.minBandwidth)} - ${formatBitrate(overview.maxBandwidth)}`
                        )}
                    </div>
                    <div class="text-xs text-slate-500 font-bold mb-1 pl-1">
                        CODECS
                    </div>
                    ${badgeList(
                        specs.videoCodecs,
                        'bg-emerald-900/20 text-emerald-300 border-emerald-500/30'
                    )}
                </div>

                <!-- Audio & Text -->
                <div>
                    <h4
                        class="text-xs font-bold text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-2"
                    >
                        ${icons.audioLines} Audio & Text
                    </h4>

                    <div class="mb-3">
                        <div class="text-xs text-slate-500 font-bold mb-1 pl-1">
                            AUDIO CODECS
                        </div>
                        ${badgeList(
                            specs.audioCodecs,
                            'bg-purple-900/20 text-purple-300 border-purple-500/30'
                        )}
                    </div>

                    <div>
                        <div class="text-xs text-slate-500 font-bold mb-1 pl-1">
                            SUBTITLES
                        </div>
                        ${badgeList(
                            specs.textFormats,
                            'bg-slate-700/30 text-slate-300 border-slate-600'
                        )}
                    </div>
                </div>

                <!-- Security -->
                <div>
                    <h4
                        class="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-2"
                    >
                        ${icons.shieldCheck} Content Protection
                    </h4>

                    ${specs.isEncrypted
                        ? html`
                              <div
                                  class="bg-amber-900/10 border border-amber-500/20 rounded-lg p-3"
                              >
                                  <div
                                      class="text-xs text-amber-200 mb-2 font-medium flex items-center gap-2"
                                  >
                                      ${icons.lockClosed} Encrypted Stream
                                  </div>
                                  <div class="space-y-1">
                                      ${specs.drmSystems.map(
                                          (sys) => html`
                                              <div
                                                  class="text-[10px] font-mono bg-black/40 px-2 py-1 rounded text-slate-300 border border-amber-500/10 flex justify-between"
                                              >
                                                  <span>${sys}</span>
                                              </div>
                                          `
                                      )}
                                  </div>
                                  <div
                                      class="mt-3 text-[10px] text-slate-500 leading-tight"
                                  >
                                      Requires a compliant DRM License Server
                                      and valid EME configuration.
                                  </div>
                              </div>
                          `
                        : html`
                              <div
                                  class="bg-slate-800/30 border border-slate-700 rounded-lg p-3 flex items-center gap-3"
                              >
                                  <div
                                      class="p-2 bg-slate-700/50 rounded-full text-slate-400"
                                  >
                                      ${icons.lockOpen}
                                  </div>
                                  <div class="text-xs text-slate-400">
                                      Stream is unencrypted (Clear). No DRM
                                      required.
                                  </div>
                              </div>
                          `}
                </div>
            </div>
        </div>
    `;
};
