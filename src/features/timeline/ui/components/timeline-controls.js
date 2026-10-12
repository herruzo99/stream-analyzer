import { html } from 'lit-html';

export const timelineControlsTemplate = (stream) => {
    if (!stream) return html``;

    return html`
        <div
            class="flex items-center justify-between px-6 py-3 bg-white/5 border-b border-white/10 shrink-0"
        >
            <div class="flex items-center gap-4">
                <div class="flex items-center gap-2 text-sm">
                    <span class="font-bold text-white">${stream.name}</span>
                    <span
                        class="px-2 py-0.5 rounded bg-white/5 text-slate-400 text-[10px] font-mono border border-white/10"
                    >
                        ${stream.protocol.toUpperCase()}
                    </span>
                </div>
            </div>
        </div>
    `;
};
