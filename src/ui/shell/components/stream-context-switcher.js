import { analysisActions, useAnalysisStore } from '@/state/analysisStore';
import { useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { closeDropdown, toggleDropdown } from '@/ui/services/dropdownService';
import { openModalWithContent } from '@/ui/services/modalService';
import { copyTextToClipboard } from '@/ui/shared/clipboard';
import { html } from 'lit-html';

const streamOptionTemplate = (stream, isActive, isGlass) => {
    const isLive = stream.manifest?.type === 'dynamic';
    const isDisabled = stream.disabled;
    const protocol = stream.protocol ? stream.protocol.toUpperCase() : 'ERR';
    const radiusClass = isGlass ? 'rounded-xl' : 'rounded-sm';

    const handleSelect = () => {
        if (isDisabled) return; // Prevent selection of disabled streams for now
        analysisActions.setActiveStreamId(stream.id);
        closeDropdown();
    };

    const handleCopy = (e) => {
        e.stopPropagation();
        copyTextToClipboard(stream.originalUrl, 'Stream URL copied');
    };

    const handleRemove = (e) => {
        e.stopPropagation();
        if (confirm('Remove this stream from the workspace?')) {
            analysisActions.removeStreamInput(stream.id);
        }
    };

    // Disabled styling
    if (isDisabled) {
        return html`
            <div
                class="w-full flex items-center justify-between p-2.5 ${radiusClass} border border-red-500/20 bg-red-500/5 opacity-80 cursor-not-allowed group"
            >
                <div class="flex items-center gap-4 min-w-0">
                    <div class="w-1 h-8 rounded-full bg-red-500"></div>
                    <div class="flex flex-col items-start min-w-0">
                        <div class="text-sm font-semibold truncate w-full text-left flex items-center gap-2 text-slate-400">
                            ${stream.name}
                            <span class="text-red-400" data-tooltip="${stream.error}">${icons.alertTriangle}</span>
                        </div>
                        <div class="flex gap-1.5 mt-1 items-center">
                            <span class="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded-md border border-red-500/30 text-red-400">
                                FAILED
                            </span>
                            <span class="text-[10px] text-slate-400 font-mono truncate max-w-[150px] opacity-60">
                                ${new URL(stream.originalUrl).hostname}
                            </span>
                        </div>
                    </div>
                </div>
                
                 <!-- Actions -->
                <div class="flex items-center gap-1.5 pl-2">
                    <div class="flex gap-1.5">
                         <div
                            @click=${handleRemove}
                            class="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                            data-tooltip="Remove Stream"
                        >
                            ${icons.xCircle}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Match HLS item row styling
    return html`
        <button
            @click=${handleSelect}
            class="w-full flex items-center justify-between p-2.5 ${radiusClass} transition-all duration-300 group ${isActive
            ? 'bg-slate-800 border border-blue-500/40 shadow-lg'
            : 'hover:bg-slate-800 border border-transparent hover:border-slate-800/30'}"
        >
            <div class="flex items-center gap-4 min-w-0">
                <!-- Status Indicator Bar -->
                <div
                    class="w-1 h-8 rounded-full transition-all duration-300 ${isActive
            ? 'bg-gradient-to-b from-blue-500 to-[#60a5fa] shadow-[0_0_12px_#3b82f6] scale-y-110'
            : isLive
                ? 'bg-red-500 animate-pulse'
                : 'bg-slate-800 group-hover:bg-slate-400'}"
                ></div>

                <div class="flex flex-col items-start min-w-0">
                    <div
                        class="text-sm font-semibold truncate w-full text-left flex items-center gap-2 ${isActive
            ? 'text-slate-100'
            : 'text-slate-100 group-hover:text-slate-100'}"
                    >
                        ${stream.name}
                        ${isActive
            ? html`<span
                                  class="text-blue-400 drop-shadow-[0_0_5px_#3b82f6]"
                                  >${icons.checkCircle}</span
                              >`
            : ''}
                        ${isLive
            ? html`<span
                                  class="flex h-2 w-2 relative"
                                  data-tooltip="Live Stream"
                                  >
                                  <span
                                      class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"
                                  ></span>
                                  <span
                                      class="relative inline-flex rounded-full h-2 w-2 bg-red-500"
                                  ></span>
                              </span>`
            : ''}
                    </div>
                    <div class="flex gap-1.5 mt-1 items-center">
                        <span
                            class="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded-md border ${isActive
            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
            : 'bg-slate-800 text-slate-400 border-slate-800/40 group-hover:border-slate-800/60'}"
                        >
                            ${protocol}
                        </span>
                        <span
                            class="text-[10px] text-slate-400 font-mono truncate max-w-[150px] opacity-60"
                        >
                            ${new URL(stream.originalUrl).hostname}
                        </span>
                    </div>
                </div>
            </div>

            <!-- Actions (Visible on Hover/Active) -->
            <div class="flex items-center gap-1.5 pl-2">
                <div
                    class="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
                    <div
                        @click=${handleCopy}
                        class="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all"
                        data-tooltip="Copy URL"
                    >
                        ${icons.clipboardCopy}
                    </div>
                    <div
                        @click=${handleRemove}
                        class="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        data-tooltip="Remove Stream"
                    >
                        ${icons.xCircle}
                    </div>
                </div>
            </div>
        </button>
    `;
};

const dropdownContentTemplate = (streams, activeStreamId, isGlass) => {
    const handleAddStream = () => {
        closeDropdown();
        openModalWithContent({
            title: 'Add Stream',
            url: '',
            content: { type: 'addStream', data: {} },
            isFullWidth: true,
        });
    };

    const panelClass = isGlass
        ? "bg-slate-800/95 backdrop-blur-3xl border-slate-800/30 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] ring-1 ring-white/10"
        : "bg-slate-800 border-slate-800 rounded-sm shadow-xl";

    const headerClass = isGlass
        ? "bg-slate-800 border-slate-800/20"
        : "bg-slate-800 border-slate-800";

    const listBgClass = isGlass
        ? "bg-gradient-to-b from-transparent to-slate-800"
        : "bg-slate-800";

    return html`
        <div
            class="dropdown-panel border w-[320px] flex flex-col max-h-[70vh] overflow-hidden ${panelClass}"
        >
            <!-- Header -->
            <div
                class="px-5 py-4 border-b flex items-center justify-between ${headerClass}"
            >
                <div
                    class="flex items-center gap-3 text-slate-400"
                >
                    <span
                        class="text-blue-400 drop-shadow-[0_0_8px_#3b82f6]"
                        >${icons.activity}</span
                    >
                    <span
                        class="text-xs font-extrabold uppercase tracking-[0.15em] opacity-80"
                        >Active Workspace</span
                    >
                </div>
                <span
                    class="text-[10px] font-bold bg-slate-800 px-2.5 py-1 rounded-full text-slate-100 border border-slate-800/20"
                >
                    ${streams.length}
                </span>
            </div>

            <!-- List -->
            <div
                class="p-3 space-y-1 overflow-y-auto custom-scrollbar grow ${listBgClass}"
            >
                ${streams.map((s) =>
        streamOptionTemplate(s, s.id === activeStreamId, isGlass)
    )}
            </div>

            <!-- Footer -->
            <div
                class="p-4 border-t flex items-center ${headerClass}"
            >
                <button
                    @click=${handleAddStream}
                    class="w-full py-3 ${isGlass ? 'rounded-xl' : 'rounded-sm'} border border-dashed border-slate-800/50 text-slate-400 hover:text-slate-100 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-3 group relative overflow-hidden"
                >
                    <div
                        class="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
                    ></div>
                    <span
                        class="group-hover:rotate-90 group-hover:scale-110 transition-all duration-300 text-blue-400"
                        >${icons.plusCircle}</span
                    >
                    <span>Add Stream Input</span>
                </button>
            </div>
        </div>
    `;
};

export const streamContextSwitcherTemplate = (streams, activeStreamId) => {
    if (streams.length === 0) return html``;

    if (streams.length === 0) return html``;

    // Port: no themes in 1.2.0; solid styling throughout.
    const isGlass = false;
    const { isGlobalNavCompact } = useUiStore.getState();

    const activeStream =
        streams.find((s) => s.id === activeStreamId) || streams[0];
    const isLive = activeStream.manifest?.type === 'dynamic';
    const protocol = activeStream.protocol
        ? activeStream.protocol.toUpperCase()
        : 'ERR';

    // Compact Mode Trigger
    if (isGlobalNavCompact) {
        return html`
            <div class="relative w-full px-2 pt-4 pb-2 flex justify-center">
                <button
                    @click=${(e) =>
                toggleDropdown(
                    e.currentTarget,
                    () => {
                        const { streams, activeStreamId } =
                            useAnalysisStore.getState();
                        return dropdownContentTemplate(
                            streams,
                            activeStreamId,
                            isGlass
                        );
                    },
                    e
                )}
                    class="w-10 h-10 bg-slate-800 hover:bg-slate-800 border border-slate-800/30 hover:border-blue-500/40 rounded-xl flex items-center justify-center transition-all duration-300 group shadow-lg relative overflow-hidden"
                    data-tooltip="${activeStream.name} (${protocol})"
                    data-tooltip-placement="right"
                >
                     <div
                        class="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                    ></div>
                    
                    <span class="text-slate-100 text-[10px] font-bold tracking-tighter group-hover:scale-110 transition-transform relative z-10">
                        ${protocol}
                    </span>

                    ${isLive ? html`<div class="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500 ring-1 ring-slate-800 z-20"></div>` : ''}
                </button>
            </div>
        `;
    }

    return html`
        <div class="relative w-full px-4 pt-6 pb-4">
            <button
                @click=${(e) =>
            toggleDropdown(
                e.currentTarget,
                () => {
                    const { streams, activeStreamId } =
                        useAnalysisStore.getState();
                    return dropdownContentTemplate(
                        streams,
                        activeStreamId,
                        isGlass
                    );
                },
                e
            )}
                class="w-full ${isGlass ? 'bg-slate-800 hover:bg-slate-800 rounded-2xl' : 'bg-slate-800 rounded-sm'} border border-slate-800/30 hover:border-blue-500/40 p-4 transition-all duration-300 text-left group shadow-lg relative overflow-hidden"
            >
                <!-- Hover Glow -->
                <div
                    class="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                ></div>

                <div class="flex items-center justify-between relative z-10">
                    <div class="min-w-0">
                        <div
                            class="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400/70 mb-1.5 group-hover:text-blue-400 transition-colors flex items-center gap-2"
                        >
                            <span
                                class="bg-blue-500/20 p-1 rounded-sm"
                                >${icons.activity}</span
                            >
                            <span>STREAM INPUT</span>
                            ${isLive
            ? html`<span
                                      class="flex h-2 w-2 relative"
                                      title="Live"
                                  >
                                      <span
                                          class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"
                                      ></span>
                                      <span
                                          class="relative inline-flex rounded-full h-2 w-2 bg-red-500"
                                      ></span>
                                  </span>`
            : ''}
                        </div>
                        <div
                            class="font-extrabold text-slate-100 text-sm group-hover:text-slate-100 truncate tracking-tight"
                            data-tooltip="${activeStream.name}"
                        >
                            ${activeStream.name}
                        </div>
                        <div
                            class="text-[10px] text-slate-400 font-mono truncate opacity-60 mt-1.5 flex items-center gap-2"
                        >
                            <span
                                class="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-800/20 font-bold tracking-wider"
                                >${protocol}</span
                            >
                            <span class="opacity-50">•</span>
                            <span class="truncate"
                                >${new URL(activeStream.originalUrl)
            .hostname}</span
                            >
                        </div>
                    </div>
                    <div
                        class="text-slate-400 group-hover:text-blue-400 transition-all duration-300 pl-3 group-hover:translate-y-0.5"
                    >
                        ${icons.chevronDown}
                    </div>
                </div>
            </button>
        </div>
    `;
};
