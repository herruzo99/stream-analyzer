import { html } from 'lit-html';
import { comparisonRowTemplate } from './comparison-row.js';
import * as icons from '@/ui/icons';

const categoryIcons = {
    General: icons.summary,
    'Video Details': icons.clapperboard,
    'Audio Details': icons.audioLines,
    Security: icons.shieldCheck,
    Compliance: icons.compliance,
    'Feature Usage': icons.features,
};

export const comparisonSectionTemplate = (
    sectionData,
    numColumns,
    hideSameRows,
    hideUnusedFeatures
) => {
    let rowsToRender = sectionData.points;

    if (hideSameRows) {
        rowsToRender = rowsToRender.filter((p) => p.status !== 'same');
    }

    if (hideUnusedFeatures && sectionData.title === 'Feature Usage') {
        rowsToRender = rowsToRender.filter((p) => p.isUsedByAny);
    }

    if (rowsToRender.length === 0) {
        return html``;
    }

    const icon = categoryIcons[sectionData.title] || icons.puzzle;

    return html`
        <tr class="h-6"></tr>
        <tr>
            <th
                class="text-lg font-bold p-4 text-left flex items-center gap-3 text-slate-200 bg-slate-800 rounded-l-lg border-y border-l border-slate-700"
            >
                ${icon}
                <span>${sectionData.title}</span>
            </th>
            <td
                class="bg-slate-800 rounded-r-lg border-y border-r border-slate-700"
                colspan=${numColumns}
            ></td>
        </tr>
        ${rowsToRender.map((point) => comparisonRowTemplate(point))}
    `;
};
