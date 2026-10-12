import * as icons from '@/ui/icons';
import { formatBitrate } from '@/ui/shared/format';
import { html } from 'lit-html';

const specItem = (label, value, icon = null) => html`
    <div class="flex justify-between items-start gap-3 py-2 px-3 border-b border-white/5 last:border-0">
        <span class="flex items-center gap-2 mono text-[11px] text-slate-500 shrink-0 pt-px">
            ${icon ? html`<span class="text-slate-600">${icon}</span>` : ''}
            ${label}
        </span>
        <span class="mono text-[11px] text-slate-200 text-right break-all max-w-[60%]">
            ${value || '-'}
        </span>
    </div>
`;

const badgeList = (items) => {
    if (!items || items.length === 0)
        return html`<span class="mono text-[11px] text-slate-600 pl-3">none</span>`;
    return html`
        <div class="flex flex-wrap gap-1.5 mt-2">
            ${items.map(
                (item) => html`
                    <span
                        class="px-2 py-0.5 rounded-md mono text-[11px] text-slate-300 border border-white/10 bg-white/[0.02]"
                    >
                        ${item}
                    </span>
                `
            )}
        </div>
    `;
};

const sectionTitle = (icon, label) => html`
    <h4 class="mono text-[11px] text-slate-500 mb-2 flex items-center gap-2 px-1">
        <span class="text-slate-600">${icon}</span>${label}
    </h4>
`;

export const technicalSpecsTemplate = (vm) => {
    const { overview, specs } = vm;
    const duration = Number(specs.avgSegmentDuration);
    const durationLabel =
        Number.isFinite(duration) && duration >= 0 ? `${duration.toFixed(2)}s` : '-';

    return html`
        <div class="h-full flex flex-col rounded-md border border-white/5 bg-[#0b111c] overflow-hidden">
            <div class="shrink-0 px-4 py-3 border-b border-white/5 flex items-center gap-2 flex-wrap">
                <p class="mono text-[10px] text-slate-500">technical specs</p>
                <span class="grow"></span>
                <div class="flex gap-1.5 flex-wrap">
                    ${(overview.badges || []).map(
                        (b) => html`
                            <span
                                class="px-2 py-0.5 rounded-md mono text-[10px] text-slate-300 border border-white/10 bg-white/[0.02]"
                            >
                                ${String(b).toLowerCase()}
                            </span>
                        `
                    )}
                </div>
            </div>

            <div class="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-x-6 gap-y-6 overflow-y-auto custom-scrollbar grow">
                <div>
                    ${sectionTitle(icons.server, 'stream profile')}
                    <div class="rounded-md border border-white/5 bg-[#06090f]">
                        ${specItem('protocol', overview.protocol)}
                        ${specItem('type', String(overview.type).toLowerCase())}
                        ${specItem('profile', specs.profiles)}
                        ${specItem('segment duration', durationLabel)}
                        ${overview.isLive
                            ? specItem(
                                  'poll interval',
                                  specs.smartPollingInterval
                                      ? `${specs.smartPollingInterval}s`
                                      : 'auto',
                                  icons.activity
                              )
                            : ''}
                    </div>
                </div>

                <div>
                    ${sectionTitle(icons.clapperboard, 'video')}
                    <div class="rounded-md border border-white/5 bg-[#06090f] mb-3">
                        ${specItem('peak', overview.maxResolution)}
                        ${specItem(
                            'bitrate range',
                            `${formatBitrate(overview.minBandwidth)} - ${formatBitrate(overview.maxBandwidth)}`
                        )}
                    </div>
                    <p class="mono text-[10px] text-slate-600 mb-1 px-1">codecs</p>
                    ${badgeList(specs.videoCodecs)}
                </div>

                <div>
                    ${sectionTitle(icons.audioLines, 'audio and text')}
                    <div class="mb-4">
                        <p class="mono text-[10px] text-slate-600 mb-1 px-1">audio codecs</p>
                        ${badgeList(specs.audioCodecs)}
                    </div>
                    <div>
                        <p class="mono text-[10px] text-slate-600 mb-1 px-1">subtitles</p>
                        ${badgeList(specs.textFormats)}
                    </div>
                </div>

                <div>
                    ${sectionTitle(icons.shieldCheck, 'content protection')}
                    ${specs.isEncrypted
                        ? html`
                              <div class="rounded-md border border-amber-400/30 bg-amber-500/[0.04] p-3.5">
                                  <p class="mono text-[11px] text-amber-200 flex items-center gap-2 mb-2.5">
                                      ${icons.lockClosed} encrypted
                                  </p>
                                  <div class="space-y-1">
                                      ${(specs.drmSystems || []).map(
                                          (sys) => html`
                                              <div
                                                  class="mono text-[11px] bg-black/40 px-3 py-1.5 rounded border border-white/5 text-amber-200/80"
                                              >
                                                  ${sys}
                                              </div>
                                          `
                                      )}
                                  </div>
                                  <p class="mono text-[10px] text-amber-200/50 leading-relaxed mt-3">
                                      needs a compliant license server and valid eme config
                                  </p>
                              </div>
                          `
                        : html`
                              <div class="rounded-md border border-white/5 bg-[#06090f] p-3.5 flex items-center gap-3">
                                  <span class="text-slate-600">${icons.lockOpen}</span>
                                  <p class="mono text-[11px] text-slate-500 leading-relaxed">
                                      clear — no drm required
                                  </p>
                              </div>
                          `}
                </div>
            </div>
        </div>
    `;
};
