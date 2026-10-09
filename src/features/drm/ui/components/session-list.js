import { decryptionActions } from '@/state/decryptionStore';
import * as icons from '@/ui/icons';
import { html } from 'lit-html';

const sessionItem = (session, isSelected) => {
    // Prism Glass Active State:
    // - Background: Primary color with low opacity
    // - Border: Primary color
    // - Glow: Box shadow with primary color active glow
    const activeClass = isSelected
        ? 'bg-blue-500/10 border-blue-500 shadow-[0_0_20px_-5px_#3b82f6]'
        : 'bg-slate-800 border-slate-800 hover:bg-slate-800 hover:border-slate-400/30';

    const textClass = isSelected
        ? 'text-slate-100'
        : 'text-slate-400 group-hover:text-slate-100';

    return html`
        <div
            @click=${() =>
            decryptionActions.setSelectedSessionId(session.internalId)}
            class="p-3 rounded-xl border cursor-pointer transition-all duration-200 mb-2 last:mb-0 group ${activeClass}"
        >
            <div class="flex justify-between items-center mb-1.5">
                <div
                    class="font-bold text-xs ${textClass} truncate max-w-[140px] tracking-tight"
                    title="${session.sessionId}"
                >
                    ${session.sessionId}
                </div>
                <span class="text-[10px] font-mono opacity-70 ${textClass}"
                    >${session.startTime}</span
                >
            </div>

            <div class="flex justify-between items-center">
                <div
                    class="text-[10px] ${textClass} opacity-80 truncate max-w-[120px] bg-slate-950/30 px-1.5 py-0.5 rounded"
                >
                    ${session.keySystem}
                </div>
                <div class="flex items-center gap-2">
                    ${session.status === 'error'
            ? html`<span class="text-red-400 animate-pulse"
                              >${icons.alertTriangle}</span
                          >`
            : ''}
                    <span
                        class="px-2 py-0.5 rounded-lg bg-slate-900/30 border border-slate-800 text-[10px] font-bold ${textClass}"
                    >
                        ${session.usableKeys} / ${session.totalKeys}
                    </span>
                </div>
            </div>
        </div>
    `;
};

export const sessionListTemplate = (sessions, selectedId) => {
    return html`
        <div class="flex flex-col h-full w-full overflow-hidden">
            <!-- Header -->
            <div
                class="p-4 border-b border-slate-800 bg-slate-800 backdrop-blur-md shrink-0 block"
            >
                <h3
                    class="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"
                >
                    <span class="p-1 rounded bg-slate-900/50 text-blue-400">
                        ${icons.key}
                    </span>
                    EME Sessions
                </h3>
            </div>

            <!-- List -->
            <div class="p-3 overflow-y-auto custom-scrollbar grow space-y-2">
                ${sessions.length === 0
            ? html`
                    <div
                        class="mt-8 flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-800 rounded-xl"
                    >
                        <div class="text-slate-400 opacity-50 mb-2 scale-75">
                             ${icons.key}
                        </div>
                        <div class="text-slate-400 text-xs font-medium">
                            No EME sessions
                        </div>
                        <div class="text-slate-400 text-[10px] opacity-70 mt-1">
                            Start playback to capture
                        </div>
                    </div>`
            : sessions.map((s) =>
                sessionItem(s, s.internalId === selectedId)
            )}
            </div>
        </div>
    `;
};
