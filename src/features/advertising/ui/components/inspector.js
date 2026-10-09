import * as icons from '@/ui/icons';
import { copyTextToClipboard } from '@/ui/shared/clipboard';
import { scte35DetailsTemplate } from '@/ui/shared/scte35-details';
import { html } from 'lit-html';

const creativeItem = (creative, idx) => html`
    <div
        class="bg-[var(--bg-glass-B-2)] rounded-xl border border-[var(--border-on-B)]/30 p-3 mb-2 hover:bg-[var(--bg-glass-B-3)] transition-colors duration-300 group"
    >
        <div class="flex justify-between items-start mb-2">
            <span
                class="text-xs font-bold text-[var(--color-info)] uppercase tracking-wider flex items-center gap-2"
                ><span class="p-1 rounded bg-[var(--bg-surface-B-panel)]/50"
                    >${icons.film}</span
                >
                Creative ${idx + 1}</span
            >
            <span
                class="text-xs font-mono text-[var(--text-on-B-secondary)] bg-[var(--bg-surface-B-panel)] px-1.5 py-0.5 rounded border border-[var(--border-on-B)]/20"
                >${creative.duration}s</span
            >
        </div>
        <div
            class="text-[10px] text-[var(--text-on-B-primary)] break-all font-mono bg-[var(--bg-surface-B-panel)]/50 p-2.5 rounded-lg mb-3 border border-[var(--border-on-B)]/20 shadow-inner select-all"
        >
            ${creative.mediaFileUrl || 'No Media File URL'}
        </div>
        <div class="flex gap-2">
            ${creative.mediaFileUrl
                ? html`
                      <a
                          href="${creative.mediaFileUrl}"
                          target="_blank"
                          class="text-[10px] flex items-center gap-1.5 bg-[var(--primary-accent)]/10 text-[var(--primary-accent)] px-2.5 py-1.5 rounded-lg border border-[var(--primary-accent)]/20 hover:bg-[var(--primary-accent)]/20 hover:border-[var(--primary-accent)]/40 transition-all font-bold"
                      >
                          ${icons.play} Open Media
                      </a>
                  `
                : ''}
            <div
                class="text-[10px] flex items-center gap-1.5 bg-[var(--bg-surface-B-panel)]/50 text-[var(--text-on-B-secondary)] px-2.5 py-1.5 rounded-lg border border-[var(--border-on-B)]/20"
            >
                ${icons.activity} ${creative.trackingUrls.size} Trackers
            </div>
        </div>
    </div>
`;

const scte224Template = (signal) => html`
    <div
        class="p-4 bg-[var(--bg-glass-B-2)] rounded-xl border border-[var(--secondary-accent)]/30 shadow-[0_0_15px_rgba(var(--secondary-accent-rgb),0.1)] relative overflow-hidden group"
    >
        <div
            class="absolute top-0 left-0 w-1 h-full bg-[var(--secondary-accent)]/50"
        ></div>
        <div class="flex justify-between items-center mb-3">
            <span
                class="text-xs font-bold text-[var(--secondary-accent)] flex items-center gap-2"
                >${icons.zap} SCTE-224 (ESNI)</span
            >
            <span
                class="text-[10px] font-mono text-[var(--text-on-B-secondary)] bg-[var(--bg-surface-B-panel)]/50 px-1.5 py-0.5 rounded border border-[var(--border-on-B)]/20"
                >ID: ${signal.id}</span
            >
        </div>
        <div
            class="text-xs text-[var(--text-on-B-primary)] mb-4 bg-[var(--bg-glass-B-1)] p-2 rounded-lg border border-[var(--border-on-B)]/10"
        >
            ${signal.description || 'No description'}
        </div>

        ${signal.mediaPoints.length > 0
            ? html`
                  <div
                      class="text-[10px] font-bold text-[var(--text-on-B-secondary)] uppercase mb-2 tracking-wider opacity-80"
                  >
                      Media Points
                  </div>
                  <div class="space-y-1.5 mb-3">
                      ${signal.mediaPoints.map(
                          (mp) => html`
                              <div
                                  class="flex justify-between bg-[var(--bg-surface-B-panel)]/50 p-2 rounded-lg border border-[var(--border-on-B)]/10"
                              >
                                  <span
                                      class="font-mono text-[var(--text-on-B-primary)] text-[10px]"
                                      >${mp.matchTime}</span
                                  >
                                  <span
                                      class="text-[var(--text-on-B-secondary)] text-[10px]"
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
                      class="text-[10px] font-bold text-[var(--text-on-B-secondary)] uppercase mb-2 tracking-wider opacity-80"
                  >
                      Audiences
                  </div>
                  <div class="flex flex-wrap gap-1.5">
                      ${signal.audiences.map(
                          (a) => html`
                              <span
                                  class="px-2 py-1 bg-[var(--secondary-accent)]/10 border border-[var(--secondary-accent)]/30 text-[var(--secondary-accent)] rounded-md text-[10px] font-medium"
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
                    class="p-6 border-b border-[var(--border-on-B)]/30 bg-[var(--bg-surface-B-panel)]/20 backdrop-blur-md"
                >
                    <h2
                        class="text-xl font-bold text-[var(--text-on-B-primary)] flex items-center gap-3"
                    >
                        <div
                            class="p-2 rounded-lg bg-[var(--bg-surface-B-panel)]/50 border border-[var(--border-on-B)]/30 text-[var(--text-on-B-secondary)]"
                        >
                            ${icons.settings}
                        </div>
                        Configuration
                    </h2>
                    <p
                        class="text-xs text-[var(--text-on-B-secondary)] mt-2 opacity-80 pl-[52px]"
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
            <div class="p-6 border-b border-[var(--border-on-B)]/30 bg-gradient-to-b from-[var(--bg-surface-B-panel)]/40 to-[var(--bg-surface-B-panel)]/10 backdrop-blur-md shrink-0 z-10">
                <div class="flex justify-between items-start">
                    <div>
                        <h2 class="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[var(--text-on-B-primary)] to-[var(--text-on-B-secondary)]">
                            Break Details
                        </h2>
                        <div class="flex items-center gap-2 mt-1">
                            <span class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--bg-surface-B-panel)]/50 border border-[var(--border-on-B)]/30 text-[var(--text-on-B-secondary)] select-all">
                                ${avail.id}
                            </span>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-3xl font-mono text-[var(--primary-accent)] font-light drop-shadow-[0_0_12px_var(--primary-accent-glow)]">
                            ${avail.duration.toFixed(2)}s
                        </div>
                        <div class="text-[9px] uppercase text-[var(--text-on-B-secondary)] font-bold tracking-[0.2em] opacity-70 mt-1">
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
                                      class="text-sm font-bold text-[var(--text-on-B-primary)] flex items-center gap-2 mb-3"
                                  >
                                      ${icons.layers} VMAP Schedule
                                  </h3>
                                  <div
                                      class="bg-[var(--bg-glass-B-2)] border border-[var(--color-info)]/30 rounded-xl p-3 flex justify-between items-center shadow-lg"
                                  >
                                      <span
                                          class="text-xs text-[var(--text-on-B-primary)] font-mono"
                                          >Version
                                          ${avail.vmapInfo.version}</span
                                      >
                                      <span
                                          class="text-xs font-bold text-[var(--color-info)] bg-[var(--color-info)]/10 px-2 py-1 rounded-lg border border-[var(--color-info)]/20"
                                          >${avail.vmapInfo.breakCount} Breaks
                                          Found</span
                                      >
                                  </div>
                              </section>
                              <hr class="border-[var(--border-on-B)]" />
                          `
                        : ''
                }

                <!-- Creatives -->
                <section>
                    <h3
                        class="text-sm font-bold text-[var(--text-on-B-primary)] flex items-center gap-2 mb-3"
                    >
                        ${icons.film} Ad Creatives
                        <span
                            class="bg-[var(--bg-surface-B-panel-opaque)] text-[var(--text-on-B-secondary)] text-[10px] px-2 py-0.5 rounded-full"
                            >${avail.creatives?.length || 0}</span
                        >
                    </h3>

                    ${
                        avail.adManifestUrl
                            ? html`
                                  <div
                                      class="flex items-center gap-2 mb-3 bg-[var(--bg-glass-accent-1)] border border-[var(--color-info)] p-2 rounded-lg"
                                  >
                                      <span
                                          class="text-[var(--color-info)] scale-75"
                                          >${icons.link}</span
                                      >
                                      <span
                                          class="text-xs text-[var(--text-on-B-primary)] truncate flex-1 font-mono"
                                          title="${avail.adManifestUrl}"
                                          >${avail.adManifestUrl}</span
                                      >
                                      <button
                                          @click=${() =>
                                              copyTextToClipboard(
                                                  avail.adManifestUrl,
                                                  'URL Copied'
                                              )}
                                          class="text-[var(--color-info)] hover:text-[var(--text-on-B-primary)] p-1"
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
                                  class="p-6 border border-dashed border-[var(--border-on-B)]/30 rounded-xl text-center text-xs text-[var(--text-on-B-secondary)]/70 bg-[var(--bg-glass-B-1)]"
                              >
                                  No creatives resolved.
                              </div>`
                    }
                </section>

                <hr class="border-[var(--border-on-B)]" />

                <!-- Signals -->
                <section>
                    <h3
                        class="text-sm font-bold text-[var(--text-on-B-primary)] flex items-center gap-2 mb-3"
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
                                          class="text-xs font-bold text-[var(--text-on-B-secondary)] uppercase mb-2"
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
                                  class="text-xs text-[var(--text-on-B-secondary)] italic"
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
            <div class="p-4 border-t border-[var(--border-on-B)]/20 bg-[var(--bg-glass-B-3)] backdrop-blur-xl shrink-0">
                <button 
                    @click=${onClose}
                    class="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[var(--bg-surface-B-elevated)] text-[var(--text-on-B-primary)] hover:bg-[var(--primary-accent)]/20 hover:text-[var(--primary-accent)] border border-[var(--border-on-B)]/30 hover:border-[var(--primary-accent)]/50 transition-all duration-300 text-sm font-bold shadow-sm hover:shadow-[0_0_15px_var(--primary-accent-glow)]/10"
                >
                    ${icons.settings} Configure Detection
                </button>
            </div>
        </div>
    `;
};
