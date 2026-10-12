import * as icons from '@/ui/icons';
import { copyTextToClipboard } from '@/ui/shared/clipboard';
import { scte35DetailsTemplate } from '@/ui/shared/scte35-details';
import { html } from 'lit-html';

const creativeItem = (creative, idx) => html`
    <div
        class="bg-white/5 rounded-md border border-white/10 p-3 mb-2 hover:bg-white/10 transition-colors duration-300 group"
    >
        <div class="flex justify-between items-start mb-2">
            <span
                class="text-xs font-bold text-emerald-200 r flex items-center gap-2"
                ><span class="p-1 rounded bg-white/5"
                    >${icons.film}</span
                >
                Creative ${idx + 1}</span
            >
            <span
                class="text-xs font-mono text-slate-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/10"
                >${creative.duration}s</span
            >
        </div>
        <div
            class="text-[10px] text-slate-100 break-all font-mono bg-white/5 p-2.5 rounded-md mb-3 border border-white/10 select-all"
        >
            ${creative.mediaFileUrl || 'No Media File URL'}
        </div>
        <div class="flex gap-2">
            ${creative.mediaFileUrl
                ? html`
                      <a
                          href="${creative.mediaFileUrl}"
                          target="_blank"
                          class="text-[10px] flex items-center gap-1.5 bg-emerald-500/10 text-emerald-200 px-2.5 py-1.5 rounded-md border border-emerald-400/25 hover:bg-emerald-500/10 hover:border-emerald-400/50 transition-all font-bold"
                      >
                          ${icons.play} Open Media
                      </a>
                  `
                : ''}
            <div
                class="text-[10px] flex items-center gap-1.5 bg-white/5 text-slate-400 px-2.5 py-1.5 rounded-md border border-white/10"
            >
                ${icons.activity} ${creative.trackingUrls.size} Trackers
            </div>
        </div>
    </div>
`;

const scte224Template = (signal) => html`
    <div
        class="p-4 bg-white/5 rounded-md border border-white/10 relative overflow-hidden group"
    >
        <div
            class="absolute top-0 left-0 w-1 h-full bg-white/5"
        ></div>
        <div class="flex justify-between items-center mb-3">
            <span
                class="text-xs font-bold text-slate-300 flex items-center gap-2"
                >${icons.zap} SCTE-224 (ESNI)</span
            >
            <span
                class="text-[10px] font-mono text-slate-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/10"
                >ID: ${signal.id}</span
            >
        </div>
        <div
            class="text-xs text-slate-100 mb-4 bg-white/5 p-2 rounded-md border border-white/10"
        >
            ${signal.description || 'No description'}
        </div>

        ${signal.mediaPoints.length > 0
            ? html`
                  <div
                      class="text-[10px] font-bold text-slate-400 mb-2 r opacity-80"
                  >
                      Media Points
                  </div>
                  <div class="space-y-1.5 mb-3">
                      ${signal.mediaPoints.map(
                          (mp) => html`
                              <div
                                  class="flex justify-between bg-white/5 p-2 rounded-md border border-white/10"
                              >
                                  <span
                                      class="font-mono text-slate-100 text-[10px]"
                                      >${mp.matchTime}</span
                                  >
                                  <span
                                      class="text-slate-400 text-[10px]"
                                      >${mp.source || 'No Source'}</span
                                  >
                              </div>
                          `
                      )}
                  </div>
              `
            : ''}
        ${signal.audiences.length > 0
            ? html`
                  <div
                      class="text-[10px] font-bold text-slate-400 mb-2 r opacity-80"
                  >
                      Audiences
                  </div>
                  <div class="flex flex-wrap gap-1.5">
                      ${signal.audiences.map(
                          (a) => html`
                              <span
                                  class="px-2 py-1 bg-white/5 border border-white/10 text-slate-300 rounded-md text-[10px] font-medium"
                                  >${a.id}</span
                              >
                          `
                      )}
                  </div>
              `
            : ''}
    </div>
`;

import { adSettingsPanelTemplate } from './ad-settings-panel.js';

export const inspectorTemplate = (avail, onClose) => {
    if (!avail) {
        return html`
            <div class="h-full flex flex-col bg-transparent">
                <!-- Header -->
                <div
                    class="p-6 border-b border-white/10 bg-white/5"
                >
                    <h2
                        class="text-xl font-bold text-slate-100 flex items-center gap-3"
                    >
                        <div
                            class="p-2 rounded-md bg-white/5 border border-white/10 text-slate-400"
                        >
                            ${icons.settings}
                        </div>
                        Configuration
                    </h2>
                    <p
                        class="text-xs text-slate-400 mt-2 opacity-80 pl-[52px]"
                    >
                        Configure ad detection rules and heuristics.
                    </p>
                </div>

                <!-- Settings Content -->
                <div class="grow overflow-y-auto p-6 custom-scrollbar">
                    ${adSettingsPanelTemplate(true)}
                    <!-- Pass true to indicate embedded mode -->
                </div>
            </div>
        `;
    }

    return html`
        <div class="h-full flex flex-col bg-transparent animate-slideInRight relative">
            <!-- Header -->
            <div class="p-6 border-b border-white/10 shrink-0 z-10">
                <div class="flex justify-between items-start">
                    <div>
                        <h2 class="text-xl font-bold text-slate-100">
                            Break Details
                        </h2>
                        <div class="flex items-center gap-2 mt-1">
                            <span class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 border border-white/10 text-slate-400 select-all">
                                ${avail.id}
                            </span>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-3xl font-mono text-emerald-200 font-light drop-">
                            ${avail.duration.toFixed(2)}s
                        </div>
                        <div class="text-[9px] text-slate-400 font-bold opacity-70 mt-1">
                            Duration
                        </div>
                    </div>
                </div>
            </div>

            <!-- Scrollable Body -->
            <div class="grow overflow-y-auto p-5 space-y-6 custom-scrollbar">
                <!-- VMAP Info -->
                ${
                    avail.vmapInfo
                        ? html`
                              <section>
                                  <h3
                                      class="text-sm font-bold text-slate-100 flex items-center gap-2 mb-3"
                                  >
                                      ${icons.layers} VMAP Schedule
                                  </h3>
                                  <div
                                      class="bg-white/5 border border-emerald-400/25 rounded-md p-3 flex justify-between items-center"
                                  >
                                      <span
                                          class="text-xs text-slate-100 font-mono"
                                          >Version
                                          ${avail.vmapInfo.version}</span
                                      >
                                      <span
                                          class="text-xs font-bold text-emerald-200 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-400/25"
                                          >${avail.vmapInfo.breakCount} Breaks
                                          Found</span
                                      >
                                  </div>
                              </section>
                              <hr class="border-white/10" />
                          `
                        : ''
                }

                <!-- Creatives -->
                <section>
                    <h3
                        class="text-sm font-bold text-slate-100 flex items-center gap-2 mb-3"
                    >
                        ${icons.film} Ad Creatives
                        <span
                            class="bg-white/5 text-slate-400 text-[10px] px-2 py-0.5 rounded-full"
                            >${avail.creatives?.length || 0}</span
                        >
                    </h3>

                    ${
                        avail.adManifestUrl
                            ? html`
                                  <div
                                      class="flex items-center gap-2 mb-3 bg-white/5 border border-emerald-400/25 p-2 rounded-md"
                                  >
                                      <span
                                          class="text-emerald-200 scale-75"
                                          >${icons.link}</span
                                      >
                                      <span
                                          class="text-xs text-slate-100 truncate flex-1 font-mono"
                                          title="${avail.adManifestUrl}"
                                          >${avail.adManifestUrl}</span
                                      >
                                      <button
                                          @click=${() =>
                                              copyTextToClipboard(
                                                  avail.adManifestUrl,
                                                  'URL Copied'
                                              )}
                                          class="text-emerald-200 hover:text-slate-100 p-1"
                                      >
                                          ${icons.clipboardCopy}
                                      </button>
                                  </div>
                              `
                            : ''
                    }
                    ${
                        avail.creatives && avail.creatives.length > 0
                            ? avail.creatives.map((c, i) => creativeItem(c, i))
                            : html`<div
                                  class="p-6 border border-dashed border-white/10 rounded-md text-center text-xs text-slate-400/70 bg-white/5"
                              >
                                  No creatives resolved.
                              </div>`
                    }
                </section>

                <hr class="border-white/10" />

                <!-- Signals -->
                <section>
                    <h3
                        class="text-sm font-bold text-slate-100 flex items-center gap-2 mb-3"
                    >
                        ${icons.binary} Signals
                    </h3>
                    ${
                        avail.scte224Signal
                            ? scte224Template(avail.scte224Signal)
                            : ''
                    }
                    ${
                        avail.scte35Signal
                            ? html`
                                  <div class="mt-4">
                                      <div
                                          class="text-xs font-bold text-slate-400 mb-2"
                                      >
                                          SCTE-35
                                      </div>
                                      ${scte35DetailsTemplate(
                                          avail.scte35Signal
                                      )}
                                  </div>
                              `
                            : ''
                    }
                    ${
                        !avail.scte35Signal && !avail.scte224Signal
                            ? html`<div
                                  class="text-xs text-slate-400 italic"
                              >
                                  No in-band signals detected (Heuristic).
                              </div>`
                            : ''
                    }
                </section>
            </div>
                </section>
            </div>
            
            <!-- Footer: Back to Settings -->
            <div class="p-4 border-t border-white/10 bg-white/5 shrink-0">
                <button 
                    @click=${onClose}
                    class="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md bg-white/5 text-slate-100 hover:bg-emerald-500/10 hover:text-emerald-200 border border-white/10 hover:border-emerald-400/50 transition-all duration-300 text-sm font-bold"
                >
                    ${icons.settings} Configure Detection
                </button>
            </div>
        </div>
    `;
};
