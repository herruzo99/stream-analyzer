import { analysisActions, useAnalysisStore } from '@/state/analysisStore';
import { useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { closeDropdown, toggleDropdown } from '@/ui/services/dropdownService';
import { openModalWithContent } from '@/ui/services/modalService';
import { copyTextToClipboard } from '@/ui/shared/clipboard';
import { showToast } from '@/ui/components/toast';
import { html } from 'lit-html';

function streamHostname(stream) {
    try {
        return new URL(stream.originalUrl).hostname || 'local file';
    } catch {
        return 'local file';
    }
}

// Armed remove-button state. The dropdown re-renders on every store
// write, which would wipe element state — so the arm lives here with a
// timestamp, and the button re-arms visually from it on each render.
let pendingRemoveArm = null;
const REMOVE_ARM_MS = 4000;

const streamOptionTemplate = (stream, isActive) => {
    const isLive = stream.manifest?.type === 'dynamic';
    const isDisabled = stream.disabled;
    const protocol = stream.protocol ? stream.protocol.toUpperCase() : 'ERR';

    const handleSelect = () => {
        if (isDisabled) {
            showToast({
                message: `“${stream.name}” failed to load (${stream.error || 'unknown error'}). Remove it or retry from the stream list.`,
                type: 'fail',
            });
            return;
        }
        analysisActions.setActiveStreamId(stream.id);
        closeDropdown();
    };

    const handleCopy = (e) => {
        e.stopPropagation();
        copyTextToClipboard(stream.originalUrl, 'Stream URL copied');
    };

    // Two-tap inline confirm: first tap arms (“Remove?”), second removes.
    // Module-level so it survives dropdown re-renders between taps.
    const handleRemove = (e) => {
        e.stopPropagation();
        const btn = e.currentTarget;
        if (btn?.dataset.armed !== stream.id) {
            if (btn) {
                btn.dataset.armed = stream.id;
                btn.classList.add('text-red-300');
            }
            pendingRemoveArm = { id: stream.id, at: Date.now() };
            return;
        }
        delete btn.dataset.armed;
        pendingRemoveArm = null;
        analysisActions.removeStreamInput(stream.id);
        showToast({
            message: `Removed “${stream.name}” from the workspace.`,
            type: 'pass',
        });
    };

    // Disabled styling
    if (isDisabled) {
        return html`
            <div
                class="w-full flex items-center justify-between px-2.5 py-2 rounded-md border border-red-400/25 bg-red-500/5 opacity-90"
            >
                <button @click=${handleSelect} class="flex items-center gap-3 min-w-0 text-left grow" title="${stream.error || 'Load failed'}">
                    <span class="w-0.5 self-stretch rounded-full bg-red-500 shrink-0"></span>
                    <span class="flex flex-col items-start min-w-0">
                        <span class="text-[13px] font-medium truncate w-full flex items-center gap-2 text-slate-300">
                            ${stream.name}
                            <span class="text-red-300" title="${stream.error || 'Load failed'}">${icons.alertTriangle}</span>
                        </span>
                        <span class="flex gap-1.5 mt-1 items-center">
                            <span class="mono text-[10px] px-1.5 py-px rounded border border-red-400/25 text-red-300">
                                failed
                            </span>
                            <span class="mono text-[10px] text-slate-600 truncate max-w-[150px]">
                                ${streamHostname(stream)}
                            </span>
                        </span>
                    </span>
                </button>
                <span class="flex items-center gap-1 pl-2 shrink-0">
                    <button
                        @click=${handleRemove}
                        class="p-1.5 rounded transition-colors ${pendingRemoveArm?.id === stream.id && Date.now() - pendingRemoveArm.at < REMOVE_ARM_MS ? 'text-red-300 bg-red-500/10' : 'text-slate-500 hover:text-red-300'}"
                        title="${pendingRemoveArm?.id === stream.id ? 'Click again to remove' : 'Remove stream'}"
                        aria-label="${pendingRemoveArm?.id === stream.id ? `Confirm remove ${stream.name}` : `Remove stream ${stream.name}`}"
                    >
                        ${icons.x}
                    </button>
                </span>
            </div>
        `;
    }

    return html`
        <div
            class="w-full flex items-center justify-between px-2.5 py-2 rounded-md border transition-colors ${isActive
                ? 'bg-transparent border-emerald-500/30'
                : 'bg-transparent border-transparent hover:bg-white/5'}"
        >
            <button
                @click=${handleSelect}
                class="flex items-center gap-3 min-w-0 text-left grow"
                aria-current=${isActive ? 'true' : 'false'}
            >
                <span
                    class="w-0.5 self-stretch rounded-full shrink-0 ${isActive
                        ? 'bg-emerald-400'
                        : isLive
                            ? 'bg-red-500'
                            : 'bg-white/10'}"
                ></span>

                <span class="flex flex-col items-start min-w-0">
                    <span
                        class="text-[13px] font-medium truncate w-full flex items-center gap-2 text-slate-200"
                    >
                        ${stream.name}
                        ${isLive
                            ? html`<span class="mono flex items-center gap-1 text-[10px] text-red-300"><span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>live</span>`
                            : ''}
                    </span>
                    <span class="flex gap-1.5 mt-1 items-center">
                        <span
                            class="mono text-[10px] px-1.5 py-px rounded border ${isActive
                                ? 'bg-emerald-500/10 text-emerald-200 border-emerald-400/25'
                                : 'bg-white/5 text-slate-500 border-white/10'}"
                        >
                            ${protocol.toLowerCase()}
                        </span>
                        <span
                            class="mono text-[10px] text-slate-600 truncate max-w-[150px]"
                        >
                            ${streamHostname(stream)}
                        </span>
                    </span>
                </span>
            </button>

            <span class="flex items-center gap-1 pl-2 shrink-0">
                <button
                    @click=${handleCopy}
                    class="p-1.5 rounded text-slate-600 hover:text-slate-200 transition-colors"
                    title="Copy URL"
                    aria-label="Copy URL of ${stream.name}"
                >
                    ${icons.clipboardCopy}
                </button>
                <button
                    @click=${handleRemove}
                    class="p-1.5 rounded transition-colors ${pendingRemoveArm?.id === stream.id && Date.now() - pendingRemoveArm.at < REMOVE_ARM_MS ? 'text-red-300 bg-red-500/10' : 'text-slate-600 hover:text-red-300'}"
                    title="${pendingRemoveArm?.id === stream.id ? 'Click again to remove' : 'Remove stream'}"
                    aria-label="${pendingRemoveArm?.id === stream.id ? `Confirm remove ${stream.name}` : `Remove stream ${stream.name}`}"
                >
                    ${icons.x}
                </button>
            </span>
        </div>
    `;
};

const dropdownContentTemplate = (streams, activeStreamId) => {
    const handleAddStream = () => {
        closeDropdown();
        openModalWithContent({
            title: 'Add stream',
            url: '',
            content: { type: 'addStream', data: {} },
            isFullWidth: true,
        });
    };

    return html`
        <div
            class="dropdown-panel border border-white/10 bg-[#0b111c] rounded-md w-[320px] flex flex-col max-h-[70vh] overflow-hidden"
        >
            <div
                class="px-4 py-3 border-b border-white/5 flex items-center justify-between"
            >
                <span class="mono text-[11px] font-medium text-slate-400"
                    >streams</span
                >
                <span class="mono text-[11px] text-slate-600"
                    >${streams.length} stream${streams.length === 1 ? '' : 's'}</span
                >
            </div>

            <div class="p-2 overflow-y-auto custom-scrollbar grow">
                ${streams.map((s) =>
                    streamOptionTemplate(s, s.id === activeStreamId)
                )}
            </div>

            <div class="p-3 border-t border-white/5">
                <button
                    @click=${handleAddStream}
                    class="w-full py-2.5 rounded-md border border-white/10 text-slate-300 hover:text-slate-100 hover:border-white/25 hover:bg-white/5 transition-colors text-[13px] font-medium flex items-center justify-center gap-2"
                >
                    ${icons.plusCircle}
                    <span>Add stream</span>
                </button>
            </div>
        </div>
    `;
};

export const streamContextSwitcherTemplate = (streams, activeStreamId) => {
    if (streams.length === 0) return html``;

    const { isGlobalNavCompact } = useUiStore.getState();

    const activeStream =
        streams.find((s) => s.id === activeStreamId) || streams[0];
    const isLive = activeStream.manifest?.type === 'dynamic';
    const protocol = (activeStream.protocol || 'err').toLowerCase();

    const openMenu = (e) =>
        toggleDropdown(
            e.currentTarget,
            () => {
                const { streams, activeStreamId } =
                    useAnalysisStore.getState();
                return dropdownContentTemplate(streams, activeStreamId);
            },
            e
        );

    // Compact Mode Trigger
    if (isGlobalNavCompact) {
        return html`
            <div class="w-full px-2 py-3 flex justify-center">
                <button
                    @click=${openMenu}
                    class="w-10 h-10 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md flex items-center justify-center transition-colors relative"
                    title="${activeStream.name} (${protocol}) — switch stream"
                    aria-label="Switch stream (currently ${activeStream.name})"
                >
                    <span class="mono text-[10px] text-slate-200">
                        ${protocol}
                    </span>
                    ${isLive
                        ? html`<span
                              class="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500"
                          ></span>`
                        : ''}
                </button>
            </div>
        `;
    }

    return html`
        <div class="w-full px-3 py-3">
            <button
                @click=${openMenu}
                class="w-full bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 rounded-md p-3 transition-colors text-left"
                aria-label="Switch stream (currently ${activeStream.name})"
            >
                <div class="flex items-center justify-between gap-2">
                    <div class="min-w-0 grow">
                        <div
                            class="mono text-[10px] text-slate-500 mb-1 flex items-center gap-1.5"
                        >
                            stream
                            ${isLive
                                ? html`<span
                                      class="mono flex items-center gap-1 text-[10px] text-red-300"
                                      ><span
                                          class="w-1.5 h-1.5 rounded-full bg-red-500"
                                      ></span
                                      >live</span
                                  >`
                                : ''}
                        </div>
                        <div
                            class="font-medium text-slate-100 text-sm truncate"
                            title="${activeStream.name}"
                        >
                            ${activeStream.name}
                        </div>
                        <div
                            class="mono text-[10px] text-slate-600 truncate mt-1 flex items-center gap-1.5"
                        >
                            <span>${protocol}</span>
                            <span class="text-slate-700">·</span>
                            <span class="truncate"
                                >${streamHostname(activeStream)}</span
                            >
                        </div>
                    </div>
                    <span class="text-slate-500 shrink-0"
                        >${icons.chevronDown}</span
                    >
                </div>
            </button>
        </div>
    `;
};
