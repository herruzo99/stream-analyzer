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
            class="bg-white/5 rounded-md border border-white/10 overflow-hidden"
        >
            <div
                class="px-4 py-3 bg-white/5 border-b border-white/10 flex items-center justify-between"
            >
                <div class="flex items-center gap-3">
                    <div class="text-slate-400">${getIcon(type)}</div>
                    <h3 class="font-bold text-slate-200 text-base">${title}</h3>
                </div>
                <span
                    class="bg-white/5 text-slate-300 px-2.5 py-1 rounded text-xs font-bold border border-slate-600"
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
