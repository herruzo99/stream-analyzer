import { html } from 'lit-html';
import { useUiStore, uiActions } from '@/state/uiStore';
import { eventBus } from '@/application/event-bus';
import * as icons from '@/ui/icons';

const getOverallStatus = (results) => {
    if (!results || results.length === 0) {
        return {
            text: 'Not Run',
            color: 'text-gray-400',
            errors: 0,
            warnings: 0,
        };
    }

    const errors = results.filter((r) => r.status === 'fail').length;
    const warnings = results.filter((r) => r.status === 'warn').length;

    if (errors > 0) {
        return { text: 'Fail', color: 'text-red-400', errors, warnings };
    }
    if (warnings > 0) {
        return { text: 'Warning', color: 'text-yellow-400', errors, warnings };
    }
    return { text: 'Pass', color: 'text-green-400', errors, warnings };
};

const resultRowTemplate = (result) => {
    const statusClasses = {
        pass: 'text-green-400',
        fail: 'text-red-400',
        warn: 'text-yellow-400',
        info: 'text-blue-400',
    };
    const icon = {
        pass: '✓',
        fail: '✗',
        warn: '⚠️',
        info: 'ℹ',
    };
    return html`
        <tr class="hover:bg-gray-700/50">
            <td class="p-2 border-t border-gray-700 w-16 text-center">
                <span class="${statusClasses[result.status]} font-bold"
                    >${icon[result.status]}</span
                >
            </td>
            <td class="p-2 border-t border-gray-700 text-gray-300">
                ${result.text}
            </td>
            <td class="p-2 border-t border-gray-700 text-gray-400 break-words">
                ${result.details}
            </td>
        </tr>
    `;
};

export const cmafValidationSummaryTemplate = (stream) => {
    const results = stream.semanticData?.get('cmafValidation');
    const status = stream.semanticData?.get('cmafValidationStatus');

    const notCmafResult = results?.find(
        (r) => r.id === 'CMAF-BRAND' && r.status === 'fail'
    );

    if (notCmafResult) {
        return html`
            <div>
                <h3 class="text-xl font-bold mb-4">CMAF Conformance</h3>
                <div class="bg-gray-800 p-4 rounded-lg border border-gray-700">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-sm font-medium text-gray-400"
                            >Overall Status</span
                        >
                        <span class="text-lg font-bold text-gray-500"
                            >Not Applicable</span
                        >
                    </div>
                    <div
                        class="text-center text-sm text-gray-400 p-4 bg-gray-900/50 rounded-md"
                    >
                        <p>${notCmafResult.details}</p>
                    </div>
                </div>
            </div>
        `;
    }

    const overallStatus = getOverallStatus(results);
    const { isCmafSummaryExpanded } = useUiStore.getState();

    const toggleExpand = () => {
        uiActions.toggleCmafSummary();
    };

    const handleRunCheck = () => {
        eventBus.dispatch('ui:cmaf-validation-requested', { stream });
    };

    let mainAction;
    if (status === 'pending') {
        mainAction = html`<button
            disabled
            class="w-full bg-gray-600 text-white font-bold py-2 px-4 rounded-md flex items-center justify-center gap-2"
        >
            ${icons.spinner} Running Check...
        </button>`;
    } else if (status === 'complete' || status === 'error') {
        mainAction = html`<button
            @click=${toggleExpand}
            class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-300"
        >
            ${isCmafSummaryExpanded ? 'Hide Details' : 'View Details'}
        </button>`;
    } else {
        mainAction = html`<button
            @click=${handleRunCheck}
            class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-300"
        >
            Run CMAF Conformance Check
        </button>`;
    }

    return html`
        <div>
            <h3 class="text-xl font-bold mb-4">CMAF Conformance</h3>
            <div class="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <div class="flex justify-between items-center mb-4">
                    <span class="text-sm font-medium text-gray-400"
                        >Overall Status</span
                    >
                    <span class="text-lg font-bold ${overallStatus.color}"
                        >${overallStatus.text}</span
                    >
                </div>

                <div class="flex justify-around text-center mb-4">
                    <div>
                        <div class="text-2xl font-bold text-red-400">
                            ${overallStatus.errors}
                        </div>
                        <div class="text-xs text-gray-400">Errors</div>
                    </div>
                    <div>
                        <div class="text-2xl font-bold text-yellow-400">
                            ${overallStatus.warnings}
                        </div>
                        <div class="text-xs text-gray-400">Warnings</div>
                    </div>
                </div>

                ${mainAction}
                ${isCmafSummaryExpanded && results
                    ? html` <div
                          class="bg-gray-900/50 rounded border border-gray-700/50 overflow-hidden mt-4"
                      >
                          <table class="w-full text-left text-xs table-auto">
                              <thead class="bg-gray-800/50">
                                  <tr>
                                      <th
                                          class="p-2 font-semibold text-gray-400"
                                      >
                                          Status
                                      </th>
                                      <th
                                          class="p-2 font-semibold text-gray-400"
                                      >
                                          Check
                                      </th>
                                      <th
                                          class="p-2 font-semibold text-gray-400"
                                      >
                                          Details
                                      </th>
                                  </tr>
                              </thead>
                              <tbody>
                                  ${results.map(resultRowTemplate)}
                              </tbody>
                          </table>
                      </div>`
                    : ''}
            </div>
        </div>
    `;
};
