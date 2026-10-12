import { getAttr } from '@/infrastructure/parsing/utils/recursive-parser.js';
import * as icons from '@/ui/icons';
import { html } from 'lit-html';
import { representationCardTemplate } from './representation-card.js';

const getTypeIcon = (type) => {
    switch (type) {
        case 'video':
            return icons.clapperboard;
        case 'audio':
            return icons.audioLines;
        case 'text':
            return icons.fileText;
        default:
            return icons.binary;
    }
};

const getTypeColor = (type) => {
    switch (type) {
        case 'video':
            return 'text-emerald-200 bg-emerald-500/10 border-emerald-400/25';
        case 'audio':
            return 'text-slate-300 bg-white/5 border-white/10';
        case 'text':
            return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
        default:
            return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
};

const badge = (label, val) => {
    if (!val && val !== 0) return '';
    return html`
        <div
            class="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px]"
        >
            <span class="text-slate-500 font-semibold">${label}</span>
            <span class="text-slate-200 font-mono">${val}</span>
        </div>
    `;
};

export const adaptationSetCardTemplate = (as, stream, period) => {
    const type = as.contentType || 'unknown';
    const colorClass = getTypeColor(type);
    const align =
        getAttr(as.serializedManifest, 'segmentAlignment') === 'true'
            ? 'Aligned'
            : null;
    const subAlign =
        getAttr(as.serializedManifest, 'subsegmentAlignment') === 'true'
            ? 'Sub-Aligned'
            : null;

    return html`
        <div
            class="bg-white/5 rounded-md border border-white/10 flex flex-col h-full hover:border-slate-600 transition-colors"
        >
            <!-- Header -->
            <div
                class="px-3 py-2 border-b border-white/10 flex items-center justify-between bg-white/5 rounded-t-lg"
            >
                <div class="flex items-center gap-2">
                    <div class="p-1.5 rounded-md border ${colorClass}">
                        ${getTypeIcon(type)}
                    </div>
                    <span class="font-bold text-sm text-slate-200"
                        >AS ${as.id}</span
                    >
                </div>
                <div class="flex gap-1">
                    ${as.lang
                        ? html`<span
                              class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/5 text-slate-300"
                              >${as.lang}</span
                          >`
                        : ''}
                    ${as.mimeType
                        ? html`<span
                              class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 text-slate-400"
                              >${as.mimeType.split('/')[1]}</span
                          >`
                        : ''}
                </div>
            </div>

            <!-- Props -->
            <div
                class="px-3 py-2 flex flex-wrap gap-2 border-b border-white/10 bg-white/5"
            >
                ${badge('Role', (as.roles || []).map((r) => r.value).join(','))}
                ${badge(
                    'Codecs',
                    (as.codecs || []).map((c) => c.value).join(',')
                )}
                ${align
                    ? html`<span
                          class="text-[10px] text-green-400 flex items-center gap-1"
                          >${icons.checkCircle} ${align}</span
                      >`
                    : ''}
                ${subAlign
                    ? html`<span
                          class="text-[10px] text-green-400 flex items-center gap-1"
                          >${icons.checkCircle} ${subAlign}</span
                      >`
                    : ''}
            </div>

            <!-- Representations Grid -->
            <div
                class="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 grow content-start"
            >
                ${as.representations.map((rep) =>
                    representationCardTemplate(rep, as, stream, period)
                )}
            </div>
        </div>
    `;
};
