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
    const { comparisonHideSameRows, expandedComparisonTables } =
        useUiStore.getState();
    const isTableExpanded = expandedComparisonTables.has(sectionData.title);

    const rowsToRender = comparisonHideSameRows
        ? sectionData.rows.filter((r) => r.status !== 'same')
        : sectionData.rows;

    if (rowsToRender.length === 0 && !sectionData.tableData) {
        return html``;
    }

    const expandButton = sectionData.tableData
        ? html`
              <button
                  @click=${(e) => {
                      e.stopPropagation();
                      uiActions.toggleComparisonTable(sectionData.title);
                  }}
                  class="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors"
                  title="Toggle detailed entry table"
              >
                  ${icons.table}
                  <span>Table</span>
              </button>
          `
        : '';

    return html`
        <div class="bg-slate-800 rounded-lg border border-slate-700 mt-6">
            <h3
                class="text-lg font-bold p-4 border-b border-slate-700 flex items-center text-slate-200"
            >
                ${icons.puzzle}
                <span class="ml-3 font-mono">${sectionData.title}</span>
                ${sectionData.fullName
                    ? html`<span class="ml-2 text-sm font-normal text-slate-400"
                          >(${sectionData.fullName})</span
                      >`
                    : ''}
                <div class="ml-auto">${expandButton}</div>
            </h3>

            ${rowsToRender.length > 0
                ? rowsToRender.map((row) =>
                      comparisonRowTemplate(row, numColumns)
                  )
                : ''}
            ${isTableExpanded
                ? tableComparisonTemplate({
                      tableData: sectionData.tableData,
                      numSegments: numColumns,
                      hideSameRows: comparisonHideSameRows,
                  })
                : ''}
        </div>
    `;
};
