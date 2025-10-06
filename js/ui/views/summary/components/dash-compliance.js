import { html } from 'lit-html';
import { storeActions } from '../../../../core/store.js';

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

export const dashComplianceSummaryTemplate = (stream) => {
    const results = stream.manifestUpdates[0]?.complianceResults;
    const overallStatus = getOverallStatus(results);

    const handleViewReportClick = () => {
        storeActions.setActiveTab('compliance');
    };

    return html`
        <div>
            <h3 class="text-xl font-bold mb-4">DASH-IF Compliance</h3>
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

                <button
                    @click=${handleViewReportClick}
                    class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-300"
                >
                    View Full Report
                </button>
            </div>
        </div>
    `;
};