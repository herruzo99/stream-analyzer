import { html } from 'lit-html';
import { mediaPlaylistCardTemplate } from './media-playlist-card.js';
import * as icons from '@/ui/icons';

export const renditionGroupCardTemplate = (title, renditions, stream) => {
    if (!renditions || renditions.length === 0) {
        return html``;
    }

    return html`
        <details
            class="bg-slate-800/50 rounded-lg border border-slate-700 details-animated"
            open
        >
            <summary
                class="flex items-center gap-3 p-2 cursor-pointer list-none hover:bg-slate-700/50 rounded-t-lg"
            >
                <span
                    class="text-slate-400 group-open:rotate-90 transition-transform"
                    >${icons.chevronDown}</span
                >
                <span class="text-teal-400">${icons.folder}</span>
                <div class="font-semibold text-slate-200">
                    ${title}
                    <span class="text-sm text-slate-400"
                        >(${renditions.length})</span
                    >
                </div>
            </summary>
            <div
                class="border-t border-slate-700 p-2 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2"
            >
                ${renditions.map((rendition) =>
                    mediaPlaylistCardTemplate(rendition, stream)
                )}
            </div>
        </details>
    `;
};
