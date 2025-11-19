import { html } from 'lit-html';
import { periodCardTemplate } from './period-card.js';
import * as icons from '@/ui/icons';

export const cascadeViewTemplate = (stream) => {
    if (!stream || !stream.manifest || !stream.manifest.periods) {
        return html`<div class="text-center p-8 text-slate-500">
            <div class="w-12 h-12 mx-auto">${icons.folder}</div>
            <p class="mt-2">No period structure to display.</p>
        </div>`;
    }

    return html`
        <div class="space-y-4">
            ${stream.manifest.periods.map((period, index) =>
                periodCardTemplate(period, index, stream)
            )}
        </div>
    `;
};
