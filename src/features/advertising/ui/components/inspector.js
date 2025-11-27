import * as icons from '@/ui/icons';
import { copyTextToClipboard } from '@/ui/shared/clipboard';
import { scte35DetailsTemplate } from '@/ui/shared/scte35-details';
import { html } from 'lit-html';

const creativeItem = (creative, idx) => html`
    <div class="bg-slate-950 rounded-lg border border-slate-800 p-3 mb-2">
        <div class="flex justify-between items-start mb-2">
            <span class="text-xs font-bold text-blue-400 uppercase"
                >Creative ${idx + 1}</span
            >
            <span class="text-xs font-mono text-slate-500"
                >${creative.duration}s</span
            >
        </div>

        <div
            class="text-xs text-slate-300 break-all font-mono bg-slate-900 p-2 rounded mb-2 border border-slate-800/50"
        >
            ${creative.mediaFileUrl || 'No Media File URL'}
        </div>

        <div class="flex gap-2">
            ${creative.mediaFileUrl
                ? html`
                      <a
                          href="${creative.mediaFileUrl}"
                          target="_blank"
                          class="text-[10px] flex items-center gap-1 bg-blue-900/30 text-blue-300 px-2 py-1 rounded hover:bg-blue-900/50 transition-colors"
                      >
                          ${icons.play} Open Media
                      </a>
                  `
                : ''}
            <button
                class="text-[10px] flex items-center gap-1 bg-slate-800 text-slate-400 px-2 py-1 rounded hover:text-white transition-colors"
            >
                ${icons.activity} ${creative.trackingUrls.size} Trackers
            </button>
        </div>
    </div>
`;

export const inspectorTemplate = (avail) => {
    if (!avail) {
        return html`
            <div
                class="h-full flex flex-col items-center justify-center text-slate-500 p-8 text-center"
            >
                <div
                    class="bg-slate-800/50 p-6 rounded-full mb-4 shadow-inner animate-pulse"
                >
                    ${icons.search}
                </div>
                <h3 class="text-lg font-bold text-slate-300">Ad Inspector</h3>
                <p class="text-sm mt-2">
                    Select an ad break from the timeline or list to view signal
                    details and creatives.
                </p>
            </div>
        `;
    }

    return html`
        <div
            class="h-full flex flex-col bg-slate-900 border-l border-slate-800 shadow-2xl animate-slideInRight"
        >
            <!-- Header -->
            <div class="p-5 border-b border-slate-800 bg-slate-950/30">
                <div class="flex justify-between items-start">
                    <div>
                        <h2 class="text-xl font-bold text-white">
                            Break Details
                        </h2>
                        <p
                            class="text-xs text-slate-400 font-mono mt-1 select-all"
                        >
                            ${avail.id}
                        </p>
                    </div>
                    <div class="text-right">
                        <div
                            class="text-2xl font-mono text-amber-400 font-light"
                        >
                            ${avail.duration.toFixed(2)}s
                        </div>
                        <div
                            class="text-[10px] uppercase text-slate-500 font-bold tracking-wider"
                        >
                            Duration
                        </div>
                    </div>
                </div>
            </div>

            <!-- Scrollable Body -->
            <div class="grow overflow-y-auto p-5 space-y-6 custom-scrollbar">
                <!-- VAST / Creatives Section -->
                <section>
                    <h3
                        class="text-sm font-bold text-white flex items-center gap-2 mb-3"
                    >
                        ${icons.film} Ad Creatives
                        <span
                            class="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded-full"
                            >${avail.creatives?.length || 0}</span
                        >
                    </h3>

                    ${avail.adManifestUrl
                        ? html`
                              <div
                                  class="flex items-center gap-2 mb-3 bg-blue-900/20 border border-blue-500/30 p-2 rounded-lg"
                              >
                                  <span class="text-blue-400 scale-75"
                                      >${icons.link}</span
                                  >
                                  <span
                                      class="text-xs text-blue-200 truncate flex-1 font-mono"
                                      title="${avail.adManifestUrl}"
                                      >${avail.adManifestUrl}</span
                                  >
                                  <button
                                      @click=${() =>
                                          copyTextToClipboard(
                                              avail.adManifestUrl,
                                              'VAST URL Copied'
                                          )}
                                      class="text-blue-400 hover:text-white p-1"
                                  >
                                      ${icons.clipboardCopy}
                                  </button>
                              </div>
                          `
                        : html`
                              <div class="text-xs text-slate-500 italic mb-3">
                                  No VAST URL associated with this break.
                              </div>
                          `}
                    ${avail.creatives && avail.creatives.length > 0
                        ? avail.creatives.map((c, i) => creativeItem(c, i))
                        : html`<div
                              class="p-4 border border-dashed border-slate-700 rounded-lg text-center text-xs text-slate-500"
                          >
                              No creatives resolved.
                          </div>`}
                </section>

                <hr class="border-slate-800" />

                <!-- SCTE-35 Section -->
                <section>
                    <h3
                        class="text-sm font-bold text-white flex items-center gap-2 mb-3"
                    >
                        ${icons.binary} SCTE-35 Signal
                    </h3>
                    ${avail.scte35Signal
                        ? scte35DetailsTemplate(avail.scte35Signal)
                        : html`<div class="text-xs text-slate-500 italic">
                              No SCTE-35 signal data available (Heuristic
                              detection).
                          </div>`}
                </section>
            </div>
        </div>
    `;
};
