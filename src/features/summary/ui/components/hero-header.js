import { getDrmSystemName } from '@/infrastructure/parsing/utils/drm';
import * as icons from '@/ui/icons';
import { copyTextToClipboard } from '@/ui/shared/clipboard';
import { html } from 'lit-html';

export const heroHeaderTemplate = (vm) => {
    const { hero } = vm;
    // Partial summaries may lack protocol/type/url — never call methods
    // on possibly-undefined values (would blank the whole overview).
    const protocol = String(hero.protocol || 'unknown').toLowerCase();
    const streamUrl = hero.url || '';

    const handleCopy = () => {
        copyTextToClipboard(streamUrl, 'Stream URL copied to clipboard');
    };

    const drmBadges = hero.drmSystems.map((sysId) => {
        const name = getDrmSystemName(sysId);
        return html`
            <span
                class="mono text-[10px] px-1.5 py-px rounded border bg-white/5 text-slate-500 border-white/10"
                title=${sysId}
                >${name}</span
            >
        `;
    });

    return html`
        <div class="w-full flex flex-col gap-4">
            <div class="flex flex-col md:flex-row md:items-start gap-4">
                <div class="flex items-start gap-3 min-w-0 grow">
                    <span
                        class="mono shrink-0 text-[11px] px-2 py-1 rounded border text-emerald-200 bg-emerald-500/10 border-emerald-400/25"
                        >${protocol}</span
                    >
                    <div class="min-w-0 grow">
                        <h1
                            class="text-base font-semibold text-slate-100 leading-snug break-words"
                            title="${hero.title || 'Untitled stream'}"
                        >
                            ${hero.title || 'Untitled stream'}
                        </h1>
                        <div class="flex flex-wrap items-center gap-2 mt-2">
                            <span
                                class="mono text-[10px] px-1.5 py-px rounded border ${hero.type === 'LIVE'
                                    ? 'text-red-300 bg-red-500/10 border-red-400/25'
                                    : 'text-slate-500 bg-white/5 border-white/10'}"
                            >
                                ${hero.type === 'LIVE' ? 'live' : 'vod'}
                            </span>
                            ${streamUrl
                                ? html`<button
                                      @click=${handleCopy}
                                      title="Copy stream URL"
                                      class="flex items-center gap-1.5 mono text-[11px] text-slate-500 hover:text-slate-200 transition-colors bg-white/[0.02] hover:bg-white/[0.05] px-2.5 py-1 rounded-md border border-white/5 hover:border-white/15 max-w-full"
                                  >
                                      <span
                                          class="truncate max-w-[200px] sm:max-w-[420px]"
                                          >${streamUrl}</span
                                      >
                                      ${icons.clipboardCopy}
                                  </button>`
                                : html`<span
                                      class="mono text-[11px] text-slate-600"
                                      >no url</span
                                  >`}
                        </div>
                    </div>
                </div>

                <div class="shrink-0 flex flex-wrap gap-1.5 md:justify-end md:max-w-[220px]">
                    ${hero.isEncrypted
                        ? drmBadges
                        : html`<span
                              class="mono text-[10px] px-1.5 py-px rounded border text-emerald-200 bg-emerald-500/10 border-emerald-400/25"
                              >clear</span
                          >`}
                </div>
            </div>

            ${hero.timingSource ||
            (hero.sessionData && hero.sessionData.length > 0) ||
            hero.steering
                ? html`
                      <div
                          class="flex flex-wrap gap-x-5 gap-y-1.5 text-xs border-t border-white/5 pt-3"
                      >
                          ${hero.steering
                              ? html`
                                    <span class="mono text-[10px] text-slate-500 truncate max-w-[280px]" title=${hero.steering.serverUri}>
                                        steering: ${hero.steering.serverUri}${hero.steering.pathwayId ? ` (${hero.steering.pathwayId})` : ''}
                                    </span>
                                `
                              : ''}
                          ${hero.timingSource
                              ? html`
                                    <span
                                        class="mono text-[10px] text-slate-500"
                                        title="${hero.timingSource.value}"
                                        >utc: ${hero.timingSource.scheme.split(':').pop()}</span
                                    >
                                `
                              : ''}
                          ${hero.sessionData.map(
                              (sd) => html`
                                  <span
                                      class="mono text-[10px] text-slate-500 truncate max-w-[220px]"
                                      title="${sd.value}"
                                      >${String(sd.id).toLowerCase()}: ${sd.value}</span
                                  >
                              `
                          )}
                      </div>
                  `
                : ''}
        </div>
    `;
};
