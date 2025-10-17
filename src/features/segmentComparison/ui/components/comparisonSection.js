import { html } from 'lit-html';
import { comparisonRowTemplate } from './comparisonRow.js';
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
    const { segmentComparisonHideSame } = useUiStore.getState();

    const genericWarningIcon = sectionData.isGeneric ? html`
        <span class="ml-2 text-yellow-400 ${tooltipTriggerClasses}" data-tooltip="This is a basic, field-by-field comparison. No deep semantic analysis was performed for this box type.">
            ${icons.debug}
        </span>
    ` : '';

    return html`
        <div class="mt-4">
            <div class="flex justify-between items-center mb-2">
                 <h3 class="text-xl font-bold text-gray-200 flex items-center">
                    ${sectionData.title}
                    ${genericWarningIcon}
                 </h3>
                 ${(sectionData.title === 'ftyp (File Type)' || sectionData.title === 'styp (Segment Type)') ? html`
                    <div class="flex items-center gap-2">
                        <label for="hide-same-toggle" class="text-sm text-gray-400">Hide identical rows</label>
                        <button
                            @click=${() => uiActions.toggleSegmentComparisonHideSame()}
                            role="switch"
                            aria-checked="${segmentComparisonHideSame}"
                            id="hide-same-toggle"
                            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${segmentComparisonHideSame ? 'bg-blue-600' : 'bg-gray-600'}"
                        >
                            <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${segmentComparisonHideSame ? 'translate-x-6' : 'translate-x-1'}"></span>
                        </button>
                    </div>
                 ` : ''}
            </div>
            <div class="border border-gray-700 rounded-lg overflow-hidden">
                ${sectionData.rows.map(row => comparisonRowTemplate(row, numColumns))}
            </div>
        </div>
    `;
};