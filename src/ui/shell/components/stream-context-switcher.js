import { analysisActions, useAnalysisStore } from '@/state/analysisStore';
import * as icons from '@/ui/icons';
import { closeDropdown, toggleDropdown } from '@/ui/services/dropdownService';
import { openModalWithContent } from '@/ui/services/modalService';
import { copyTextToClipboard } from '@/ui/shared/clipboard';
import { html } from 'lit-html';

const streamOptionTemplate = (stream, isActive) => {
    const isLive = stream.manifest?.type === 'dynamic';
    const protocol = stream.protocol.toUpperCase();

    const protocolColor =
        protocol === 'DASH'
            ? 'text-blue-400 bg-blue-400/10'
            : 'text-purple-400 bg-purple-400/10';
    const statusColor = isLive
        ? 'text-red-400 bg-red-400/10 border-red-400/20'
        : 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';

    const handleSelect = () => {
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

    const containerClass = isActive
        ? 'bg-blue-600/10 border-blue-500/50 ring-1 ring-blue-500/20'
        : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10';

    return html`
        <div
            class="group relative flex flex-col p-3 rounded-xl border transition-all duration-200 cursor-pointer ${containerClass}"
            @click=${handleSelect}
        >
            <!-- Header -->
            <div class="flex justify-between items-start mb-2">
                <div class="flex items-center gap-2">
                    <span
                        class="text-[10px] font-black px-1.5 py-0.5 rounded ${protocolColor}"
                        >${protocol}</span
                    >
                    <span
                        class="text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor} flex items-center gap-1"
                    >
                        ${isLive
            ? html`<span
                                  class="w-1.5 h-1.5 rounded-full bg-current animate-pulse"
                              ></span>`
            : ''}
                        ${isLive ? 'LIVE' : 'VOD'}
                    </span>
                </div>
                ${isActive
            ? html`<span
                          class="text-blue-400 shadow-blue-500/50 drop-shadow-sm"
                          >${icons.checkCircle}</span
                      >`
            : ''}
            </div>

            <!-- Content -->
            <div class="min-w-0 pr-8">
                <h3
                    class="font-bold text-sm text-white truncate mb-0.5 group-hover:text-blue-200 transition-colors"
                >
                    ${stream.name}
                </h3>
                <p
                    class="text-[10px] text-slate-500 font-mono truncate mt-1 opacity-70 group-hover:opacity-100 transition-opacity"
                >
                    ${new URL(stream.originalUrl).hostname}
                </p>
            </div>

            <!-- Hover Actions -->
            <div
                class="absolute bottom-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            >
                <button
                    @click=${handleCopy}
                    class="p-1.5 rounded-md bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700"
                    title="Copy URL"
                >
                    ${icons.clipboardCopy}
                </button>
                <button
                    @click=${handleRemove}
                    class="p-1.5 rounded-md bg-red-900/20 text-red-400 hover:bg-red-900/40 border border-red-900/30"
                    title="Remove Stream"
                >
                    ${icons.xCircle}
                </button>
            </div>
        </div>
    `;
};

const dropdownContentTemplate = (streams, activeStreamId) => {
    const handleAddStream = () => {
        closeDropdown();
        openModalWithContent({
            title: 'Add Stream',
            url: '',
            content: { type: 'addStream', data: {} },
            isFullWidth: true,
        });
    };

    return html`
        <div
            class="dropdown-panel bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl w-80 flex flex-col max-h-[70vh] overflow-hidden ring-1 ring-black/50"
        >
            <!-- Header -->
            <div class="p-4 border-b border-white/5 bg-white/[0.02]">
                <h3
                    class="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1"
                >
                    Active Workspace
                </h3>
                <div
                    class="flex justify-between items-center text-slate-300 text-sm"
                >
                    <span
                        >${streams.length} Active
                        Stream${streams.length !== 1 ? 's' : ''}</span
                    >
                </div>
            </div>

            <!-- List -->
            <div class="p-2 space-y-2 overflow-y-auto custom-scrollbar grow">
                ${streams.map((s) =>
        streamOptionTemplate(s, s.id === activeStreamId)
    )}
            </div>

            <!-- Footer -->
            <div class="p-3 border-t border-white/5 bg-white/[0.02]">
                <button
                    @click=${handleAddStream}
                    class="w-full py-2.5 rounded-lg border border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 hover:bg-white/5 transition-all text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2"
                >
                    ${icons.plusCircle} Add Stream
                </button>
            </div>
        </div>
    `;
};

export const streamContextSwitcherTemplate = (streams, activeStreamId) => {
    if (streams.length === 0) return html``;

    const activeStream =
        streams.find((s) => s.id === activeStreamId) || streams[0];
    const isLive = activeStream.manifest?.type === 'dynamic';
    const protocol = activeStream.protocol.toUpperCase();

    return html`
        <div class="px-3 pt-4 pb-2">
            <button
                @click=${(e) =>
            toggleDropdown(
                e.currentTarget,
                () => {
                    const { streams, activeStreamId } =
                        useAnalysisStore.getState();
                    return dropdownContentTemplate(
                        streams,
                        activeStreamId
                    );
                },
                e
            )}
                class="w-full text-left group"
            >
                <div
                    class="bg-slate-800/60 border border-white/5 rounded-xl p-3 transition-all duration-200 hover:bg-slate-800 hover:border-white/10 hover:shadow-lg hover:shadow-blue-900/5 relative overflow-hidden"
                >
                    <!-- Active Indicator Line -->
                    <div
                        class="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    ></div>

                    <div class="flex items-start justify-between mb-2">
                        <div class="flex items-center gap-2">
                            <span
                                class="px-1.5 py-0.5 rounded bg-slate-950/50 border border-white/10 text-[10px] font-bold text-slate-300 shadow-inner"
                            >
                                ${protocol}
                            </span>
                            ${isLive
            ? html`<span class="flex h-2 w-2 relative"
                                      ><span
                                          class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"
                                      ></span
                                      ><span
                                          class="relative inline-flex rounded-full h-2 w-2 bg-red-500"
                                      ></span
                                  ></span>`
            : ''}
                        </div>
                        <span
                            class="text-slate-500 group-hover:text-white transition-colors scale-90"
                        >
                            ${icons.chevronDown}
                        </span>
                    </div>

                    <h2
                        class="font-bold text-sm text-white truncate leading-tight group-hover:text-blue-100 transition-colors"
                    >
                        ${activeStream.name}
                    </h2>

                    <p
                        class="text-[10px] text-slate-500 font-mono truncate mt-1 opacity-70 group-hover:opacity-100 transition-opacity"
                    >
                        ${new URL(activeStream.originalUrl).hostname}
                    </p>
                </div>
            </button>
        </div>
    `;
};
