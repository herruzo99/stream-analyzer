import { html } from 'lit-html';
import * as icons from '@/ui/icons';
import { uiActions } from '@/state/uiStore';

const row = (label, value, isCode = false) => html`
    <div
        class="flex justify-between items-baseline py-1.5 border-b border-slate-800 last:border-0 group"
    >
        <span
            class="text-xs font-medium text-slate-500 group-hover:text-slate-400 transition-colors"
            >${label}</span
        >
        <span
            class="text-xs ${isCode
                ? 'font-mono text-cyan-400'
                : 'text-slate-200'} text-right truncate max-w-[200px]"
            title="${value}"
        >
            ${value}
        </span>
    </div>
`;

export const timelineInspectorTemplate = () => {
    // We use require to avoid circular dependencies if uiStore imports this file (though it shouldn't)
    // But strictly following the previous pattern:
    const { timelineSelectedItem } =
        require('@/state/uiStore').useUiStore.getState();

    if (!timelineSelectedItem) {
        return html`
            <div
                class="h-full flex flex-col items-center justify-center p-8 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/30"
            >
                <div class="text-slate-600 mb-2">${icons.search}</div>
                <span class="text-xs font-medium text-slate-500"
                    >Select an item to inspect</span
                >
            </div>
        `;
    }

    const { type, label, data, originalStart, duration } = timelineSelectedItem;

    // Extract relevant properties based on type to avoid dumping everything
    let properties = [];

    if (type === 'segment') {
        // data.time and data.duration are already formatted strings from the ViewModel
        properties = [
            { k: 'Number', v: `#${data.number}` },
            { k: 'Start (PTS)', v: data.time, code: true },
            { k: 'Duration', v: data.duration, code: true },
            { k: 'URL', v: data.url.split('/').pop(), code: true },
        ];
    } else if (type === 'period') {
        properties = [
            { k: 'ID', v: data.id },
            { k: 'Start', v: originalStart?.toFixed(4) },
            { k: 'Duration', v: duration ? duration.toFixed(4) : 'Unknown' },
        ];
    } else if (type === 'ad') {
        properties = [
            { k: 'ID', v: data.id },
            { k: 'Method', v: data.detectionMethod },
            { k: 'Duration', v: duration?.toFixed(2) },
        ];
    } else {
        // Fallback for generic items
        properties = Object.entries(data)
            .filter(([k]) => typeof data[k] !== 'object' && k !== '_raw')
            .map(([k, v]) => ({ k, v }));
    }

    return html`
        <div
            class="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col h-full"
        >
            <div
                class="p-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between"
            >
                <div class="flex items-center gap-2">
                    <div class="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span class="font-bold text-sm text-white">${label}</span>
                    <span
                        class="text-[10px] uppercase tracking-wider font-bold text-slate-500 border border-slate-600 px-1.5 rounded"
                        >${type}</span
                    >
                </div>
                <button
                    @click=${() => uiActions.setTimelineSelectedItem(null)}
                    class="text-slate-500 hover:text-white transition-colors"
                >
                    ${icons.xCircle}
                </button>
            </div>
            <div class="p-4 overflow-y-auto custom-scrollbar">
                ${properties.map((p) => row(p.k, p.v, p.code))}
            </div>
        </div>
    `;
};
