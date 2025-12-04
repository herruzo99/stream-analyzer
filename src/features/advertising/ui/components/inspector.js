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
            <div
                class="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded"
            >
                ${icons.activity} ${creative.trackingUrls.size} Trackers
            </div>
        </div>
    </div>
`;

const scte224Template = (signal) => html`
    <div class="p-3 bg-slate-950 rounded-lg border border-slate-800">
        <div class="flex justify-between items-center mb-2">
            <span class="text-xs font-bold text-purple-400"
                >SCTE-224 (ESNI)</span
            >
            <span class="text-[10px] font-mono text-slate-500"
                >ID: ${signal.id}</span
            >
        </div>
        <div class="text-xs text-slate-300 mb-2">
            ${signal.description || 'No description'}
        </div>

        ${signal.mediaPoints.length > 0
            ? html`
                  <div
                      class="text-[10px] font-bold text-slate-500 uppercase mb-1"
                  >
                      Media Points
                  </div>
                  <div class="space-y-1">
                      ${signal.mediaPoints.map(
                          (mp) => html`
                              <div
                                  class="flex justify-between bg-slate-900 p-1.5 rounded"
                              >
                                  <span class="font-mono text-slate-300"
                                      >${mp.matchTime}</span
                                  >
                                  <span class="text-slate-500"
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
                      class="text-[10px] font-bold text-slate-500 uppercase mt-3 mb-1"
                  >
                      Audiences
                  </div>
                  <div class="flex flex-wrap gap-1">
                      ${signal.audiences.map(
                          (a) => html`
                              <span
                                  class="px-2 py-0.5 bg-purple-900/20 border border-purple-500/30 text-purple-300 rounded text-[10px]"
                                  >${a.id}</span
                              >
                          `
                      )}
                  </div>
              `
            : ''}
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
                    Select an ad break to view signals, VMAP structure, and
                    creatives.
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
                <!-- VMAP Info -->
                ${avail.vmapInfo
                    ? html`
                          <section>
                              <h3
                                  class="text-sm font-bold text-white flex items-center gap-2 mb-3"
                              >
                                  ${icons.layers} VMAP Schedule
                              </h3>
                              <div
                                  class="bg-blue-900/10 border border-blue-500/20 rounded-lg p-3 flex justify-between items-center"
                              >
                                  <span class="text-xs text-blue-200"
                                      >Version ${avail.vmapInfo.version}</span
                                  >
                                  <span class="text-xs font-bold text-white"
                                      >${avail.vmapInfo.breakCount} Breaks
                                      Found</span
                                  >
                              </div>
                          </section>
                          <hr class="border-slate-800" />
                      `
                    : ''}

                <!-- Creatives -->
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
                                              'URL Copied'
                                          )}
                                      class="text-blue-400 hover:text-white p-1"
                                  >
                                      ${icons.clipboardCopy}
                                  </button>
                              </div>
                          `
                        : ''}
                    ${avail.creatives && avail.creatives.length > 0
                        ? avail.creatives.map((c, i) => creativeItem(c, i))
                        : html`<div
                              class="p-4 border border-dashed border-slate-700 rounded-lg text-center text-xs text-slate-500"
                          >
                              No creatives resolved.
                          </div>`}
                </section>

                <hr class="border-slate-800" />

                <!-- Signals -->
                <section>
                    <h3
                        class="text-sm font-bold text-white flex items-center gap-2 mb-3"
                    >
                        ${icons.binary} Signals
                    </h3>
                    ${avail.scte224Signal
                        ? scte224Template(avail.scte224Signal)
                        : ''}
                    ${avail.scte35Signal
                        ? html`
                              <div class="mt-4">
                                  <div
                                      class="text-xs font-bold text-slate-500 uppercase mb-2"
                                  >
                                      SCTE-35
                                  </div>
                                  ${scte35DetailsTemplate(avail.scte35Signal)}
                              </div>
                          `
                        : ''}
                    ${!avail.scte35Signal && !avail.scte224Signal
                        ? html`<div class="text-xs text-slate-500 italic">
                              No in-band signals detected (Heuristic).
                          </div>`
                        : ''}
                </section>
            </div>
        </div>
    `;
};
