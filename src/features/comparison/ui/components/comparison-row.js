import { html } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { tooltipTriggerClasses } from '@/ui/shared/constants';
import * as icons from '@/ui/icons';

const groupColors = [
    'bg-sky-950/50',
    'bg-teal-950/50',
    'bg-fuchsia-950/50',
    'bg-lime-950/50',
    'bg-rose-950/50',
    'bg-cyan-950/50',
    'bg-violet-950/50',
];

const getCellClass = (item, allValues) => {
    if (item.groupId === -1) {
        return 'bg-slate-800/50 text-slate-500 italic';
    }

    const uniqueGroupCount = new Set(
        allValues.map((v) => v.groupId).filter((id) => id !== -1)
    ).size;

    if (uniqueGroupCount <= 1 && item.groupId !== -1) {
        return 'bg-slate-800';
    }

    return groupColors[item.groupId % groupColors.length];
};

const getRowIcon = (overallStatus) => {
    switch (overallStatus) {
        case 'different':
            return html`<span
                class="text-amber-400 shrink-0"
                title="Values are different across streams"
                >${icons.updates}</span
            >`;
        case 'missing':
            return html`<span
                class="text-red-400 shrink-0"
                title="Value is missing in one or more streams"
                >${icons.xCircle}</span
            >`;
        default: // 'same'
            return html`<span
                class="text-green-500/50 shrink-0"
                title="Values are the same across all streams"
                >${icons.checkCircle}</span
            >`;
    }
};

export const comparisonRowTemplate = (comparisonPoint) => {
    const { label, tooltip, isoRef, values, status } = comparisonPoint;
    const hasTooltip = tooltip || isoRef;

    return html`<tr>
        <td
            class="font-medium text-slate-300 p-3 bg-slate-800 rounded-l-lg border-y border-l border-slate-700"
        >
            <div
                class="flex items-start gap-2 ${hasTooltip
                    ? tooltipTriggerClasses
                    : ''}"
                data-tooltip="${tooltip}"
                data-iso="${isoRef}"
            >
                ${getRowIcon(status)}
                <span class="grow">${label}</span>
            </div>
        </td>
        ${values.map(
            (item, index) => html`
                <td
                    class="p-3 font-mono text-xs wrap-break-word border-y border-slate-700 ${getCellClass(
                        item,
                        values
                    )} ${index === values.length - 1
                        ? 'rounded-r-lg border-r'
                        : ''}"
                >
                    ${unsafeHTML(item.value)}
                </td>
            `
        )}
    </tr>`;
};