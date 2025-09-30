import { html, render } from 'lit-html';
import { runChecks } from '../../../engines/compliance/engine.js';
import {
    validateCmafTrack,
    validateCmafSwitchingSets,
} from '../../../engines/cmaf/validator.js';
import { analysisState } from '../../../core/state.js';

// --- STATE ---
let activeFilter = 'all';
let cmafTrackResults = { isLoading: false, results: [] };
let cmafSwitchingSetResults = { isLoading: false, results: [] };

// --- EVENT LISTENERS & LOGIC ---
function applyFilter(container) {
    const allRows = container.querySelectorAll('.compliance-card');
    allRows.forEach((row) => {
        /** @type {HTMLElement} */ (row).style.display =
            activeFilter === 'all' ||
            row.classList.contains(`status-${activeFilter}`)
                ? 'grid'
                : 'none';
    });
}

export function attachComplianceFilterListeners() {
    const container = document.getElementById('tab-compliance');
    if (!container) return;

    container.addEventListener('click', (e) => {
        const button = /** @type {HTMLElement} */ (e.target).closest(
            '[data-filter]'
        );
        if (!button) return;

        activeFilter = /** @type {HTMLElement} */ (button).dataset.filter;
        applyFilter(container);

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

async function runCmafChecks(stream) {
    const container = document.getElementById('tab-compliance');
    if (!container) return;

    cmafTrackResults = { isLoading: true, results: [] };
    cmafSwitchingSetResults = { isLoading: true, results: [] };
    render(getComplianceReportTemplate(stream), container); // Re-render to show loading state
    attachComplianceFilterListeners();

    const trackResults = await validateCmafTrack(stream);
    cmafTrackResults = { isLoading: false, results: trackResults };
    render(getComplianceReportTemplate(stream), container);
    attachComplianceFilterListeners();

    const ssResults = await validateCmafSwitchingSets(stream);
    cmafSwitchingSetResults = { isLoading: false, results: ssResults };
    render(getComplianceReportTemplate(stream), container);
    attachComplianceFilterListeners();
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
                <span class="md:hidden font-semibold text-gray-300"
                    >${item.text}</span
                >
            </div>
            <div class="pl-6 md:pl-0">
                <p class="hidden md:block font-semibold text-gray-200">
                    ${item.text}
                </p>
                <p class="text-xs text-gray-400 mt-1">${item.details}</p>
            </div>
            <div
                class="text-left md:text-right text-xs text-gray-500 font-mono pl-6 md:pl-0"
            >
                ${item.isoRef}
            </div>
        </div>
    `;
};

const categoryTemplate = (category, items) => {
    if (!items || items.length === 0) return '';
    return html`
        <div class="mt-8">
            <h4 class="text-lg font-semibold text-gray-300 mb-3">
                ${category}
            </h4>
            <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                ${items.map((item) => complianceRowTemplate(item))}
            </div>
        </div>
    `;
};

const cmafResultsTemplate = (title, data) => {
    return html`
        <div class="mt-8">
            <h4 class="text-lg font-semibold text-gray-300 mb-3">${title}</h4>
            <div class="grid grid-cols-1 gap-2">
                ${data.isLoading
                    ? html`<div class="text-center p-4 text-gray-400">
                          Running CMAF validation...
                      </div>`
                    : ''}
                ${data.results.map((item) => complianceRowTemplate(item))}
            </div>
        </div>
    `;
};

const cmafButtonTemplate = (stream) => {
    const handleCmafClick = () => {
        runCmafChecks(stream);
    };
    return html`
        <div class="mt-8">
            <h4 class="text-lg font-semibold text-gray-300 mb-3">
                CMAF Conformance
            </h4>
            <div class="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <p class="text-sm text-gray-400 mb-4">
                    Run in-depth validation against the CMAF specification. This
                    will fetch and parse the initialization segment and the
                    first media segment.
                </p>
                <button
                    @click=${handleCmafClick}
                    class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
                >
                    Run CMAF Validation
                </button>
            </div>
        </div>
    `;
};

const renderReportForChecks = (checks, title) => {
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
        <h3 class="text-xl font-bold mb-2">${title}</h3>
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

export function getComplianceReportTemplate(stream) {
    if (!stream || !stream.manifest) return html``;

    const context = { stream }; // Pass the whole stream object for context
    const manifestObjectForChecks =
        stream.protocol === 'hls'
            ? stream.manifest
            : stream.manifest.rawElement;
    const structuralChecks = runChecks(
        manifestObjectForChecks,
        stream.protocol,
        context
    );

    if (
        stream.protocol === 'dash' &&
        !cmafTrackResults.isLoading &&
        cmafTrackResults.results.length === 0
    ) {
        // Defer CMAF check initialization slightly to not block initial render
        setTimeout(() => {
            const currentStream = analysisState.streams.find(
                (s) => s.id === stream.id
            );
            // Check if the button is still in the DOM before running
            if (
                currentStream &&
                document.querySelector('#tab-compliance button')
            ) {
                runCmafChecks(currentStream);
            }
        }, 100);
    }

    const manifestChecks = [...structuralChecks];

    activeFilter = 'all';
    return html`
        ${renderReportForChecks(manifestChecks, 'Manifest Compliance Report')}
        ${stream.protocol === 'dash' &&
        cmafTrackResults.results.length === 0 &&
        !cmafTrackResults.isLoading
            ? cmafButtonTemplate(stream)
            : ''}
        ${stream.protocol === 'dash' &&
        (cmafTrackResults.isLoading || cmafTrackResults.results.length > 0)
            ? cmafResultsTemplate('CMAF Track Conformance', cmafTrackResults)
            : ''}
        ${stream.protocol === 'dash' &&
        (cmafSwitchingSetResults.isLoading ||
            cmafSwitchingSetResults.results.length > 0)
            ? cmafResultsTemplate(
                  'CMAF Switching Set Analysis',
                  cmafSwitchingSetResults
              )
            : ''}
    `;
}

function groupChecks(checks) {
    const groups = {};
    checks.forEach((check) => {
        const category = check.category || 'General Best Practices';
        if (!groups[category]) groups[category] = [];
        groups[category].push(check);
    });

    const orderedGroups = {};
    const categoryOrder = [
        'HLS Structure',
        'Manifest Structure',
        'Semantic & Temporal Rules',
        'Live Stream Properties',
        'Segment & Timing Info',
        'Profile Conformance',
        'Encryption',
        'Interoperability',
        'General Best Practices',
    ];
    for (const category of categoryOrder) {
        if (groups[category]) orderedGroups[category] = groups[category];
    }
    for (const category in groups) {
        if (!orderedGroups[category])
            orderedGroups[category] = groups[category];
    }
    return orderedGroups;
}
