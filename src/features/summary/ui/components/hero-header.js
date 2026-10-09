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
        hero.protocol === 'DASH'
            ? 'text-blue-400'
            : 'text-purple-300';
    const drmBadges = hero.drmSystems.map((sysId) => {
        const name = getDrmSystemName(sysId);
        return html`
            <div
                class="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 border border-slate-800 text-xs text-slate-400"
            >
                ${icons.lockClosed} ${name}
            </div>
        `;
    });

    // Refactored for Top Bar Injection:
    // We remove the card-like container styles because the Top Bar shell slot already provides the "glass pane" container.
    // We just provide the flexible content.

    return html`
        <div
            class="w-full flex flex-col md:flex-row justify-between items-center gap-6"
        >
            <div
                class="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 w-full"
            >
                <div class="flex items-center gap-6 min-w-0 w-full md:w-auto">
                    <div
                        class="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-800 flex shrink-0 items-center justify-center shadow-inner border border-slate-800/50 text-3xl sm:text-4xl font-bold ${protocolColor} backdrop-blur-sm"
                    >
                        ${hero.protocol}
                    </div>

                    <div class="min-w-0 flex-1">
                        <h1
                            class="text-2xl sm:text-3xl font-black text-slate-100 leading-tight break-words tracking-tight mb-3"
                            title="${hero.title}"
                        >
                            ${hero.title}
                        </h1>
                        <div class="flex flex-wrap items-center gap-3">
                            <span
                                class="px-3 py-1 text-xs font-bold rounded-full border ${hero.typeClass} uppercase tracking-widest flex items-center gap-2 shadow-sm"
                            >
                                ${hero.type === 'LIVE'
            ? html`<span
                                          class="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]"
                                      ></span>`
            : ''}
                                ${hero.type}
                            </span>

                            <button
                                @click=${handleCopy}
                                class="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-100 transition-all font-mono bg-slate-800 hover:bg-slate-800 px-3 py-1 rounded-full border border-slate-800/50 hover:border-blue-500/50 max-w-full overflow-hidden group/copy"
                            >
                                <span
                                    class="truncate max-w-[150px] sm:max-w-[750px] opacity-80 group-hover/copy:opacity-100"
                                    >${hero.url}</span
                                >
                                ${icons.clipboardCopy}
                            </button>
                        </div>
                    </div>
                </div>

                <div class="flex flex-col items-end gap-3 w-full md:w-auto">
                    ${hero.isEncrypted
            ? html`<div
                              class="flex flex-wrap gap-2 justify-start md:justify-end w-full"
                          >
                              ${drmBadges}
                          </div>`
            : html`<span
                              class="flex items-center gap-2 text-emerald-400 text-sm font-bold bg-slate-800 px-4 py-1.5 rounded-full border border-emerald-500/30 shadow-[0_0_15px_-5px_#10b981]"
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
                          class="relative z-10 mt-6 pt-6 border-t border-slate-800/30 flex flex-wrap gap-6 text-xs"
                      >
                          ${hero.steering
                    ? html`
                                    <div
                                        class="flex items-center gap-3 bg-purple-500/10 px-3 py-1.5 rounded-lg border border-purple-500/20"
                                    >
                                        <span
                                            class="text-purple-300 font-bold uppercase tracking-wider flex items-center gap-2"
                                            >${icons.gitMerge} Content
                                            Steering</span
                                        >
                                        <span
                                            class="w-px h-4 bg-purple-500/20"
                                        ></span>
                                        <span
                                            class="font-mono text-slate-400 truncate max-w-[200px]"
                                            title="${hero.steering.serverUri}"
                                            >${hero.steering.serverUri}</span
                                        >
                                        ${hero.steering.pathwayId
                            ? html`<span
                                                  class="text-purple-300 font-mono font-bold"
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
                                            class="text-slate-400 font-bold uppercase tracking-wider"
                                            >UTC Timing:</span
                                        >
                                        <span
                                            class="font-mono text-blue-400 bg-slate-700 px-2 py-1 rounded border border-blue-500/20"
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
                                          class="text-slate-400 font-bold uppercase tracking-wider"
                                          >${sd.id}:</span
                                      >
                                      <span
                                          class="font-mono text-slate-400 bg-slate-900/50 px-2 py-1 rounded border border-slate-800/30 truncate max-w-[200px]"
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
