import { html } from 'lit-html';
import { runChecks } from '../api/compliance.js';

// --- STATE ---
// Keep track of the active filter at the module level to persist between re-renders.
let activeFilter = 'all';

// --- EVENT LISTENERS ---
/**
 * Attaches click event listeners to the filter buttons.
 * This needs to be called after each render because the buttons are part of the template.
 */
export function attachComplianceFilterListeners() {
    const container = document.getElementById('tab-compliance');

    container.addEventListener('click', (e) => {
        const button = /** @type {HTMLElement} */ (e.target).closest(
            '.compliance-filter-btn'
        );
        if (!button) return;

        activeFilter = /** @type {HTMLElement} */ (button).dataset.filter;

        // A simple and efficient way to apply the filter without a full re-render
        const allRows = container.querySelectorAll(
            '.compliance-report-table tbody tr'
        );
        allRows.forEach((row) => {
            /** @type {HTMLElement} */ (row).style.display =
                activeFilter === 'all' ||
                row.classList.contains(`status-${activeFilter}`)
                    ? 'table-row'
                    : 'none';
        });

        // Update active state on buttons
        container.querySelectorAll('.compliance-filter-btn').forEach((btn) => {
            btn.classList.toggle(
                'filter-active',
                /** @type {HTMLElement} */ (btn).dataset.filter === activeFilter
            );
        });
    });
}

// --- TEMPLATES ---
const complianceRowTemplate = (item) => {
    const icons = {
        pass: { icon: '✔', color: 'text-green-400', title: 'Passed' },
        fail: { icon: '✖', color: 'text-red-400', title: 'Error' },
        warn: { icon: '⚠', color: 'text-yellow-400', title: 'Warning' },
        info: { icon: 'ℹ', color: 'text-blue-400', title: 'Info' },
    };
    const status = icons[item.status] || {
        icon: '?',
        color: 'text-gray-400',
        title: 'Unknown',
    };

    return html`
        <tr
            class="compliance-row status-${item.status}"
            style="display: ${activeFilter === 'all' ||
            activeFilter === item.status
                ? 'table-row'
                : 'none'}"
        >
            <td class="p-3 text-center w-20">
                <span
                    class="${status.color} font-bold text-lg"
                    title="${status.title}"
                    >${status.icon}</span
                >
            </td>
            <td class="p-3">
                <p class="font-semibold text-gray-200">${item.text}</p>
                <p class="text-xs text-gray-400 mt-1">${item.details}</p>
            </td>
            <td class="p-3 text-xs text-gray-500 font-mono w-40 text-right">
                ${item.isoRef}
            </td>
        </tr>
    `;
};

const categoryTemplate = (category, items) => html`
    <div class="mt-8">
        <h4 class="text-lg font-semibold text-gray-300 mb-3">${category}</h4>
        <div
            class="bg-gray-800 rounded-lg overflow-hidden border border-gray-700"
        >
            <table class="compliance-report-table w-full text-left">
                <thead class="bg-gray-900/50">
                    <tr>
                        <th
                            class="p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-center"
                        >
                            Status
                        </th>
                        <th
                            class="p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider"
                        >
                            Description
                        </th>
                        <th
                            class="p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right"
                        >
                            Spec Ref.
                        </th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-700">
                    ${items.map((item) => complianceRowTemplate(item))}
                </tbody>
            </table>
        </div>
    </div>
`;

const renderReportForChecks = (checks) => {
    const counts = { pass: 0, warn: 0, fail: 0, info: 0 };
    checks.forEach(
        (check) => (counts[check.status] = (counts[check.status] || 0) + 1)
    );

    const groupedChecks = groupChecks(checks);

    return html`
        <h3 class="text-xl font-bold mb-2">
            Compliance & Best Practices Report
        </h3>
        <p class="text-sm text-gray-400 mb-4">
            An analysis of the manifest against the ISO/IEC 23009-1:2022
            standard and common best practices.
        </p>

        <div
            class="flex items-center gap-4 mb-4 p-2 bg-gray-900 rounded-md sticky top-0 z-20 border-b border-gray-700"
        >
            <span class="text-sm font-semibold">Filter by Status:</span>
            <button
                class="compliance-filter-btn ${activeFilter === 'all'
                    ? 'filter-active'
                    : ''}"
                data-filter="all"
            >
                All (${checks.length})
            </button>
            <button
                class="compliance-filter-btn ${activeFilter === 'fail'
                    ? 'filter-active'
                    : ''}"
                data-filter="fail"
            >
                Errors (${counts.fail})
            </button>
            <button
                class="compliance-filter-btn ${activeFilter === 'warn'
                    ? 'filter-active'
                    : ''}"
                data-filter="warn"
            >
                Warnings (${counts.warn})
            </button>
            <button
                class="compliance-filter-btn ${activeFilter === 'pass'
                    ? 'filter-active'
                    : ''}"
                data-filter="pass"
            >
                Passed (${counts.pass})
            </button>
        </div>

        ${Object.entries(groupedChecks).map(([category, items]) =>
            categoryTemplate(category, items)
        )}

        <div class="dev-watermark">Compliance v5.0</div>
    `;
};

export function getComplianceReportTemplate(mpd) {
    const checks = runChecks(mpd);
    // Reset filter to 'all' whenever a new report is generated
    activeFilter = 'all';
    return renderReportForChecks(checks);
}

function groupChecks(checks) {
    const groups = {};
    checks.forEach((check) => {
        const category = check.category || 'General Best Practices';
        if (!groups[category]) {
            groups[category] = [];
        }
        groups[category].push(check);
    });
    return groups;
}
