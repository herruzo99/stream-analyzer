import { decryptionActions } from '@/state/decryptionStore';
import * as icons from '@/ui/icons';
import { html } from 'lit-html';

const sessionItem = (session, isSelected) => {
    // Flat active state:
    // - Background: Primary color with low opacity
    // - Border: Primary color
    // - Glow: Box shadow with primary color active glow
    const activeClass = isSelected
        ? 'bg-emerald-500/10 border-emerald-400/25 '
        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-slate-400/30';

    const textClass = isSelected
        ? 'text-slate-100'
        : 'text-slate-400 group-hover:text-slate-100';

    return html`
        <div
            @click=${() =>
            decryptionActions.setSelectedSessionId(session.internalId)}
            class="p-3 rounded-md border cursor-pointer transition-all duration-200 mb-2 last:mb-0 group ${activeClass}"
        >
            <div class="flex justify-between items-center mb-1.5">
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
                        class="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold ${textClass}"
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
                class="p-4 border-b border-white/10 bg-white/5 shrink-0 block"
            >
                <h3
                    class="text-xs font-bold text-slate-400 r flex items-center gap-2"
                >
                    <span class="p-1 rounded bg-white/5 text-emerald-200">
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
                        class="mt-8 flex flex-col items-center justify-center text-center p-4 border border-dashed border-white/10 rounded-md"
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
