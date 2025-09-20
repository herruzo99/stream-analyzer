import { html } from 'lit-html';
import { runChecks } from './logic.js';

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
            '[data-filter]'
        );
        if (!button) return;

        activeFilter = /** @type {HTMLElement} */ (button).dataset.filter;

        // A simple and efficient way to apply the filter without a full re-render
        const allRows = container.querySelectorAll(
            '.compliance-card'
        );
        allRows.forEach((row) => {
            /** @type {HTMLElement} */ (row).style.display =
                activeFilter === 'all' ||
                row.classList.contains(`status-${activeFilter}`)
                    ? 'grid'
                    : 'none';
        });

        // Update active state on buttons
        container.querySelectorAll('[data-filter]').forEach((btn) => {
            const isActive =
                /** @type {HTMLElement} */ (btn).dataset.filter ===
                activeFilter;
            btn.classList.toggle('bg-blue-600', isActive);
            btn.classList.toggle('text-white', isActive);
            btn.classList.toggle('font-semibold', isActive);
            btn.classList.toggle('bg-gray-700', !isActive);
            btn.classList.toggle('text-gray-300', !isActive);
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
        <div
            class="compliance-card bg-gray-800 p-3 rounded-lg border border-gray-700 grid grid-cols-1 md:grid-cols-[auto_1fr_auto] md:items-center gap-x-4 gap-y-2 status-${item.status}"
            style="display: ${activeFilter === 'all' ||
            activeFilter === item.status
                ? 'grid'
                : 'none'}"
        >
            <div class="flex items-center gap-2 md:w-20">
                 <span
                    class="${status.color} font-bold text-lg"
                    title="${status.title}"
                    >${status.icon}</span
                >
                 <span class="md:hidden font-semibold text-gray-300">${item.text}</span>
            </div>
            <div class="pl-6 md:pl-0">
                <p class="hidden md:block font-semibold text-gray-200">${item.text}</p>
                <p class="text-xs text-gray-400 mt-1">${item.details}</p>
            </div>
            <div class="text-left md:text-right text-xs text-gray-500 font-mono pl-6 md:pl-0">
                ${item.isoRef}
            </div>
        </div>
    `;
};

const categoryTemplate = (category, items) => html`
    <div class="mt-8">
        <h4 class="text-lg font-semibold text-gray-300 mb-3">${category}</h4>
        <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            ${items.map((item) => complianceRowTemplate(item))}
        </div>
    </div>
`;

const renderReportForChecks = (checks) => {
    const counts = { pass: 0, warn: 0, fail: 0, info: 0 };
    checks.forEach(
        (check) => (counts[check.status] = (counts[check.status] || 0) + 1)
    );

    const groupedChecks = groupChecks(checks);

    const filterButton = (filter, label, count) => {
        const isActive = activeFilter === filter;
        return html`<button
            class="px-3 py-1 rounded-full text-xs transition-colors duration-200 ${isActive
                ? 'bg-blue-600 text-white font-semibold'
                : 'bg-gray-700 text-gray-300'}"
            data-filter="${filter}"
        >
            ${label} (${count})
        </button>`;
    };

    return html`
        <h3 class="text-xl font-bold mb-2">
            Compliance & Best Practices Report
        </h3>
        <p class="text-sm text-gray-400 mb-4">
            An analysis of the manifest against industry standards and common
            best practices.
        </p>

        <div
            class="flex items-center gap-4 mb-4 p-2 bg-gray-900/50 rounded-md sticky top-0 z-20 border-b border-gray-700"
        >
            <span class="text-sm font-semibold">Filter by Status:</span>
            ${filterButton('all', 'All', checks.length)}
            ${filterButton('fail', 'Errors', counts.fail)}
            ${filterButton('warn', 'Warnings', counts.warn)}
            ${filterButton('pass', 'Passed', counts.pass)}
            ${counts.info > 0 ? filterButton('info', 'Info', counts.info) : ''}
        </div>

        ${Object.entries(groupedChecks).map(([category, items]) =>
            categoryTemplate(category, items)
        )}

    `;
};

export function getComplianceReportTemplate(manifest, protocol) {
    if (!manifest) return html``;
    const checks = runChecks(manifest.rawElement, protocol);
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