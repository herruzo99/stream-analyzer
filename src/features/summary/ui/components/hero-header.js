import { html } from 'lit-html';
import { copyTextToClipboard } from '@/ui/shared/clipboard';
import * as icons from '@/ui/icons';
import { getDrmSystemName } from '@/infrastructure/parsing/utils/drm';

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
                        <!-- Removed 'truncate' and allowed wrapping for title on mobile -->
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
                                <span class="truncate max-w-[150px] sm:max-w-[300px]">${hero.url}</span>
                                ${icons.clipboardCopy}
                            </button>
                        </div>
                    </div>
                </div>

                <div class="flex flex-col items-end gap-2 w-full md:w-auto">
                    ${hero.isEncrypted
                        ? html`<div class="flex flex-wrap gap-2 justify-start md:justify-end w-full">
                              ${drmBadges}
                          </div>`
                        : html`<span
                              class="flex items-center gap-1 text-green-400 text-sm font-medium bg-green-900/20 px-3 py-1 rounded-full border border-green-900/50"
                              >${icons.lockOpen} Clear Content</span
                          >`}
                </div>
            </div>
        </div>
    `;
};