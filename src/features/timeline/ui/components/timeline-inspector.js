import { uiActions, useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { html } from 'lit-html';

// Improved recursive renderer that handles arrays and nested objects cleanly
const renderRowContent = (key, value, depth = 0) => {
    if (value === null || value === undefined) return '';

    // Handle arrays by iterating
    if (Array.isArray(value)) {
        if (value.length === 0) return '';
        return html`
            <div
                class="flex flex-col border-b border-slate-800/50 py-1.5 last:border-0"
            >
                <span
                    class="text-xs font-bold text-slate-500 mb-1 ml-${depth *
                    2}"
                    >${key} (${value.length})</span
                >
                <div class="pl-2 border-l border-slate-700/50 ml-${depth * 2}">
                    ${value.map((item, i) =>
                        renderRowContent(`${i}`, item, depth + 1)
                    )}
                </div>
            </div>
        `;
    }

    // Handle nested objects
    if (typeof value === 'object') {
        return html`
            <div
                class="flex flex-col border-b border-slate-800/50 py-1.5 last:border-0"
            >
                <span
                    class="text-xs font-bold text-slate-500 mb-1 ml-${depth *
                    2}"
                    >${key}</span
                >
                <div class="pl-2 border-l border-slate-700/50 ml-${depth * 2}">
                    ${Object.entries(value).map(([k, v]) =>
                        renderRowContent(k, v, depth + 1)
                    )}
                </div>
            </div>
        `;
    }

    // Handle Primitive Values
    return html`
        <div
            class="flex justify-between items-baseline py-1.5 border-b border-slate-800 last:border-0 group ml-${depth *
            2}"
        >
            <span
                class="text-xs font-medium text-slate-500 group-hover:text-slate-400 transition-colors"
                >${key}</span
            >
            <span
                class="text-xs text-slate-200 text-right truncate max-w-[200px] select-all"
                title="${value}"
            >
                ${value}
            </span>
        </div>
    `;
};

export const timelineInspectorTemplate = () => {
    const { timelineSelectedItem } = useUiStore.getState();

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

    let content = html``;

    if (type === 'segment') {
        content = html`
            ${renderRowContent('Number', `#${data.number}`)}
            ${renderRowContent('Start (PTS)', data.time)}
            ${renderRowContent('Duration', data.duration)}
            ${renderRowContent('URL', data.url.split('/').pop())}
        `;
    } else if (type === 'period') {
        content = html`
            ${renderRowContent('ID', data.id)}
            ${renderRowContent('Start', originalStart?.toFixed(4))}
            ${renderRowContent(
                'Duration',
                duration ? duration.toFixed(4) : 'Unknown'
            )}
        `;
    } else if (type === 'ad') {
        content = html`
            ${renderRowContent('ID', data.id)}
            ${renderRowContent('Method', data.detectionMethod)}
            ${renderRowContent('Duration', duration?.toFixed(2))}
        `;
    } else if (type === 'event' || type === 'hls-daterange') {
        const messageData = timelineSelectedItem.data?.messageData;
        const otherData = { ...timelineSelectedItem.data };
        delete otherData.messageData;

        // SCTE-35 is often in scte35 property
        if (otherData.scte35) {
            // Render SCTE-35 first as it is most important
            content = html`
                ${renderRowContent('SCTE-35 Signal', otherData.scte35)}
                ${Object.entries(otherData)
                    .filter(([k]) => k !== 'scte35')
                    .map(([k, v]) => renderRowContent(k, v))}
            `;
        } else {
            content = html`
                ${Object.entries(otherData).map(([k, v]) =>
                    renderRowContent(k, v)
                )}
                ${messageData
                    ? html`
                          <div class="mt-2 pt-2 border-t border-slate-700">
                              <span
                                  class="text-[10px] font-bold text-blue-400 uppercase tracking-wider block mb-1"
                                  >Event Payload</span
                              >
                              ${renderRowContent('Data', messageData)}
                          </div>
                      `
                    : ''}
            `;
        }
    } else {
        // Fallback
        content = html`
            ${Object.entries(data)
                .filter(([k]) => k !== '_raw')
                .map(([k, v]) => renderRowContent(k, v))}
        `;
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
                    <span
                        class="font-bold text-sm text-white truncate max-w-[150px]"
                        >${label}</span
                    >
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
            <div class="p-4 overflow-y-auto custom-scrollbar">${content}</div>
        </div>
    `;
};
