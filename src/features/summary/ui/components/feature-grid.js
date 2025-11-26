import { html } from 'lit-html';
import * as icons from '@/ui/icons';

const getTypeStyles = (type) => {
    switch (type) {
        case 'video':
            return 'bg-blue-900/30 text-blue-300 border-blue-700/50';
        case 'audio':
            return 'bg-purple-900/30 text-purple-300 border-purple-700/50';
        case 'text':
            return 'bg-green-900/30 text-green-300 border-green-700/50';
        case 'quality':
            return 'bg-amber-900/30 text-amber-300 border-amber-700/50';
        case 'tech':
            return 'bg-slate-700/50 text-slate-300 border-slate-600';
        default:
            return 'bg-gray-800 text-gray-400';
    }
};

const getIcon = (type) => {
    switch (type) {
        case 'video':
            return icons.clapperboard;
        case 'audio':
            return icons.audioLines;
        case 'text':
            return icons.fileText;
        case 'quality':
            return icons.star;
        case 'tech':
            return icons.server;
        default:
            return icons.tag;
    }
};

export const featureGridTemplate = (vm) => {
    const { features } = vm;

    if (features.length === 0) {
        return html`<div class="text-slate-500 italic text-sm p-4">
            No special features detected.
        </div>`;
    }

    return html`
        <div class="flex flex-wrap gap-2">
            ${features.map(
                (feature) => html`
                    <div
                        class="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-all hover:scale-105 cursor-default ${getTypeStyles(
                            feature.type
                        )}"
                    >
                        ${getIcon(feature.type)} ${feature.label}
                    </div>
                `
            )}
        </div>
    `;
};
