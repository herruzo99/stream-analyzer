import * as icons from '@/ui/icons';
import { html } from 'lit-html';
import { mediaPlaylistCardTemplate } from './media-playlist-card.js';

const getIcon = (type) => {
    if (type === 'video') return icons.clapperboard;
    if (type === 'audio') return icons.audioLines;
    if (type === 'text') return icons.fileText;
    return icons.layers;
};

export const renditionGroupCardTemplate = (title, items, stream, type) => {
    return html`
        <div
            class="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-sm"
        >
            <div
                class="px-4 py-3 bg-slate-800/80 border-b border-slate-700/50 flex items-center justify-between"
            >
                <div class="flex items-center gap-3">
                    <div class="text-slate-400">${getIcon(type)}</div>
                    <h3 class="font-bold text-slate-200 text-base">${title}</h3>
                </div>
                <span
                    class="bg-slate-700 text-slate-300 px-2.5 py-1 rounded text-xs font-bold border border-slate-600"
                >
                    ${items.length}
                </span>
            </div>
            <div
                class="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
            >
                ${items.map((item) =>
                    mediaPlaylistCardTemplate(item, stream, type)
                )}
            </div>
        </div>
    `;
};
