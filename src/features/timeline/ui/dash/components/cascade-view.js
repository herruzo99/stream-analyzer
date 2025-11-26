import { html } from 'lit-html';
import { periodCardTemplate } from './period-card.js';
import * as icons from '@/ui/icons';

export const cascadeViewTemplate = (stream) => {
    if (!stream || !stream.manifest || !stream.manifest.periods) {
        return html`
            <div
                class="flex flex-col items-center justify-center h-64 text-slate-500"
            >
                <div class="p-4 bg-slate-800/50 rounded-full mb-3">
                    ${icons.folder}
                </div>
                <p>No structure available.</p>
            </div>
        `;
    }

    return html`
        <div class="relative pl-4 space-y-8">
            <!-- Vertical Connector Line -->
            <div
                class="absolute left-4 top-4 bottom-4 w-px bg-gradient-to-b from-blue-500/50 via-slate-700 to-transparent"
            ></div>

            ${stream.manifest.periods.map((period, index) =>
                periodCardTemplate(period, index, stream)
            )}
        </div>
    `;
};
