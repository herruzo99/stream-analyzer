import { getDrmSystemName } from '@/infrastructure/parsing/utils/drm';
import * as icons from '@/ui/icons';
import { copyTextToClipboard } from '@/ui/shared/clipboard';
import { html } from 'lit-html';

export const heroHeaderTemplate = (vm) => {
    const { hero } = vm;

    const handleCopy = () => {
        copyTextToClipboard(hero.url, 'Stream URL copied to clipboard');
    };

    const protocolColor =
        hero.protocol === 'DASH' ? 'text-blue-400' : 'text-purple-400';
    const drmBadges = hero.drmSystems.map((sysId) => {
        const name = getDrmSystemName(sysId);
        return html`
            <div
                class="flex items-center gap-1 px-2 py-1 rounded bg-slate-800/80 border border-slate-600 text-xs text-slate-300"
            >
                ${icons.lockClosed} ${name}
            </div>
        `;
    });

    return html`
        <div
            class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 shadow-xl p-4 sm:p-6 shrink-0"
        >
            <!-- Background decoration -->
            <div
                class="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"
            ></div>
            <div
                class="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl"
            ></div>

            <div
                class="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            >
                <div class="flex items-center gap-4 min-w-0 w-full md:w-auto">
                    <div
                        class="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-slate-950/50 flex shrink-0 items-center justify-center shadow-inner border border-slate-700/50 text-2xl sm:text-3xl font-bold ${protocolColor}"
                    >
                        ${hero.protocol}
                    </div>

                    <div class="min-w-0 flex-1">
                        <h1
                            class="text-lg sm:text-2xl font-bold text-white leading-tight break-words"
                            title="${hero.title}"
                        >
                            ${hero.title}
                        </h1>
                        <div class="flex flex-wrap items-center gap-2 mt-2">
                            <span
                                class="px-2 py-0.5 text-xs font-bold rounded-full border ${hero.typeClass} uppercase tracking-wider flex items-center gap-1"
                            >
                                ${hero.type === 'LIVE'
                                    ? html`<span
                                          class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"
                                      ></span>`
                                    : ''}
                                ${hero.type}
                            </span>

                            <button
                                @click=${handleCopy}
                                class="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors font-mono bg-slate-900/50 px-2 py-0.5 rounded border border-slate-700/50 max-w-full overflow-hidden"
                            >
                                <span
                                    class="truncate max-w-[150px] sm:max-w-[300px]"
                                    >${hero.url}</span
                                >
                                ${icons.clipboardCopy}
                            </button>
                        </div>
                    </div>
                </div>

                <div class="flex flex-col items-end gap-2 w-full md:w-auto">
                    ${hero.isEncrypted
                        ? html`<div
                              class="flex flex-wrap gap-2 justify-start md:justify-end w-full"
                          >
                              ${drmBadges}
                          </div>`
                        : html`<span
                              class="flex items-center gap-1 text-green-400 text-sm font-medium bg-green-900/20 px-3 py-1 rounded-full border border-green-900/50"
                              >${icons.lockOpen} Clear Content</span
                          >`}
                </div>
            </div>

            <!-- Extra Metadata Row (Timing/Session/Steering) -->
            ${hero.timingSource ||
            (hero.sessionData && hero.sessionData.length > 0) ||
            hero.steering
                ? html`
                      <div
                          class="relative z-10 mt-4 pt-4 border-t border-slate-700/50 flex flex-wrap gap-4 text-xs"
                      >
                          ${hero.steering
                              ? html`
                                    <div
                                        class="flex items-center gap-2 bg-indigo-900/30 px-2 py-1 rounded border border-indigo-500/30"
                                    >
                                        <span
                                            class="text-indigo-300 font-bold uppercase tracking-wider"
                                            >${icons.gitMerge} Content
                                            Steering</span
                                        >
                                        <span
                                            class="w-px h-3 bg-indigo-500/30"
                                        ></span>
                                        <span
                                            class="font-mono text-slate-300 truncate max-w-[200px]"
                                            title="${hero.steering.serverUri}"
                                            >${hero.steering.serverUri}</span
                                        >
                                        ${hero.steering.pathwayId
                                            ? html`<span
                                                  class="text-indigo-400 font-mono"
                                                  >(${hero.steering
                                                      .pathwayId})</span
                                              >`
                                            : ''}
                                    </div>
                                `
                              : ''}
                          ${hero.timingSource
                              ? html`
                                    <div class="flex items-center gap-2">
                                        <span
                                            class="text-slate-500 font-bold uppercase tracking-wider"
                                            >UTC Timing:</span
                                        >
                                        <span
                                            class="font-mono text-slate-300 bg-black/20 px-1.5 py-0.5 rounded"
                                            title="${hero.timingSource.value}"
                                            >${hero.timingSource.scheme
                                                .split(':')
                                                .pop()}</span
                                        >
                                    </div>
                                `
                              : ''}
                          ${hero.sessionData.map(
                              (sd) => html`
                                  <div class="flex items-center gap-2">
                                      <span
                                          class="text-slate-500 font-bold uppercase tracking-wider"
                                          >${sd.id}:</span
                                      >
                                      <span
                                          class="font-mono text-slate-300 bg-black/20 px-1.5 py-0.5 rounded truncate max-w-[200px]"
                                          title="${sd.value}"
                                          >${sd.value}</span
                                      >
                                  </div>
                              `
                          )}
                      </div>
                  `
                : ''}
        </div>
    `;
};
