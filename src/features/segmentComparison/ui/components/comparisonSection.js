import { html } from 'lit-html';
import { comparisonRowTemplate } from './comparisonRow.js';
import { tableComparisonTemplate } from './tableComparison.js';
import { useUiStore, uiActions } from '@/state/uiStore';
import * as icons from '@/ui/icons';
import { tooltipTriggerClasses } from '@/ui/shared/constants';

/**
 * Renders a section of comparison rows with a title.
 * @param {object} sectionData - The data for the section.
 * @param {number} numColumns - The total number of segment columns.
 * @returns {import('lit-html').TemplateResult}
 */
export const comparisonSectionTemplate = (sectionData, numColumns) => {
    const { segmentComparisonHideSame, expandedComparisonTables } =
        useUiStore.getState();
    const isTableExpanded = expandedComparisonTables.has(sectionData.title);

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

    const expandButton = sectionData.tableData
        ? html`
              <button
                  @click=${() =>
                      uiActions.toggleComparisonTable(sectionData.title)}
                  class="ml-4 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors"
                  title="Toggle detailed entry table"
              >
                  <span>Table</span>
                  <svg
                      class="w-3 h-3 transition-transform ${isTableExpanded
                          ? 'rotate-180'
                          : ''}"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                  >
                      <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M19 9l-7 7-7-7"
                      ></path>
                  </svg>
              </button>
          `
        : '';

    return html`
        <div class="mt-4">
            <div class="flex justify-between items-center mb-2">
                <h3 class="text-xl font-bold text-gray-200 flex items-center">
                    ${sectionData.title} ${genericWarningIcon} ${expandButton}
                </h3>
            </div>
            <div class="border border-gray-700 rounded-lg overflow-hidden">
                ${sectionData.rows.map((row) =>
                    comparisonRowTemplate(row, numColumns)
                )}
            </div>
            ${isTableExpanded
                ? tableComparisonTemplate({
                      tableData: sectionData.tableData,
                      numSegments: numColumns,
                      hideSameRows: segmentComparisonHideSame,
                  })
                : ''}
        </div>
    `;
};
