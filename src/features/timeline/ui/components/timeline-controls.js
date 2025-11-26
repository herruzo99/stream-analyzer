import { html } from 'lit-html';
import * as icons from '@/ui/icons';
import { reloadStream } from '@/ui/services/streamActionsService';

export const timelineControlsTemplate = (stream) => {
    if (!stream) return html``;

    return html`
        <div
            class="flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-800 shrink-0"
        >
            <div class="flex items-center gap-4">
                <div class="flex items-center gap-2 text-sm">
                    <span class="font-bold text-white">${stream.name}</span>
                    <span
                        class="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-mono border border-slate-700"
                    >
                        ${stream.protocol.toUpperCase()}
                    </span>
                </div>
            </div>
        </div>
    `;
};
