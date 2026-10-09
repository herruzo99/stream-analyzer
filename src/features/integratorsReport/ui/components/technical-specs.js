import * as icons from '@/ui/icons';
import { formatBitrate } from '@/ui/shared/format';
import { html } from 'lit-html';
import { styleMap } from 'lit-html/directives/style-map.js';



const specItem = (label, value, icon = null, highlight = false) => html`
    <div
        class="flex justify-between items-start py-2.5 border-b border-slate-800 last:border-0 hover:bg-slate-900/50 px-3 rounded-lg transition-all group"
    >
        <div
            class="flex items-center gap-2.5 text-slate-400 font-bold text-xs uppercase tracking-wide group-hover:text-slate-200 transition-colors"
        >
            ${icon
        ? html`<span
                      class="scale-90 opacity-70 group-hover:opacity-100 transition-opacity ${highlight
                ? 'text-[#60a5fa]'
                : ''}"
                      >${icon}</span
                  >`
        : ''}
            ${label}
        </div>
        <div
            class="font-mono text-xs text-right break-all max-w-[60%] ${highlight
        ? 'text-[#60a5fa] font-bold drop-shadow-[0_0_5px_#3b82f6]/50'
        : 'text-slate-200 opacity-90 group-hover:opacity-100 transition-colors'}"
        >
            ${value || '-'}
        </div>
    </div>
`;

const badgeList = (items, colorClass) => {
    if (!items || items.length === 0)
        return html`<span
            class="text-slate-400 text-[10px] italic pl-3 font-medium"
            >None</span
        >`;
    return html`
        <div class="flex flex-wrap gap-2 mt-2 pl-1">
            ${items.map(
        (item) => html`
                    <span
                        class="px-2.5 py-1 rounded-md text-[10px] font-bold font-mono border backdrop-blur-sm shadow-sm hover:scale-105 transition-transform cursor-default ${colorClass}"
                    >
                        ${item}
                    </span>
                `
    )}
        </div>
    `;
};

export const technicalSpecsTemplate = (vm, isGlass) => {
    const { overview, specs, _securityInfo } = vm;
    const isLive = overview.type === 'LIVE';

    const glassStyles = {
        borderRadius: '0.75rem',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 30px rgb(0 0 0 / 0.35)',
        background: '#1e293b',
    };

    const containerClass = isGlass
        ? "h-full group flex flex-col relative overflow-hidden"
        : "h-full group flex flex-col relative overflow-hidden bg-slate-800 border border-slate-800 rounded-sm";

    const innerRadius = isGlass ? 'rounded-2xl' : 'rounded-sm';

    return html`
        <div
            class="${containerClass}"
            style=${styleMap(isGlass ? glassStyles : {})}
        >
            <!-- Top Accent -->
            <div
                class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500/50 via-[#60a5fa]/50 to-blue-500/50 opacity-50"
            ></div>

            <div
                class="shrink-0 p-6 border-b border-slate-800 bg-slate-800/50 flex justify-between items-center"
            >
                <h3
                    class="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"
                >
                    ${icons.settings} Technical Specs
                </h3>
                <div class="flex gap-2">
                    ${overview.badges.map(
        (b) => html`
                            <span
                                class="px-2.5 py-1 bg-slate-900/50 text-slate-200 rounded-lg text-[9px] font-black uppercase tracking-wider border border-slate-800 shadow-inner"
                            >
                                ${b}
                            </span>
                        `
    )}
                </div>
            </div>

            <div
                class="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-x-8 gap-y-8 overflow-y-auto custom-scrollbar grow"
            >
                <!-- General -->
                <div>
                    <h4
                        class="text-[10px] font-black text-[#60a5fa] uppercase tracking-[0.2em] mb-3 flex items-center gap-2 pl-1"
                    >
                        ${icons.server} Stream Profile
                    </h4>
                    <div
                        class="bg-slate-900/30 ${innerRadius} border border-slate-800 p-1"
                    >
                        ${specItem('Protocol', overview.protocol)}
                        ${specItem('Type', overview.type)}
                        ${specItem('Profile / Version', specs.profiles)}
                        ${specItem(
        'Avg Seg Duration',
        `${specs.avgSegmentDuration.toFixed(2)}s`
    )}
                        <!-- Smart Interval Display -->
                        ${isLive && specs.smartPollingInterval
            ? specItem(
                'Rec. Poll Interval',
                `${specs.smartPollingInterval}s`,
                icons.activity,
                true
            )
            : ''}
                    </div>
                </div>

                <!-- Video -->
                <div>
                    <h4
                        class="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2 pl-1"
                    >
                        ${icons.clapperboard} Video
                    </h4>
                    <div
                        class="bg-slate-900/30 ${innerRadius} border border-slate-800 p-1 mb-4"
                    >
                        ${specItem('Max Resolution', overview.maxResolution)}
                        ${specItem(
                'Bitrate Range',
                `${formatBitrate(overview.minBandwidth)} - ${formatBitrate(overview.maxBandwidth)}`
            )}
                    </div>
                    <div
                        class="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1 pl-1"
                    >
                        Codecs
                    </div>
                    ${badgeList(
                specs.videoCodecs,
                'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_#10b981]/10'
            )}
                </div>

                <!-- Audio & Text -->
                <div>
                    <h4
                        class="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2 pl-1"
                    >
                        ${icons.audioLines} Audio & Text
                    </h4>

                    <div class="mb-6">
                        <div
                            class="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1 pl-1"
                        >
                            Audio Codecs
                        </div>
                        ${badgeList(
                specs.audioCodecs,
                'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_10px_#3b82f6]/10'
            )}
                    </div>

                    <div>
                        <div
                            class="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1 pl-1"
                        >
                            Subtitles
                        </div>
                        ${badgeList(
                specs.textFormats,
                'bg-slate-900/50 text-slate-200 border-slate-800'
            )}
                    </div>
                </div>

                <!-- Security -->
                <div>
                    <h4
                        class="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2 pl-1"
                    >
                        ${icons.shieldCheck} Content Protection
                    </h4>

                    ${specs.isEncrypted
            ? html`
                              <div
                                  class="bg-amber-500/5 border border-amber-500/20 ${innerRadius} p-4 relative overflow-hidden group"
                              >
                                  <div
                                      class="absolute inset-0 bg-amber-500/5 blur-xl group-hover:bg-amber-500/10 transition-colors"
                                  ></div>
                                  <div class="relative z-10">
                                      <div
                                          class="text-xs text-amber-400 mb-3 font-bold flex items-center gap-2 uppercase tracking-wide"
                                      >
                                          ${icons.lockClosed} Encrypted Stream
                                      </div>
                                      <div class="space-y-2">
                                          ${specs.drmSystems.map(
                (sys) => html`
                                                  <div
                                                      class="text-[10px] font-mono bg-slate-800/40 px-3 py-1.5 rounded-lg text-amber-400/80 border border-amber-500/10 flex justify-between shadow-inner"
                                                  >
                                                      <span>${sys}</span>
                                                  </div>
                                              `
            )}
                                      </div>
                                      <div
                                          class="mt-4 text-[10px] text-amber-400/60 leading-tight font-medium"
                                      >
                                          Requires a compliant DRM License
                                          Server and valid EME configuration.
                                      </div>
                                  </div>
                              </div>
                          `
            : html`
                              <div
                                  class="bg-slate-900/30 border border-slate-800 ${innerRadius} p-4 flex items-center gap-4 group hover:bg-slate-900/50 transition-colors"
                              >
                                  <div
                                      class="p-3 bg-slate-900/50 rounded-full text-slate-400 group-hover:text-slate-200 group-hover:scale-110 transition-all shadow-inner"
                                  >
                                      ${icons.lockOpen}
                                  </div>
                                  <div
                                      class="text-xs text-slate-400 group-hover:text-slate-200 transition-colors"
                                  >
                                      Stream is unencrypted (Clear). <br />No
                                      DRM required.
                                  </div>
                              </div>
                          `}
                </div>
            </div>
        </div>
    `;
};
