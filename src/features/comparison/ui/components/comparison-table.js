import { uiActions } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { tooltipTriggerClasses } from '@/ui/shared/constants';
import { html } from 'lit-html';

const getStreamHeader = (target, isReference) => {
    const refButtonClasses = isReference
        ? 'bg-[#60a5fa] text-slate-100 cursor-default shadow-[0_0_15px_#3b82f6] ring-1 ring-blue-500/50'
        : 'bg-slate-800 text-slate-400 hover:text-blue-400 hover:bg-slate-800 hover:scale-[1.02] transition-all duration-200 rounded-xl';

    return html`
        <div
            class="flex flex-col p-4 gap-3 min-w-0 relative group h-full justify-end rounded-xl"
        >
            ${isReference
            ? html`
                      <div
                          class="absolute top-2 left-1/2 -translate-x-1/2 bg-[#60a5fa] text-slate-100 text-[9px] font-bold px-2 py-0.5 rounded-full shadow-[0_0_10px_#3b82f6] z-20 tracking-wider border border-blue-500/30"
                      >
                          REFERENCE
                      </div>
                  `
            : ''}
            <div class="flex items-center justify-between gap-2">
                <h3
                    class="font-bold text-slate-100 truncate text-sm tracking-tight group-hover:text-slate-100 transition-colors"
                    title="${target.streamName}"
                >
                    ${target.streamName}
                </h3>
                <button
                    @click=${() => {
            // Extract stream ID from composite ID if needed, or UI store handles it
            // Ideally, we set the composite ID as reference, but UI store expects streamId
            // For now, we toggle reference based on the stream ID part
            const streamId = parseInt(target.id.split('::')[0]);
            uiActions.setComparisonReferenceStreamId(
                isReference ? null : streamId
            );
        }}
                    class="shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${refButtonClasses}"
                    title="${isReference
            ? 'Unset Reference'
            : 'Set as Reference'}"
                >
                    ${icons.star}
                </button>
            </div>

            <!-- Variant Sub-header -->
            <div class="flex items-center gap-2">
                <span
                    class="px-2 py-0.5 rounded-md bg-slate-800/30 border border-slate-800 text-[10px] font-mono text-blue-400 shadow-inner"
                >
                    ${target.label}
                </span>
                <span
                    class="text-[10px] text-slate-400 truncate max-w-[100px] font-medium"
                    title="${target.subLabel}"
                >
                    ${target.subLabel}
                </span>
            </div>

            <div class="flex gap-2 mt-1">
                <span
                    class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-900/10 text-slate-400 font-mono"
                >
                    ${target.id}
                </span>
            </div>
        </div>
    `;
};

const renderCell = (cellData, isReferenceRow) => {
    const statusClasses = {
        match: isReferenceRow
            ? 'bg-blue-500/10 text-slate-100'
            : 'text-slate-400',
        diff: 'bg-red-500/10 text-red-400 font-medium shadow-[inset_0_0_10px_rgba(239,68,68,0.05)]',
        missing:
            'bg-slate-900/10 text-slate-400 italic',
        neutral: 'text-slate-400',
    };

    const cellClass = statusClasses[cellData.status] || statusClasses.neutral;

    // Reference column always gets a subtle highlight
    const refClass = isReferenceRow
        ? 'bg-blue-500/5 border-x border-blue-500/10'
        : '';

    return html`
        <div
            class="p-3 flex items-center text-xs break-all rounded-lg ${cellClass} ${refClass} transition-colors hover:bg-slate-100/[0.05]"
        >
            ${cellData.displayValue}
        </div>
    `;
};

export const comparisonTableTemplate = ({
    targetHeaders,
    sections,
    referenceCompositeId,
    hideSameRows,
}) => {
    // CSS Grid Template: First column fixed (140px on mobile, 220px on desktop), rest split equally
    // Using minmax to ensure columns don't get too small, forcing horizontal scroll
    const gridStyle = `
        display: grid;
        grid-template-columns: minmax(140px, 220px) repeat(${targetHeaders.length}, minmax(180px, 1fr));
        gap: 6px;
        padding: 6px;
    `;

    return html`
        <div
            class="layout-card w-full h-full relative bg-slate-800"
        >
            <div class="layout-body p-0 custom-scrollbar">
                <div style="${gridStyle}" class="min-w-fit">
                    <!-- Top-Left Corner -->
                    <div
                        class="sticky top-0 left-0 z-40 rounded-xl font-bold text-slate-400 flex items-end pb-4 p-4 shadow-[4px_4px_20px_rgba(0,0,0,0.3)] border border-slate-800/30"
                        style="backdrop-filter: blur(12px); background-color: #1e293b;"
                    >
                        <span
                            class="text-xs uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-slate-400"
                            >Properties</span
                        >
                    </div>

                    <!-- Stream Headers -->
                    ${targetHeaders.map(
        (target) => html`
                            <div
                                class="sticky top-0 z-30 rounded-xl shadow-lg border border-slate-800/30 ${target.id ===
                referenceCompositeId
                ? 'ring-1 ring-blue-500/50'
                : ''}"
                                style="backdrop-filter: blur(12px); background-color: #1e293b; background-image: ${target.id ===
                referenceCompositeId
                ? 'linear-gradient(rgba(59, 130, 246, 0.3), rgba(59, 130, 246, 0.3))'
                : 'none'}"
                            >
                                ${getStreamHeader(
                    target,
                    target.id === referenceCompositeId
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
                            <!-- Section Header (Sticky Left) -->
                            <div
                                class="sticky left-0 z-20 bg-slate-800 backdrop-blur-md rounded-lg py-2.5 px-4 text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2 shadow-sm group mt-4 mb-2 border border-slate-800/20"
                                style="grid-column: 1 / 2; backdrop-filter: blur(12px)"
                            >
                                <span
                                    class="text-blue-400 group-hover:text-[#60a5fa] transition-colors"
                                    >${icons[section.icon] || icons.box}</span
                                >
                                ${section.title}
                            </div>
                            <!-- Section Header (Background Filler) -->
                            <div
                                class="z-10 bg-slate-800/30 backdrop-blur-md rounded-lg mt-4 mb-2"
                                style="grid-column: 2 / -1"
                            ></div>

                            <!-- Rows -->
                            ${visiblePoints.map(
            (point) => html`
                                    <!-- Property Label -->
                                    <div
                                        class="sticky left-0 z-10 bg-slate-800 backdrop-blur-md rounded-lg p-3 flex items-center justify-between group shadow-lg hover:bg-slate-800 transition-colors border border-slate-800/20"
                                        style="backdrop-filter: blur(12px)"
                                    >
                                        <span
                                            class="text-xs font-medium text-slate-400 group-hover:text-slate-100 transition-colors ${point.tooltip
                    ? tooltipTriggerClasses
                    : ''}"
                                            data-tooltip="${point.tooltip || ''}"
                                            data-iso="${point.isoRef || ''}"
                                        >
                                            ${point.label}
                                        </span>
                                        ${point.isDiff
                    ? html`<span
                                                class="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse"
                                                title="Values differ"
                                            ></span>`
                    : ''}
                                    </div>
                                    <!-- Values -->
                                    ${point.values.map((val) =>
                        renderCell(
                            val,
                            val.id === referenceCompositeId
                        )
                    )}
                                `
        )}
                        `;
    })}
                </div>
            </div>
        </div>
    `;
};
