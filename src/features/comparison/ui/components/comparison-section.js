import { html } from 'lit-html';
import { comparisonRowTemplate } from './comparison-row.js';
import * as icons from '@/ui/icons';
import './abr-ladder-chart.js';

const categoryIcons = {
    General: icons.summary,
    'Video Details': icons.clapperboard,
    'Audio Details': icons.audioLines,
    Security: icons.shieldCheck,
};

export const comparisonSectionTemplate = (
    sectionData,
    numColumns,
    hideSameRows
) => {
    const rowsToRender = hideSameRows
        ? sectionData.points.filter((p) => p.status !== 'same')
        : sectionData.points;

    const hasContent =
        rowsToRender.length > 0 ||
        (sectionData.abrData &&
            !sectionData.abrData.every((d) => d.tracks.length === 0));

    if (!hasContent) {
        return html``;
    }

    const icon = categoryIcons[sectionData.title] || icons.puzzle;
    const gridStyle = `grid-template-columns: 250px repeat(${numColumns}, minmax(200px, 1fr));`;

    return html`
        <div class="bg-slate-800 rounded-lg border border-slate-700 mt-6">
            <h3
                class="text-lg font-bold p-4 border-b border-slate-700 flex items-center gap-3 text-slate-200"
            >
                ${icon}
                <span>${sectionData.title}</span>
            </h3>
            ${sectionData.abrData
                ? html`<div class="p-4 h-80 border-b border-slate-700">
                      <abr-ladder-chart
                          .data=${sectionData.abrData}
                      ></abr-ladder-chart>
                  </div>`
                : ''}
            ${rowsToRender.length > 0
                ? html` <div
                      class="grid divide-y divide-slate-700"
                      style=${gridStyle}
                  >
                      ${rowsToRender.map((point) =>
                          comparisonRowTemplate(point, numColumns)
                      )}
                  </div>`
                : ''}
        </div>
    `;
};
