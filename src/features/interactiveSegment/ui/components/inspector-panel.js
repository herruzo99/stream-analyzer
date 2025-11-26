import { html } from 'lit-html';
import { useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { inspectorDetailsTemplate } from '@/ui/shared/isobmff-renderer';
import { getTooltipData } from '@/infrastructure/parsing/isobmff/index';

const allTooltips = getTooltipData();

const infoCard = (label, value, icon = null, width = 'full') => html`
    <div
        class="bg-slate-800/40 rounded border border-slate-700/50 p-2.5 flex flex-col ${width ===
        'half'
            ? 'col-span-1'
            : 'col-span-2'}"
    >
        <span
            class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"
        >
            ${icon} ${label}
        </span>
        <span
            class="text-xs text-slate-200 font-mono truncate select-text"
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
                class="h-full flex flex-col items-center justify-center text-center p-8 text-slate-600 bg-slate-950/30"
            >
                <div
                    class="mb-4 p-4 bg-slate-800/30 rounded-full border border-slate-800 shadow-inner"
                >
                    ${icons.searchCode}
                </div>
                <p class="font-medium text-sm text-slate-400">
                    Select an item to inspect
                </p>
                <p class="text-xs mt-2 max-w-[200px] text-slate-500">
                    Click a box in the tree or a byte in the hex view to see
                    details.
                </p>
            </div>
        `;
    }

    if (item.type && allTooltips[item.type]) {
        return html`
            <div
                class="flex flex-col h-full overflow-hidden segment-inspector-panel bg-slate-950/30 border-l border-slate-800/50"
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
            class="flex flex-col h-full overflow-hidden segment-inspector-panel bg-slate-950/30 border-l border-slate-800/50"
        >
            <div
                class="shrink-0 bg-slate-900 border-b border-slate-800 p-4 shadow-sm"
            >
                <div class="flex items-start justify-between mb-2">
                    <h2
                        class="text-lg font-bold text-white font-mono tracking-tight"
                    >
                        ${title}
                    </h2>
                    <span
                        class="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-400"
                    >
                        ${size}
                    </span>
                </div>
            </div>
            <div class="p-4 space-y-4">
                <div class="grid grid-cols-2 gap-2">
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
