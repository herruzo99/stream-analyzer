import { uiActions } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { tooltipTriggerClasses } from '@/ui/shared/constants';
import { html } from 'lit-html';

const getStreamHeader = (target, isReference) => {
    // Keep the original stream id type: stores use numeric ids and the
    // view resolves targets with strict ===, so a string would orphan
    // the reference. Fall back to the raw split only if unparseable.
    const rawHead = String(target.id).split('::')[0];
    const asInt = parseInt(rawHead, 10);
    const streamId = Number.isNaN(asInt) ? rawHead : asInt;
    return html`
        <div class="flex flex-col gap-1.5 min-w-0 h-full justify-end p-3">
            <div class="flex items-center justify-between gap-2 min-w-0">
                <h3
                    class="font-medium text-[13px] text-slate-100 truncate"
                    title="${target.streamName}"
                >
                    ${target.streamName}
                </h3>
                <button
                    @click=${() => {
                        uiActions.setComparisonReferenceStreamId(
                            isReference ? null : streamId
                        );
                    }}
                    class="shrink-0 p-1 rounded transition-colors ${isReference
                        ? 'text-emerald-300'
                        : 'text-slate-600 hover:text-slate-300'}"
                    title="${isReference
                        ? 'Reference column (click to clear)'
                        : 'Set as reference column'}"
                    aria-label="${isReference
                        ? 'Clear reference column'
                        : `Set ${target.streamName} as reference column`}"
                    aria-pressed=${isReference}
                >
                    ${icons.star}
                </button>
            </div>
            <p
                class="mono text-[10px] text-slate-600 truncate"
                title="${target.subLabel}"
            >
                ${target.label} · ${target.subLabel}
            </p>
        </div>
    `;
};

const renderCell = (cellData, isReferenceRow) => {
    const statusClasses = {
        match: 'text-slate-500',
        diff: 'text-slate-100 bg-red-500/[0.07]',
        missing: 'text-slate-600',
        neutral: 'text-slate-400',
    };
    const cellClass = statusClasses[cellData.status] || statusClasses.neutral;
    const refClass = isReferenceRow ? 'bg-emerald-500/[0.04]' : '';

    return html`
        <div
            class="px-3 py-2 flex items-center text-xs break-words rounded-md ${cellClass} ${refClass}"
            title=${cellData.status === 'diff'
                ? 'Values differ between columns'
                : cellData.status === 'missing'
                  ? 'No value for this column'
                  : ''}
        >
            ${cellData.status === 'diff'
                ? html`<span
                      class="w-1 h-1 rounded-full bg-red-400 shrink-0 mr-2"
                      aria-hidden="true"
                  ></span>`
                : ''}
            <span class="min-w-0">${cellData.displayValue}</span>
        </div>
    `;
};

export const comparisonTableTemplate = ({
    targetHeaders,
    sections,
    referenceCompositeId,
    hideSameRows,
}) => {
    if (!targetHeaders || targetHeaders.length === 0) {
        return html`<p
            class="mono text-[11px] text-slate-600 p-8 text-center"
        >
            No streams selected for comparison.
        </p>`;
    }

    const gridStyle = `
        display: grid;
        grid-template-columns: minmax(140px, 220px) repeat(${targetHeaders.length}, minmax(180px, 1fr));
        gap: 2px;
        padding: 8px;
    `;

    const visibleSections = sections.map((section) => ({
        ...section,
        points: hideSameRows
            ? section.points.filter((p) => p.isDiff)
            : section.points,
    }));
    const totalVisible = visibleSections.reduce(
        (n, s) => n + s.points.length,
        0
    );

    return html`
        <div class="w-full h-full relative bg-[#06090f]">
            <div class="h-full overflow-auto custom-scrollbar">
                <div style="${gridStyle}" class="min-w-fit">
                    <div
                        class="sticky top-0 left-0 z-40 flex items-end pb-2 px-3 bg-[#06090f]"
                    >
                        <span class="mono text-[10px] text-slate-600"
                            >property</span
                        >
                    </div>

                    ${targetHeaders.map(
                        (target) => html`
                            <div
                                class="sticky top-0 z-30 bg-[#06090f] border-b ${target.id ===
                                referenceCompositeId
                                    ? 'border-emerald-400/40'
                                    : 'border-white/5'}"
                            >
                                ${getStreamHeader(
                                    target,
                                    target.id === referenceCompositeId
                                )}
                            </div>
                        `
                    )}
                    ${visibleSections.map((section) => {
                        if (section.points.length === 0) return '';
                        return html`
                            <div
                                class="sticky left-0 z-20 bg-[#06090f] mono text-[11px] font-medium text-slate-400 flex items-center gap-2 py-2 pr-2"
                                style="grid-column: 1 / 2;"
                            >
                                <span
                                    class="text-slate-600 shrink-0"
                                    >${icons[section.icon] || icons.box}</span
                                >
                                <span class="truncate"
                                    >${String(section.title).toLowerCase()}</span
                                >
                            </div>
                            <div
                                class="border-b border-white/5"
                                style="grid-column: 2 / -1"
                                aria-hidden="true"
                            ></div>

                            ${section.points.map(
                                (point) => html`
                                    <div
                                        class="sticky left-0 z-10 bg-[#06090f] px-3 py-2 flex items-center justify-between gap-2"
                                    >
                                        <span
                                            class="text-xs text-slate-400 truncate ${point.tooltip
                                                ? tooltipTriggerClasses
                                                : ''}"
                                            data-tooltip="${point.tooltip ||
                                            ''}"
                                            data-iso="${point.isoRef || ''}"
                                        >
                                            ${point.label}
                                        </span>
                                        ${point.isDiff
                                            ? html`<span
                                                  class="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0"
                                                  title="Values differ"
                                              ></span>`
                                            : ''}
                                    </div>
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
                    ${totalVisible === 0
                        ? html`<p
                              class="mono text-[11px] text-slate-600 p-8 text-center"
                              style="grid-column: 1 / -1"
                          >
                              Every compared row matches — nothing differs.
                          </p>`
                        : ''}
                </div>
            </div>
        </div>
    `;
};
