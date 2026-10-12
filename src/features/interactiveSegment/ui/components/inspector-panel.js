import { getTooltipData } from '@/infrastructure/parsing/isobmff/index';
import { useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { inspectorDetailsTemplate } from '@/ui/shared/isobmff-renderer';
import { html } from 'lit-html';

const allTooltips = getTooltipData();

const infoCard = (label, value, icon = null, width = 'full') => html`
    <div
        class="bg-white/5 rounded-md border border-white/10 p-3 flex flex-col group hover:bg-white/10 transition-all duration-300 hover:border-[#3b82f6]/50 ring-1 ring-white/5 ${width === 'half' ? 'col-span-1' : 'col-span-2'}"
    >
        <span
            class="text-[10px] font-bold text-slate-400 r mb-1.5 flex items-center gap-1.5"
        >
            <span
                class="text-emerald-200 group-hover:scale-110 transition-transform duration-300 drop-"
                >${icon}</span
            >
            ${label}
        </span>
        <span
            class="text-xs text-slate-100 font-mono truncate select-text font-bold"
            title="${String(value)}"
        >
            ${value !== null && value !== undefined ? value : '-'}
        </span>
    </div>
`;

// Use the shared template directly to avoid duplication and missing exports
export const inspectorPanelTemplate = (parsedData) => {
    const {
        interactiveSegmentSelectedItem,
        interactiveSegmentHighlightedItem,
    } = useUiStore.getState();
    const itemWrapper =
        interactiveSegmentSelectedItem || interactiveSegmentHighlightedItem;
    const item = itemWrapper?.item;
    const fieldToHighlight = itemWrapper?.field;

    if (!item) {
        return html`
            <div
                class="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 bg-transparent relative overflow-hidden"
            >
                <!-- Ambient Glow -->
                <div
                    class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] bg-[#3b82f6]/5 rounded-full pointer-events-none animate-pulse-slow mix-blend-screen"
                ></div>

                <div
                    class="mb-6 p-6 bg-white/5 rounded-full border border-white/10 relative z-10 ring-1 ring-white/10 group"
                >
                    <div
                        class="text-emerald-200 scale-150 group-hover:scale-[1.6] transition-transform duration-500"
                    >
                        ${icons.searchCode}
                    </div>
                </div>
                <p
                    class="font-bold text-lg text-slate-100 relative z-10"
                >
                    Select an item to inspect
                </p>
                <p
                    class="text-xs mt-2 max-w-[240px] text-slate-400 opacity-80 relative z-10 font-medium"
                >
                    Click a box in the tree or a byte in the hex view to see
                    details.
                </p>
            </div>
        `;
    }

    if (item.type && allTooltips[item.type]) {
        return html`
            <div
                class="flex flex-col h-full overflow-hidden segment-inspector-panel bg-transparent"
            >
                ${inspectorDetailsTemplate(
                    item,
                    parsedData.data,
                    fieldToHighlight
                )}
            </div>
        `;
    }

    const title = item.type || 'Unknown Item';
    const size = item.size ? `${item.size} bytes` : '-';

    return html`
        <div
            class="flex flex-col h-full overflow-hidden segment-inspector-panel bg-transparent"
        >
            <div
                class="shrink-0 bg-white/5 border-b border-white/10 p-4 z-10"
            >
                <div class="flex items-start justify-between mb-2">
                    <h2
                        class="text-lg font-bold text-slate-100 font-mono flex items-center gap-2"
                    >
                        ${title}
                    </h2>
                    <span
                        class="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-mono text-slate-400 font-bold"
                    >
                        ${size}
                    </span>
                </div>
            </div>
            <div class="p-4 space-y-4 overflow-y-auto custom-scrollbar">
                <div class="grid grid-cols-2 gap-3">
                    ${infoCard('Offset', item.offset, icons.binary, 'half')}
                    ${item.pid
                        ? infoCard('PID', item.pid, icons.tag, 'half')
                        : ''}
                </div>
                ${item.payloadType
                    ? infoCard('Payload', item.payloadType, icons.box)
                    : ''}
            </div>
        </div>
    `;
};
