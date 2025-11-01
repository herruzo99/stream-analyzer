import { html } from 'lit-html';
import { comparisonRowTemplate } from './comparison-row.js';
import { useUiStore } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { tooltipTriggerClasses } from '@/ui/shared/constants';
import './abr-ladder-chart.js';

/**
 * Renders a section of comparison rows with a title.
 * @param {object} sectionData - The data for the section.
 * @param {number} numColumns - The total number of segment columns.
 * @param {boolean} hideSameRows - Whether to hide identical rows.
 * @returns {import('lit-html').TemplateResult}
 */
export const comparisonSectionTemplate = (
    sectionData,
    numColumns,
    hideSameRows
) => {
    const rowsToRender = hideSameRows
        ? sectionData.points.filter((p) => p.status !== 'same')
        : sectionData.points;

    if (
        rowsToRender.length === 0 &&
        (!sectionData.abrData ||
            sectionData.abrData.every((d) => d.tracks.length === 0))
    ) {
        return html``;
    }

    const genericWarningIcon = sectionData.isGeneric
        ? html`
              <span
                  class="ml-2 text-yellow-400 ${tooltipTriggerClasses}"
                  data-tooltip="This is a basic, field-by-field comparison. No deep semantic analysis was performed for this box type."
              >
                  ${icons.debug}
              </span>
          `
        : '';

    return html`
        <div class="bg-gray-800 rounded-lg border border-gray-700 mt-6">
            <h3
                class="text-xl font-bold p-4 border-b border-gray-700 flex items-center"
            >
                ${sectionData.title} ${genericWarningIcon}
            </h3>
            ${sectionData.abrData
                ? html`<div class="p-4 h-80">
                      <abr-ladder-chart
                          .data=${sectionData.abrData}
                      ></abr-ladder-chart>
                  </div>`
                : ''}
            <div class="divide-y divide-gray-700">
                ${rowsToRender.map((point) =>
                    comparisonRowTemplate(point, numColumns)
                )}
            </div>
        </div>
    `;
};
