import { decryptionActions } from '@/state/decryptionStore';
import * as icons from '@/ui/icons';
import { html } from 'lit-html';

const sessionItem = (session, isSelected) => {
    const activeClass = isSelected
        ? 'bg-blue-600 border-blue-500 shadow-md'
        : 'bg-slate-800 border-slate-700 hover:bg-slate-700';
    const textClass = isSelected ? 'text-white' : 'text-slate-300';

    return html`
        <div
            @click=${() =>
                decryptionActions.setSelectedSessionId(session.internalId)}
            class="p-3 rounded-lg border cursor-pointer transition-all mb-2 group ${activeClass}"
        >
            <div class="flex justify-between items-center mb-1">
                <div
                    class="font-bold text-xs ${textClass} truncate max-w-[140px]"
                    title="${session.sessionId}"
                >
                    ${session.sessionId}
                </div>
                <span class="text-[10px] font-mono opacity-70 ${textClass}"
                    >${session.startTime}</span
                >
            </div>

            <div class="flex justify-between items-end">
                <div
                    class="text-[10px] opacity-80 ${textClass} truncate max-w-[150px]"
                >
                    ${session.keySystem}
                </div>
                <div class="flex gap-1">
                    ${session.status === 'error'
                        ? html`<span class="text-red-300"
                              >${icons.alertTriangle}</span
                          >`
                        : ''}
                    <span
                        class="px-1.5 py-0.5 rounded bg-black/20 text-[10px] font-bold ${textClass}"
                    >
                        ${session.usableKeys} / ${session.totalKeys} Keys
                    </span>
                </div>
            </div>
        </div>
    `;
};

export const sessionListTemplate = (sessions, selectedId) => {
    return html`
        <div
            class="flex flex-col h-full bg-slate-900 border-r border-slate-800 w-72 shrink-0"
        >
            <div class="p-4 border-b border-slate-800 bg-slate-900/50">
                <h3
                    class="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"
                >
                    ${icons.key} EME Sessions
                </h3>
            </div>
            <div class="p-2 overflow-y-auto custom-scrollbar grow">
                ${sessions.length === 0
                    ? html`<div
                          class="p-4 text-center text-slate-500 text-xs italic"
                      >
                          No EME sessions detected yet.
                      </div>`
                    : sessions.map((s) =>
                          sessionItem(s, s.internalId === selectedId)
                      )}
            </div>
        </div>
    `;
};
