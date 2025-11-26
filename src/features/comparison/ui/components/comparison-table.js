import { html } from 'lit-html';
import { uiActions } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { tooltipTriggerClasses } from '@/ui/shared/constants';

const getStreamHeader = (stream, isReference) => {
    const refButtonClasses = isReference
        ? 'bg-amber-500 text-black cursor-default'
        : 'bg-slate-700 text-slate-400 hover:text-amber-400 hover:bg-slate-600';

    return html`
        <div
            class="flex flex-col p-4 gap-2 min-w-0 relative group h-full justify-end"
        >
            ${isReference
                ? html`
                      <div
                          class="absolute top-2 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg z-20"
                      >
                          REFERENCE
                      </div>
                  `
                : ''}
            <div class="flex items-center justify-between gap-2">
                <h3
                    class="font-bold text-slate-200 truncate text-sm"
                    title="${stream.name}"
                >
                    ${stream.name}
                </h3>
                <button
                    @click=${() =>
                        uiActions.setComparisonReferenceStreamId(
                            isReference ? null : stream.id
                        )}
                    class="shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all ${refButtonClasses}"
                    title="${isReference
                        ? 'Unset Reference'
                        : 'Set as Reference'}"
                >
                    ${icons.star}
                </button>
            </div>
            <div
                class="text-xs font-mono text-slate-500 truncate"
                title="${stream.originalUrl}"
            >
                ${stream.originalUrl}
            </div>
            <div class="flex gap-2 mt-1">
                <span
                    class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400"
                >
                    ID: ${stream.id}
                </span>
            </div>
        </div>
    `;
};

const renderCell = (cellData, isReferenceRow) => {
    const statusClasses = {
        match: isReferenceRow
            ? 'bg-amber-900/10 text-slate-300'
            : 'text-slate-300',
        diff: 'bg-red-900/20 text-red-200 font-medium',
        missing: 'bg-slate-800/50 text-slate-500 italic',
        neutral: 'text-slate-300',
    };

    const cellClass = statusClasses[cellData.status] || statusClasses.neutral;

    // Reference column always gets a subtle highlight
    const refClass = isReferenceRow
        ? 'bg-amber-900/5 border-x-2 border-amber-500/20'
        : '';

    return html`
        <div
            class="p-3 flex items-center text-xs break-all border-b border-slate-800 ${cellClass} ${refClass}"
        >
            ${cellData.displayValue}
        </div>
    `;
};

export const comparisonTableTemplate = ({
    streams,
    sections,
    referenceStreamId,
    hideSameRows,
}) => {
    // CSS Grid Template: First column fixed (200px), rest split equally
    const gridStyle = `
        display: grid;
        grid-template-columns: 220px repeat(${streams.length}, minmax(200px, 1fr));
    `;

    return html`
        <!-- 
             ARCHITECTURAL FIX: 
             We set 'h-full' and 'overflow-auto' here to make THIS container the scroll parent.
             This ensures 'sticky' inside the grid works relative to this box, keeping headers
             visible as you scroll down, and the first column visible as you scroll right.
        -->
        <div
            class="w-full h-full overflow-auto rounded-xl border border-slate-700 bg-slate-900 shadow-2xl custom-scrollbar relative"
        >
            <div style="${gridStyle}" class="min-w-fit">
                <!-- Header Row -->
                <!-- Top-Left Corner: Sticky on both axes (z-index 40) -->
                <div
                    class="sticky top-0 left-0 z-40 bg-slate-900 border-b border-slate-700 border-r font-bold text-slate-400 flex items-end pb-4 p-4 shadow-[4px_4px_10px_rgba(0,0,0,0.2)]"
                >
                    PROPERTIES
                </div>

                <!-- Stream Headers: Sticky Top (z-index 30) -->
                ${streams.map(
                    (stream) => html`
                        <div
                            class="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 shadow-[0_4px_10px_rgba(0,0,0,0.1)] ${stream.id ===
                            referenceStreamId
                                ? 'bg-amber-900/10'
                                : ''}"
                        >
                            ${getStreamHeader(
                                stream,
                                stream.id === referenceStreamId
                            )}
                        </div>
                    `
                )}

                <!-- Data Rows -->
                ${sections.map((section) => {
                    const visiblePoints = hideSameRows
                        ? section.points.filter((p) => p.isDiff)
                        : section.points;

                    if (visiblePoints.length === 0) return '';

                    return html`
                        <!-- Section Header: Sticky Left (z-index 20) - Acts as a separator -->
                        <div
                            class="col-span-full sticky left-0 z-20 bg-slate-800/90 backdrop-blur border-y border-slate-700 py-2 px-4 text-xs font-bold text-blue-300 uppercase tracking-wider flex items-center gap-2 shadow-sm"
                        >
                            ${icons[section.icon] || icons.box} ${section.title}
                        </div>

                        <!-- Rows -->
                        ${visiblePoints.map(
                            (point) => html`
                                <!-- Property Label: Sticky Left (z-index 10) -->
                                <div
                                    class="sticky left-0 z-10 bg-slate-900 border-b border-slate-800 border-r p-3 flex items-center justify-between group shadow-[4px_0_10px_rgba(0,0,0,0.1)]"
                                >
                                    <span
                                        class="text-xs font-medium text-slate-300 ${point.tooltip
                                            ? tooltipTriggerClasses
                                            : ''}"
                                        data-tooltip="${point.tooltip || ''}"
                                        data-iso="${point.isoRef || ''}"
                                    >
                                        ${point.label}
                                    </span>
                                    ${point.isDiff
                                        ? html`<span
                                              class="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.5)]"
                                              title="Values differ"
                                          ></span>`
                                        : ''}
                                </div>
                                <!-- Values -->
                                ${point.values.map((val) =>
                                    renderCell(
                                        val,
                                        val.streamId === referenceStreamId
                                    )
                                )}
                            `
                        )}
                    `;
                })}
            </div>
        </div>
    `;
};
